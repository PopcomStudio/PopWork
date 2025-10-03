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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, Mail, MapPin, AlertCircle } from 'lucide-react'
import type { Invoice } from '@/shared/types/database'
import { format } from 'date-fns'

interface ConfirmSendDialogProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onConfirm: (data: { sentDate: string; sendMethod: 'email' | 'mail'; recipientEmail?: string }) => Promise<void>
}

export function ConfirmSendDialog({
  open,
  onClose,
  invoice,
  onConfirm,
}: ConfirmSendDialogProps) {
  const [loading, setLoading] = useState(false)
  const [sentDate, setSentDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sendMethod, setSendMethod] = useState<'email' | 'mail'>('email')
  const [recipientEmail, setRecipientEmail] = useState('')

  if (!invoice) return null

  const handleConfirm = async () => {
    try {
      setLoading(true)
      await onConfirm({
        sentDate,
        sendMethod,
        recipientEmail: sendMethod === 'email' ? recipientEmail : undefined,
      })
      onClose()
    } catch (err) {
      console.error('Erreur lors de l\'envoi:', err)
    } finally {
      setLoading(false)
    }
  }

  const isValid = sendMethod === 'mail' || (sendMethod === 'email' && recipientEmail.trim() !== '')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Marquer comme envoyée
          </DialogTitle>
          <DialogDescription>
            Enregistrez l'envoi de la facture {invoice.invoice_number} au client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date d'envoi */}
          <div className="space-y-2">
            <Label htmlFor="sent_date">
              Date d'envoi <span className="text-destructive">*</span>
            </Label>
            <Input
              id="sent_date"
              type="date"
              value={sentDate}
              onChange={(e) => setSentDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
            <p className="text-xs text-muted-foreground">
              Date à laquelle la facture a été envoyée au client
            </p>
          </div>

          {/* Moyen d'envoi */}
          <div className="space-y-2">
            <Label htmlFor="send_method">
              Moyen d'envoi <span className="text-destructive">*</span>
            </Label>
            <Select value={sendMethod} onValueChange={(value: 'email' | 'mail') => setSendMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="mail">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Courrier postal
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email destinataire (si email) */}
          {sendMethod === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="recipient_email">
                Email destinataire <span className="text-destructive">*</span>
              </Label>
              <Input
                id="recipient_email"
                type="email"
                placeholder="client@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Adresse email à laquelle la facture a été envoyée
              </p>
            </div>
          )}

          {/* Info client */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">Client: {invoice.customer_name}</div>
              <div className="text-sm">
                {invoice.customer_address}, {invoice.customer_postal_code} {invoice.customer_city}
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={loading || !isValid}>
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                Enregistrement...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Confirmer l'envoi
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
