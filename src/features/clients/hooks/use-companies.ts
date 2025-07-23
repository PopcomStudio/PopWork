"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export interface Company {
  id: string
  name: string
  address: string | null
  siret: string | null
  email: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface CreateCompanyData {
  name: string
  address?: string
  siret?: string
  email?: string
  phone?: string
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {
  id: string
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Charger toutes les entreprises
  const fetchCompanies = async (): Promise<Company[]> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Erreur lors du chargement des entreprises:', err)
      throw err
    }
  }

  // Charger une entreprise par ID
  const fetchCompanyById = async (id: string): Promise<Company | null> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return data
    } catch (err) {
      console.error('Erreur lors du chargement de l\'entreprise:', err)
      throw err
    }
  }

  // Créer une nouvelle entreprise
  const createCompany = async (companyData: CreateCompanyData): Promise<Company> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([companyData])
        .select()
        .single()

      if (error) throw error

      const newCompany = data as Company
      setCompanies(prev => [newCompany, ...prev])
      
      return newCompany
    } catch (err) {
      console.error('Erreur lors de la création de l\'entreprise:', err)
      throw err
    }
  }

  // Mettre à jour une entreprise
  const updateCompany = async (companyData: UpdateCompanyData): Promise<Company> => {
    try {
      const { id, ...updateData } = companyData
      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const updatedCompany = data as Company
      setCompanies(prev => 
        prev.map(company => 
          company.id === id ? updatedCompany : company
        )
      )
      
      return updatedCompany
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'entreprise:', err)
      throw err
    }
  }

  // Supprimer une entreprise
  const deleteCompany = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)

      if (error) throw error

      setCompanies(prev => prev.filter(company => company.id !== id))
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'entreprise:', err)
      throw err
    }
  }

  // Rechercher des entreprises
  const searchCompanies = async (query: string): Promise<Company[]> => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (err) {
      console.error('Erreur lors de la recherche d\'entreprises:', err)
      throw err
    }
  }

  // Charger les entreprises au montage du composant
  const loadCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchCompanies()
      setCompanies(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Actualiser les données
  const refetch = async () => {
    await loadCompanies()
  }

  // Charger les données au montage
  useEffect(() => {
    loadCompanies()
  }, [])

  return {
    // État
    companies,
    loading,
    error,

    // Actions CRUD
    createCompany,
    updateCompany,
    deleteCompany,
    fetchCompanyById,
    searchCompanies,

    // Utilitaires
    refetch,
    setError,
  }
} 