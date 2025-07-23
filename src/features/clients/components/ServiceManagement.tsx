"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ServicesDataTable } from './ServicesDataTable'
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
import { useServices, type Service, type CreateServiceData } from '../hooks/use-services'
import { useCompaniesList } from '../hooks/use-companies-list'
import { IconPhone } from '@tabler/icons-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const serviceFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  address: z.string().optional(),
  phone: z.string().optional(),
  company_id: z.string().min(1, 'Veuillez sélectionner une entreprise'),
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

export function ServiceManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    services,
    loading,
    error,
    createService,
    updateService,
    deleteService,
    setError,
  } = useServices()

  const { companies, loading: companiesLoading } = useCompaniesList()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
  })

  // Gérer la suppression d'un service
  const handleDeleteService = async (service: Service) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le service "${service.name}" ?`)) {
      try {
        setError(null)
        await deleteService(service.id)
      } catch (err) {
        console.error('Erreur lors de la suppression:', err)
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    }
  }

  // Ouvrir le formulaire d'édition
  const handleEditService = (service: Service) => {
    setEditingService(service)
    setValue('name', service.name)
    setValue('address', service.address || '')
    setValue('phone', service.phone || '')
    setValue('company_id', service.company_id)
    setIsDialogOpen(true)
  }

  // Ouvrir le formulaire de création
  const handleNewService = () => {
    setEditingService(null)
    reset()
    setIsDialogOpen(true)
  }

  // Fermer le dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingService(null)
    reset()
  }

  // Soumettre le formulaire
  const handleFormSubmit = async (data: ServiceFormData) => {
    try {
      setActionLoading(true)
      setError(null)

      // Nettoyer les données
      const cleanedData: CreateServiceData = {
        name: data.name.trim(),
        address: data.address?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        company_id: data.company_id,
      }

      if (editingService) {
        // Modification
        await updateService({
          id: editingService.id,
          ...cleanedData,
        })
      } else {
        // Création
        await createService(cleanedData)
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
              <IconPhone className="h-5 w-5" />
              {editingService ? 'Modifier le service' : 'Nouveau service'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du service *</Label>
                <Input
                  id="name"
                  placeholder="Nom du service"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_id">Entreprise *</Label>
                <Select 
                  onValueChange={(value) => setValue('company_id', value)}
                  defaultValue={editingService?.company_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesLoading ? (
                      <SelectItem value="" disabled>
                        Chargement...
                      </SelectItem>
                    ) : (
                      companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.company_id && (
                  <p className="text-sm text-destructive">{errors.company_id.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="Adresse du service"
                {...register('address')}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
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
                    {editingService ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  editingService ? 'Modifier' : 'Créer'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DataTable spécifique aux services avec barre de recherche intégrée */}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <ServicesDataTable
          data={services}
          onNewService={handleNewService}
          onEditService={handleEditService}
          onDeleteService={handleDeleteService}
        />
      )}
    </div>
  )
} 