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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import type { Invoice } from '@/shared/types/database'
import { formatAmount } from '../../utils/vat-calculator'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ConfirmValidateDialogProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onConfirm: () => Promise<void>
}

export function ConfirmValidateDialog({
  open,
  onClose,
  invoice,
  onConfirm,
}: ConfirmValidateDialogProps) {
  const [loading, setLoading] = useState(false)

  if (!invoice) return null

  const handleConfirm = async () => {
    try {
      setLoading(true)
      await onConfirm()
      onClose()
    } catch (err) {
      console.error('Erreur lors de la validation:', err)
    } finally {
      setLoading(false)
    }
  }

  // Vérifier les warnings potentiels
  const warnings: string[] = []

  if (!invoice.customer_siret && !invoice.customer_vat_number) {
    warnings.push('Le client n\'a ni SIRET ni numéro de TVA renseigné')
  }

  if (Number(invoice.total_amount_including_tax) === 0) {
    warnings.push('Le montant total de la facture est de 0 €')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Valider la facture
          </DialogTitle>
          <DialogDescription>
            Cette action est irréversible. Une fois validée, la facture recevra un numéro
            définitif et ne pourra plus être modifiée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Résumé de la facture */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="font-semibold">Résumé de la facture</div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Numéro actuel:</span>
                <span className="font-mono">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{invoice.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date de facture:</span>
                <span>
                  {format(new Date(invoice.invoice_date), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date d'échéance:</span>
                <span>{format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: fr })}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Montant TTC:</span>
                <span className="font-mono">
                  {formatAmount(invoice.total_amount_including_tax)}
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="default" className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <div className="font-semibold text-orange-900 mb-2">Points d'attention</div>
                <ul className="list-disc list-inside space-y-1 text-sm text-orange-800">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Information importante */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">⚠️ Action irréversible</div>
              <div className="text-sm">
                Une fois validée, cette facture:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Recevra un numéro séquentiel définitif</li>
                  <li>Ne pourra plus être modifiée</li>
                  <li>Sera enregistrée dans le journal comptable</li>
                  <li>Ne pourra être annulée que par avoir</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                Validation en cours...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Valider la facture
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
