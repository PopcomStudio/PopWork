"use client"

import { useState } from 'react'
import { useTranslation } from '@/features/translation/hooks/use-translation'
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
import { Phone } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const createServiceFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t('services.validation.nameMinLength')),
  address: z.string().optional(),
  phone: z.string().optional(),
  company_id: z.string().min(1, t('services.validation.companyRequired')),
})

type ServiceFormData = z.infer<ReturnType<typeof createServiceFormSchema>>

export function ServiceManagement() {
  const { t } = useTranslation()
  const serviceFormSchema = createServiceFormSchema(t)
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
    if (window.confirm(t('services.deleteConfirm', { name: service.name }))) {
      try {
        setError(null)
        await deleteService(service.id)
      } catch (err) {
        console.error('Erreur lors de la suppression:', err)
        setError(err instanceof Error ? err.message : t('messages.error.general'))
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
      setError(err instanceof Error ? err.message : t('messages.error.general'))
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
              <Phone className="h-5 w-5" />
              {editingService ? t('services.editService') : t('services.newService')}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('services.fields.name')} {t('services.fields.required')}</Label>
                <Input
                  id="name"
                  placeholder={t('services.fields.namePlaceholder')}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_id">{t('services.fields.company')} {t('services.fields.required')}</Label>
                <Select 
                  onValueChange={(value) => setValue('company_id', value)}
                  defaultValue={editingService?.company_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('services.fields.companySelect')} />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesLoading ? (
                      <SelectItem value="" disabled>
                        {t('common.loading')}
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
              <Label htmlFor="address">{t('services.fields.address')}</Label>
              <Input
                id="address"
                placeholder={t('services.fields.addressPlaceholder')}
                {...register('address')}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t('services.fields.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('services.fields.phonePlaceholder')}
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
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {editingService ? t('services.actions.modifying') : t('services.actions.creating')}
                  </>
                ) : (
                  editingService ? t('services.actions.modify') : t('services.actions.create')
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