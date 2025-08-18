"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { 
  Users, 
  Briefcase, 
  Plus, 
  Trash2, 
  Crown, 
  User,
  Shield,
  X,
  Settings,
  UserPlus,
  FolderPlus
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageCropModal } from '@/components/ImageCropModal'
import { useTeamMembers } from '../hooks/use-team-members'
import { useTeamProjects } from '../hooks/use-team-projects'
import type { 
  TeamWithStats, 
  CreateTeamData, 
  UpdateTeamData,
  TeamMemberWithUser,
  TeamProjectWithDetails
} from '../types'

const teamSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  color: z.string().optional(),
  avatar_url: z.string().url("URL invalide").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
})

type TeamFormData = z.infer<typeof teamSchema>

interface TeamDialogsProps {
  isCreateOpen: boolean
  isEditOpen: boolean
  selectedTeam: TeamWithStats | null
  onCreateOpenChange: (open: boolean) => void
  onEditOpenChange: (open: boolean) => void
  onCreateTeam: (data: CreateTeamData) => Promise<TeamWithStats>
  onUpdateTeam: (data: UpdateTeamData) => Promise<TeamWithStats>
  onUploadTeamAvatar?: (teamId: string, file: File) => Promise<{ success?: boolean; avatar_url?: string; error?: string }>
  onRemoveTeamAvatar?: (teamId: string) => Promise<{ success?: boolean; error?: string }>
  onTeamsRefetch?: () => void
}

const TEAM_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#06b6d4', '#3b82f6', '#84cc16', '#f97316'
]

