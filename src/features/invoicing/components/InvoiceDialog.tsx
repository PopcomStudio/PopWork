"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  FileText,
  AlertCircle,
  Plus,
  Save,
  Edit,
  Trash2,
  Calculator,
} from 'lucide-react'
import type {
  Invoice,
  InvoiceLine,
  InvoiceOperationType,
  PaymentTerms,
} from '@/shared/types/database'
import { useCompanies } from '@/features/clients/hooks/use-companies'
import { useInvoices } from '../hooks/use-invoices'
import { Skeleton } from '@/components/ui/skeleton'
import { InvoiceLineForm } from './forms/InvoiceLineForm'
import { formatAmount } from '../utils/vat-calculator'
import { useToast } from '@/hooks/use-toast'

interface InvoiceDialogProps {
  open: boolean
  onClose: () => void
  editingInvoice: Invoice | null
}

// Schéma de validation
const invoiceFormSchema = z.object({
  customer_company_id: z.string().min(1, 'Le client est requis'),
  operation_type: z.enum(['goods', 'services', 'mixed']),
  payment_terms: z.enum([
    'immediate',
    'net_15',
    'net_30',
    'net_45',
    'net_60',
    'end_of_month',
    'custom',
  ]),
  payment_terms_days: z.number().optional(),
  customer_notes: z.string().optional(),
  notes: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceFormSchema>

export function InvoiceDialog({
  open,
  onClose,
  editingInvoice,
}: InvoiceDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lines, setLines] = useState<Omit<InvoiceLine, 'invoice_id' | 'created_at' | 'updated_at'>[]>([])
  const [showLineForm, setShowLineForm] = useState(false)
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('general')

  const { companies, loading: companiesLoading } = useCompanies()
  const {
    createDraft,
    updateDraft,
    addLine,
    deleteLine,
    recalculateInvoiceTotals,
    fetchInvoices,
  } = useInvoices()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      operation_type: 'services',
      payment_terms: 'net_30',
    },
  })

  const paymentTerms = watch('payment_terms')

  // Charger les données si édition
  useEffect(() => {
    if (editingInvoice && open) {
      setValue('customer_company_id', editingInvoice.customer_company_id)
      setValue('operation_type', editingInvoice.operation_type)
      setValue('payment_terms', editingInvoice.payment_terms)
      if (editingInvoice.payment_terms_days) {
        setValue('payment_terms_days', editingInvoice.payment_terms_days)
      }
      if (editingInvoice.customer_notes) {
        setValue('customer_notes', editingInvoice.customer_notes)
      }
      if (editingInvoice.notes) {
        setValue('notes', editingInvoice.notes)
      }

      // TODO: Charger les lignes existantes depuis la DB
      setLines([])
    } else {
      reset()
      setLines([])
      setActiveTab('general')
    }
  }, [editingInvoice, open, setValue, reset])

  // Calculer les totaux
  const totals = lines.reduce(
    (acc, line) => ({
      subtotalExcludingTax: acc.subtotalExcludingTax + Number(line.subtotal_excluding_tax),
      totalVAT: acc.totalVAT + Number(line.vat_amount),
      totalIncludingTax: acc.totalIncludingTax + Number(line.total_including_tax),
    }),
    { subtotalExcludingTax: 0, totalVAT: 0, totalIncludingTax: 0 }
  )

  const handleAddLine = (lineData: Omit<InvoiceLine, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>) => {
    if (editingLineIndex !== null) {
      // Mode édition
      const updatedLines = [...lines]
      updatedLines[editingLineIndex] = lineData
      setLines(updatedLines)
      setEditingLineIndex(null)
    } else {
      // Mode ajout
      setLines([...lines, lineData])
    }
    setShowLineForm(false)
  }

  const handleEditLine = (index: number) => {
    setEditingLineIndex(index)
    setShowLineForm(true)
    setActiveTab('lines')
  }

  const handleDeleteLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index))
  }

  const handleCancelLineForm = () => {
    setShowLineForm(false)
    setEditingLineIndex(null)
  }

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setLoading(true)
      setError(null)

      // Vérifier qu'il y a au moins une ligne
      if (lines.length === 0) {
        setError('Ajoutez au moins une ligne de facture')
        setActiveTab('lines')
        return
      }

      // Trouver l'entreprise sélectionnée
      const selectedCompany = companies.find((c) => c.id === data.customer_company_id)
      if (!selectedCompany) {
        setError('Entreprise cliente introuvable')
        return
      }

      // TODO: Récupérer les infos de l'émetteur depuis les settings
      const issuerData = {
        issuer_company_id: '', // À compléter
        issuer_name: 'PopWork SAS', // À récupérer depuis settings
        issuer_address: '123 rue de la Paix', // À récupérer depuis settings
        issuer_siret: '12345678901234', // À récupérer depuis settings
      }

      if (editingInvoice) {
        // Mode édition
        await updateDraft(editingInvoice.id, {
          operation_type: data.operation_type,
          payment_terms: data.payment_terms,
          payment_terms_days: data.payment_terms_days,
          customer_notes: data.customer_notes,
          notes: data.notes,
        })

        // TODO: Mettre à jour les lignes existantes

        toast({
          title: 'Facture mise à jour',
          description: 'Le brouillon a été mis à jour avec succès',
        })
      } else {
        // Mode création
        const invoice = await createDraft({
          customer_company_id: data.customer_company_id,
          customer_name: selectedCompany.name,
          operation_type: data.operation_type,
          ...issuerData,
        })

        // Ajouter les lignes
        for (const line of lines) {
          await addLine(invoice.id, line)
        }

        toast({
          title: 'Facture créée',
          description: `Le brouillon ${invoice.invoice_number} a été créé avec succès`,
        })
      }

      // Recharger les factures
      await fetchInvoices()

      // Fermer le dialog
      onClose()
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err)
      setError(
        err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {editingInvoice ? 'Modifier la facture' : 'Nouvelle facture'}
          </DialogTitle>
          <DialogDescription>
            {editingInvoice
              ? `Modification de la facture ${editingInvoice.invoice_number}`
              : 'Créez une nouvelle facture conforme à la réglementation française'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="lines">
                Lignes ({lines.length})
              </TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            {/* Onglet Général */}
            <TabsContent value="general" className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Sélection du client */}
              <div className="space-y-2">
                <Label htmlFor="customer_company_id">
                  Client <span className="text-destructive">*</span>
                </Label>
                {companiesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={watch('customer_company_id')}
                    onValueChange={(value) =>
                      setValue('customer_company_id', value)
                    }
                    disabled={!!editingInvoice}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                          {company.siret && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({company.siret})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.customer_company_id && (
                  <p className="text-sm text-destructive">
                    {errors.customer_company_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Type d'opération */}
                <div className="space-y-2">
                  <Label htmlFor="operation_type">
                    Type d'opération <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch('operation_type')}
                    onValueChange={(value: InvoiceOperationType) =>
                      setValue('operation_type', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="goods">Livraison de biens</SelectItem>
                      <SelectItem value="services">
                        Prestation de services
                      </SelectItem>
                      <SelectItem value="mixed">
                        Mixte (biens + services)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Mention obligatoire depuis 2026
                  </p>
                </div>

                {/* Conditions de paiement */}
                <div className="space-y-2">
                  <Label htmlFor="payment_terms">
                    Conditions de paiement{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch('payment_terms')}
                    onValueChange={(value: PaymentTerms) =>
                      setValue('payment_terms', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">
                        Paiement immédiat
                      </SelectItem>
                      <SelectItem value="net_15">15 jours nets</SelectItem>
                      <SelectItem value="net_30">30 jours nets</SelectItem>
                      <SelectItem value="net_45">45 jours nets</SelectItem>
                      <SelectItem value="net_60">60 jours nets</SelectItem>
                      <SelectItem value="end_of_month">Fin de mois</SelectItem>
                      <SelectItem value="custom">Personnalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Jours personnalisés si custom */}
              {paymentTerms === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="payment_terms_days">Nombre de jours</Label>
                  <Input
                    type="number"
                    {...register('payment_terms_days', { valueAsNumber: true })}
                    placeholder="Ex: 45"
                  />
                </div>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Une fois la facture validée, elle recevra un numéro
                  séquentiel définitif et ne pourra plus être modifiée (seule
                  l&apos;annulation par avoir sera possible).
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Onglet Lignes */}
            <TabsContent value="lines" className="space-y-4">
              {showLineForm ? (
                <InvoiceLineForm
                  mode={editingLineIndex !== null ? 'edit' : 'add'}
                  lineNumber={editingLineIndex !== null ? editingLineIndex + 1 : lines.length + 1}
                  initialValues={
                    editingLineIndex !== null ? lines[editingLineIndex] : undefined
                  }
                  onSubmit={handleAddLine}
                  onCancel={handleCancelLineForm}
                />
              ) : (
                <>
                  {lines.length === 0 ? (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">
                        Aucune ligne de facture
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Ajoutez des prestations ou produits à facturer
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowLineForm(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter une ligne
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Qté</TableHead>
                              <TableHead className="text-right">
                                PU HT
                              </TableHead>
                              <TableHead className="text-right">
                                Total HT
                              </TableHead>
                              <TableHead className="text-right">
                                TVA
                              </TableHead>
                              <TableHead className="text-right">
                                Total TTC
                              </TableHead>
                              <TableHead className="w-20"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lines.map((line, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-muted-foreground">
                                  {index + 1}
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      {line.description}
                                    </div>
                                    {line.product_code && (
                                      <div className="text-xs text-muted-foreground">
                                        {line.product_code}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {line.quantity} {line.unit}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatAmount(line.unit_price_excluding_tax)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatAmount(line.subtotal_after_discount)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {line.vat_rate}% (
                                  {formatAmount(line.vat_amount)})
                                </TableCell>
                                <TableCell className="text-right font-mono font-medium">
                                  {formatAmount(line.total_including_tax)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditLine(index)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteLine(index)}
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowLineForm(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter une ligne
                        </Button>

                        <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                          <div className="flex justify-between gap-8 font-mono text-sm">
                            <span className="text-muted-foreground">
                              Sous-total HT:
                            </span>
                            <span className="font-medium">
                              {formatAmount(totals.subtotalExcludingTax)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-8 font-mono text-sm">
                            <span className="text-muted-foreground">
                              Total TVA:
                            </span>
                            <span className="font-medium">
                              {formatAmount(totals.totalVAT)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-8 font-mono text-lg font-bold pt-2 border-t">
                            <span>Total TTC:</span>
                            <span>{formatAmount(totals.totalIncludingTax)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {lines.length > 0 && (
                    <Alert>
                      <Calculator className="h-4 w-4" />
                      <AlertDescription>
                        Les totaux sont calculés automatiquement. La ventilation
                        TVA sera générée lors de la validation de la facture.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </TabsContent>

            {/* Onglet Notes */}
            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_notes">
                  Notes visibles par le client
                </Label>
                <Textarea
                  {...register('customer_notes')}
                  placeholder="Notes, conditions particulières, informations pour le client..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Ces notes apparaîtront sur la facture PDF
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes internes (privées)</Label>
                <Textarea
                  {...register('notes')}
                  placeholder="Notes internes, rappels, informations de gestion..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Ces notes ne sont pas visibles par le client
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || showLineForm}>
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingInvoice ? 'Mettre à jour' : 'Créer le brouillon'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
