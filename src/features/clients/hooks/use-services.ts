"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export interface Service {
  id: string
  name: string
  address: string | null
  phone: string | null
  company_id: string
  company_name: string
  created_at: string
  updated_at: string
}

export interface CreateServiceData {
  name: string
  address?: string
  phone?: string
  company_id: string
}

export interface UpdateServiceData extends CreateServiceData {
  id: string
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Récupérer tous les services avec les entreprises
  const fetchServices = async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('services')
        .select(`
          id,
          name,
          address,
          phone,
          company_id,
          created_at,
          updated_at,
          companies!inner(name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedServices = data.map((service: any) => {
        // Gérer la relation companies (peut être objet ou tableau)
        const company = Array.isArray(service.companies) ? service.companies[0] : service.companies
        
        return {
          id: service.id,
          name: service.name,
          address: service.address,
          phone: service.phone,
          company_id: service.company_id,
          company_name: company?.name || '',
          created_at: service.created_at,
          updated_at: service.updated_at,
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

  // Créer un nouveau service
  const createService = async (serviceData: CreateServiceData) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('services')
        .insert([{
          name: serviceData.name,
          address: serviceData.address || null,
          phone: serviceData.phone || null,
          company_id: serviceData.company_id,
        }])
        .select(`
          id,
          name,
          address,
          phone,
          company_id,
          created_at,
          updated_at,
          companies!inner(name)
        `)
        .single()

      if (error) throw error

      // Gérer la relation companies (peut être objet ou tableau)
      const company = Array.isArray(data.companies) ? data.companies[0] : data.companies

      const newService: Service = {
        id: data.id,
        name: data.name,
        address: data.address,
        phone: data.phone,
        company_id: data.company_id,
        company_name: company?.name || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      setServices(prev => [newService, ...prev])
      return newService
    } catch (err) {
      console.error('Erreur lors de la création du service:', err)
      throw err
    }
  }

  // Mettre à jour un service
  const updateService = async (serviceData: UpdateServiceData) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('services')
        .update({
          name: serviceData.name,
          address: serviceData.address || null,
          phone: serviceData.phone || null,
          company_id: serviceData.company_id,
        })
        .eq('id', serviceData.id)
        .select(`
          id,
          name,
          address,
          phone,
          company_id,
          created_at,
          updated_at,
          companies!inner(name)
        `)
        .single()

      if (error) throw error

      // Gérer la relation companies (peut être objet ou tableau)
      const company = Array.isArray(data.companies) ? data.companies[0] : data.companies

      const updatedService: Service = {
        id: data.id,
        name: data.name,
        address: data.address,
        phone: data.phone,
        company_id: data.company_id,
        company_name: company?.name || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      setServices(prev => 
        prev.map(service => 
          service.id === serviceData.id ? updatedService : service
        )
      )
      return updatedService
    } catch (err) {
      console.error('Erreur lors de la mise à jour du service:', err)
      throw err
    }
  }

  // Supprimer un service
  const deleteService = async (serviceId: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error

      setServices(prev => prev.filter(service => service.id !== serviceId))
    } catch (err) {
      console.error('Erreur lors de la suppression du service:', err)
      throw err
    }
  }

  // Charger les services au montage du composant
  useEffect(() => {
    fetchServices()
  }, [])

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService,
    refetch: fetchServices,
    setError,
  }
} 