"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type {
  ProjectDeliverable,
  DeliverableItem,
  DeliverableStatus,
} from '@/shared/types/database'

/**
 * Hook pour la gestion des livrables de projet
 */
export function useProjectDeliverables(projectId?: string) {
  const [deliverables, setDeliverables] = useState<ProjectDeliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Charger tous les livrables d'un projet avec leurs items
  const fetchDeliverables = useCallback(
    async (pId?: string): Promise<ProjectDeliverable[]> => {
      try {
        const targetProjectId = pId || projectId
        if (!targetProjectId) {
          throw new Error('Project ID is required')
        }

        // Charger les livrables
        const { data: deliverablesData, error: deliverablesError } =
          await supabase
            .from('project_deliverables')
            .select('*')
            .eq('project_id', targetProjectId)
            .order('display_order', { ascending: true })

        if (deliverablesError) throw deliverablesError

        if (!deliverablesData || deliverablesData.length === 0) {
          return []
        }

        // Charger tous les items de ces livrables
        const deliverableIds = deliverablesData.map((d) => d.id)
        const { data: itemsData, error: itemsError } = await supabase
          .from('deliverable_items')
          .select('*')
          .in('deliverable_id', deliverableIds)
          .order('display_order', { ascending: true })

        if (itemsError) throw itemsError

        // Grouper les items par deliverable_id
        const itemsByDeliverable: Record<string, DeliverableItem[]> = {}
        itemsData?.forEach((item) => {
          if (!itemsByDeliverable[item.deliverable_id]) {
            itemsByDeliverable[item.deliverable_id] = []
          }
          itemsByDeliverable[item.deliverable_id].push(item)
        })

        // Attacher les items aux livrables
        const result = deliverablesData.map((deliverable) => ({
          ...deliverable,
          items: itemsByDeliverable[deliverable.id] || [],
        }))

        return result
      } catch (err) {
        console.error('Erreur lors du chargement des livrables:', err)
        throw err
      }
    },
    [supabase, projectId]
  )

  // Créer un nouveau livrable
  const createDeliverable = useCallback(
    async (data: {
      project_id: string
      name: string
      description?: string
      due_date?: string
    }): Promise<ProjectDeliverable> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Utilisateur non authentifié')
        }

        // Obtenir le prochain display_order
        const { data: existingDeliverables, error: countError } =
          await supabase
            .from('project_deliverables')
            .select('display_order')
            .eq('project_id', data.project_id)
            .order('display_order', { ascending: false })
            .limit(1)

        if (countError) throw countError

        const nextOrder =
          existingDeliverables && existingDeliverables.length > 0
            ? (existingDeliverables[0].display_order || 0) + 1
            : 0

        const { data: deliverable, error } = await supabase
          .from('project_deliverables')
          .insert([
            {
              ...data,
              status: 'pending' as DeliverableStatus,
              validated: false,
              display_order: nextOrder,
              created_by: user.id,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Mettre à jour l'état local avec items vides
        const deliverableWithItems = { ...deliverable, items: [] }
        setDeliverables((prev) => [...prev, deliverableWithItems])

        return deliverableWithItems
      } catch (err) {
        console.error('Erreur lors de la création du livrable:', err)
        throw err
      }
    },
    [supabase]
  )

  // Mettre à jour un livrable
  const updateDeliverable = useCallback(
    async (
      id: string,
      data: Partial<ProjectDeliverable>
    ): Promise<ProjectDeliverable> => {
      try {
        const { data: deliverable, error } = await supabase
          .from('project_deliverables')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Mettre à jour l'état local
        setDeliverables((prev) =>
          prev.map((d) =>
            d.id === id ? { ...deliverable, items: d.items || [] } : d
          )
        )

        return deliverable
      } catch (err) {
        console.error('Erreur lors de la mise à jour du livrable:', err)
        throw err
      }
    },
    [supabase]
  )

  // Valider un livrable
  const validateDeliverable = useCallback(
    async (id: string): Promise<ProjectDeliverable> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Utilisateur non authentifié')
        }

        const { data: deliverable, error } = await supabase
          .from('project_deliverables')
          .update({
            status: 'validated',
            validated: true,
            validated_at: new Date().toISOString(),
            validated_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        setDeliverables((prev) =>
          prev.map((d) =>
            d.id === id ? { ...deliverable, items: d.items || [] } : d
          )
        )

        return deliverable
      } catch (err) {
        console.error('Erreur lors de la validation du livrable:', err)
        throw err
      }
    },
    [supabase]
  )

  // Supprimer un livrable
  const deleteDeliverable = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Supprimer d'abord les items
        await supabase.from('deliverable_items').delete().eq('deliverable_id', id)

        // Puis le livrable
        const { error } = await supabase
          .from('project_deliverables')
          .delete()
          .eq('id', id)

        if (error) throw error

        setDeliverables((prev) => prev.filter((d) => d.id !== id))
      } catch (err) {
        console.error('Erreur lors de la suppression du livrable:', err)
        throw err
      }
    },
    [supabase]
  )

  // Ajouter un item à un livrable
  const addItem = useCallback(
    async (data: {
      deliverable_id: string
      name: string
      description?: string
    }): Promise<DeliverableItem> => {
      try {
        // Obtenir le prochain display_order
        const { data: existingItems, error: countError } = await supabase
          .from('deliverable_items')
          .select('display_order')
          .eq('deliverable_id', data.deliverable_id)
          .order('display_order', { ascending: false })
          .limit(1)

        if (countError) throw countError

        const nextOrder =
          existingItems && existingItems.length > 0
            ? (existingItems[0].display_order || 0) + 1
            : 0

        const { data: item, error } = await supabase
          .from('deliverable_items')
          .insert([
            {
              ...data,
              status: 'pending',
              completed: false,
              display_order: nextOrder,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Mettre à jour l'état local
        setDeliverables((prev) =>
          prev.map((d) =>
            d.id === data.deliverable_id
              ? { ...d, items: [...(d.items || []), item] }
              : d
          )
        )

        return item
      } catch (err) {
        console.error("Erreur lors de l'ajout de l'item:", err)
        throw err
      }
    },
    [supabase]
  )

  // Mettre à jour un item
  const updateItem = useCallback(
    async (
      id: string,
      deliverableId: string,
      data: Partial<DeliverableItem>
    ): Promise<DeliverableItem> => {
      try {
        const { data: item, error } = await supabase
          .from('deliverable_items')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        // Mettre à jour l'état local
        setDeliverables((prev) =>
          prev.map((d) =>
            d.id === deliverableId
              ? {
                  ...d,
                  items: (d.items || []).map((i) => (i.id === id ? item : i)),
                }
              : d
          )
        )

        return item
      } catch (err) {
        console.error("Erreur lors de la mise à jour de l'item:", err)
        throw err
      }
    },
    [supabase]
  )

  // Cocher/décocher un item
  const toggleItemCompletion = useCallback(
    async (
      id: string,
      deliverableId: string,
      completed: boolean
    ): Promise<DeliverableItem> => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          throw new Error('Utilisateur non authentifié')
        }

        const updateData: Partial<DeliverableItem> = {
          completed,
          status: completed ? 'completed' : 'pending',
        }

        if (completed) {
          updateData.completed_at = new Date().toISOString()
          updateData.completed_by = user.id
        } else {
          updateData.completed_at = undefined
          updateData.completed_by = undefined
        }

        return await updateItem(id, deliverableId, updateData)
      } catch (err) {
        console.error("Erreur lors du changement d'état de l'item:", err)
        throw err
      }
    },
    [supabase, updateItem]
  )

  // Supprimer un item
  const deleteItem = useCallback(
    async (id: string, deliverableId: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('deliverable_items')
          .delete()
          .eq('id', id)

        if (error) throw error

        // Mettre à jour l'état local
        setDeliverables((prev) =>
          prev.map((d) =>
            d.id === deliverableId
              ? { ...d, items: (d.items || []).filter((i) => i.id !== id) }
              : d
          )
        )
      } catch (err) {
        console.error("Erreur lors de la suppression de l'item:", err)
        throw err
      }
    },
    [supabase]
  )

  // Charger les livrables au montage du composant
  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const loadDeliverables = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchDeliverables(projectId)
        setDeliverables(data)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des livrables'
        )
      } finally {
        setLoading(false)
      }
    }

    loadDeliverables()
  }, [projectId, fetchDeliverables])

  return {
    deliverables,
    loading,
    error,
    setError,
    fetchDeliverables,
    createDeliverable,
    updateDeliverable,
    validateDeliverable,
    deleteDeliverable,
    addItem,
    updateItem,
    toggleItemCompletion,
    deleteItem,
  }
}
