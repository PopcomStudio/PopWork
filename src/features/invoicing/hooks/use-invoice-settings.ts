"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type { OrganizationInvoiceSettings } from '@/shared/types/database'

/**
 * Hook pour charger les paramètres de facturation de l'organisation
 */
export function useInvoiceSettings() {
  const [settings, setSettings] = useState<OrganizationInvoiceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Charger la première (et normalement seule) entrée de settings
      const { data, error: fetchError } = await supabase
        .from('organization_invoice_settings')
        .select('*')
        .limit(1)
        .single()

      if (fetchError) {
        // Si pas de settings, on peut créer des valeurs par défaut
        if (fetchError.code === 'PGRST116') {
          setError('Aucun paramètre de facturation configuré. Contactez votre administrateur.')
        } else {
          throw fetchError
        }
      } else {
        setSettings(data)
      }
    } catch (err) {
      console.error('Erreur lors du chargement des paramètres:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des paramètres de facturation'
      )
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
  }
}
