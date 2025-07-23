"use client"

import { ReactNode } from 'react'
import { useRolesPermissions } from '../hooks/use-roles-permissions'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPermission?: string
  requiredRole?: string
  fallback?: ReactNode
  showLoading?: boolean
}

export function ProtectedRoute({ 
  children, 
  requiredPermission, 
  requiredRole, 
  fallback = null,
  showLoading = true
}: ProtectedRouteProps) {
  const { hasPermission, hasRole, loading } = useRolesPermissions()

  // Afficher le loading pendant le chargement des permissions
  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">
          Chargement des permissions...
        </div>
      </div>
    )
  }

  // Vérifier les permissions
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-destructive mb-2">Accès refusé</div>
        <div className="text-muted-foreground">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette section.
        </div>
      </div>
    )
  }

  // Vérifier les rôles
  if (requiredRole && !hasRole(requiredRole)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-destructive mb-2">Accès refusé</div>
        <div className="text-muted-foreground">
          Seuls les utilisateurs avec le rôle &quot;{requiredRole}&quot; peuvent accéder à cette section.
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook utilitaire pour vérifier les permissions dans les composants
export function usePermissionCheck() {
  const { hasPermission, hasRole, isAdmin, currentUserRole, loading } = useRolesPermissions()
  
  return {
    hasPermission,
    hasRole,
    isAdmin,
    currentUserRole,
    loading,
    canAccess: (permission?: string, role?: string) => {
      if (permission && !hasPermission(permission)) return false
      if (role && !hasRole(role)) return false
      return true
    }
  }
} 