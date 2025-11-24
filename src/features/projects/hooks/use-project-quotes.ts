"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type {
  ProjectQuote,
  QuoteLine,
  QuoteStatus,
  PaymentTerms,
} from '@/shared/types/database'

/**
 * Hook pour la gestion des devis de projet
 */
export function useProjectQuotes(projectId?: string) {
  const [quotes, setQuotes] = useState<ProjectQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Charger tous les devis d'un projet
  const fetchQuotes = useCallback(
    async (pId?: string): Promise<ProjectQuote[]> => {
      try {
        const targetProjectId = pId || projectId
        if (!targetProjectId) {
          throw new Error('Project ID is required')
        }

        const { data, error } = await supabase
          .from('project_quotes')
          .select('*')
          .eq('project_id', targetProjectId)
          .order('quote_date', { ascending: false })

        if (error) throw error

        return data || []
      } catch (err) {
        console.error('Erreur lors du chargement des devis:', err)
        throw err
      }
    },
    [supabase, projectId]
  )

  // Charger un devis par ID avec ses lignes
  const fetchQuoteById = useCallback(
    async (
      id: string
    ): Promise<{ quote: ProjectQuote; lines: QuoteLine[] } | null> => {
      try {
        // Charger le devis
        const { data: quote, error: quoteError } = await supabase
          .from('project_quotes')
          .select('*')
          .eq('id', id)
          .single()

        if (quoteError) throw quoteError

        // Charger les lignes
        const { data: lines, error: linesError } = await supabase
          .from('quote_lines')
          .select('*')
          .eq('quote_id', id)
          .order('line_number')

        if (linesError) throw linesError

        return {
          quote,
          lines: lines || [],
        }
      } catch (err) {
        console.error('Erreur lors du chargement du devis:', err)
        throw err
      }
    },
    [supabase]
  )

  // Créer un brouillon de devis
  const createDraft = useCallback(
    async (data: {
      project_id: string
      customer_company_id: string
      customer_name: string
      customer_address?: string
      customer_postal_code?: string
      customer_city?: string
      customer_siret?: string
      valid_until?: string
    }): Promise<ProjectQuote> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Utilisateur non authentifié')
        }

        const currentDate = new Date().toISOString().split('T')[0]
        const validUntilDate = data.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const { data: quote, error } = await supabase
          .from('project_quotes')
          .insert([
            {
              ...data,
              quote_number: 'DRAFT-' + Date.now(),
              quote_date: currentDate,
              status: 'draft' as QuoteStatus,
              valid_until: validUntilDate,
              payment_terms: 'net_30' as PaymentTerms,
              customer_country: 'FR',
              subtotal_excluding_tax: 0,
              total_vat_amount: 0,
              total_including_tax: 0,
              created_by: user.id,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Mettre à jour l'état local
        setQuotes((prev) => [quote, ...prev])

        return quote
      } catch (err) {
        console.error('Erreur lors de la création du brouillon:', err)
        throw err
      }
    },
    [supabase]
  )

  // Mettre à jour un devis brouillon
  const updateDraft = useCallback(
    async (id: string, data: Partial<ProjectQuote>): Promise<ProjectQuote> => {
      try {
        const { data: existing, error: fetchError } = await supabase
          .from('project_quotes')
          .select('status')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError

        if (existing.status !== 'draft') {
          throw new Error('Seuls les brouillons peuvent être modifiés.')
        }

        const { data: quote, error } = await supabase
          .from('project_quotes')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Mettre à jour l'état local
        setQuotes((prev) => prev.map((q) => (q.id === id ? quote : q)))

        return quote
      } catch (err) {
        console.error('Erreur lors de la mise à jour du brouillon:', err)
        throw err
      }
    },
    [supabase]
  )

  // Ajouter une ligne au devis
  const addLine = useCallback(
    async (
      quoteId: string,
      line: Omit<QuoteLine, 'id' | 'quote_id' | 'created_at' | 'updated_at'>
    ): Promise<QuoteLine> => {
      try {
        const { data, error } = await supabase
          .from('quote_lines')
          .insert([
            {
              ...line,
              quote_id: quoteId,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Recalculer les totaux du devis
        await recalculateTotals(quoteId)

        return data
      } catch (err) {
        console.error("Erreur lors de l'ajout de la ligne:", err)
        throw err
      }
    },
    [supabase]
  )

  // Supprimer une ligne du devis
  const deleteLine = useCallback(
    async (lineId: string, quoteId: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('quote_lines')
          .delete()
          .eq('id', lineId)

        if (error) throw error

        // Recalculer les totaux
        await recalculateTotals(quoteId)
      } catch (err) {
        console.error('Erreur lors de la suppression de la ligne:', err)
        throw err
      }
    },
    [supabase]
  )

  // Recalculer les totaux d'un devis
  const recalculateTotals = useCallback(
    async (quoteId: string): Promise<void> => {
      try {
        const { data: lines, error: linesError } = await supabase
          .from('quote_lines')
          .select('*')
          .eq('quote_id', quoteId)

        if (linesError) throw linesError

        if (!lines || lines.length === 0) {
          await supabase
            .from('project_quotes')
            .update({
              subtotal_excluding_tax: 0,
              total_vat_amount: 0,
              total_including_tax: 0,
            })
            .eq('id', quoteId)

          return
        }

        const subtotal = lines.reduce(
          (sum, line) => sum + Number(line.subtotal_after_discount),
          0
        )
        const vatAmount = lines.reduce(
          (sum, line) => sum + Number(line.vat_amount),
          0
        )
        const total = lines.reduce(
          (sum, line) => sum + Number(line.total_including_tax),
          0
        )

        await supabase
          .from('project_quotes')
          .update({
            subtotal_excluding_tax: subtotal,
            total_vat_amount: vatAmount,
            total_including_tax: total,
          })
          .eq('id', quoteId)

        // Rafraîchir la liste
        await fetchQuotes(projectId)
      } catch (err) {
        console.error('Erreur lors du recalcul des totaux:', err)
        throw err
      }
    },
    [supabase, projectId, fetchQuotes]
  )

  // Soumettre un devis (change status to submitted)
  const submitQuote = useCallback(
    async (id: string): Promise<ProjectQuote> => {
      try {
        const { data: quote, error } = await supabase
          .from('project_quotes')
          .update({
            status: 'submitted',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        setQuotes((prev) => prev.map((q) => (q.id === id ? quote : q)))

        return quote
      } catch (err) {
        console.error('Erreur lors de la soumission du devis:', err)
        throw err
      }
    },
    [supabase]
  )

  // Accepter un devis
  const acceptQuote = useCallback(
    async (id: string): Promise<ProjectQuote> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Utilisateur non authentifié')
        }

        const { data: quote, error } = await supabase
          .from('project_quotes')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString(),
            accepted_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        setQuotes((prev) => prev.map((q) => (q.id === id ? quote : q)))

        return quote
      } catch (err) {
        console.error("Erreur lors de l'acceptation du devis:", err)
        throw err
      }
    },
    [supabase]
  )

  // Supprimer un devis
  const deleteQuote = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Supprimer d'abord les lignes
        await supabase.from('quote_lines').delete().eq('quote_id', id)

        // Puis le devis
        const { error } = await supabase
          .from('project_quotes')
          .delete()
          .eq('id', id)

        if (error) throw error

        setQuotes((prev) => prev.filter((q) => q.id !== id))
      } catch (err) {
        console.error('Erreur lors de la suppression du devis:', err)
        throw err
      }
    },
    [supabase]
  )

  // Charger les devis au montage du composant
  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const loadQuotes = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchQuotes(projectId)
        setQuotes(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des devis'
        )
      } finally {
        setLoading(false)
      }
    }

    loadQuotes()
  }, [projectId, fetchQuotes])

  return {
    quotes,
    loading,
    error,
    setError,
    fetchQuotes,
    fetchQuoteById,
    createDraft,
    updateDraft,
    addLine,
    deleteLine,
    recalculateTotals,
    submitQuote,
    acceptQuote,
    deleteQuote,
  }
}
