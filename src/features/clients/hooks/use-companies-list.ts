"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export interface CompanyOption {
  id: string
  name: string
}

export function useCompaniesList() {
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const fetchCompanies = async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error

      setCompanies(data || [])
    } catch (err) {
      console.error('Erreur lors du chargement des entreprises:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  return {
    companies,
    loading,
    error,
    refetch: fetchCompanies,
  }
} 