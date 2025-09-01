"use client"

import { type LucideIcon } from "lucide-react"

import { CmdKNavigation } from "@/components/cmd-k-navigation"
import { NotificationBell } from "@/features/notifications/components/NotificationBell"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 flex-nowrap min-w-0">
              <div className="flex-1 min-w-0">
                <CmdKNavigation />
              </div>
              <div className="flex-shrink-0">
                <NotificationBell />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
