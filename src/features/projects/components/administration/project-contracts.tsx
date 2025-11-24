"use client"

import { useState } from 'react'
import { FileText, Plus, Edit, Trash2, Calendar, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectContracts } from '../../hooks/use-project-contracts'
import type { ProjectContract, ContractType, ContractStatus } from '@/shared/types/database'

interface ProjectContractsProps {
  projectId: string
}

export function ProjectContracts({ projectId }: ProjectContractsProps) {
  const { contracts, loading, error, createContract, updateContract, deleteContract } =
    useProjectContracts(projectId)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<ProjectContract | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    contract_type: '' as ContractType | '',
    status: 'draft' as ContractStatus,
    start_date: '',
    end_date: '',
    amount_total: '',
    payment_terms: '',
    notes: '',
  })

  const handleCreate = () => {
    setSelectedContract(null)
    setFormData({
      name: '',
      contract_type: '',
      status: 'draft',
      start_date: '',
      end_date: '',
      amount_total: '',
      payment_terms: '',
      notes: '',
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (contract: ProjectContract) => {
    setSelectedContract(contract)
    setFormData({
      name: contract.name,
      contract_type: contract.contract_type || '',
      status: contract.status,
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      amount_total: contract.amount_total?.toString() || '',
      payment_terms: contract.payment_terms || '',
      notes: contract.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      setFormLoading(true)

      const data = {
        name: formData.name,
        contract_type: formData.contract_type || undefined,
        status: formData.status,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        amount_total: formData.amount_total ? parseFloat(formData.amount_total) : undefined,
        payment_terms: formData.payment_terms || undefined,
        notes: formData.notes || undefined,
      }

      if (selectedContract) {
        await updateContract(selectedContract.id, data)
      } else {
        await createContract({
          project_id: projectId,
          ...data,
        })
      }

      setIsDialogOpen(false)
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteClick = (contract: ProjectContract) => {
    setSelectedContract(contract)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedContract) return

    try {
      await deleteContract(selectedContract.id)
      setIsDeleteDialogOpen(false)
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
    }
  }

  const getStatusBadge = (status: ContractStatus) => {
    const variants: Record<ContractStatus, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
      active: { label: 'Actif', className: 'bg-green-100 text-green-800' },
      expired: { label: 'Expiré', className: 'bg-red-100 text-red-800' },
      terminated: { label: 'Terminé', className: 'bg-gray-100 text-gray-700' },
    }

    return variants[status]
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrats ({contracts.length})
          </CardTitle>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau contrat
          </Button>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun contrat pour ce projet</p>
              <Button variant="outline" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Créer le premier contrat
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => {
                const statusInfo = getStatusBadge(contract.status)
                return (
                  <div
                    key={contract.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{contract.name}</h3>
                          <Badge className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {contract.contract_type && (
                            <div>
                              <span className="text-muted-foreground">Type: </span>
                              {contract.contract_type}
                            </div>
                          )}
                          {contract.amount_total && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span>{contract.amount_total.toLocaleString('fr-FR')} €</span>
                            </div>
                          )}
                          {contract.start_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>Début: {new Date(contract.start_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                          {contract.end_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span>Fin: {new Date(contract.end_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(contract)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(contract)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedContract ? 'Modifier le contrat' : 'Nouveau contrat'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du contrat *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Contrat de maintenance 2025"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_type">Type de contrat</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contract_type: value as ContractType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service_agreement">Contrat de service</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="development">Développement</SelectItem>
                    <SelectItem value="consulting">Conseil</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value as ContractStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="expired">Expiré</SelectItem>
                    <SelectItem value="terminated">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_total">Montant total (€)</Label>
              <Input
                id="amount_total"
                type="number"
                step="0.01"
                value={formData.amount_total}
                onChange={(e) =>
                  setFormData({ ...formData, amount_total: e.target.value })
                }
                placeholder="Ex: 50000.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_terms">Conditions de paiement</Label>
              <Textarea
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) =>
                  setFormData({ ...formData, payment_terms: e.target.value })
                }
                placeholder="Ex: Paiement en 3 fois..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes internes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={formLoading}
            >
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={formLoading || !formData.name}>
              {formLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce contrat ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
