"use client"

import { useState } from 'react'
import { FileText, Plus, Download, Trash2, Calendar, Upload } from 'lucide-react'
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
import { useProjectFiles, type ProjectFile } from '../../hooks/use-project-files'

interface ProjectDocumentsProps {
  projectId: string
}

type DocumentType = 'contract' | 'quote' | 'invoice' | 'other'

export function ProjectDocuments({ projectId }: ProjectDocumentsProps) {
  const { files, loading, error, uploadFile, deleteFile, getFileUrl } = useProjectFiles(projectId)

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [uploading, setUploading] = useState(false)

  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    name: '',
    document_type: '' as DocumentType | '',
    description: '',
  })

  // Filtrer uniquement les documents administratifs
  const adminDocuments = files.filter((file) =>
    ['contract', 'quote', 'invoice'].includes(file.document_type || '')
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadForm({
        ...uploadForm,
        file,
        name: uploadForm.name || file.name.split('.')[0],
      })
    }
  }

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.document_type) return

    try {
      setUploading(true)

      await uploadFile({
        file: uploadForm.file,
        project_id: projectId,
        description: uploadForm.description,
        document_type: uploadForm.document_type,
      })

      setIsUploadDialogOpen(false)
      setUploadForm({
        file: null,
        name: '',
        document_type: '',
        description: '',
      })
    } catch (err) {
      console.error('Erreur lors de l\'upload:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteClick = (file: ProjectFile) => {
    setSelectedFile(file)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedFile) return

    try {
      await deleteFile(selectedFile.id)
      setIsDeleteDialogOpen(false)
    } catch (err) {
      console.error('Erreur lors de la suppression:', err)
    }
  }

  const getDocumentTypeBadge = (type: string) => {
    const types: Record<string, { label: string; className: string }> = {
      contract: { label: 'Contrat', className: 'bg-blue-100 text-blue-800' },
      quote: { label: 'Devis', className: 'bg-purple-100 text-purple-800' },
      invoice: { label: 'Facture', className: 'bg-green-100 text-green-800' },
      other: { label: 'Autre', className: 'bg-gray-100 text-gray-700' },
    }

    return types[type] || types.other
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
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
            <FileText className="h-5 w-5" />
            Documents ({adminDocuments.length})
          </CardTitle>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Ajouter un document
          </Button>
        </CardHeader>
        <CardContent>
          {adminDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Aucun document pour ce projet
              </p>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Ajouter le premier document
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {adminDocuments.map((file) => {
                const typeBadge = getDocumentTypeBadge(file.document_type || 'other')

                return (
                  <div
                    key={file.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{file.file_name}</h3>
                            <Badge className={typeBadge.className}>
                              {typeBadge.label}
                            </Badge>
                          </div>
                          {file.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {file.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(file.created_at).toLocaleDateString('fr-FR')}
                            </div>
                            {file.file_size && (
                              <span>{formatFileSize(file.file_size)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {getFileUrl(file) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a
                              href={getFileUrl(file) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(file)}
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

      {/* Dialog Upload */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document_type">Type de document *</Label>
              <Select
                value={uploadForm.document_type}
                onValueChange={(value) =>
                  setUploadForm({ ...uploadForm, document_type: value as DocumentType })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contrat</SelectItem>
                  <SelectItem value="quote">Devis</SelectItem>
                  <SelectItem value="invoice">Facture</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Fichier *</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
              />
              <p className="text-xs text-muted-foreground">
                Formats acceptés: PDF, DOC, DOCX, XLS, XLSX
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom du document *</Label>
              <Input
                id="name"
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, name: e.target.value })
                }
                placeholder="Ex: Contrat de prestation 2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, description: e.target.value })
                }
                placeholder="Description du document..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadDialogOpen(false)}
              disabled={uploading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                uploading ||
                !uploadForm.file ||
                !uploadForm.name ||
                !uploadForm.document_type
              }
            >
              {uploading ? 'Upload en cours...' : 'Ajouter'}
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
              Êtes-vous sûr de vouloir supprimer ce document ? Cette action est
              irréversible.
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
