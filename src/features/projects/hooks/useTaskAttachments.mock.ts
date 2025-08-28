'use client'

import { useState, useCallback, useEffect } from 'react'
import { TaskAttachmentExtended } from '../types/kanban'

// Données mockées pour les tests
const mockAttachments: TaskAttachmentExtended[] = [
  {
    id: 'attachment-1',
    taskId: 'task-1',
    fileName: 'design-mockups.png',
    fileSize: 2048000, // 2MB
    mimeType: 'image/png',
    filePath: '/mock/attachments/design-mockups.png',
    uploadedBy: 'user-1',
    uploadedAt: '2024-01-15T09:00:00Z',
    commentsCount: 2,
    preview: {
      thumbnailUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA5VjMxSDI4VjEzTDI0IDlIMTJaIiBmaWxsPSIjOUNBM0FGIi8+CjxwYXRoIGQ9Ik0yNCA5VjEzSDI4IiBmaWxsPSIjNkI3Mjg1Ii8+Cjwvc3ZnPgo=',
      previewUrl: null
    },
    user: {
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Dupont',
      email: 'alice@popwork.com'
    }
  },
  {
    id: 'attachment-2',
    taskId: 'task-1',
    fileName: 'specifications.pdf',
    fileSize: 1536000, // 1.5MB
    mimeType: 'application/pdf',
    filePath: '/mock/attachments/specifications.pdf',
    uploadedBy: 'user-2',
    uploadedAt: '2024-01-15T14:30:00Z',
    commentsCount: 0,
    preview: null,
    user: {
      id: 'user-2',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@popwork.com'
    }
  }
]

export interface UseTaskAttachmentsReturn {
  attachments: TaskAttachmentExtended[]
  loading: boolean
  error: string | null
  uploadFile: (file: File) => Promise<TaskAttachmentExtended>
  deleteAttachment: (attachmentId: string) => Promise<void>
  downloadAttachment: (attachmentId: string) => Promise<void>
  previewAttachment: (attachmentId: string) => Promise<void>
  commentOnAttachment: (attachmentId: string) => Promise<void>
}

export function useTaskAttachments(taskId: string): UseTaskAttachmentsReturn {
  const [attachments, setAttachments] = useState<TaskAttachmentExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Simuler le chargement des pièces jointes
  const fetchAttachments = useCallback(async () => {
    setLoading(true)
    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Filtrer les pièces jointes pour cette tâche
      const taskAttachments = mockAttachments.filter(a => a.taskId === taskId)
      setAttachments(taskAttachments)
      setError(null)
    } catch (err) {
      console.error('Erreur récupération pièces jointes:', err)
      setError('Erreur lors du chargement des pièces jointes')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  // Uploader un fichier
  const uploadFile = useCallback(async (file: File): Promise<TaskAttachmentExtended> => {
    setLoading(true)
    try {
      // Simuler l'upload
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Générer une miniature pour les images
      let preview = null
      if (file.type.startsWith('image/')) {
        preview = {
          thumbnailUrl: URL.createObjectURL(file),
          previewUrl: URL.createObjectURL(file)
        }
      }

      const newAttachment: TaskAttachmentExtended = {
        id: `attachment-${Date.now()}`,
        taskId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        filePath: `/mock/attachments/${file.name}`,
        uploadedBy: 'current-user',
        uploadedAt: new Date().toISOString(),
        commentsCount: 0,
        preview,
        user: {
          id: 'current-user',
          firstName: 'Utilisateur',
          lastName: 'Actuel',
          email: 'user@popwork.com'
        }
      }

      mockAttachments.push(newAttachment)
      await fetchAttachments()
      return newAttachment
    } catch (err) {
      console.error('Erreur upload fichier:', err)
      throw new Error('Erreur lors de l\'upload du fichier')
    } finally {
      setLoading(false)
    }
  }, [taskId, fetchAttachments])

  // Supprimer une pièce jointe
  const deleteAttachment = useCallback(async (attachmentId: string): Promise<void> => {
    try {
      // Simuler la suppression
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = mockAttachments.findIndex(a => a.id === attachmentId)
      if (index !== -1) {
        mockAttachments.splice(index, 1)
        await fetchAttachments()
      }
    } catch (err) {
      console.error('Erreur suppression pièce jointe:', err)
      throw new Error('Erreur lors de la suppression')
    }
  }, [fetchAttachments])

  // Télécharger une pièce jointe
  const downloadAttachment = useCallback(async (attachmentId: string): Promise<void> => {
    try {
      const attachment = mockAttachments.find(a => a.id === attachmentId)
      if (!attachment) {
        throw new Error('Pièce jointe non trouvée')
      }

      // Simuler le téléchargement
      console.log(`Téléchargement simulé de: ${attachment.fileName}`)
      
      // Dans un vrai cas, on créerait un blob et déclencherait le téléchargement
      const link = document.createElement('a')
      link.href = '#'
      link.download = attachment.fileName
      link.click()
    } catch (err) {
      console.error('Erreur téléchargement:', err)
      throw new Error('Erreur lors du téléchargement')
    }
  }, [])

  // Prévisualiser une pièce jointe
  const previewAttachment = useCallback(async (attachmentId: string): Promise<void> => {
    try {
      const attachment = mockAttachments.find(a => a.id === attachmentId)
      if (!attachment) {
        throw new Error('Pièce jointe non trouvée')
      }

      console.log(`Prévisualisation simulée de: ${attachment.fileName}`)
      
      // Dans un vrai cas, on ouvrirait une modal de prévisualisation
      if (attachment.preview?.previewUrl) {
        window.open(attachment.preview.previewUrl, '_blank')
      } else {
        alert(`Prévisualisation de ${attachment.fileName}`)
      }
    } catch (err) {
      console.error('Erreur prévisualisation:', err)
      throw new Error('Erreur lors de la prévisualisation')
    }
  }, [])

  // Commenter sur une pièce jointe
  const commentOnAttachment = useCallback(async (attachmentId: string): Promise<void> => {
    try {
      const attachment = mockAttachments.find(a => a.id === attachmentId)
      if (!attachment) {
        throw new Error('Pièce jointe non trouvée')
      }

      console.log(`Ouverture des commentaires pour: ${attachment.fileName}`)
      
      // Dans un vrai cas, on ouvrirait une interface de commentaire
      // Pour le moment, on simule juste l'action
      alert(`Commentaires pour ${attachment.fileName}`)
    } catch (err) {
      console.error('Erreur commentaire:', err)
      throw new Error('Erreur lors de l\'ouverture des commentaires')
    }
  }, [])

  // Charger les pièces jointes au montage
  useEffect(() => {
    if (taskId) {
      fetchAttachments()
    }
  }, [taskId, fetchAttachments])

  return {
    attachments,
    loading,
    error,
    uploadFile,
    deleteAttachment,
    downloadAttachment,
    previewAttachment,
    commentOnAttachment
  }
}