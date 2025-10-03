"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { CreditCard, AlertCircle, DollarSign } from 'lucide-react'
import type { Invoice, PaymentMethod } from '@/shared/types/database'
import { formatAmount } from '../../utils/vat-calculator'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface PaymentDialogProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  totalPaid: number
  onConfirm: (payment: PaymentFormData) => Promise<void>
}

const paymentFormSchema = z.object({
  amount: z.number().positive('Le montant doit être supérieur à 0'),
  payment_method: z.enum(['bank_transfer', 'check', 'credit_card', 'direct_debit', 'cash']),
  payment_date: z.string().min(1, 'La date de paiement est requise'),
  payment_reference: z.string().optional(),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
})

export type PaymentFormData = z.infer<typeof paymentFormSchema>

const paymentMethodLabels: Record<PaymentMethod, string> = {
  bank_transfer: 'Virement bancaire',
  check: 'Chèque',
  credit_card: 'Carte bancaire',
  direct_debit: 'Prélèvement automatique',
  cash: 'Espèces',
}

export function PaymentDialog({
  open,
  onClose,
  invoice,
  totalPaid,
  onConfirm,
}: PaymentDialogProps) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      payment_method: 'bank_transfer',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const paymentMethod = watch('payment_method')
  const amount = watch('amount')

  useEffect(() => {
    if (open && invoice) {
      reset({
        payment_method: 'bank_transfer',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        amount: undefined,
      })
    }
  }, [open, invoice, reset])

  if (!invoice) return null

  const remainingAmount = Number(invoice.total_amount_including_tax) - totalPaid

  const handleFillFullAmount = () => {
    setValue('amount', Number(remainingAmount.toFixed(2)))
  }

  const onSubmit = async (data: PaymentFormData) => {
    // Validation supplémentaire
    if (data.amount > remainingAmount) {
      return
    }

    // Validation spécifique chèque
    if (data.payment_method === 'check' && !data.payment_reference?.trim()) {
      return
    }

    try {
      setLoading(true)
      await onConfirm(data)
      onClose()
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement du paiement:', err)
    } finally {
      setLoading(false)
    }
  }

  const isAmountValid = amount > 0 && amount <= remainingAmount
  const isReferenceRequired = paymentMethod === 'check' && !watch('payment_reference')?.trim()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-600" />
            Enregistrer un paiement
          </DialogTitle>
          <DialogDescription>
            Enregistrez un paiement reçu pour la facture {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Résumé facture */}
          <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant total TTC:</span>
              <span className="font-mono font-medium">
                {formatAmount(invoice.total_amount_including_tax)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Déjà payé:</span>
              <span className="font-mono">{formatAmount(totalPaid)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Reste à payer:</span>
              <span className="font-mono text-lg">{formatAmount(remainingAmount)}</span>
            </div>
          </div>

          {/* Montant du paiement */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="amount">
                Montant <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleFillFullAmount}
                className="h-auto p-0 text-xs"
              >
                <DollarSign className="mr-1 h-3 w-3" />
                Solde complet
              </Button>
            </div>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
              className={
                errors.amount || (amount > 0 && !isAmountValid) ? 'border-destructive' : ''
              }
            />
            {errors.amount && (
              <p className="text-sm text-destructive">{errors.amount.message}</p>
            )}
            {amount > remainingAmount && (
              <p className="text-sm text-destructive">
                Le montant ne peut pas dépasser le reste à payer ({formatAmount(remainingAmount)})
              </p>
            )}
          </div>

          {/* Mode de paiement */}
          <div className="space-y-2">
            <Label htmlFor="payment_method">
              Mode de paiement <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch('payment_method')}
              onValueChange={(value: PaymentMethod) => setValue('payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date de paiement */}
          <div className="space-y-2">
            <Label htmlFor="payment_date">
              Date de paiement <span className="text-destructive">*</span>
            </Label>
            <Input
              id="payment_date"
              type="date"
              {...register('payment_date')}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Référence de paiement */}
            <div className="space-y-2">
              <Label htmlFor="payment_reference">
                Référence{paymentMethod === 'check' && <span className="text-destructive"> *</span>}
              </Label>
              <Input
                id="payment_reference"
                placeholder={
                  paymentMethod === 'check'
                    ? 'N° chèque'
                    : paymentMethod === 'bank_transfer'
                      ? 'Réf. virement'
                      : 'Référence'
                }
                {...register('payment_reference')}
                className={isReferenceRequired ? 'border-destructive' : ''}
              />
              {isReferenceRequired && (
                <p className="text-sm text-destructive">La référence du chèque est requise</p>
              )}
            </div>

            {/* Transaction ID (pour CB) */}
            {paymentMethod === 'credit_card' && (
              <div className="space-y-2">
                <Label htmlFor="transaction_id">ID Transaction</Label>
                <Input
                  id="transaction_id"
                  placeholder="ID transaction"
                  {...register('transaction_id')}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Informations complémentaires..."
              rows={3}
              {...register('notes')}
            />
          </div>

          {/* Avertissement automatique */}
          {amount > 0 && amount === remainingAmount && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ce paiement soldera entièrement la facture. Le statut passera automatiquement à
                "Payée".
              </AlertDescription>
            </Alert>
          )}

          {amount > 0 && amount < remainingAmount && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Paiement partiel. Le statut passera à "Payée partiellement" et le reste à payer
                sera de {formatAmount(remainingAmount - amount)}.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading || !isAmountValid || isReferenceRequired}
            >
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Enregistrer le paiement
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
