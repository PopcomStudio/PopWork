"use client"

import { useProfileContext } from "@/features/settings/contexts/profile-context"

export function useProfile() {
  return useProfileContext()
}