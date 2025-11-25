"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Archive,
  FileText,
  Edit,
  Users,
  ListChecks,
  Columns,
  Activity,
  Folder,
  Info,
  Settings,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useProjects, type Project } from '../hooks/use-projects'
import { useRolesPermissions, type UserWithRole } from '../../auth/hooks/use-roles-permissions'
import { useProjectMembers } from '../hooks/use-project-members'
import { ProjectMembersTable } from './project-members-table'
import type { ProjectMemberRole } from '../types/project-members'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { KanbanBoard } from './kanban/KanbanBoard'
import { ProjectGanttView } from './project-gantt-view'
import { ProjectCalendarView } from './project-calendar-view'
import { ProjectFilesManager } from './project-files-manager'
import { ProjectDocuments } from './administration/project-documents'
import { ProjectDeliverablesSimple } from './administration/project-deliverables-simple'

interface ProjectDetailViewProps {
  projectId: string
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
  isAssigned: boolean
}



export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const router = useRouter()
  const { projects, loading, error, updateProject, fetchProjectAssignees, saveProjectAssignees } = useProjects()
  const { fetchAllUsers } = useRolesPermissions()
  const {
    members: projectMembers,
    availableUsers: availableProjectUsers,
    loading: membersLoading,
    addProjectMember,
    updateProjectMemberRole,
    removeProjectMember,
  } = useProjectMembers(projectId)
  const [project, setProject] = useState<Project | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [assignedMembers, setAssignedMembers] = useState<TeamMember[]>([])
  
  // États pour l'édition
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    status: '',
  })
  const [editLoading, setEditLoading] = useState(false)
  
  // États pour la gestion d'équipe
  const [availableUsers, setAvailableUsers] = useState<UserWithRole[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    if (!loading && projects.length > 0) {
      const foundProject = projects.find(p => p.id === projectId)
      if (foundProject) {
        setProject(foundProject)
        // Initialiser le formulaire d'édition
        setEditForm({
          name: foundProject.name,
          description: foundProject.description || '',
          status: foundProject.status,
        })
        
        // Initialiser l'affichage de l&apos;équipe avec les vraies données si disponibles
        initializeTeamDisplay()
      }
    }
  }, [projects, loading, projectId])

  // Initialiser l'affichage de l&apos;équipe avec les vraies données depuis la DB
  const initializeTeamDisplay = async () => {
    try {
      const assignments = await fetchProjectAssignees(projectId)
      
      const members: TeamMember[] = assignments.map(assignment => ({
        id: assignment.user.id,
        name: `${assignment.user.firstName} ${assignment.user.lastName}`,
        email: assignment.user.email,
        role: assignment.user.roleName,
        isAssigned: true,
      }))
      
      setAssignedMembers(members)
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'équipe:', error)
      // En cas d'erreur, garder un tableau vide
      setAssignedMembers([])
    }
  }

  // Charger les utilisateurs disponibles et leurs assignations actuelles
  const loadAvailableUsers = async () => {
    try {
      setUsersLoading(true)
      const users = await fetchAllUsers()
      setAvailableUsers(users)
      
      // Récupérer les assignations actuelles du projet
      const assignments = await fetchProjectAssignees(projectId)
      const currentlyAssignedUserIds = assignments.map(assignment => assignment.user.id)
      setSelectedUserIds(currentlyAssignedUserIds)
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
      // En cas d'erreur, garder les listes vides
      setSelectedUserIds([])
    } finally {
      setUsersLoading(false)
    }
  }

  // Ouvrir le dialog d'édition
  const handleEditClick = async () => {
    if (project) {
      setEditForm({
        name: project.name,
        description: project.description || '',
        status: project.status,
      })
      
      // Ouvrir le dialog immédiatement
      setIsEditDialogOpen(true)
      
      // Charger les utilisateurs en arrière-plan (ne pas bloquer l'ouverture)
      try {
        await loadAvailableUsers()
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error)
        // Le dialog reste ouvert même en cas d'erreur
      }
    }
  }

  // Sauvegarder les modifications
  const handleSaveEdit = async () => {
    if (!project) return

    try {
      setEditLoading(true)
      
      // Sauvegarder les informations du projet
      await updateProject({
        id: project.id,
        name: editForm.name,
        description: editForm.description || undefined,
        status: editForm.status as Project['status'],
        company_id: project.company_id,
        service_id: project.service_id,
      })
      
      // Sauvegarder les assignations d'équipe
      await handleUpdateAssignments(selectedUserIds)
      
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error('Erreur lors de la modification:', error)
    } finally {
      setEditLoading(false)
    }
  }

  // Gérer la sélection/désélection d'un utilisateur
  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Gérer l'assignation d'équipe
  const handleUpdateAssignments = async (assignedMemberIds: string[]) => {
    try {
      // Sauvegarder en base de données
      await saveProjectAssignees(projectId, assignedMemberIds)
      
      // Mettre à jour l'état local pour l'affichage immédiat
      const assignedUsers = availableUsers.filter(user => 
        assignedMemberIds.includes(user.id)
      )
      
      const updatedMembers: TeamMember[] = assignedUsers.map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role?.name || 'Utilisateur',
        isAssigned: true,
      }))
      
      setAssignedMembers(updatedMembers)
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des assignations:', error)
      throw error
    }
  }

  // Handlers pour la nouvelle table de membres
  const handleAddMember = async (userId: string, role: ProjectMemberRole) => {
    await addProjectMember({ projectId, userId, role })
  }

  const handleUpdateMemberRole = async (memberId: string, role: ProjectMemberRole) => {
    await updateProjectMemberRole(memberId, role)
  }

  const handleRemoveMember = async (memberId: string) => {
    await removeProjectMember(memberId)
  }

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux projets
          </Button>
        </div>
        <Alert>
          <AlertDescription>Projet non trouvé</AlertDescription>
        </Alert>
      </div>
    )
  }

  const statusInfo = getStatusInfo(project.status)
  const StatusIcon = statusInfo.icon
  const percentage = project.task_count > 0 ? Math.round((project.completed_tasks / project.task_count) * 100) : 0

  return (
    <>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge variant={statusInfo.variant} className={statusInfo.className}>
              <StatusIcon className="h-4 w-4 mr-2" />
              {statusInfo.label}
            </Badge>
          </div>
          <Button variant="outline" onClick={handleEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>

        {/* Onglets de navigation du projet */}
        <Tabs defaultValue="information" className="w-full">
          <TabsList className="grid grid-cols-7">
            <TabsTrigger value="information" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Information
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Membres
            </TabsTrigger>
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Columns className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="gantt" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Gant
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendrier
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Fichiers
            </TabsTrigger>
            <TabsTrigger value="administration" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Administration
            </TabsTrigger>
          </TabsList>

          {/* Onglet Information */}
          <TabsContent value="information" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colonne principale */}
              <div className="lg:col-span-2 space-y-6">
                {/* Informations générales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Informations générales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Entreprise</label>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span>{project.company_name}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Service</label>
                        <Badge variant="secondary">{project.service_name}</Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Créé le</label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(project.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Dernière modification</label>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(project.updated_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </div>
                    {project.description && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p className="text-sm leading-relaxed">{project.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Progression */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      Progression du projet
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-2xl font-bold">{percentage}%</div>
                        <div className="text-sm text-muted-foreground">
                          {project.completed_tasks} sur {project.task_count} tâches terminées
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Tâches restantes</div>
                        <div className="text-xl font-semibold">
                          {project.task_count - project.completed_tasks}
                        </div>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-3" />
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Actions rapides */}
                <Card>
                  <CardHeader>
                    <CardTitle>Actions rapides</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <ListChecks className="h-4 w-4 mr-2" />
                      Voir les tâches
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Planning
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Documents
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Onglet Membres */}
          <TabsContent value="members" className="space-y-6 mt-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Equipe du projet ({projectMembers.length})</h2>
            </div>

            <ProjectMembersTable
              members={projectMembers}
              availableUsers={availableProjectUsers}
              loading={membersLoading}
              onAddMember={handleAddMember}
              onUpdateRole={handleUpdateMemberRole}
              onRemoveMember={handleRemoveMember}
            />
          </TabsContent>

          {/* Onglet Kanban */}
          <TabsContent value="kanban" className="space-y-6 mt-6">
            <KanbanBoard projectId={projectId} />
          </TabsContent>

          {/* Onglet Gant */}
          <TabsContent value="gantt" className="space-y-6 mt-6">
            <ProjectGanttView projectId={projectId} />
          </TabsContent>

          {/* Onglet Calendrier */}
          <TabsContent value="calendar" className="space-y-6 mt-6">
            <ProjectCalendarView projectId={projectId} />
          </TabsContent>

          {/* Onglet Fichiers */}
          <TabsContent value="files" className="space-y-6 mt-6">
            <ProjectFilesManager projectId={projectId} />
          </TabsContent>
                     {/* Onglet Administration */}
          <TabsContent value="administration" className="space-y-6 mt-6">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Administration du projet</h2>
            </div>

            <div className="space-y-6">
              <ProjectDocuments projectId={projectId} />
              <ProjectDeliverablesSimple projectId={projectId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Modifier le projet
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Informations générales</TabsTrigger>
              <TabsTrigger value="team">Équipe ({selectedUserIds.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nom du projet</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du projet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Statut</Label>
                <Select 
                  value={editForm.status} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                    <SelectItem value="archived">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description du projet (optionnel)"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <div className="space-y-2">
                <Label>Assignation d'équipe</Label>
                <p className="text-sm text-muted-foreground">
                  Sélectionnez les membres de l&apos;équipe qui travailleront sur ce projet.
                </p>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Chargement des utilisateurs...</div>
                </div>
              ) : (
                <div className="h-64 overflow-y-auto border rounded-md p-2">
                  <div className="space-y-2">
                    {availableUsers.map((user) => {
                      const isSelected = selectedUserIds.includes(user.id)
                      const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()

                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer"
                          onClick={() => handleUserToggle(user.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleUserToggle(user.id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.role?.name || 'Aucun rôle'} • {user.email}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {availableUsers.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Aucun utilisateur disponible
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {selectedUserIds.length} membre{selectedUserIds.length > 1 ? 's' : ''} sélectionné{selectedUserIds.length > 1 ? 's' : ''}
              </div>
            </TabsContent>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={editLoading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editLoading}
              >
                {editLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
} 