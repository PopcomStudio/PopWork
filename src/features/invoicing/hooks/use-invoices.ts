"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type {
  Invoice,
  InvoiceLine,
  InvoiceVATBreakdown,
  InvoiceAuditTrail,
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
      issuer_siret: string
    }): Promise<Invoice> => {
      try {
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
              issuer_postal_code: '',
              issuer_city: '',
              customer_address: '',
              customer_postal_code: '',
              customer_city: '',
              created_by: '', // À remplir avec le user_id
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
  const validateInvoice = useCallback(
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
    validateInvoice,
  }
}
