"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { XCircle, AlertTriangle } from 'lucide-react'
import type { Invoice } from '@/shared/types/database'
import { formatAmount } from '../../utils/vat-calculator'

interface ConfirmCancelDialogProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onConfirm: (reason: string) => Promise<void>
}

export function ConfirmCancelDialog({
  open,
  onClose,
  invoice,
  onConfirm,
}: ConfirmCancelDialogProps) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')

  if (!invoice) return null

  const handleConfirm = async () => {
    try {
      setLoading(true)
      await onConfirm(reason)
      onClose()
      setReason('')
    } catch (err) {
      console.error('Erreur lors de l\'annulation:', err)
    } finally {
      setLoading(false)
    }
  }

  const isValid = reason.trim().length >= 10

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Annuler la facture
          </DialogTitle>
          <DialogDescription>
            Annulez la facture {invoice.invoice_number}. Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé facture */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1 text-sm">
                <div className="font-semibold">{invoice.customer_name}</div>
                <div>Montant TTC: {formatAmount(invoice.total_amount_including_tax)}</div>
                <div className="text-muted-foreground">Numéro: {invoice.invoice_number}</div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Raison obligatoire */}
          <div className="space-y-2">
            <Label htmlFor="cancel_reason">
              Raison de l'annulation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel_reason"
              placeholder="Expliquez la raison de l'annulation (minimum 10 caractères)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className={reason.trim().length > 0 && !isValid ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/10 caractères minimum
            </p>
          </div>

          {/* Avertissement */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">⚠️ Conséquences de l'annulation</div>
              <div className="text-sm">
                <ul className="list-disc list-inside space-y-0.5">
                  <li>La facture sera marquée comme annulée</li>
                  <li>Elle restera visible dans l'historique</li>
                  <li>Un avoir pourra être créé si nécessaire</li>
                  <li>Cette action ne peut pas être annulée</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || !isValid}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                Annulation...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Confirmer l'annulation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
