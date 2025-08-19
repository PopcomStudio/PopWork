"use client"

import * as React from "react"
import {
  IconCalendar,
  IconClock,
  IconDashboard,
  IconFileInvoice,
  IconFolder,
  IconFolderOpen,
  IconHistory,
  IconInnerShadowTop,
  IconBell,
  IconSettings,
  IconBeach,
  IconUsers,
  IconBuilding,
  IconPhone,
  IconUserCheck,
} from "@tabler/icons-react"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { useProfile } from "@/features/settings/hooks/use-profile"

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

const staticData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Projets & Tâches",
      url: "/projects",
      icon: IconFolder,
    },
    {
      title: "Time Tracking",
      url: "/time-tracking",
      icon: IconClock,
    },
    {
      title: "Facturation",
      url: "/invoicing",
      icon: IconFileInvoice,
    },
    {
      title: "Équipe",
      url: "/team",
      icon: IconUsers,
    },
    {
      title: "Calendrier",
      url: "/calendar",
      icon: IconCalendar,
    },
  ],
  navClients: [
    {
      name: "Entreprises",
      url: "/entreprises",
      icon: IconBuilding,
    },
    {
      name: "Services",
      url: "/services", 
      icon: IconPhone,
    },
    {
      name: "Contacts",
      url: "/contacts",
      icon: IconUserCheck,
    },
  ],
  navSecondary: [
    {
      title: "Historique",
      url: "/audit-log",
      icon: IconHistory,
    },
    {
      title: "Paramètres",
      url: "/settings",
      icon: IconSettings,
    },
  ],
  documents: [
    {
      name: "Coffre-fort RH",
      url: "/documents",
      icon: IconFolderOpen,
    },
    {
      name: "Congés",
      url: "/leaves",
      icon: IconBeach,
    },
    {
      name: "Notifications",
      url: "/notifications",
      icon: IconBell,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()

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
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard" aria-label="Aller au tableau de bord PopWork">
                <IconInnerShadowTop className="!size-5" aria-hidden="true" />
                <span className="text-base font-semibold">PopWork</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={staticData.navMain} />
        <NavDocuments items={staticData.navClients} title="Clients" showActions={false} />
        <NavDocuments items={staticData.documents} title="Ressources" showActions={false} />
        <NavSecondary items={staticData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {!loading && <NavUser user={userData} />}
      </SidebarFooter>
    </Sidebar>
  )
}

