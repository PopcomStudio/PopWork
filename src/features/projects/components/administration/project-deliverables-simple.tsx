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
    updateDeliverable,
    deleteDeliverable,
    addItem,
    toggleItemCompletion,
    deleteItem,
  } = useProjectDeliverables(projectId)

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [isSubtask, setIsSubtask] = useState(false)
  const [parentDeliverableId, setParentDeliverableId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return

    try {
      setSaving(true)

      if (isSubtask && parentDeliverableId) {
        // Ajouter une sous-tâche
        await addItem({
          deliverable_id: parentDeliverableId,
          name: newTaskName,
        })
      } else {
        // Ajouter une tâche principale
        await createDeliverable({
          project_id: projectId,
          name: newTaskName,
        })
      }

      setNewTaskName('')
      setIsAddTaskOpen(false)
      setIsSubtask(false)
      setParentDeliverableId(null)
    } catch (err) {
      console.error('Erreur:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDeliverable = async (deliverableId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
      await updateDeliverable(deliverableId, { status: newStatus })
    } catch (err) {
      console.error('Erreur:', err)
    }
  }

  const openAddSubtask = (deliverableId: string) => {
    setParentDeliverableId(deliverableId)
    setIsSubtask(true)
    setIsAddTaskOpen(true)
  }

  const openAddTask = () => {
    setParentDeliverableId(null)
    setIsSubtask(false)
    setIsAddTaskOpen(true)
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

  const allTasksCount = deliverables.reduce((count, d) => {
    return count + 1 + (d.items?.length || 0)
  }, 0)

  const completedTasksCount = deliverables.reduce((count, d) => {
    const deliverableCompleted = d.status === 'completed' ? 1 : 0
    const itemsCompleted = d.items?.filter(item => item.completed).length || 0
    return count + deliverableCompleted + itemsCompleted
  }, 0)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Liste des livrables
            </CardTitle>
            {allTasksCount > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {completedTasksCount} / {allTasksCount} tâches complétées
              </p>
            )}
          </div>
          <Button onClick={openAddTask} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une tâche
          </Button>
        </CardHeader>
        <CardContent>
          {deliverables.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucune tâche pour ce projet</p>
              <Button variant="outline" onClick={openAddTask}>
                <Plus className="h-4 w-4 mr-2" />
                Créer la première tâche
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {deliverables.map((deliverable) => (
                <div key={deliverable.id} className="space-y-1">
                  {/* Tâche principale */}
                  <div className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 group">
                    <Checkbox
                      checked={deliverable.status === 'completed'}
                      onCheckedChange={() => handleToggleDeliverable(deliverable.id, deliverable.status)}
                    />
                    <span
                      className={`flex-1 font-medium ${
                        deliverable.status === 'completed' ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {deliverable.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 text-xs"
                      onClick={() => openAddSubtask(deliverable.id)}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Sous-tâche
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteDeliverable(deliverable.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Sous-tâches */}
                  {deliverable.items && deliverable.items.length > 0 && (
                    <div className="ml-8 space-y-1">
                      {deliverable.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 group"
                        >
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={() =>
                              toggleItemCompletion(item.id, deliverable.id, !item.completed)
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
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ajouter une tâche */}
      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isSubtask ? 'Nouvelle sous-tâche' : 'Nouvelle tâche'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task_name">
                Nom de la {isSubtask ? 'sous-tâche' : 'tâche'}
              </Label>
              <Input
                id="task_name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder={
                  isSubtask
                    ? 'Ex: Rédiger le guide utilisateur'
                    : 'Ex: Documentation technique'
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTask()
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddTaskOpen(false)
                setNewTaskName('')
                setIsSubtask(false)
                setParentDeliverableId(null)
              }}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button onClick={handleAddTask} disabled={saving || !newTaskName.trim()}>
              {saving ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
