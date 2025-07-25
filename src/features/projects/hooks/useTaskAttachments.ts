'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { TaskAttachmentExtended } from '../types/kanban'

interface UseTaskAttachmentsReturn {
  attachments: TaskAttachmentExtended[]
  loading: boolean
  error: string | null
  uploading: boolean
  
  // Actions CRUD
  uploadFile: (file: File) => Promise<TaskAttachmentExtended>
  deleteAttachment: (attachmentId: string) => Promise<void>
  downloadAttachment: (attachment: TaskAttachmentExtended) => Promise<void>
  
  // Utilitaires
  refreshAttachments: () => Promise<void>
  getAttachmentById: (attachmentId: string) => TaskAttachmentExtended | undefined
  generateThumbnail: (file: File) => Promise<string | null>
  getFileIcon: (mimeType: string) => string
  formatFileSize: (bytes: number) => string
}

export function useTaskAttachments(taskId: string): UseTaskAttachmentsReturn {
  const [attachments, setAttachments] = useState<TaskAttachmentExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  
  const supabase = createClientComponentClient()

  // Récupérer toutes les pièces jointes d'une tâche
  const fetchAttachments = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('task_attachments')
        .select(`
          *,
          user:users(id, first_name, last_name, email),
          comments:task_comments!attachment_id(
            id, content, created_at,
            user:users(id, first_name, last_name)
          )
        `)
        .eq('task_id', taskId)
        .order('uploaded_at', { ascending: false })

      if (attachmentsError) throw attachmentsError

      const extendedAttachments: TaskAttachmentExtended[] = (attachmentsData || []).map(attachment => ({
        id: attachment.id,
        taskId: attachment.task_id,
        fileName: attachment.file_name,
        fileUrl: attachment.file_url,
        fileSize: attachment.file_size,
        mimeType: attachment.mime_type,
        uploadedBy: attachment.uploaded_by,
        uploadedAt: attachment.uploaded_at,
        comments: attachment.comments || [],
        commentsCount: attachment.comments?.length || 0,
        user: {
          id: attachment.user.id,
          firstName: attachment.user.first_name,
          lastName: attachment.user.last_name,
          email: attachment.user.email
        },
        preview: attachment.preview ? JSON.parse(attachment.preview) : undefined
      }))

      setAttachments(extendedAttachments)
    } catch (err) {
      console.error('Erreur récupération pièces jointes:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [taskId, supabase])

  // Upload d'un fichier
  const uploadFile = useCallback(async (file: File): Promise<TaskAttachmentExtended> => {
    try {
      setUploading(true)
      setError(null)

      // Générer un nom unique pour le fichier
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `task-attachments/${taskId}/${fileName}`

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('task-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtenir l'URL publique
      const { data: publicUrlData } = supabase.storage
        .from('task-files')
        .getPublicUrl(filePath)

      // Générer une miniature si c'est une image
      let preview = null
      if (file.type.startsWith('image/')) {
        const thumbnailUrl = await generateThumbnail(file)
        if (thumbnailUrl) {
          preview = {
            thumbnailUrl,
            width: 0, // TODO: obtenir les dimensions réelles
            height: 0
          }
        }
      }

      // Enregistrer en base de données
      const { data: attachmentData, error: dbError } = await supabase
        .from('task_attachments')
        .insert([{
          task_id: taskId,
          file_name: file.name,
          file_url: publicUrlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          preview: preview ? JSON.stringify(preview) : null
        }])
        .select(`
          *,
          user:users(id, first_name, last_name, email)
        `)
        .single()

      if (dbError) throw dbError

      const newAttachment: TaskAttachmentExtended = {
        id: attachmentData.id,
        taskId: attachmentData.task_id,
        fileName: attachmentData.file_name,
        fileUrl: attachmentData.file_url,
        fileSize: attachmentData.file_size,
        mimeType: attachmentData.mime_type,
        uploadedBy: attachmentData.uploaded_by,
        uploadedAt: attachmentData.uploaded_at,
        comments: [],
        commentsCount: 0,
        user: {
          id: attachmentData.user.id,
          firstName: attachmentData.user.first_name,
          lastName: attachmentData.user.last_name,
          email: attachmentData.user.email
        },
        preview
      }

      // Rafraîchir la liste
      await fetchAttachments()
      
      return newAttachment
    } catch (err) {
      console.error('Erreur upload fichier:', err)
      throw new Error(err instanceof Error ? err.message : 'Erreur upload fichier')
    } finally {
      setUploading(false)
    }
  }, [taskId, supabase, fetchAttachments])

  // Supprimer une pièce jointe
  const deleteAttachment = useCallback(async (attachmentId: string) => {
    try {
      const attachment = getAttachmentById(attachmentId)
      if (!attachment) throw new Error('Pièce jointe introuvable')

      // Supprimer le fichier du storage
      const filePath = attachment.fileUrl.split('/').slice(-3).join('/')
      await supabase.storage
        .from('task-files')
        .remove([filePath])

      // Supprimer l'enregistrement de la base
      const { error: deleteError } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId)

      if (deleteError) throw deleteError
      await fetchAttachments()
    } catch (err) {
      console.error('Erreur suppression pièce jointe:', err)
      throw new Error(err instanceof Error ? err.message : 'Erreur suppression pièce jointe')
    }
  }, [supabase, fetchAttachments])

  // Télécharger une pièce jointe
  const downloadAttachment = useCallback(async (attachment: TaskAttachmentExtended) => {
    try {
      const response = await fetch(attachment.fileUrl)
      const blob = await response.blob()
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = attachment.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Erreur téléchargement:', err)
      throw new Error('Erreur lors du téléchargement')
    }
  }, [])

  // Générer une miniature pour les images
  const generateThumbnail = useCallback(async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(null)
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        const maxSize = 200
        let { width, height } = img

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }

      img.onerror = () => resolve(null)
      img.src = URL.createObjectURL(file)
    })
  }, [])

  // Obtenir l'icône d'un type de fichier
  const getFileIcon = useCallback((mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.startsWith('audio/')) return '🎵'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word')) return '📝'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📈'
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️'
    return '📎'
  }, [])

  // Formater la taille d'un fichier
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }, [])

  // Utilitaires
  const refreshAttachments = useCallback(async () => {
    await fetchAttachments()
  }, [fetchAttachments])

  const getAttachmentById = useCallback((attachmentId: string): TaskAttachmentExtended | undefined => {
    return attachments.find(attachment => attachment.id === attachmentId)
  }, [attachments])

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
    uploading,
    
    // Actions CRUD
    uploadFile,
    deleteAttachment,
    downloadAttachment,
    
    // Utilitaires
    refreshAttachments,
    getAttachmentById,
    generateThumbnail,
    getFileIcon,
    formatFileSize
  }
}