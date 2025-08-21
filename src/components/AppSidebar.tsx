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
  Sparkles,
  Bell,
  Settings,
  Palmtree,
  Users,
  Building,
  Phone,
  UserCheck,
} from "lucide-react"

import { useAuth } from "@/features/auth/hooks/use-auth"

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
      icon: LayoutDashboard,
    },
    {
      title: "Projets & Tâches",
      url: "/projects",
      icon: Folder,
    },
    {
      title: "Time Tracking",
      url: "/time-tracking",
      icon: Clock,
    },
    {
      title: "Facturation",
      url: "/invoicing",
      icon: FileText,
    },
    {
      title: "Équipe",
      url: "/team",
      icon: Users,
    },
    {
      title: "Calendrier",
      url: "/calendar",
      icon: Calendar,
    },
  ],
  navClients: [
    {
      name: "Entreprises",
      url: "/entreprises",
      icon: Building,
    },
    {
      name: "Services",
      url: "/services", 
      icon: Phone,
    },
    {
      name: "Contacts",
      url: "/contacts",
      icon: UserCheck,
    },
  ],
  navSecondary: [
    {
      title: "Historique",
      url: "/audit-log",
      icon: History,
    },
    {
      title: "Paramètres",
      url: "/settings",
      icon: Settings,
    },
  ],
  documents: [
    {
      name: "Coffre-fort RH",
      url: "/documents",
      icon: FolderOpen,
    },
    {
      name: "Congés",
      url: "/leaves",
      icon: Palmtree,
    },
    {
      name: "Notifications",
      url: "/notifications",
      icon: Bell,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading } = useAuth()

  // Construire les données utilisateur
  const firstName = user?.user_metadata?.first_name
  const lastName = user?.user_metadata?.last_name
  const fullName = firstName && lastName 
    ? `${firstName} ${lastName}`
    : user?.email?.split('@')[0] || "Utilisateur"
  
  const userData = {
    name: fullName,
    email: user?.email || "",
    avatar: user?.user_metadata?.avatar_url || "/avatars/shadcn.jpeg",
    initials: firstName && lastName 
      ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
      : (user?.email?.charAt(0) || "U").toUpperCase(),
  }

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
                <Sparkles className="!size-5" aria-hidden="true" />
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

