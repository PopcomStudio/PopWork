"use client"

import { useState } from 'react'
import { useProjectFiles, type ProjectFile } from '../hooks/use-project-files'
import { useTasks } from '../hooks/use-tasks'
import { FileUploader } from './attachments/FileUploader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Video,
  Music,
  Archive,
  AlertTriangle,
  Edit2,
  Link as LinkIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface ProjectFilesManagerProps {
  projectId: string
}

// Fonction pour obtenir l'icône selon le type de fichier
function getFileIcon(fileType: string) {
  if (fileType.startsWith('image/')) return <ImageIcon className="h-4 w-4" />
  if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />
  if (fileType.startsWith('audio/')) return <Music className="h-4 w-4" />
  if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="h-4 w-4" />
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return <Archive className="h-4 w-4" />
  return <FileIcon className="h-4 w-4" />
}

// Fonction pour formater la taille du fichier
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export function ProjectFilesManager({ projectId }: ProjectFilesManagerProps) {
  const { files, loading, uploading, error, uploadFile, downloadFile, deleteFile, updateFile, fetchFiles, getFileUrl } = useProjectFiles(projectId)
  const { tasks } = useTasks(projectId)

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    description: '',
    task_id: '',
  })
  const [filterTaskId, setFilterTaskId] = useState<string>('all')

  const handleFilesSelected = async (selectedFiles: File[]) => {
    for (const file of selectedFiles) {
      try {
        await uploadFile({
          file,
          project_id: projectId,
        })
      } catch (error) {
        console.error('Erreur upload:', error)
      }
    }
  }

  const handleEditClick = (file: ProjectFile) => {
    setSelectedFile(file)
    setEditForm({
      description: file.description || '',
      task_id: file.task_id || '',
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedFile) return

    try {
      await updateFile(selectedFile.id, {
        description: editForm.description || undefined,
        task_id: editForm.task_id || null,
      })
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Erreur mise à jour:', error)
    }
  }

  const handleDeleteClick = (file: ProjectFile) => {
    setSelectedFile(file)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedFile) return

    try {
      await deleteFile(selectedFile.id)
      setIsDeleteDialogOpen(false)
      setSelectedFile(null)
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  // Filtrer les fichiers par tâche
  const filteredFiles = filterTaskId === 'all'
    ? files
    : filterTaskId === 'unassigned'
    ? files.filter(f => !f.task_id)
    : files.filter(f => f.task_id === filterTaskId)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={fetchFiles}
          >
            Réessayer
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Zone d'upload */}
      <FileUploader
        onFilesSelected={handleFilesSelected}
        uploading={uploading}
        maxSize={50}
        multiple
      />

      {/* Filtres */}
      <div className="flex items-center gap-4">
        <Label>Filtrer par tâche :</Label>
        <Select value={filterTaskId} onValueChange={setFilterTaskId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les fichiers ({files.length})</SelectItem>
            <SelectItem value="unassigned">
              Non assignés ({files.filter(f => !f.task_id).length})
            </SelectItem>
            {tasks.map(task => (
              <SelectItem key={task.id} value={task.id}>
                {task.title} ({files.filter(f => f.task_id === task.id).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Liste des fichiers */}
      {filteredFiles.length === 0 ? (
        <Alert>
          <FileIcon className="h-4 w-4" />
          <AlertDescription>
            {filterTaskId === 'all'
              ? 'Aucun fichier dans ce projet. Uploadez votre premier fichier ci-dessus.'
              : 'Aucun fichier ne correspond aux filtres sélectionnés.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {filteredFiles.map((file) => (
            <Card key={file.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Prévisualisation ou icône du fichier */}
                  {file.file_type.startsWith('image/') ? (
                    <div className="flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden bg-gray-100 relative">
                      <Image
                        src={getFileUrl(file) || ''}
                        alt={file.file_name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {getFileIcon(file.file_type)}
                    </div>
                  )}

                  {/* Informations du fichier */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{file.file_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.file_size)} • Uploadé le {format(new Date(file.created_at), 'PPP', { locale: fr })}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(file)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(file)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(file)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Métadonnées */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {file.uploader && (
                        <Badge variant="secondary">
                          Par {file.uploader.first_name} {file.uploader.last_name}
                        </Badge>
                      )}
                      {file.task && (
                        <Badge variant="outline">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          {file.task.title}
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {file.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le fichier</DialogTitle>
            <DialogDescription>
              Modifiez la description ou assignez le fichier à une tâche
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Ajoutez une description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task">Assigner à une tâche</Label>
              <Select
                value={editForm.task_id || "none"}
                onValueChange={(value) => setEditForm({ ...editForm, task_id: value === "none" ? "" : value })}
              >
                <SelectTrigger id="task">
                  <SelectValue placeholder="Sélectionnez une tâche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune tâche</SelectItem>
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le fichier</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{selectedFile?.file_name}&quot; ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
