"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useProjects } from "@/features/projects/hooks/use-projects"

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/entreprises': 'Entreprises',
  '/services': 'Services',
  '/contacts': 'Contacts',
  '/projects': 'Projets & Tâches',
  '/time-tracking': 'Time Tracking',
  '/invoicing': 'Facturation',
  '/team': 'Équipe',
  '/calendar': 'Calendrier',
  '/settings': 'Settings',
}

const getPageName = (pathname: string): string => {
  return pageNames[pathname] || 'Dashboard'
}

export function SiteHeader() {
  const pathname = usePathname()
  const { projects, loading } = useProjects()
  const [currentProject, setCurrentProject] = useState<{ id: string; name: string } | null>(null)

  // Détecter si on est sur une page de détail de projet
  const isProjectDetailPage = pathname.startsWith('/projects/') && pathname !== '/projects'
  const projectId = isProjectDetailPage ? pathname.split('/')[2] : null

  // Récupérer le projet actuel si on est sur une page de détail
  useEffect(() => {
    if (projectId && projects.length > 0 && !loading) {
      const project = projects.find(p => p.id === projectId)
      if (project) {
        setCurrentProject({ id: project.id, name: project.name })
      }
    } else {
      setCurrentProject(null)
    }
  }, [projectId, projects, loading])

  const pageName = getPageName(pathname)

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {isProjectDetailPage && currentProject ? (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/projects">Projets</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">{currentProject.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <h1 className="text-base font-medium">{pageName}</h1>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/Kwickos/PopWork"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
