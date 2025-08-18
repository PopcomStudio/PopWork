"use client"

import { useAuth } from "@/features/auth/hooks/use-auth"

/**
 * Hook pour récupérer l'avatar utilisateur de manière cohérente
 */
export function useUserAvatar() {
  const { user } = useAuth()

  const firstName = user?.user_metadata?.first_name || ""
  const lastName = user?.user_metadata?.last_name || ""
  const email = user?.email || ""
  
  const avatarUrl = user?.user_metadata?.avatar_url
  const initials = firstName && lastName 
    ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    : email.charAt(0).toUpperCase()

  const fullName = firstName && lastName 
    ? `${firstName} ${lastName}`
    : email.split('@')[0] || "Utilisateur"

  return {
    avatarUrl,
    initials,
    fullName,
    firstName,
    lastName,
    email,
    user
  }
}