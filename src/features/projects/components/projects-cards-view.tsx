"use client"

import * as React from "react"
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  CheckCircle,
  Clock,
  Archive,
  FileText,
  Building,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Project } from '../hooks/use-projects'

interface ProjectsCardsViewProps {
  data: Project[]
  onNewProject: () => void
}

export function ProjectsCardsView({
  data: projects,
  onNewProject,
}: ProjectsCardsViewProps) {
  const [globalFilter, setGlobalFilter] = React.useState("")
  const router = useRouter()

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Brouillon',
          variant: 'secondary' as const,
          icon: FileText,
          className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
        }
      case 'active':
        return {
          label: 'Actif',
          variant: 'default' as const,
          icon: Clock,
          className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        }
      case 'completed':
        return {
          label: 'Terminé',
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        }
      case 'archived':
        return {
          label: 'Archivé',
          variant: 'outline' as const,
          icon: Archive,
          className: 'bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600',
        }
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          icon: FileText,
          className: '',
        }
    }
  }

  // Filtrer les projets en fonction de la recherche
  const filteredProjects = React.useMemo(() => {
    if (!globalFilter) return projects

    const searchTerm = globalFilter.toLowerCase()
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      project.company_name.toLowerCase().includes(searchTerm) ||
      project.service_name.toLowerCase().includes(searchTerm) ||
      (project.description && project.description.toLowerCase().includes(searchTerm))
    )
  }, [projects, globalFilter])

  return (
    <div className="w-full space-y-6">
      {/* Barre de recherche et bouton nouveau projet */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <Search className="h-4 w-4 opacity-50" />
          <Input
            placeholder="Rechercher par nom, entreprise ou service..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="flex-1"
          />
        </div>
        <Button variant="default" size="sm" onClick={onNewProject}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      {/* Grille de cards */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {globalFilter ? 'Aucun projet trouvé pour cette recherche' : 'Aucun projet trouvé'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const statusInfo = getStatusInfo(project.status)
            const StatusIcon = statusInfo.icon
            const percentage = project.task_count > 0 ? Math.round((project.completed_tasks / project.task_count) * 100) : 0

            return (
              <Card 
                key={project.id} 
                className="group hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-4 w-4" />
                      <span className="truncate">{project.company_name}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Service et Statut */}
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {project.service_name}
                    </Badge>
                    <Badge variant={statusInfo.variant} className={`text-xs ${statusInfo.className}`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Progression */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">
                        {project.completed_tasks}/{project.task_count} tâches ({percentage}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>

                  {/* Assignés */}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="flex -space-x-1">
                      {/* Afficher les avatars des premiers membres */}
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          AD
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                          BM
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs bg-green-100 text-green-700">
                          CL
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <span className="text-xs text-muted-foreground ml-1">
                      3 assignés
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Créé le {new Date(project.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
} 