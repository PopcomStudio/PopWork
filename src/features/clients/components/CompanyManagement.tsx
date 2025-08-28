"use client"

import { useState } from 'react'
import { useTranslation } from '@/features/translation/hooks/use-translation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CompaniesDataTable } from './CompaniesDataTable'
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

import { useCompanies, type Company, type CreateCompanyData } from '../hooks/use-companies'
import { Building } from 'lucide-react'

const createCompanyFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(2, t('companies.validation.nameMinLength')),
  address: z.string().optional(),
  siret: z.string().optional(),
  email: z.string().email(t('companies.validation.emailInvalid')).optional().or(z.literal('')),
  phone: z.string().optional(),
})

type CompanyFormData = z.infer<ReturnType<typeof createCompanyFormSchema>>

export function CompanyManagement() {
  const { t } = useTranslation()
  const companyFormSchema = createCompanyFormSchema(t)
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    companies,
    loading,
    error,
    createCompany,
    updateCompany,
    deleteCompany,
    setError,
  } = useCompanies()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
  })

  // Gérer la suppression d'une entreprise
  const handleDeleteCompany = async (company: Company) => {
    if (window.confirm(t('companies.deleteConfirm', { name: company.name }))) {
      try {
        setError(null)
        await deleteCompany(company.id)
      } catch (err) {
        console.error('Erreur lors de la suppression:', err)
        setError(err instanceof Error ? err.message : t('messages.error.general'))
      }
    }
  }

  // Ouvrir le formulaire d'édition
  const handleEditCompany = (company: Company) => {
    setEditingCompany(company)
    setValue('name', company.name)
    setValue('address', company.address || '')
    setValue('siret', company.siret || '')
    setValue('email', company.email || '')
    setValue('phone', company.phone || '')
    setIsDialogOpen(true)
  }

  // Fermer le dialogue
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCompany(null)
    reset()
    setError(null)
  }

  // Ouvrir le dialogue pour une nouvelle entreprise
  const handleNewCompany = () => {
    setEditingCompany(null)
    reset()
    setIsDialogOpen(true)
  }

  // Soumettre le formulaire (création ou modification)
  const onSubmit = async (data: CompanyFormData) => {
    try {
      setActionLoading(true)
      setError(null)

      // Nettoyer les données (enlever les chaînes vides)
      const cleanData: CreateCompanyData = {
        name: data.name,
        ...(data.address && data.address.trim() && { address: data.address.trim() }),
        ...(data.siret && data.siret.trim() && { siret: data.siret.trim() }),
        ...(data.email && data.email.trim() && { email: data.email.trim() }),
        ...(data.phone && data.phone.trim() && { phone: data.phone.trim() }),
      }

      if (editingCompany) {
        await updateCompany({
          id: editingCompany.id,
          ...cleanData,
        })
      } else {
        await createCompany(cleanData)
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
                  <Building className="h-5 w-5" />
                  {editingCompany ? t('companies.editCompany') : t('companies.newCompany')}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nom de l'entreprise */}
                  <div className="md:col-span-2">
                    <Label htmlFor="name">{t('companies.fields.name')} {t('companies.fields.required')}</Label>
                    <Input
                      id="name"
                      placeholder={t('companies.fields.companyNamePlaceholder')}
                      {...register('name')}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Adresse */}
                  <div className="md:col-span-2">
                    <Label htmlFor="address">{t('companies.fields.addressComplete')}</Label>
                    <Input
                      id="address"
                      placeholder={t('companies.fields.addressPlaceholder')}
                      {...register('address')}
                    />
                  </div>

                  {/* SIRET */}
                  <div>
                    <Label htmlFor="siret">{t('companies.fields.siret')}</Label>
                    <Input
                      id="siret"
                      placeholder={t('companies.fields.siretPlaceholder')}
                      {...register('siret')}
                    />
                  </div>

                  {/* Téléphone */}
                  <div>
                    <Label htmlFor="phone">{t('companies.fields.phone')}</Label>
                    <Input
                      id="phone"
                      placeholder={t('companies.fields.phonePlaceholder')}
                      {...register('phone')}
                    />
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <Label htmlFor="email">{t('companies.fields.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('companies.fields.emailPlaceholder')}
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={actionLoading}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    {editingCompany ? t('companies.actions.modify') : t('companies.actions.create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

        {/* DataTable spécifique aux entreprises avec barre de recherche intégrée */}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <CompaniesDataTable
            data={companies}
            onNewCompany={handleNewCompany}
            onEditCompany={handleEditCompany}
            onDeleteCompany={handleDeleteCompany}
          />
        )}
      </div>
  )
} 