"use client"

import { useState } from 'react'
import { CheckCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { useProjectDeliverables } from '../../hooks/use-project-deliverables'

interface ProjectDeliverablesSimpleProps {
  projectId: string
}

export function ProjectDeliverablesSimple({ projectId }: ProjectDeliverablesSimpleProps) {
  const {
    deliverables,
    loading,
    error,
    createDeliverable,
    deleteDeliverable,
    addItem,
    toggleItemCompletion,
    deleteItem,
  } = useProjectDeliverables(projectId)

  const [isAddDeliverableOpen, setIsAddDeliverableOpen] = useState(false)
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null)
  const [newDeliverableName, setNewDeliverableName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddDeliverable = async () => {
    if (!newDeliverableName.trim()) return

    try {
      setSaving(true)
      await createDeliverable({
        project_id: projectId,
        name: newDeliverableName,
      })
      setNewDeliverableName('')
      setIsAddDeliverableOpen(false)
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = async () => {
    if (!newItemName.trim() || !selectedDeliverableId) return

    try {
      setSaving(true)
      await addItem({
        deliverable_id: selectedDeliverableId,
        name: newItemName,
      })
      setNewItemName('')
      setIsAddItemOpen(false)
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleItem = async (itemId: string, deliverableId: string, completed: boolean) => {
    try {
      await toggleItemCompletion(itemId, deliverableId, !completed)
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const getCompletionStats = (deliverable: any) => {
    if (!deliverable.items || deliverable.items.length === 0) return null
    const completed = deliverable.items.filter((item: any) => item.completed).length
    const total = deliverable.items.length
    return { completed, total }
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
          <Button onClick={() => setIsAddDeliverableOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau livrable
          </Button>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun livrable pour ce projet</p>
              <Button variant="outline" onClick={() => setIsAddDeliverableOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer le premier livrable
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {deliverables.map((deliverable) => {
                const stats = getCompletionStats(deliverable)

                return (
                  <div key={deliverable.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{deliverable.name}</h3>
                        {stats && (
                          <p className="text-sm text-muted-foreground">
                            {stats.completed} / {stats.total} complété
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDeliverableId(deliverable.id)
                            setIsAddItemOpen(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDeliverable(deliverable.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {deliverable.items && deliverable.items.length > 0 ? (
                      <div className="space-y-2 pl-4 border-l-2 border-muted">
                        {deliverable.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded hover:bg-accent/50 group"
                          >
                            <Checkbox
                              checked={item.completed}
                              onCheckedChange={() =>
                                handleToggleItem(item.id, deliverable.id, item.completed)
                              }
                            />
                            <span
                              className={`flex-1 ${
                                item.completed ? 'line-through text-muted-foreground' : ''
                              }`}
                            >
                              {item.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteItem(item.id, deliverable.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pl-4">
                        Aucune tâche. Cliquez sur &quot;Ajouter&quot; pour créer une tâche.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ajouter un livrable */}
      <Dialog open={isAddDeliverableOpen} onOpenChange={setIsAddDeliverableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau livrable</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deliverable_name">Nom du livrable</Label>
              <Input
                id="deliverable_name"
                value={newDeliverableName}
                onChange={(e) => setNewDeliverableName(e.target.value)}
                placeholder="Ex: Documentation technique"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddDeliverable()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDeliverableOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={handleAddDeliverable} disabled={saving || !newDeliverableName.trim()}>
              {saving ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter une tâche */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item_name">Nom de la tâche</Label>
              <Input
                id="item_name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Ex: Rédiger le guide utilisateur"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddItem()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddItemOpen(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={handleAddItem} disabled={saving || !newItemName.trim()}>
              {saving ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
