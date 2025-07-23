"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ContactsDataTable } from './ContactsDataTable'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Icons } from '@/components/ui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useContacts, type Contact, type CreateContactData } from '../hooks/use-contacts'
import { useServicesList } from '../hooks/use-services-list'
import { IconUserCheck } from '@tabler/icons-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const contactFormSchema = z.object({
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  service_id: z.string().min(1, 'Veuillez sélectionner un service'),
})

type ContactFormData = z.infer<typeof contactFormSchema>

export function ContactManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    contacts,
    loading,
    error,
    createContact,
    updateContact,
    deleteContact,
    setError,
  } = useContacts()

  const { services, loading: servicesLoading } = useServicesList()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
  })

  // Gérer la suppression d'un contact
  const handleDeleteContact = async (contact: Contact) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le contact "${contact.first_name} ${contact.last_name}" ?`)) {
      try {
        setError(null)
        await deleteContact(contact.id)
      } catch (err) {
        console.error('Erreur lors de la suppression:', err)
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    }
  }

  // Ouvrir le formulaire d'édition
  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setValue('first_name', contact.first_name)
    setValue('last_name', contact.last_name)
    setValue('email', contact.email || '')
    setValue('phone', contact.phone || '')
    setValue('service_id', contact.service_id)
    setIsDialogOpen(true)
  }

  // Ouvrir le formulaire de création
  const handleNewContact = () => {
    setEditingContact(null)
    reset()
    setIsDialogOpen(true)
  }

  // Fermer le dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingContact(null)
    reset()
  }

  // Soumettre le formulaire
  const handleFormSubmit = async (data: ContactFormData) => {
    try {
      setActionLoading(true)
      setError(null)

      // Nettoyer les données
      const cleanedData: CreateContactData = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        email: data.email?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        service_id: data.service_id,
      }

      if (editingContact) {
        // Modification
        await updateContact({
          id: editingContact.id,
          ...cleanedData,
        })
      } else {
        // Création
        await createContact(cleanedData)
      }

      handleCloseDialog()
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-6 w-full">
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconUserCheck className="h-5 w-5" />
              {editingContact ? 'Modifier le contact' : 'Nouveau contact'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  placeholder="Prénom"
                  {...register('first_name')}
                />
                {errors.first_name && (
                  <p className="text-sm text-destructive">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  placeholder="Nom de famille"
                  {...register('last_name')}
                />
                {errors.last_name && (
                  <p className="text-sm text-destructive">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_id">Service *</Label>
              <Select 
                onValueChange={(value) => setValue('service_id', value)}
                defaultValue={editingContact?.service_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un service" />
                </SelectTrigger>
                <SelectContent>
                  {servicesLoading ? (
                    <SelectItem value="" disabled>
                      Chargement...
                    </SelectItem>
                  ) : (
                    services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.company_name})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.service_id && (
                <p className="text-sm text-destructive">{errors.service_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@entreprise.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01 23 45 67 89"
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={actionLoading}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {editingContact ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  editingContact ? 'Modifier' : 'Créer'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DataTable spécifique aux contacts avec barre de recherche intégrée */}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <ContactsDataTable
          data={contacts}
          onNewContact={handleNewContact}
          onEditContact={handleEditContact}
          onDeleteContact={handleDeleteContact}
        />
      )}
    </div>
  )
} 