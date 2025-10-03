"use client"

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText,
  Building2,
  Calendar,
  CreditCard,
  History,
  AlertCircle,
  Download,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  FileDown,
} from 'lucide-react'
import type {
  Invoice,
  InvoiceLine,
  InvoicePayment,
  InvoiceAuditTrail,
  InvoiceVATBreakdown,
} from '@/shared/types/database'
import { useInvoices } from '../hooks/use-invoices'
import { formatAmount } from '../utils/vat-calculator'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface InvoiceViewProps {
  invoiceId: string | null
  open: boolean
  onClose: () => void
  onEdit?: (invoice: Invoice) => void
}

const statusConfig = {
  draft: { label: 'Brouillon', variant: 'secondary' as const, icon: FileText },
  validated: { label: 'Validée', variant: 'default' as const, icon: CheckCircle },
  sent: { label: 'Envoyée', variant: 'default' as const, icon: Send },
  paid: { label: 'Payée', variant: 'default' as const, icon: CreditCard },
  partial_paid: { label: 'Payée partiellement', variant: 'secondary' as const, icon: CreditCard },
  overdue: { label: 'En retard', variant: 'destructive' as const, icon: AlertCircle },
  cancelled: { label: 'Annulée', variant: 'destructive' as const, icon: XCircle },
}

const paymentMethodLabels = {
  bank_transfer: 'Virement bancaire',
  check: 'Chèque',
  credit_card: 'Carte bancaire',
  direct_debit: 'Prélèvement',
  cash: 'Espèces',
}

