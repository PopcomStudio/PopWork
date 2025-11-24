"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { toast } from 'sonner'

export interface ProjectFile {
  id: string
  project_id: string
  task_id: string | null
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  uploaded_by: string
  description: string | null
  document_type?: string | null
  created_at: string
  updated_at: string
  uploader?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  task?: {
    id: string
    title: string
  }
}

export interface UploadFileData {
  file: File
  project_id: string
  task_id?: string
  description?: string
  document_type?: string
}

const BUCKET_NAME = 'project-files'

export function useProjectFiles(projectId: string) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})

  const supabase = createClientComponentClient()

  // Générer les URLs signées pour tous les fichiers
  const generateSignedUrls = useCallback(async (filesToProcess: ProjectFile[]) => {
    const newUrls: Record<string, string> = {}

    for (const file of filesToProcess) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(file.storage_path, 3600) // URL valide pendant 1 heure

        if (error) {
          console.error('Erreur création URL signée:', error)
        } else if (data?.signedUrl) {
          newUrls[file.id] = data.signedUrl
        }
      } catch (err) {
        console.error('Erreur génération URL:', err)
      }
    }

    setFileUrls(prev => ({ ...prev, ...newUrls }))
  }, [supabase])

  // Récupérer tous les fichiers d'un projet
  const fetchFiles = useCallback(async () => {
    if (!projectId) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('project_files')
        .select(`
          *,
          uploader:users!uploaded_by (
            id,
            first_name,
            last_name,
            email
          ),
          task:tasks (
            id,
            title
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const projectFiles = data as ProjectFile[]
      setFiles(projectFiles)

      // Générer les URLs signées pour tous les fichiers
      if (projectFiles.length > 0) {
        await generateSignedUrls(projectFiles)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement des fichiers'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase, generateSignedUrls])

  // Uploader un fichier
  const uploadFile = useCallback(async ({ file, project_id, task_id, description, document_type }: UploadFileData) => {
    try {
      setUploading(true)
      setError(null)

      // Obtenir l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non authentifié')

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const storagePath = `${project_id}/${fileName}`

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Créer l'entrée dans la base de données
      const { data, error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id,
          task_id: task_id || null,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storagePath,
          uploaded_by: user.id,
          description: description || null,
          document_type: document_type || null,
        })
        .select(`
          *,
          uploader:users!uploaded_by (
            id,
            first_name,
            last_name,
            email
          ),
          task:tasks (
            id,
            title
          )
        `)
        .single()

      if (dbError) throw dbError

      const newFile = data as ProjectFile

      // Ajouter le fichier à la liste
      setFiles(prev => [newFile, ...prev])

      // Générer l'URL signée pour le nouveau fichier
      await generateSignedUrls([newFile])

      toast.success(`Fichier "${file.name}" uploadé avec succès`)
      return newFile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'upload du fichier'
      setError(message)
      toast.error(message)
      throw err
    } finally {
      setUploading(false)
    }
  }, [supabase, generateSignedUrls])

  // Télécharger un fichier
  const downloadFile = useCallback(async (file: ProjectFile) => {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(file.storage_path)

      if (error) throw error

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = file.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`Fichier "${file.file_name}" téléchargé`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du téléchargement'
      toast.error(message)
    }
  }, [supabase])

  // Obtenir l'URL signée d'un fichier depuis le cache ou la créer
  const getFileUrl = useCallback((file: ProjectFile) => {
    return fileUrls[file.id] || null
  }, [fileUrls])

  // Supprimer un fichier
  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const fileToDelete = files.find(f => f.id === fileId)
      if (!fileToDelete) throw new Error('Fichier non trouvé')

      // Supprimer de la base de données
      const { error: dbError } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId)

      if (dbError) throw dbError

      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileToDelete.storage_path])

      if (storageError) throw storageError

      // Retirer de la liste
      setFiles(prev => prev.filter(f => f.id !== fileId))

      toast.success(`Fichier "${fileToDelete.file_name}" supprimé`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression'
      setError(message)
      toast.error(message)
    }
  }, [files, supabase])

  // Mettre à jour la description ou l'assignation à une tâche
  const updateFile = useCallback(async (
    fileId: string,
    updates: { description?: string; task_id?: string | null }
  ) => {
    try {
      const { data, error } = await supabase
        .from('project_files')
        .update(updates)
        .eq('id', fileId)
        .select(`
          *,
          uploader:users!uploaded_by (
            id,
            first_name,
            last_name,
            email
          ),
          task:tasks (
            id,
            title
          )
        `)
        .single()

      if (error) throw error

      // Mettre à jour dans la liste
      setFiles(prev => prev.map(f => f.id === fileId ? data as ProjectFile : f))

      toast.success('Fichier mis à jour')
      return data as ProjectFile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
      setError(message)
      toast.error(message)
      throw err
    }
  }, [supabase])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  return {
    files,
    loading,
    uploading,
    error,
    fetchFiles,
    uploadFile,
    downloadFile,
    getFileUrl,
    deleteFile,
    updateFile,
  }
}
