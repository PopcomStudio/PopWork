"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRolesPermissions } from "@/features/auth/hooks/use-roles-permissions"
import { PageLayout } from "@/components/PageLayout"
import { Loader2 } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAdmin, loading: rolesLoading } = useRolesPermissions()

  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      router.push('/dashboard')
    }
  }, [rolesLoading, isAdmin, router])

  if (rolesLoading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
            <p className="mt-4 text-muted-foreground">Vérification des permissions...</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <PageLayout>
      {children}
    </PageLayout>
  )
}