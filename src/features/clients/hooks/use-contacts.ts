"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export interface Contact {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  service_id: string
  service_name: string
  company_name: string
  created_at: string
  updated_at: string
}

export interface CreateContactData {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  service_id: string
}

export interface UpdateContactData extends CreateContactData {
  id: string
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  // Récupérer tous les contacts avec les services et entreprises
  const fetchContacts = async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          service_id,
          created_at,
          updated_at,
          services!inner(
            name,
            companies!inner(name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mappedContacts = data.map((contact: any) => {
        // Gérer les relations services et companies (peuvent être objet ou tableau)
        const service = Array.isArray(contact.services) ? contact.services[0] : contact.services
        const company = service?.companies ? (Array.isArray(service.companies) ? service.companies[0] : service.companies) : null
        
        return {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone,
          service_id: contact.service_id,
          service_name: service?.name || '',
          company_name: company?.name || '',
          created_at: contact.created_at,
          updated_at: contact.updated_at,
        }
      })

      setContacts(mappedContacts)
    } catch (err) {
      console.error('Erreur lors du chargement des contacts:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Créer un nouveau contact
  const createContact = async (contactData: CreateContactData) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('contacts')
        .insert([{
          first_name: contactData.first_name,
          last_name: contactData.last_name,
          email: contactData.email || null,
          phone: contactData.phone || null,
          service_id: contactData.service_id,
        }])
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          service_id,
          created_at,
          updated_at,
          services!inner(
            name,
            companies!inner(name)
          )
        `)
        .single()

      if (error) throw error

      // Gérer les relations services et companies (peuvent être objet ou tableau)
      const service = Array.isArray(data.services) ? data.services[0] : data.services
      const company = service?.companies ? (Array.isArray(service.companies) ? service.companies[0] : service.companies) : null

      const newContact: Contact = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        service_id: data.service_id,
        service_name: service?.name || '',
        company_name: company?.name || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      setContacts(prev => [newContact, ...prev])
      return newContact
    } catch (err) {
      console.error('Erreur lors de la création du contact:', err)
      throw err
    }
  }

  // Mettre à jour un contact
  const updateContact = async (contactData: UpdateContactData) => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('contacts')
        .update({
          first_name: contactData.first_name,
          last_name: contactData.last_name,
          email: contactData.email || null,
          phone: contactData.phone || null,
          service_id: contactData.service_id,
        })
        .eq('id', contactData.id)
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          service_id,
          created_at,
          updated_at,
          services!inner(
            name,
            companies!inner(name)
          )
        `)
        .single()

      if (error) throw error

      // Gérer les relations services et companies (peuvent être objet ou tableau)
      const service = Array.isArray(data.services) ? data.services[0] : data.services
      const company = service?.companies ? (Array.isArray(service.companies) ? service.companies[0] : service.companies) : null

      const updatedContact: Contact = {
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        service_id: data.service_id,
        service_name: service?.name || '',
        company_name: company?.name || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      }

      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactData.id ? updatedContact : contact
        )
      )
      return updatedContact
    } catch (err) {
      console.error('Erreur lors de la mise à jour du contact:', err)
      throw err
    }
  }

  // Supprimer un contact
  const deleteContact = async (contactId: string) => {
    try {
      setError(null)
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)

      if (error) throw error

      setContacts(prev => prev.filter(contact => contact.id !== contactId))
    } catch (err) {
      console.error('Erreur lors de la suppression du contact:', err)
      throw err
    }
  }

  // Charger les contacts au montage du composant
  useEffect(() => {
    fetchContacts()
  }, [])

  return {
    contacts,
    loading,
    error,
    createContact,
    updateContact,
    deleteContact,
    refetch: fetchContacts,
    setError,
  }
} 