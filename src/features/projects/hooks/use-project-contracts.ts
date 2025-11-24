"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type {
  ProjectContract,
  ContractStatus,
  ContractType,
} from '@/shared/types/database'

/**
 * Hook pour la gestion des contrats de projet
 */
export function useProjectContracts(projectId?: string) {
  const [contracts, setContracts] = useState<ProjectContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Charger tous les contrats d'un projet
  const fetchContracts = useCallback(
    async (pId?: string): Promise<ProjectContract[]> => {
      try {
        const targetProjectId = pId || projectId
        if (!targetProjectId) {
          throw new Error('Project ID is required')
        }

        const { data, error } = await supabase
          .from('project_contracts')
          .select('*')
          .eq('project_id', targetProjectId)
          .order('created_at', { ascending: false })

        if (error) throw error

        return data || []
      } catch (err) {
        console.error('Erreur lors du chargement des contrats:', err)
        throw err
      }
    },
    [supabase, projectId]
  )

  // Créer un nouveau contrat
  const createContract = useCallback(
    async (data: {
      project_id: string
      name: string
      contract_type?: ContractType
      start_date?: string
      end_date?: string
      amount_total?: number
      payment_terms?: string
      notes?: string
    }): Promise<ProjectContract> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Utilisateur non authentifié')
        }

        const { data: contract, error } = await supabase
          .from('project_contracts')
          .insert([
            {
              ...data,
              status: 'draft' as ContractStatus,
              created_by: user.id,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Mettre à jour l'état local
        setContracts((prev) => [contract, ...prev])

        return contract
      } catch (err) {
        console.error('Erreur lors de la création du contrat:', err)
        throw err
      }
    },
    [supabase]
  )

  // Mettre à jour un contrat
  const updateContract = useCallback(
    async (
      id: string,
      data: Partial<ProjectContract>
    ): Promise<ProjectContract> => {
      try {
        const { data: contract, error } = await supabase
          .from('project_contracts')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Mettre à jour l'état local
        setContracts((prev) =>
          prev.map((c) => (c.id === id ? contract : c))
        )

        return contract
      } catch (err) {
        console.error('Erreur lors de la mise à jour du contrat:', err)
        throw err
      }
    },
    [supabase]
  )

  // Supprimer un contrat
  const deleteContract = useCallback(
    async (id: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('project_contracts')
          .delete()
          .eq('id', id)

        if (error) throw error

        // Mettre à jour l'état local
        setContracts((prev) => prev.filter((c) => c.id !== id))
      } catch (err) {
        console.error('Erreur lors de la suppression du contrat:', err)
        throw err
      }
    },
    [supabase]
  )

  // Charger les contrats au montage du composant
  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const loadContracts = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchContracts(projectId)
        setContracts(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des contrats'
        )
      } finally {
        setLoading(false)
      }
    }

    loadContracts()
  }, [projectId, fetchContracts])

  return {
    contracts,
    loading,
    error,
    setError,
    fetchContracts,
    createContract,
    updateContract,
    deleteContract,
  }
}
