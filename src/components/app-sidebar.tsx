"use client"

import * as React from "react"
import {
  Calendar,
  Clock,
  LayoutDashboard,
  FileText,
  Folder,
  FolderOpen,
  History,
  Bell,
  Settings,
  Palmtree,
  Users,
  Building,
  Phone,
  UserCheck,
} from "lucide-react"
import { Logo } from "@/components/logo"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { useProfile } from "@/features/settings/hooks/use-profile"
import { useTranslation } from "@/features/translation/hooks/use-translation"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// Moved outside component to avoid re-creating on each render
const getStaticData = (t: (key: string) => string) => ({
  navMain: [
    {
      title: t("navigation.dashboard"),
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t("navigation.projects"),
      url: "/projects",
      icon: Folder,
    },
    {
      title: t("navigation.timeTracking"),
      url: "/time-tracking",
      icon: Clock,
    },
    {
      title: t("navigation.invoicing"),
      url: "/invoicing",
      icon: FileText,
    },
    {
      title: t("navigation.team"),
      url: "/team",
      icon: Users,
    },
    {
      title: t("navigation.calendar"),
      url: "/calendar",
      icon: Calendar,
    },
  ],
  navClients: [
    {
      name: t("navigation.companies"),
      url: "/entreprises",
      icon: Building,
    },
    {
      name: t("navigation.services"),
      url: "/services", 
      icon: Phone,
    },
    {
      name: t("navigation.contacts"),
      url: "/contacts",
      icon: UserCheck,
    },
  ],
  navSecondary: [
    {
      title: t("navigation.history"),
      url: "/audit-log",
      icon: History,
    },
    {
      title: t("navigation.settings"),
      url: "/settings",
      icon: Settings,
    },
  ],
  documents: [
    {
      name: t("navigation.documents"),
      url: "/documents",
      icon: FolderOpen,
    },
    {
      name: t("navigation.leaves"),
      url: "/leaves",
      icon: Palmtree,
    },
    {
      name: t("navigation.notifications"),
      url: "/notifications",
      icon: Bell,
    },
  ],
})

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const { t } = useTranslation()

  // Construire les données utilisateur
  const firstName = profile?.first_name || user?.user_metadata?.first_name
  const lastName = profile?.last_name || user?.user_metadata?.last_name
  const fullName = firstName && lastName 
    ? `${firstName} ${lastName}`
    : user?.email?.split('@')[0] || "Utilisateur"
  
  const userData = {
    name: fullName,
    email: user?.email || "",
    avatar: profile?.avatar_url || user?.user_metadata?.avatar_url || "/avatars/shadcn.jpeg",
    initials: firstName && lastName 
      ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
      : (user?.email?.charAt(0) || "U").toUpperCase(),
  }
  
  const loading = authLoading || profileLoading

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2"
            >
              <a href="/dashboard" aria-label="Aller au tableau de bord PopWork">
                <Logo className="!h-7" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getStaticData(t).navMain} />
        <NavDocuments items={getStaticData(t).navClients} title={t("navigation.clients")} showActions={false} />
        <NavDocuments items={getStaticData(t).documents} title={t("navigation.resources")} showActions={false} />
        <NavSecondary items={getStaticData(t).navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {!loading && <NavUser user={userData} />}
      </SidebarFooter>
    </Sidebar>
  )
}

