"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export interface ServiceOption {
  id: string
  name: string
  company_id: string
  company_name: string
}

export function useServicesList() {
  const [services, setServices] = useState<ServiceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const fetchServices = async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          company_id,
          companies!inner(name)
        `)
        .order('name', { ascending: true })

      if (error) throw error

      const mappedServices = (data || []).map((service: any) => {
        // Gérer la relation companies (peut être objet ou tableau)
        const company = Array.isArray(service.companies) ? service.companies[0] : service.companies
        
        return {
          id: service.id,
          name: service.name,
          company_id: service.company_id,
          company_name: company?.name || '',
        }
      })

      setServices(mappedServices)
    } catch (err) {
      console.error('Erreur lors du chargement des services:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchServices()
  }, [])

  return {
    services,
    loading,
    error,
    refetch: fetchServices,
  }
} 