export function InvoiceView({ invoiceId, open, onClose, onEdit }: InvoiceViewProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [vatBreakdown, setVatBreakdown] = useState<InvoiceVATBreakdown[]>([])
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [auditTrail, setAuditTrail] = useState<InvoiceAuditTrail[]>([])
  const [loading, setLoading] = useState(false)

  const { fetchInvoiceById, fetchPayments, fetchAuditTrail } = useInvoices()

  useEffect(() => {
    if (invoiceId && open) {
      loadInvoiceData()
    }
  }, [invoiceId, open])

  const loadInvoiceData = async () => {
    if (!invoiceId) return

    try {
      setLoading(true)

      // Charger la facture avec ses lignes et ventilation TVA
      const invoiceData = await fetchInvoiceById(invoiceId)
      setInvoice(invoiceData.invoice)
      setLines(invoiceData.lines)
      setVatBreakdown(invoiceData.vatBreakdown)

      // Charger les paiements
      const paymentsData = await fetchPayments(invoiceId)
      setPayments(paymentsData)

      // Charger l'audit trail
      const auditData = await fetchAuditTrail(invoiceId)
      setAuditTrail(auditData)
    } catch (err) {
      console.error('Erreur lors du chargement de la facture:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!invoice && loading) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </SheetHeader>
          <div className="space-y-6 mt-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  if (!invoice) return null

  const statusInfo = statusConfig[invoice.status]
  const StatusIcon = statusInfo.icon
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const remainingAmount = Number(invoice.total_amount_including_tax) - totalPaid

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <SheetTitle className="text-2xl">{invoice.invoice_number}</SheetTitle>
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
            <div className="flex gap-2">
              {invoice.status === 'draft' && onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(invoice)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Éditer
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
          <SheetDescription>
            Facture créée le {format(new Date(invoice.invoice_date), 'dd MMMM yyyy', { locale: fr })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Section Émetteur/Client */}
          <div className="grid grid-cols-2 gap-6">
            {/* Émetteur */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Émetteur
              </div>
              <div className="border rounded-lg p-4 space-y-1 bg-muted/30">
                <div className="font-semibold">{invoice.issuer_name}</div>
                <div className="text-sm text-muted-foreground">{invoice.issuer_address}</div>
                <div className="text-sm text-muted-foreground">
                  {invoice.issuer_postal_code} {invoice.issuer_city}
                </div>
                <Separator className="my-2" />
                <div className="text-xs text-muted-foreground">SIRET: {invoice.issuer_siret}</div>
                {invoice.issuer_vat_number && (
                  <div className="text-xs text-muted-foreground">TVA: {invoice.issuer_vat_number}</div>
                )}
              </div>
            </div>

            {/* Client */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Client
              </div>
              <div className="border rounded-lg p-4 space-y-1">
                <div className="font-semibold">{invoice.customer_name}</div>
                <div className="text-sm text-muted-foreground">{invoice.customer_address}</div>
                <div className="text-sm text-muted-foreground">
                  {invoice.customer_postal_code} {invoice.customer_city}
                </div>
                {invoice.customer_siret && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-xs text-muted-foreground">SIRET: {invoice.customer_siret}</div>
                  </>
                )}
                {invoice.customer_vat_number && (
                  <div className="text-xs text-muted-foreground">TVA: {invoice.customer_vat_number}</div>
                )}
              </div>
            </div>
          </div>

          {/* Dates et conditions */}
          <div className="grid grid-cols-3 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Date de facture
              </div>
              <div className="font-semibold">
                {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                Date d'échéance
              </div>
              <div className="font-semibold">
                {format(new Date(invoice.due_date), 'dd/MM/yyyy')}
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-1">Type d'opération</div>
              <div className="font-semibold">
                {invoice.operation_type === 'goods' && 'Livraison de biens'}
                {invoice.operation_type === 'services' && 'Prestation de services'}
                {invoice.operation_type === 'mixed' && 'Mixte'}
              </div>
            </div>
          </div>

          <Separator />

          {/* Lignes de facture */}
          <div className="space-y-2">
            <h3 className="font-semibold">Lignes de facture</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qté</TableHead>
                    <TableHead className="text-right">PU HT</TableHead>
                    <TableHead className="text-right">Remise</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={line.id}>
                      <TableCell className="font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{line.description}</div>
                          {line.product_code && (
                            <div className="text-xs text-muted-foreground">{line.product_code}</div>
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
                        {line.discount_rate > 0 ? `-${line.discount_rate}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(line.subtotal_after_discount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {line.vat_rate}%
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatAmount(line.total_including_tax)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totaux et ventilation TVA */}
          <div className="flex justify-end">
            <div className="w-96 space-y-3">
              <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total HT:</span>
                  <span className="font-mono">
                    {formatAmount(invoice.total_amount_excluding_tax)}
                  </span>
                </div>

                {vatBreakdown.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Ventilation TVA
                    </div>
                    {vatBreakdown.map((vat) => (
                      <div key={vat.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          TVA {vat.vat_rate}% sur {formatAmount(vat.taxable_base)}:
                        </span>
                        <span className="font-mono">{formatAmount(vat.vat_amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Total TVA:</span>
                  <span className="font-mono">{formatAmount(invoice.total_vat_amount)}</span>
                </div>

                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total TTC:</span>
                  <span className="font-mono">
                    {formatAmount(invoice.total_amount_including_tax)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Paiements */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Paiements reçus
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Mode de paiement</TableHead>
                      <TableHead>Référence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {formatAmount(payment.amount)}
                        </TableCell>
                        <TableCell>{paymentMethodLabels[payment.payment_method]}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {payment.payment_reference || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={2} className="font-semibold">
                        Reste à payer
                      </TableCell>
                      <TableCell colSpan={2} className="font-mono font-bold text-right">
                        {formatAmount(remainingAmount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Historique */}
          {auditTrail.length > 0 && (
            <Accordion type="single" collapsible className="border rounded-lg">
              <AccordionItem value="history" className="border-none">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <span className="font-semibold">Historique ({auditTrail.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Heure</TableHead>
                        <TableHead>Événement</TableHead>
                        <TableHead>Détails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditTrail.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-mono text-xs">
                            {format(new Date(event.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell className="font-medium">{event.action}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {event.details}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Notes */}
          {(invoice.customer_notes || invoice.notes) && (
            <div className="space-y-3">
              {invoice.customer_notes && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Notes client</div>
                    <div className="text-sm whitespace-pre-wrap">{invoice.customer_notes}</div>
                  </AlertDescription>
                </Alert>
              )}
              {invoice.notes && (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">Notes internes</div>
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {invoice.notes}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Informations légales */}
          {invoice.status !== 'draft' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <div className="space-y-1">
                  <div>
                    En cas de retard de paiement, une pénalité de {invoice.late_payment_penalty_rate}%
                    sera appliquée, ainsi qu'une indemnité forfaitaire de{' '}
                    {formatAmount(invoice.late_payment_fixed_fee)} pour frais de recouvrement.
                  </div>
                  <div className="text-muted-foreground">
                    Escompte pour paiement anticipé: néant • Pas d'escompte en cas de paiement avant
                    échéance
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
