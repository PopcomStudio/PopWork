"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type {
  Invoice,
  InvoiceLine,
  InvoiceVATBreakdown,
  InvoiceAuditTrail,
  InvoicePayment,
  InvoiceStatus,
  InvoiceOperationType,
  PaymentTerms,
} from '@/shared/types/database'
import { getNextInvoiceNumber } from '../services/invoice-numbering.service'
import {
  validateInvoice,
  validateDraftInvoice,
  type ValidationResult,
} from '../services/invoice-validation.service'
import {
  calculateVATBreakdown,
  calculateInvoiceTotals,
} from '../utils/vat-calculator'

/**
 * Hook pour la gestion des factures
 */
export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Charger toutes les factures
  const fetchInvoices = useCallback(async (): Promise<Invoice[]> => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Erreur lors du chargement des factures:', err)
      throw err
    }
  }, [supabase])

  // Charger une facture par ID avec ses lignes
  const fetchInvoiceById = useCallback(
    async (
      id: string
    ): Promise<{
      invoice: Invoice
      lines: InvoiceLine[]
      vatBreakdown: InvoiceVATBreakdown[]
    } | null> => {
      try {
        // Charger la facture
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', id)
          .single()

        if (invoiceError) throw invoiceError

        // Charger les lignes
        const { data: lines, error: linesError } = await supabase
          .from('invoice_lines')
          .select('*')
          .eq('invoice_id', id)
          .order('line_number')

        if (linesError) throw linesError

        // Charger la ventilation TVA
        const { data: vatBreakdown, error: vatError } = await supabase
          .from('invoice_vat_breakdown')
          .select('*')
          .eq('invoice_id', id)
          .order('vat_rate', { ascending: false })

        if (vatError) throw vatError

        return {
          invoice,
          lines: lines || [],
          vatBreakdown: vatBreakdown || [],
        }
      } catch (err) {
        console.error('Erreur lors du chargement de la facture:', err)
        throw err
      }
    },
    [supabase]
  )

  // Créer un brouillon de facture
  const createDraft = useCallback(
    async (data: {
      customer_company_id: string
      customer_name: string
      operation_type: InvoiceOperationType
      issuer_company_id: string
      issuer_name: string
      issuer_address: string
      issuer_postal_code: string
      issuer_city: string
      issuer_siret: string
    }): Promise<Invoice> => {
      try {
        // Récupérer l'utilisateur connecté
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Utilisateur non authentifié')
        }

        const currentDate = new Date().toISOString().split('T')[0]
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)

        const { data: invoice, error } = await supabase
          .from('invoices')
          .insert([
            {
              ...data,
              invoice_number: 'DRAFT-' + Date.now(), // Temporaire, remplacé à la validation
              invoice_date: currentDate,
              status: 'draft' as InvoiceStatus,
              is_credit_note: false,
              payment_terms: 'net_30' as PaymentTerms,
              payment_due_date: dueDate.toISOString().split('T')[0],
              subtotal_excluding_tax: 0,
              total_vat_amount: 0,
              total_including_tax: 0,
              facturx_generated: false,
              issuer_country: 'FR',
              customer_country: 'FR',
              customer_address: '',
              customer_postal_code: '',
              customer_city: '',
              created_by: user.id,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Ajouter une entrée dans l'audit trail
        await createAuditEntry(invoice.id, 'created', 'Brouillon créé')

        return invoice
      } catch (err) {
        console.error('Erreur lors de la création du brouillon:', err)
        throw err
      }
    },
    [supabase]
  )

  // Mettre à jour un brouillon
  const updateDraft = useCallback(
    async (id: string, data: Partial<Invoice>): Promise<Invoice> => {
      try {
        // Vérifier que la facture est bien en brouillon
        const { data: existing, error: fetchError } = await supabase
          .from('invoices')
          .select('status')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError

        if (existing.status !== 'draft') {
          throw new Error(
            'Seuls les brouillons peuvent être modifiés. Créez un avoir pour annuler une facture validée.'
          )
        }

        const { data: invoice, error } = await supabase
          .from('invoices')
          .update(data)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Audit trail
        await createAuditEntry(id, 'updated', 'Brouillon mis à jour')

        return invoice
      } catch (err) {
        console.error('Erreur lors de la mise à jour du brouillon:', err)
        throw err
      }
    },
    [supabase]
  )

  // Ajouter une ligne de facture
  const addLine = useCallback(
    async (invoiceId: string, line: Omit<InvoiceLine, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>): Promise<InvoiceLine> => {
      try {
        const { data, error } = await supabase
          .from('invoice_lines')
          .insert([
            {
              ...line,
              invoice_id: invoiceId,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Recalculer les totaux de la facture
        await recalculateInvoiceTotals(invoiceId)

        return data
      } catch (err) {
        console.error('Erreur lors de l\'ajout de la ligne:', err)
        throw err
      }
    },
    [supabase]
  )

  // Supprimer une ligne de facture
  const deleteLine = useCallback(
    async (lineId: string, invoiceId: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('invoice_lines')
          .delete()
          .eq('id', lineId)

        if (error) throw error

        // Recalculer les totaux
        await recalculateInvoiceTotals(invoiceId)
      } catch (err) {
        console.error('Erreur lors de la suppression de la ligne:', err)
        throw err
      }
    },
    [supabase]
  )

  // Recalculer les totaux d'une facture
  const recalculateInvoiceTotals = useCallback(
    async (invoiceId: string): Promise<void> => {
      try {
        // Charger toutes les lignes
        const { data: lines, error: linesError } = await supabase
          .from('invoice_lines')
          .select('*')
          .eq('invoice_id', invoiceId)

        if (linesError) throw linesError

        if (!lines || lines.length === 0) {
          // Pas de lignes: remettre les totaux à zéro
          await supabase
            .from('invoices')
            .update({
              subtotal_excluding_tax: 0,
              total_vat_amount: 0,
              total_including_tax: 0,
            })
            .eq('id', invoiceId)

          return
        }

        // Calculer les totaux
        const linesData = lines.map((line) => ({
          amountExcludingTax: line.subtotal_after_discount,
          vatRate: line.vat_rate,
        }))

        const totals = calculateInvoiceTotals(linesData)

        // Mettre à jour la facture
        await supabase
          .from('invoices')
          .update({
            subtotal_excluding_tax: totals.subtotalExcludingTax,
            total_vat_amount: totals.totalVATAmount,
            total_including_tax: totals.totalIncludingTax,
          })
          .eq('id', invoiceId)

        // Mettre à jour la ventilation TVA
        const vatBreakdown = calculateVATBreakdown(linesData)

        // Supprimer l'ancienne ventilation
        await supabase
          .from('invoice_vat_breakdown')
          .delete()
          .eq('invoice_id', invoiceId)

        // Insérer la nouvelle ventilation
        if (vatBreakdown.length > 0) {
          await supabase.from('invoice_vat_breakdown').insert(
            vatBreakdown.map((item) => ({
              invoice_id: invoiceId,
              vat_rate: item.vatRate,
              taxable_base: item.taxableBase,
              vat_amount: item.vatAmount,
              total_including_tax: item.totalIncludingTax,
            }))
          )
        }
      } catch (err) {
        console.error('Erreur lors du recalcul des totaux:', err)
        throw err
      }
    },
    [supabase]
  )

  // Valider une facture (attribution du numéro définitif)
  const validateInvoiceAction = useCallback(
    async (id: string): Promise<{ invoice: Invoice; validation: ValidationResult }> => {
      try {
        // Charger la facture avec ses lignes
        const invoiceData = await fetchInvoiceById(id)

        if (!invoiceData) {
          throw new Error('Facture non trouvée')
        }

        // Valider la facture
        const validation = validateInvoice({
          invoice_date: invoiceData.invoice.invoice_date,
          operation_type: invoiceData.invoice.operation_type,
          is_credit_note: invoiceData.invoice.is_credit_note,
          issuer_siret: invoiceData.invoice.issuer_siret,
          issuer_name: invoiceData.invoice.issuer_name,
          issuer_address: invoiceData.invoice.issuer_address,
          issuer_vat_number: invoiceData.invoice.issuer_vat_number,
          customer_name: invoiceData.invoice.customer_name,
          customer_address: invoiceData.invoice.customer_address,
          customer_siret: invoiceData.invoice.customer_siret,
          customer_vat_number: invoiceData.invoice.customer_vat_number,
          subtotal_excluding_tax: invoiceData.invoice.subtotal_excluding_tax,
          total_vat_amount: invoiceData.invoice.total_vat_amount,
          total_including_tax: invoiceData.invoice.total_including_tax,
          payment_due_date: invoiceData.invoice.payment_due_date,
          lines: invoiceData.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unit_price_excluding_tax: line.unit_price_excluding_tax,
            vat_rate: line.vat_rate,
            vat_amount: line.vat_amount,
            total_including_tax: line.total_including_tax,
          })),
        })

        if (!validation.isValid) {
          return { invoice: invoiceData.invoice, validation }
        }

        // Générer le numéro de facture définitif
        const { invoiceNumber } = await getNextInvoiceNumber()

        // Mettre à jour la facture
        const { data: invoice, error } = await supabase
          .from('invoices')
          .update({
            invoice_number: invoiceNumber,
            status: 'validated',
            validated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Audit trail
        await createAuditEntry(
          id,
          'validated',
          `Facture validée avec le numéro ${invoiceNumber}`
        )

        return { invoice, validation }
      } catch (err) {
        console.error('Erreur lors de la validation de la facture:', err)
        throw err
      }
    },
    [supabase, fetchInvoiceById]
  )

  // Créer une entrée dans l'audit trail
  const createAuditEntry = useCallback(
    async (
      invoiceId: string,
      eventType: InvoiceAuditTrail['event_type'],
      description: string
    ): Promise<void> => {
      try {
        await supabase.from('invoice_audit_trail').insert([
          {
            invoice_id: invoiceId,
            event_type: eventType,
            event_description: description,
            timestamp: new Date().toISOString(),
          },
        ])
      } catch (err) {
        console.error('Erreur lors de la création de l\'audit trail:', err)
        // Ne pas lancer d'erreur pour ne pas bloquer l'opération principale
      }
    },
    [supabase]
  )

  // Marquer une facture comme envoyée
  const markAsSent = useCallback(
    async (id: string, sentDate?: string): Promise<Invoice> => {
      try {
        // Vérifier que la facture est bien validée
        const { data: existing, error: fetchError } = await supabase
          .from('invoices')
          .select('status')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError

        if (existing.status !== 'validated') {
          throw new Error(
            'Seules les factures validées peuvent être marquées comme envoyées.'
          )
        }

        const sendDate = sentDate || new Date().toISOString()

        const { data: invoice, error } = await supabase
          .from('invoices')
          .update({
            status: 'sent',
            // Note: pdp_transmission_date sera ajouté quand on implémentera PDP
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Audit trail
        await createAuditEntry(
          id,
          'sent',
          `Facture envoyée le ${new Date(sendDate).toLocaleDateString('fr-FR')}`
        )

        return invoice
      } catch (err) {
        console.error('Erreur lors du marquage comme envoyée:', err)
        throw err
      }
    },
    [supabase]
  )

  // Enregistrer un paiement
  const recordPayment = useCallback(
    async (
      invoiceId: string,
      payment: {
        amount: number
        payment_method: 'bank_transfer' | 'check' | 'credit_card' | 'direct_debit' | 'cash'
        payment_date: string
        payment_reference?: string
        transaction_id?: string
        notes?: string
      }
    ): Promise<{ invoice: Invoice; totalPaid: number }> => {
      try {
        // Charger la facture
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .single()

        if (invoiceError) throw invoiceError

        // Vérifier que la facture peut recevoir un paiement
        if (!['sent', 'partial_paid', 'overdue'].includes(invoice.status)) {
          throw new Error(
            'Seules les factures envoyées peuvent recevoir des paiements.'
          )
        }

        // Insérer le paiement
        const { error: paymentError } = await supabase
          .from('invoice_payments')
          .insert([
            {
              invoice_id: invoiceId,
              ...payment,
              created_by: '', // À remplir avec le user_id
            },
          ])

        if (paymentError) throw paymentError

        // Calculer le total des paiements
        const { data: payments, error: paymentsError } = await supabase
          .from('invoice_payments')
          .select('amount')
          .eq('invoice_id', invoiceId)

        if (paymentsError) throw paymentsError

        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
        const totalDue = Number(invoice.total_including_tax)

        // Déterminer le nouveau statut
        let newStatus: InvoiceStatus = invoice.status
        if (totalPaid >= totalDue) {
          newStatus = 'paid'
        } else if (totalPaid > 0) {
          newStatus = 'partial_paid'
        }

        // Mettre à jour le statut de la facture
        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update({ status: newStatus })
          .eq('id', invoiceId)
          .select()
          .single()

        if (updateError) throw updateError

        // Audit trail
        await createAuditEntry(
          invoiceId,
          'payment_received',
          `Paiement de ${payment.amount}€ reçu (${payment.payment_method}) - Total payé: ${totalPaid}€ / ${totalDue}€`
        )

        return { invoice: updatedInvoice, totalPaid }
      } catch (err) {
        console.error('Erreur lors de l\'enregistrement du paiement:', err)
        throw err
      }
    },
    [supabase]
  )

  // Créer un avoir (credit note)
  const createCreditNote = useCallback(
    async (
      originalInvoiceId: string,
      reason: string,
      partialLines?: { lineId: string; quantity: number }[]
    ): Promise<Invoice> => {
      try {
        // Charger la facture originale avec ses lignes
        const invoiceData = await fetchInvoiceById(originalInvoiceId)

        if (!invoiceData) {
          throw new Error('Facture originale non trouvée')
        }

        const { invoice: originalInvoice, lines: originalLines } = invoiceData

        // Vérifier que la facture peut être annulée
        if (!['validated', 'sent', 'paid', 'partial_paid', 'overdue'].includes(originalInvoice.status)) {
          throw new Error(
            'Seules les factures validées peuvent être annulées par avoir.'
          )
        }

        // Générer un numéro d'avoir (format: AV-YYYY-NNNNN)
        // Note: Pour l'instant on utilise le même système de numérotation
        // TODO: Implémenter une séquence séparée pour les avoirs
        const { invoiceNumber } = await getNextInvoiceNumber()
        const creditNoteNumber = invoiceNumber.replace(/^\d{4}/, 'AV-$&')

        // Déterminer les lignes à inclure dans l'avoir
        let creditLines = originalLines
        if (partialLines && partialLines.length > 0) {
          creditLines = originalLines
            .filter((line) =>
              partialLines.some((pl) => pl.lineId === line.id)
            )
            .map((line) => {
              const partialLine = partialLines.find((pl) => pl.lineId === line.id)
              if (partialLine) {
                return { ...line, quantity: partialLine.quantity }
              }
              return line
            })
        }

        // Créer l'avoir
        const { data: creditNote, error: creditNoteError } = await supabase
          .from('invoices')
          .insert([
            {
              invoice_number: creditNoteNumber,
              invoice_date: new Date().toISOString().split('T')[0],
              operation_type: originalInvoice.operation_type,
              status: 'validated',
              is_credit_note: true,
              credit_note_reason: reason,
              original_invoice_id: originalInvoiceId,

              // Copier les informations de l'émetteur
              issuer_company_id: originalInvoice.issuer_company_id,
              issuer_name: originalInvoice.issuer_name,
              issuer_address: originalInvoice.issuer_address,
              issuer_postal_code: originalInvoice.issuer_postal_code,
              issuer_city: originalInvoice.issuer_city,
              issuer_country: originalInvoice.issuer_country,
              issuer_siret: originalInvoice.issuer_siret,
              issuer_vat_number: originalInvoice.issuer_vat_number,

              // Copier les informations du client
              customer_company_id: originalInvoice.customer_company_id,
              customer_service_id: originalInvoice.customer_service_id,
              customer_name: originalInvoice.customer_name,
              customer_address: originalInvoice.customer_address,
              customer_postal_code: originalInvoice.customer_postal_code,
              customer_city: originalInvoice.customer_city,
              customer_country: originalInvoice.customer_country,
              customer_siret: originalInvoice.customer_siret,
              customer_vat_number: originalInvoice.customer_vat_number,

              // Montants négatifs
              subtotal_excluding_tax: -originalInvoice.subtotal_excluding_tax,
              total_vat_amount: -originalInvoice.total_vat_amount,
              total_including_tax: -originalInvoice.total_including_tax,

              // Autres champs
              payment_terms: originalInvoice.payment_terms,
              payment_due_date: new Date().toISOString().split('T')[0],
              facturx_generated: false,
              validated_at: new Date().toISOString(),
              created_by: '', // À remplir avec le user_id
            },
          ])
          .select()
          .single()

        if (creditNoteError) throw creditNoteError

        // Créer les lignes de l'avoir (quantités et montants négatifs)
        const creditNoteLinesData = creditLines.map((line, index) => ({
          invoice_id: creditNote.id,
          line_number: index + 1,
          description: line.description,
          product_code: line.product_code,
          quantity: -line.quantity, // Négatif
          unit: line.unit,
          unit_price_excluding_tax: line.unit_price_excluding_tax,
          subtotal_excluding_tax: -line.subtotal_excluding_tax, // Négatif
          discount_rate: line.discount_rate,
          discount_amount: line.discount_amount ? -line.discount_amount : null,
          subtotal_after_discount: -line.subtotal_after_discount, // Négatif
          vat_rate: line.vat_rate,
          vat_amount: -line.vat_amount, // Négatif
          total_including_tax: -line.total_including_tax, // Négatif
        }))

        const { error: linesError } = await supabase
          .from('invoice_lines')
          .insert(creditNoteLinesData)

        if (linesError) throw linesError

        // Annuler la facture originale
        const { error: cancelError } = await supabase
          .from('invoices')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
          })
          .eq('id', originalInvoiceId)

        if (cancelError) throw cancelError

        // Audit trails
        await createAuditEntry(
          creditNote.id,
          'created',
          `Avoir créé pour annulation de ${originalInvoice.invoice_number}: ${reason}`
        )

        await createAuditEntry(
          originalInvoiceId,
          'cancelled',
          `Facture annulée par avoir ${creditNoteNumber}: ${reason}`
        )

        return creditNote
      } catch (err) {
        console.error('Erreur lors de la création de l\'avoir:', err)
        throw err
      }
    },
    [supabase, fetchInvoiceById]
  )

  // Annuler une facture
  const cancelInvoice = useCallback(
    async (id: string, reason: string): Promise<Invoice> => {
      try {
        // Vérifier qu'aucun paiement n'a été enregistré
        const { data: payments, error: paymentsError } = await supabase
          .from('invoice_payments')
          .select('id')
          .eq('invoice_id', id)

        if (paymentsError) throw paymentsError

        if (payments && payments.length > 0) {
          throw new Error(
            'Impossible d\'annuler une facture avec des paiements enregistrés. Créez un avoir à la place.'
          )
        }

        // Annuler la facture
        const { data: invoice, error } = await supabase
          .from('invoices')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: reason,
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Audit trail
        await createAuditEntry(id, 'cancelled', `Facture annulée: ${reason}`)

        return invoice
      } catch (err) {
        console.error('Erreur lors de l\'annulation de la facture:', err)
        throw err
      }
    },
    [supabase]
  )

  // Charger les paiements d'une facture
  const fetchPayments = useCallback(
    async (invoiceId: string) => {
      try {
        const { data, error } = await supabase
          .from('invoice_payments')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('payment_date', { ascending: false })

        if (error) throw error

        return data || []
      } catch (err) {
        console.error('Erreur lors du chargement des paiements:', err)
        throw err
      }
    },
    [supabase]
  )

  // Charger l'audit trail d'une facture
  const fetchAuditTrail = useCallback(
    async (invoiceId: string) => {
      try {
        const { data, error } = await supabase
          .from('invoice_audit_trail')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('timestamp', { ascending: false })

        if (error) throw error

        return data || []
      } catch (err) {
        console.error('Erreur lors du chargement de l\'audit trail:', err)
        throw err
      }
    },
    [supabase]
  )

  // Charger les factures au montage du composant
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchInvoices()
        setInvoices(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement des factures'
        )
      } finally {
        setLoading(false)
      }
    }

    loadInvoices()
  }, [fetchInvoices])

  return {
    invoices,
    loading,
    error,
    setError,
    fetchInvoices,
    fetchInvoiceById,
    createDraft,
    updateDraft,
    addLine,
    deleteLine,
    recalculateInvoiceTotals,
    validateInvoice: validateInvoiceAction,
    markAsSent,
    recordPayment,
    createCreditNote,
    cancelInvoice,
    fetchPayments,
    fetchAuditTrail,
  }
}
