"use client"

import * as React from "react"
import {
  IconCalendar,
  IconChartBar,
  IconClock,
  IconDashboard,
  IconFileInvoice,
  IconFolder,
  IconFolderOpen,
  IconHistory,
  IconInnerShadowTop,
  IconBell,
  IconSearch,
  IconSettings,
  IconBeach,
  IconUsers,
  IconUserCog,
  IconBuilding,
  IconPhone,
  IconUserCheck,
} from "@tabler/icons-react"

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

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpeg",
  },
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
      url: "/clients/companies",
      icon: IconBuilding,
    },
    {
      name: "Services",
      url: "/clients/services", 
      icon: IconPhone,
    },
    {
      name: "Contacts",
      url: "/clients/contacts",
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
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">PopWork</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.navClients} title="Clients" showActions={false} />
        <NavDocuments items={data.documents} title="Ressources" showActions={false} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}