export function TeamDialogs({
  isCreateOpen,
  isEditOpen,
  selectedTeam,
  onCreateOpenChange,
  onEditOpenChange,
  onCreateTeam,
  onUpdateTeam,
  onUploadTeamAvatar,
  onRemoveTeamAvatar,
  onTeamsRefetch,
}: TeamDialogsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedTab, setSelectedTab] = useState('details')
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0])

  // Hooks pour la gestion des membres et projets
  const { 
    members, 
    availableUsers, 
    loading: membersLoading, 
    addTeamMember, 
    removeTeamMember,
    changeTeamMemberRole,
    fetchTeamMembers,
    fetchAvailableUsers
  } = useTeamMembers(selectedTeam?.id, onTeamsRefetch)

  const { 
    teamProjects, 
    availableProjects, 
    loading: projectsLoading, 
    assignTeamToProject, 
    removeTeamFromProject,
    fetchTeamProjects,
    fetchAvailableProjects
  } = useTeamProjects(selectedTeam?.id, onTeamsRefetch)

  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleAvatarChange called', event.target.files)
    const file = event.target.files?.[0]
    if (file) {
      console.log('File selected:', file.name)
      setSelectedImageFile(file)
      setCropModalOpen(true)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAvatarClick = () => {
    console.log('Avatar clicked', fileInputRef.current)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleCropComplete = async (croppedFile: File) => {
    // Pour l'édition d'équipe existante, uploader directement
    if (isEditOpen && selectedTeam && onUploadTeamAvatar) {
      console.log('Upload direct pour équipe existante:', selectedTeam.id)
      const uploadResult = await onUploadTeamAvatar(selectedTeam.id, croppedFile)
      
      if (uploadResult.error) {
        console.error('Erreur upload avatar:', uploadResult.error)
      } else {
        // Mettre à jour le formulaire avec la vraie URL
        editForm.setValue('avatar_url', uploadResult.avatar_url || '')
      }
    } else {
      // Pour la création, créer une URL temporaire et stocker le fichier
      const imageUrl = URL.createObjectURL(croppedFile)
      createForm.setValue('avatar_url', imageUrl)
      setSelectedImageFile(croppedFile)
    }
  }

  const handleCropCancel = () => {
    setSelectedImageFile(null)
  }

  const createForm = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      description: '',
      color: TEAM_COLORS[0],
      avatar_url: '',
      is_active: true,
    },
  })

  const editForm = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: '',
      description: '',
      color: TEAM_COLORS[0],
      avatar_url: '',
      is_active: true,
    },
  })

  // Réinitialiser le formulaire d'édition quand l'équipe sélectionnée change
  useEffect(() => {
    if (selectedTeam && isEditOpen) {
      editForm.reset({
        name: selectedTeam.name,
        description: selectedTeam.description || '',
        color: selectedTeam.color || TEAM_COLORS[0],
        avatar_url: selectedTeam.avatar_url || '',
        is_active: selectedTeam.is_active,
      })
      setSelectedColor(selectedTeam.color || TEAM_COLORS[0])
      
      // Charger les données de l'équipe
      fetchTeamMembers(selectedTeam.id)
      fetchAvailableUsers(selectedTeam.id)
      fetchTeamProjects(selectedTeam.id)
      fetchAvailableProjects(selectedTeam.id)
    }
  }, [selectedTeam, isEditOpen, editForm, fetchTeamMembers, fetchAvailableUsers, fetchTeamProjects, fetchAvailableProjects])

  const handleCreateSubmit = async (data: TeamFormData) => {
    setIsSubmitting(true)
    try {
      // D'abord créer l'équipe sans avatar
      const teamData = {
        ...data,
        color: selectedColor,
        avatar_url: undefined, // On va l'uploader après
      }
      
      // Créer l'équipe et récupérer l'objet complet
      const newTeam = await onCreateTeam(teamData)
      
      // Si on a un fichier image sélectionné et la fonction d'upload, l'uploader
      if (selectedImageFile && onUploadTeamAvatar && newTeam?.id) {
        console.log('Upload avatar pour équipe:', newTeam.id)
        const uploadResult = await onUploadTeamAvatar(newTeam.id, selectedImageFile)
        
        if (uploadResult.error) {
          console.error('Erreur upload avatar:', uploadResult.error)
          // On continue quand même, l'équipe est créée
        }
      }
      
      createForm.reset()
      setSelectedColor(TEAM_COLORS[0])
      setSelectedImageFile(null)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async (data: TeamFormData) => {
    if (!selectedTeam) return
    
    setIsSubmitting(true)
    try {
      await onUpdateTeam({
        ...data,
        id: selectedTeam.id,
        color: selectedColor,
        avatar_url: data.avatar_url || undefined,
      })
      setSelectedImageFile(null)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddMember = async (userId: string, role: 'member' | 'lead' | 'admin' = 'member') => {
    if (!selectedTeam) return
    
    try {
      await addTeamMember({
        team_id: selectedTeam.id,
        user_id: userId,
        role,
      })
    } catch (error) {
      console.error('Erreur lors de l\'ajout du membre:', error)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      if (confirm('Êtes-vous sûr de vouloir retirer ce membre de l\'équipe ?')) {
        await removeTeamMember(memberId)
      }
    } catch (error) {
      console.error('Erreur lors du retrait du membre:', error)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: 'member' | 'lead' | 'admin') => {
    try {
      await changeTeamMemberRole(memberId, newRole)
    } catch (error) {
      console.error('Erreur lors du changement de rôle:', error)
    }
  }

  const handleAssignProject = async (projectId: string) => {
    if (!selectedTeam) return
    
    try {
      await assignTeamToProject({
        team_id: selectedTeam.id,
        project_id: projectId,
        permissions: {
          can_view: true,
          can_edit: false,
          can_delete: false
        }
      })
    } catch (error) {
      console.error('Erreur lors de l\'assignation du projet:', error)
    }
  }

  const handleRemoveProject = async (assignmentId: string) => {
    try {
      if (confirm('Êtes-vous sûr de vouloir retirer ce projet de l\'équipe ?')) {
        await removeTeamFromProject(assignmentId)
      }
    } catch (error) {
      console.error('Erreur lors du retrait du projet:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />
      case 'lead':
        return <Crown className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'lead':
        return 'Lead'
      default:
        return 'Membre'
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      active: 'default',
      completed: 'default',
      archived: 'secondary'
    } as const

    const labels = {
      draft: 'Brouillon',
      active: 'Actif',
      completed: 'Terminé',
      archived: 'Archivé'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  return (
    <>
      {/* Input file partagé */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
      />

      {/* Dialog de création */}
      <Dialog open={isCreateOpen} onOpenChange={onCreateOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Créer une nouvelle équipe</DialogTitle>
            <DialogDescription>
              Créez une nouvelle équipe pour organiser votre travail collaboratif.
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'équipe</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom de l'équipe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (optionnel)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description de l'équipe..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Photo de l'équipe</Label>
                    <div className="flex flex-col items-center space-y-3">
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={isSubmitting}
                        className="group relative"
                      >
                        <Avatar className="h-20 w-20 cursor-pointer transition-all group-hover:brightness-75">
                          <AvatarImage src={createForm.watch('avatar_url')} />
                          <AvatarFallback 
                            className="text-xl font-semibold" 
                            style={{ backgroundColor: selectedColor }}
                          >
                            {createForm.watch('name') ? getTeamInitials(createForm.watch('name')) : 'EQ'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                          <span className="text-white text-xs font-medium">Changer</span>
                        </div>
                      </button>
                      {createForm.watch('avatar_url') && (
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="text-muted-foreground"
                          onClick={() => createForm.setValue('avatar_url', '')}
                          disabled={isSubmitting}
                        >
                          Supprimer l'image
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground text-center">
                        Cliquez sur l'avatar pour changer l'image<br />
                        PNG, JPEG et WebP supportés, max 10MB
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Couleur de l'équipe</Label>
                    <div className="flex gap-2 flex-wrap">
                      {TEAM_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            selectedColor === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setSelectedColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onCreateOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Création...' : 'Créer l\'équipe'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog d'édition */}
      <Dialog open={isEditOpen} onOpenChange={onEditOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gestion de l'équipe: {selectedTeam?.name}
            </DialogTitle>
            <DialogDescription>
              Gérez les détails, membres et projets de votre équipe.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membres ({members.length})
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Projets ({teamProjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                  {/* Photo de profil en haut alignée à gauche */}
                  <div className="space-y-2">
                    <Label>Photo de l'équipe</Label>
                    <div className="flex items-start space-x-4">
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={isSubmitting}
                        className="group relative flex-shrink-0"
                      >
                        <Avatar className="h-20 w-20 cursor-pointer transition-all group-hover:brightness-75">
                          <AvatarImage src={editForm.watch('avatar_url')} />
                          <AvatarFallback 
                            className="text-xl font-semibold" 
                            style={{ backgroundColor: selectedColor }}
                          >
                            {editForm.watch('name') ? getTeamInitials(editForm.watch('name')) : 'EQ'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full">
                          <span className="text-white text-xs font-medium">Changer</span>
                        </div>
                      </button>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Cliquez sur l'avatar pour changer l'image<br />
                          PNG, JPEG et WebP supportés, max 10MB
                        </p>
                        {editForm.watch('avatar_url') && (
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground h-8"
                            onClick={() => editForm.setValue('avatar_url', '')}
                            disabled={isSubmitting}
                          >
                            Supprimer l'image
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'équipe</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom de l'équipe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Description de l'équipe..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">

                    <div className="space-y-2">
                      <Label>Couleur de l'équipe</Label>
                      <div className="flex gap-2 flex-wrap">
                        {TEAM_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              selectedColor === color ? 'border-gray-900' : 'border-gray-300'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setSelectedColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>


                  <FormField
                    control={editForm.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Équipe active</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Une équipe inactive ne peut pas être assignée à de nouveaux projets.
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Membres de l'équipe</h4>
                {availableUsers.length > 0 && (
                  <Select onValueChange={(userId) => handleAddMember(userId)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Ajouter un membre" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {user.firstName[0]}{user.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>{user.firstName} {user.lastName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {membersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <UserPlus className="h-8 w-8 mx-auto mb-2" />
                  <p>Aucun membre dans cette équipe</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {member.user?.firstName[0]}{member.user?.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {member.user?.firstName} {member.user?.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {member.user?.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={member.role} 
                          onValueChange={(role: 'member' | 'lead' | 'admin') => 
                            handleChangeRole(member.id, role)
                          }
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Membre
                              </div>
                            </SelectItem>
                            <SelectItem value="lead">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4" />
                                Lead
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="projects" className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Projets assignés</h4>
                {availableProjects.length > 0 && (
                  <Select onValueChange={(projectId) => handleAssignProject(projectId)}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Assigner un projet" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div>
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {project.company_name}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {projectsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : teamProjects.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <FolderPlus className="h-8 w-8 mx-auto mb-2" />
                  <p>Aucun projet assigné à cette équipe</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamProjects.map((assignment) => (
                    <div 
                      key={assignment.id} 
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{assignment.project?.name}</div>
                          {assignment.project?.status && getStatusBadge(assignment.project.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {assignment.project?.company_name} • {assignment.project?.service_name}
                        </div>
                        {assignment.project?.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {assignment.project.description}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProject(assignment.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modal de crop d'image */}
      <ImageCropModal
        open={cropModalOpen}
        onOpenChange={setCropModalOpen}
        imageFile={selectedImageFile}
        onCropComplete={handleCropComplete}
        onCancel={handleCropCancel}
      />
    </>
  )
}
