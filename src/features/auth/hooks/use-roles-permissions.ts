"use client"

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export type Role = {
  id: string
  name: 'admin' | 'manager' | 'developer' | 'client'
  permissions: string[]
}

export type UserWithRole = {
  id: string
  email: string
  first_name: string
  last_name: string
  role_id: string
  role?: Role
  created_at: string
  updated_at: string
}

export function useRolesPermissions() {
  const [roles, setRoles] = useState<Role[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient()

  // Charger tous les rôles disponibles
  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name')

      if (error) {
        throw error
      }

      const formattedRoles = data.map(role => ({
        ...role,
        permissions: role.permissions || []
      }))

      setRoles(formattedRoles)
      return formattedRoles
    } catch (err) {
      console.error('Erreur lors du chargement des rôles:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      return []
    }
  }

  // Récupérer le rôle de l'utilisateur courant
  const fetchCurrentUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setCurrentUserRole(null)
        return null
      }

      // D'abord récupérer les données utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userError) {
        throw userError
      }

      if (!userData || !userData.role_id) {
        setCurrentUserRole(null)
        return null
      }

      // Ensuite récupérer le rôle
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', userData.role_id)
        .single()

      if (roleError) {
        throw roleError
      }

      const userRole = roleData ? {
        ...roleData,
        permissions: roleData.permissions || []
      } : null

      setCurrentUserRole(userRole)
      return userRole
    } catch (err) {
      console.error('💥 Erreur lors du chargement du rôle utilisateur:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      return null
    }
  }

  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = (permission: string): boolean => {
    if (!currentUserRole) return false

    // Admin a toutes les permissions
    if (currentUserRole.permissions.includes('*')) return true

    // Vérifier la permission exacte
    if (currentUserRole.permissions.includes(permission)) return true

    // Vérifier les permissions avec wildcard (ex: "projects.*" pour "projects.read")
    const wildcardPermissions = currentUserRole.permissions.filter(p => p.endsWith('.*'))
    for (const wildcardPerm of wildcardPermissions) {
      const prefix = wildcardPerm.replace('.*', '')
      if (permission.startsWith(prefix + '.')) return true
    }

    return false
  }

  // Vérifier si l'utilisateur a un rôle spécifique
  const hasRole = (roleName: string): boolean => {
    return currentUserRole?.name === roleName
  }

  // Vérifier si l'utilisateur est admin
  const isAdmin = (): boolean => {
    return hasRole('admin') || hasPermission('*')
  }

  // Créer un nouvel utilisateur avec un rôle
  const createUserWithRole = async (userData: {
    email: string
    first_name: string
    last_name: string
    role_id: string
  }) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select(`
          *,
          role:roles(*)
        `)
        .single()

      if (error) throw error

      return {
        ...data,
        role: data.role ? {
          ...data.role,
          permissions: data.role.permissions || []
        } : null
      }
    } catch (err) {
      console.error('Erreur lors de la création de l\'utilisateur:', err)
      throw err
    }
  }

  // Mettre à jour le rôle d'un utilisateur
  const updateUserRole = async (userId: string, roleId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role_id: roleId })
        .eq('id', userId)
        .select(`
          *,
          role:roles(*)
        `)
        .single()

      if (error) throw error

      return {
        ...data,
        role: data.role ? {
          ...data.role,
          permissions: data.role.permissions || []
        } : null
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du rôle:', err)
      throw err
    }
  }

  // Récupérer tous les utilisateurs avec leurs rôles
  const fetchAllUsers = async (): Promise<UserWithRole[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          role:roles(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data.map(user => ({
        ...user,
        role: user.role ? {
          ...user.role,
          permissions: user.role.permissions || []
        } : undefined
      }))
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err)
      throw err
    }
  }

  // Initialisation
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError(null)
      
      try {
        await Promise.all([
          fetchRoles(),
          fetchCurrentUserRole()
        ])
      } catch (err) {
        console.error('Erreur lors de l\'initialisation:', err)
        setError(err instanceof Error ? err.message : 'Erreur d\'initialisation')
      } finally {
        setLoading(false)
      }
    }

    init()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchCurrentUserRole()
        } else if (event === 'SIGNED_OUT') {
          setCurrentUserRole(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return {
    // État
    roles,
    currentUserRole,
    loading,
    error,

    // Fonctions de vérification
    hasPermission,
    hasRole,
    isAdmin,

    // Fonctions de gestion
    fetchRoles,
    fetchCurrentUserRole,
    createUserWithRole,
    updateUserRole,
    fetchAllUsers,

    // Refresh
    refetch: () => {
      fetchRoles()
      fetchCurrentUserRole()
    }
  }
} 