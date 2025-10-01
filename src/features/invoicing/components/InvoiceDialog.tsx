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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FileText, AlertCircle, Plus, Save } from 'lucide-react'
import type { Invoice, InvoiceOperationType, PaymentTerms } from '@/shared/types/database'
import { useCompanies } from '@/features/clients/hooks/use-companies'
import { Skeleton } from '@/components/ui/skeleton'

interface InvoiceDialogProps {
  open: boolean
  onClose: () => void
  editingInvoice: Invoice | null
}

// Schéma de validation basique
const invoiceFormSchema = z.object({
  customer_company_id: z.string().min(1, 'Le client est requis'),
  operation_type: z.enum(['goods', 'services', 'mixed']),
  payment_terms: z.enum(['immediate', 'net_15', 'net_30', 'net_45', 'net_60', 'end_of_month', 'custom']),
  payment_terms_days: z.number().optional(),
  customer_notes: z.string().optional(),
  notes: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceFormSchema>

export function InvoiceDialog({ open, onClose, editingInvoice }: InvoiceDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { companies, loading: companiesLoading } = useCompanies()

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
    if (editingInvoice) {
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
    } else {
      reset()
    }
  }, [editingInvoice, setValue, reset])

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      setLoading(true)
      setError(null)

      // TODO: Implémenter la création/mise à jour de la facture
      console.log('Données facture:', data)

      // Pour l'instant, juste fermer le dialog
      onClose()
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="lines">Lignes (0)</TabsTrigger>
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
                    onValueChange={(value) => setValue('customer_company_id', value)}
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
                      <SelectItem value="services">Prestation de services</SelectItem>
                      <SelectItem value="mixed">Mixte (biens + services)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Mention obligatoire depuis 2026
                  </p>
                </div>

                {/* Conditions de paiement */}
                <div className="space-y-2">
                  <Label htmlFor="payment_terms">
                    Conditions de paiement <span className="text-destructive">*</span>
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
                      <SelectItem value="immediate">Paiement immédiat</SelectItem>
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
                  Une fois la facture validée, elle recevra un numéro séquentiel définitif et
                  ne pourra plus être modifiée (seule l&apos;annulation par avoir sera possible).
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Onglet Lignes */}
            <TabsContent value="lines" className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Aucune ligne de facture</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ajoutez des prestations ou produits à facturer
                </p>
                <Button type="button" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Les montants seront calculés automatiquement en fonction des lignes et des taux
                  de TVA appliqués.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Onglet Notes */}
            <TabsContent value="notes" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_notes">Notes visibles par le client</Label>
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
            <Button type="submit" disabled={loading}>
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
