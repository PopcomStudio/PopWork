"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectsCardsView } from './projects-cards-view'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Icons } from '@/components/ui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useProjects, type Project, type CreateProjectData } from '../hooks/use-projects'
import { useServicesList } from '../../clients/hooks/use-services-list'
import { Folder } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const projectFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  service_id: z.string().min(1, 'Veuillez sélectionner un service'),
})

type ProjectFormData = z.infer<typeof projectFormSchema>

const statusOptions = [
  { value: 'draft', label: 'Brouillon', description: 'Projet en préparation' },
  { value: 'active', label: 'Actif', description: 'Projet en cours' },
  { value: 'completed', label: 'Terminé', description: 'Projet achevé' },
  { value: 'archived', label: 'Archivé', description: 'Projet archivé' },
]

export function ProjectManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    setError,
  } = useProjects()

  const { services, loading: servicesLoading } = useServicesList()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
  })

  const watchedServiceId = watch('service_id')

  // Trouver l'entreprise du service sélectionné
  const selectedService = services.find(s => s.id === watchedServiceId)





  // Ouvrir le formulaire de création
  const handleNewProject = () => {
    setEditingProject(null)
    reset()
    setIsDialogOpen(true)
  }

  // Fermer le dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingProject(null)
    reset()
  }

  // Soumettre le formulaire
  const handleFormSubmit = async (data: ProjectFormData) => {
    try {
      setActionLoading(true)
      setError(null)

      // Trouver l'entreprise associée au service sélectionné
      const selectedService = services.find(s => s.id === data.service_id)
      if (!selectedService) {
        throw new Error('Service non trouvé')
      }
      
      // Nettoyer les données
      const cleanedData: CreateProjectData = {
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        status: data.status,
        service_id: data.service_id,
        company_id: selectedService.company_id,
      }

      if (editingProject) {
        // Modification
        await updateProject({
          id: editingProject.id,
          ...cleanedData,
        })
      } else {
        // Création
        await createProject(cleanedData)
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
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5" />
              {editingProject ? 'Modifier le projet' : 'Nouveau projet'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du projet *</Label>
                <Input
                  id="name"
                  placeholder="Nom du projet"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut *</Label>
                <Select 
                  onValueChange={(value) => setValue('status', value as any)}
                  defaultValue={editingProject?.status}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex flex-col">
                          <span>{status.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {status.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_id">Service *</Label>
              <Select 
                onValueChange={(value) => setValue('service_id', value)}
                defaultValue={editingProject?.service_id}
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
                        <div className="flex flex-col">
                          <span>{service.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {service.company_name}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.service_id && (
                <p className="text-sm text-destructive">{errors.service_id.message}</p>
              )}
              {selectedService && (
                <p className="text-xs text-muted-foreground">
                  Entreprise : {selectedService.company_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description du projet (optionnel)"
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
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
                    {editingProject ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  editingProject ? 'Modifier' : 'Créer'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vue en cards des projets avec barre de recherche intégrée */}
      {loading ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <ProjectsCardsView
          data={projects}
          onNewProject={handleNewProject}
        />
      )}
    </div>
  )
} 