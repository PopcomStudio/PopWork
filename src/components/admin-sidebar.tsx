"use client"

import * as React from "react"
import {
  Settings,
  Users,
  Activity,
  BarChart3,
  Palmtree,
  Building,
} from "lucide-react"
import { Logo } from "@/components/logo"

import { useAuth } from "@/features/auth/hooks/use-auth"
import { useProfile } from "@/features/settings/hooks/use-profile"

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

const getAdminData = () => ({
  navMain: [
    {
      title: "Tableau de bord",
      url: "/admin",
      icon: BarChart3,
    },
    {
      title: "Gestion des utilisateurs",
      url: "/admin/users",
      icon: Users,
    },
    {
      title: "Gestion des équipes",
      url: "/admin/teams",
      icon: Building,
    },
    {
      title: "Gestion des congés",
      url: "/admin/leaves",
      icon: Palmtree,
    },
  ],
  navSecondary: [
    {
      title: "Journal d'audit",
      url: "/admin/audit-log",
      icon: Activity,
    },
    {
      title: "Paramètres système",
      url: "/admin/settings",
      icon: Settings,
    },
  ],
})

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()

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
              <a href="/admin" aria-label="Aller au tableau de bord admin PopWork">
                <Logo className="!h-7" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getAdminData().navMain} />
        <NavSecondary items={getAdminData().navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {!loading && <NavUser user={userData} />}
      </SidebarFooter>
    </Sidebar>
  )
}