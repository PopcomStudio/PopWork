"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  MoreVertical,
  Eye,
  Edit,
  CheckCircle,
  Send,
  CreditCard,
  FileDown,
  XCircle,
  Trash2,
  Download,
  AlertCircle,
} from 'lucide-react'
import type { Invoice } from '@/shared/types/database'

export type InvoiceAction =
  | 'view'
  | 'edit'
  | 'validate'
  | 'send'
  | 'payment'
  | 'credit_note'
  | 'cancel'
  | 'delete'
  | 'download'

interface InvoiceActionsProps {
  invoice: Invoice
  onAction: (action: InvoiceAction) => void
}

export function InvoiceActions({ invoice, onAction }: InvoiceActionsProps) {
  const status = invoice.status

  // Définir les actions disponibles selon le statut
  const actions = {
    view: true, // Toujours disponible
    download: status !== 'draft', // Pas de PDF pour les brouillons
    edit: status === 'draft',
    validate: status === 'draft',
    send: status === 'validated',
    payment: ['sent', 'partial_paid', 'overdue'].includes(status),
    credit_note: ['validated', 'sent', 'paid', 'partial_paid', 'overdue'].includes(status),
    cancel: ['validated', 'sent'].includes(status),
    delete: status === 'draft',
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Voir */}
        <DropdownMenuItem onClick={() => onAction('view')}>
          <Eye className="mr-2 h-4 w-4" />
          Voir les détails
        </DropdownMenuItem>

        {/* Télécharger PDF */}
        {actions.download && (
          <DropdownMenuItem onClick={() => onAction('download')}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger PDF
          </DropdownMenuItem>
        )}

        {/* Actions d'édition (uniquement brouillon) */}
        {actions.edit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction('edit')}>
              <Edit className="mr-2 h-4 w-4" />
              Éditer
            </DropdownMenuItem>
          </>
        )}

        {/* Actions de workflow */}
        {(actions.validate || actions.send || actions.payment) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Workflow</DropdownMenuLabel>

            {actions.validate && (
              <DropdownMenuItem onClick={() => onAction('validate')}>
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                <span className="font-medium">Valider</span>
              </DropdownMenuItem>
            )}

            {actions.send && (
              <DropdownMenuItem onClick={() => onAction('send')}>
                <Send className="mr-2 h-4 w-4 text-blue-600" />
                <span className="font-medium">Marquer comme envoyée</span>
              </DropdownMenuItem>
            )}

            {actions.payment && (
              <DropdownMenuItem onClick={() => onAction('payment')}>
                <CreditCard className="mr-2 h-4 w-4 text-purple-600" />
                <span className="font-medium">Enregistrer paiement</span>
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Actions d'annulation */}
        {(actions.credit_note || actions.cancel) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Annulation</DropdownMenuLabel>

            {actions.credit_note && (
              <DropdownMenuItem onClick={() => onAction('credit_note')}>
                <FileDown className="mr-2 h-4 w-4 text-orange-600" />
                Créer un avoir
              </DropdownMenuItem>
            )}

            {actions.cancel && (
              <DropdownMenuItem onClick={() => onAction('cancel')}>
                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                <span className="text-red-600">Annuler la facture</span>
              </DropdownMenuItem>
            )}
          </>
        )}

        {/* Supprimer (uniquement brouillon) */}
        {actions.delete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onAction('delete')}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
