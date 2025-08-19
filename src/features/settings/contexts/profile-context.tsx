"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { createClientComponentClient } from "@/lib/supabase"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { compressImage, validateImageFile, generateAvatarFileName } from "@/lib/image-utils"

interface Profile {
  id: string
  first_name?: string
  last_name?: string
  avatar_url?: string
  updated_at?: string
}

interface UpdateProfileData {
  first_name?: string
  last_name?: string
  avatar_url?: string
}

interface UploadResult {
  success?: boolean
  error?: string
  url?: string
}

interface ProfileContextType {
  profile: Profile | null
  loading: boolean
  updating: boolean
  updateProfile: (updates: UpdateProfileData) => Promise<{ success?: boolean; error?: string }>
  uploadAvatar: (file: File) => Promise<UploadResult>
  removeAvatar: () => Promise<UploadResult>
  refetch: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const { user } = useAuth()
  const supabase = createClientComponentClient()

  // Charger le profil utilisateur
  useEffect(() => {
    if (user) {
      loadProfile()
    } else {
      setLoading(false)
      setProfile(null)
    }
  }, [user])

  const loadProfile = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Erreur lors du chargement du profil:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Erreur inattendue:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: UpdateProfileData) => {
    if (!user) return { error: 'Utilisateur non connecté' }

    setUpdating(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Erreur lors de la mise à jour:', error)
        return { error: 'Erreur lors de la mise à jour du profil' }
      }

      setProfile(data)
      return { success: true }
    } catch (error) {
      console.error('Erreur inattendue:', error)
      return { error: 'Erreur inattendue' }
    } finally {
      setUpdating(false)
    }
  }

  const uploadAvatar = async (file: File): Promise<UploadResult> => {
    if (!user) return { error: 'Utilisateur non connecté' }

    // Valider le fichier
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { error: validation.error }
    }

    setUpdating(true)
    try {
      // Compresser l'image
      const compressedFile = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        format: 'webp'
      })

      // Générer un nom de fichier unique
      const fileName = generateAvatarFileName(user.id)
      
      // Supprimer l'ancien avatar s'il existe
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${oldPath}`])
        }
      }

      // Upload du nouveau fichier
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Erreur upload:', uploadError)
        return { error: 'Erreur lors de l\'upload de l\'image' }
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Mettre à jour le profil avec la nouvelle URL
      const updateResult = await updateProfile({ avatar_url: publicUrl })
      if (updateResult.error) {
        return { error: updateResult.error }
      }

      return { success: true, url: publicUrl }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      return { error: 'Erreur lors du traitement de l\'image' }
    } finally {
      setUpdating(false)
    }
  }

  const removeAvatar = async (): Promise<UploadResult> => {
    if (!user || !profile?.avatar_url) return { error: 'Aucun avatar à supprimer' }

    setUpdating(true)
    try {
      // Supprimer le fichier du storage
      const oldPath = profile.avatar_url.split('/').pop()
      if (oldPath) {
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([`${user.id}/${oldPath}`])

        if (deleteError) {
          console.error('Erreur suppression storage:', deleteError)
        }
      }

      // Mettre à jour le profil
      const updateResult = await updateProfile({ avatar_url: undefined })
      if (updateResult.error) {
        return { error: updateResult.error }
      }

      return { success: true }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      return { error: 'Erreur lors de la suppression de l\'avatar' }
    } finally {
      setUpdating(false)
    }
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        loading,
        updating,
        updateProfile,
        uploadAvatar,
        removeAvatar,
        refetch: loadProfile
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfileContext() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider')
  }
  return context
}