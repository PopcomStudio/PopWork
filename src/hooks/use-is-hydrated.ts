"use client"

import { useEffect, useState } from "react"

/**
 * Hook pour détecter si l'hydration côté client est terminée.
 * Utile pour éviter les erreurs d'hydration causées par les extensions de navigateur
 * comme Dashlane, LastPass, etc.
 */
export function useIsHydrated() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
} 