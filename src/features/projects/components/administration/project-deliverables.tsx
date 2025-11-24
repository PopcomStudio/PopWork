"use client"

import { useState } from 'react'
import {
  CheckCircle,
  Circle,
  Plus,
  Edit,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { useProjectDeliverables } from '../../hooks/use-project-deliverables'
import type { ProjectDeliverable, DeliverableStatus } from '@/shared/types/database'

interface ProjectDeliverablesProps {
  projectId: string
}

export function ProjectDeliverables({ projectId }: ProjectDeliverablesProps) {
  const {
    deliverables,
    loading,
    error,
    createDeliverable,
    updateDeliverable,
    validateDeliverable,
    deleteDeliverable,
    addItem,
    updateItem,
    toggleItemCompletion,
    deleteItem,
  } = useProjectDeliverables(projectId)

  const [isDeliverableDialogOpen, setIsDeliverableDialogOpen] = useState(false)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedDeliverable, setSelectedDeliverable] = useState<ProjectDeliverable | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set())

  const [deliverableForm, setDeliverableForm] = useState({
    name: '',
    description: '',
    due_date: '',
  })

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
  })

  const toggleExpand = (deliverableId: string) => {
    setExpandedDeliverables((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(deliverableId)) {
        newSet.delete(deliverableId)
      } else {
        newSet.add(deliverableId)
      }
      return newSet
    })
  }

  const handleCreateDeliverable = () => {
    setSelectedDeliverable(null)
    setDeliverableForm({
      name: '',
      description: '',
      due_date: '',
    })
    setIsDeliverableDialogOpen(true)
  }

  const handleEditDeliverable = (deliverable: ProjectDeliverable) => {
    setSelectedDeliverable(deliverable)
    setDeliverableForm({
      name: deliverable.name,
      description: deliverable.description || '',
      due_date: deliverable.due_date || '',
    })
    setIsDeliverableDialogOpen(true)
  }

  const handleSaveDeliverable = async () => {
    try {
      setFormLoading(true)

      if (selectedDeliverable) {
        await updateDeliverable(selectedDeliverable.id, deliverableForm)
      } else {
        await createDeliverable({
          project_id: projectId,
          ...deliverableForm,
        })
      }

      setIsDeliverableDialogOpen(false)
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err)
    } finally {
      setFormLoading(false)
    }
  }

  const handleValidate = async (deliverable: ProjectDeliverable) => {
    try {
      await validateDeliverable(deliverable.id)
    } catch (err) {
      console.error('Erreur lors de la validation:', err)
    }
  }

  const handleDeleteDeliverable = (deliverable: ProjectDeliverable) => {
    setSelectedDeliverable(deliverable)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedDeliverable) return

    try {
      await deleteDeliverable(selectedDeliverable.id)
      setIsDeleteDialogOpen(false)
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
    }
  }

  const handleAddItem = (deliverable: ProjectDeliverable) => {
    setSelectedDeliverable(deliverable)
    setSelectedItemId(null)
    setItemForm({
      name: '',
      description: '',
    })
    setIsItemDialogOpen(true)
  }

  const handleSaveItem = async () => {
    if (!selectedDeliverable) return

    try {
      setFormLoading(true)

      await addItem({
        deliverable_id: selectedDeliverable.id,
        ...itemForm,
      })

      setIsItemDialogOpen(false)
    } catch (err) {
      console.error("Erreur lors de l'ajout de l'item:", err)
    } finally {
      setFormLoading(false)
    }
  }

  const handleToggleItem = async (
    itemId: string,
    deliverableId: string,
    completed: boolean
  ) => {
    try {
      await toggleItemCompletion(itemId, deliverableId, !completed)
    } catch (err) {
      console.error("Erreur lors du changement d'état:", err)
    }
  }

  const getStatusBadge = (status: DeliverableStatus) => {
    const variants: Record<
      DeliverableStatus,
      { label: string; className: string }
    > = {
      pending: { label: 'En attente', className: 'bg-gray-100 text-gray-700' },
      in_progress: {
        label: 'En cours',
        className: 'bg-blue-100 text-blue-800',
      },
      completed: {
        label: 'Terminé',
        className: 'bg-green-100 text-green-800',
      },
      validated: {
        label: 'Validé',
        className: 'bg-emerald-100 text-emerald-800',
      },
    }

    return variants[status]
  }

  const getCompletionPercentage = (deliverable: ProjectDeliverable) => {
    if (!deliverable.items || deliverable.items.length === 0) return 0
    const completedCount = deliverable.items.filter((item) => item.completed).length
    return Math.round((completedCount / deliverable.items.length) * 100)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
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
            <CheckCircle className="h-5 w-5" />
            Livrables ({deliverables.length})
          </CardTitle>
          <Button onClick={handleCreateDeliverable}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau livrable
          </Button>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Aucun livrable pour ce projet
              </p>
              <Button variant="outline" onClick={handleCreateDeliverable}>
                <Plus className="h-4 w-4 mr-2" />
                Créer le premier livrable
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {deliverables.map((deliverable) => {
                const statusInfo = getStatusBadge(deliverable.status)
                const isExpanded = expandedDeliverables.has(deliverable.id)
                const completionPercentage = getCompletionPercentage(deliverable)

                return (
                  <div
                    key={deliverable.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="p-4 bg-accent/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpand(deliverable.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <h3 className="font-semibold">{deliverable.name}</h3>
                            <Badge className={statusInfo.className}>
                              {statusInfo.label}
                            </Badge>
                            {deliverable.items && deliverable.items.length > 0 && (
                              <Badge variant="secondary">
                                {completionPercentage}% complété
                              </Badge>
                            )}
                          </div>
                          {deliverable.description && (
                            <p className="text-sm text-muted-foreground ml-9">
                              {deliverable.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 ml-9 mt-2 text-sm">
                            {deliverable.due_date && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  Échéance:{' '}
                                  {new Date(deliverable.due_date).toLocaleDateString(
                                    'fr-FR'
                                  )}
                                </span>
                              </div>
                            )}
                            {deliverable.items && deliverable.items.length > 0 && (
                              <span className="text-muted-foreground">
                                {deliverable.items.filter((i) => i.completed).length} /{' '}
                                {deliverable.items.length} tâches
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!deliverable.validated && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleValidate(deliverable)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Valider
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDeliverable(deliverable)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDeliverable(deliverable)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t">
                        <div className="space-y-2 mb-4">
                          {deliverable.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 p-2 rounded hover:bg-accent/50"
                            >
                              <Checkbox
                                checked={item.completed}
                                onCheckedChange={() =>
                                  handleToggleItem(
                                    item.id,
                                    deliverable.id,
                                    item.completed
                                  )
                                }
                              />
                              <div className="flex-1">
                                <div
                                  className={
                                    item.completed
                                      ? 'line-through text-muted-foreground'
                                      : ''
                                  }
                                >
                                  {item.name}
                                </div>
                                {item.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {item.description}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  deleteItem(item.id, deliverable.id)
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddItem(deliverable)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter une sous-tâche
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Livrable */}
      <Dialog
        open={isDeliverableDialogOpen}
        onOpenChange={setIsDeliverableDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDeliverable ? 'Modifier le livrable' : 'Nouveau livrable'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deliverable_name">Nom du livrable *</Label>
              <Input
                id="deliverable_name"
                value={deliverableForm.name}
                onChange={(e) =>
                  setDeliverableForm({ ...deliverableForm, name: e.target.value })
                }
                placeholder="Ex: Documentation technique"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable_description">Description</Label>
              <Textarea
                id="deliverable_description"
                value={deliverableForm.description}
                onChange={(e) =>
                  setDeliverableForm({
                    ...deliverableForm,
                    description: e.target.value,
                  })
                }
                placeholder="Description du livrable..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverable_due_date">Date d'échéance</Label>
              <Input
                id="deliverable_due_date"
                type="date"
                value={deliverableForm.due_date}
                onChange={(e) =>
                  setDeliverableForm({
                    ...deliverableForm,
                    due_date: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeliverableDialogOpen(false)}
              disabled={formLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveDeliverable}
              disabled={formLoading || !deliverableForm.name}
            >
              {formLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Item */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une sous-tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item_name">Nom de la tâche *</Label>
              <Input
                id="item_name"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm({ ...itemForm, name: e.target.value })
                }
                placeholder="Ex: Rédiger le guide utilisateur"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item_description">Description</Label>
              <Textarea
                id="item_description"
                value={itemForm.description}
                onChange={(e) =>
                  setItemForm({ ...itemForm, description: e.target.value })
                }
                placeholder="Description de la tâche..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsItemDialogOpen(false)}
              disabled={formLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={formLoading || !itemForm.name}
            >
              {formLoading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce livrable et toutes ses
              sous-tâches ? Cette action est irréversible.
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
