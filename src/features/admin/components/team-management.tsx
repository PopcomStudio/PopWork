"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClientComponentClient } from '@/lib/supabase'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { Icons } from '@/components/ui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, UserPlus, Settings, Trash2, Edit, Shield, Activity } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const teamFormSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  description: z.string().optional(),
  team_lead_id: z.string().optional(),
})

const memberFormSchema = z.object({
  user_id: z.string().min(1, 'Un utilisateur doit être sélectionné'),
  role: z.enum(['leader', 'member']),
})

type TeamFormData = z.infer<typeof teamFormSchema>
type MemberFormData = z.infer<typeof memberFormSchema>

interface Team {
  id: string
  name: string
  description: string | null
  team_lead_id: string | null
  created_at: string
  team_lead?: {
    first_name: string
    last_name: string
    email: string
  }
  member_count?: number
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: string
  joined_at: string
  user: {
    id: string
    first_name: string
    last_name: string
    email: string
    avatar_url?: string
  }
}

export function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  const supabase = createClientComponentClient()

  const teamForm = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
  })

  const memberForm = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      role: 'member'
    }
  })

  // Fetch teams
  const fetchTeams = async () => {
    try {
      setLoading(true)
      
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_lead:users!teams_team_lead_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
      
      if (teamsError) throw teamsError

      // Get member counts
      const teamsWithCounts = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { count } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id)
          
          return {
            ...team,
            member_count: count || 0
          }
        })
      )

      setTeams(teamsWithCounts)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des équipes')
    } finally {
      setLoading(false)
    }
  }

  // Fetch team members
  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user:users(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('team_id', teamId)
        .order('joined_at', { ascending: false })
      
      if (error) throw error
      setTeamMembers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des membres')
    }
  }

  // Fetch available users for adding to team
  const fetchAvailableUsers = async () => {
    try {
      const { data: allUsers, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .order('first_name')
      
      if (error) throw error
      
      // Filter out users already in the selected team
      if (selectedTeam) {
        const memberUserIds = teamMembers.map(m => m.user_id)
        const available = allUsers?.filter(u => !memberUserIds.includes(u.id)) || []
        setAvailableUsers(available)
      } else {
        setAvailableUsers(allUsers || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des utilisateurs')
    }
  }

  // Create or update team
  const onSubmitTeam = async (data: TeamFormData) => {
    try {
      setActionLoading(true)
      
      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update({
            name: data.name,
            description: data.description || null,
            team_lead_id: data.team_lead_id || null,
          })
          .eq('id', editingTeam.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('teams')
          .insert({
            name: data.name,
            description: data.description || null,
            team_lead_id: data.team_lead_id || null,
          })
        
        if (error) throw error
      }

      await fetchTeams()
      setIsTeamDialogOpen(false)
      teamForm.reset()
      setEditingTeam(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    } finally {
      setActionLoading(false)
    }
  }

  // Add member to team
  const onSubmitMember = async (data: MemberFormData) => {
    if (!selectedTeam) return
    
    try {
      setActionLoading(true)
      
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: selectedTeam.id,
          user_id: data.user_id,
          role: data.role,
        })
      
      if (error) throw error
      
      await fetchTeamMembers(selectedTeam.id)
      await fetchAvailableUsers()
      setIsMemberDialogOpen(false)
      memberForm.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout du membre')
    } finally {
      setActionLoading(false)
    }
  }

  // Remove member from team
  const removeMember = async (memberId: string) => {
    if (!selectedTeam) return
    
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
      
      if (error) throw error
      
      await fetchTeamMembers(selectedTeam.id)
      await fetchAvailableUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  // Delete team
  const deleteTeam = async (teamId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return
    
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
      
      if (error) throw error
      
      await fetchTeams()
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(null)
        setTeamMembers([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  // Update member role
  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)
      
      if (error) throw error
      
      if (selectedTeam) {
        await fetchTeamMembers(selectedTeam.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id)
    }
  }, [selectedTeam])

  useEffect(() => {
    if (selectedTeam) {
      fetchAvailableUsers()
    }
  }, [selectedTeam, teamMembers])

  // Open edit dialog
  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    teamForm.setValue('name', team.name)
    teamForm.setValue('description', team.description || '')
    teamForm.setValue('team_lead_id', team.team_lead_id || '')
    setIsTeamDialogOpen(true)
  }

  return (
    <ProtectedRoute requiredPermission="admin.*">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestion des équipes</h2>
            <p className="text-muted-foreground">
              Gérez les équipes et leurs membres
            </p>
          </div>
          
          <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTeam(null)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Nouvelle équipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTeam ? 'Modifier l\'équipe' : 'Nouvelle équipe'}
                </DialogTitle>
                <DialogDescription>
                  {editingTeam ? 'Modifiez les informations de l\'équipe' : 'Créez une nouvelle équipe'}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={teamForm.handleSubmit(onSubmitTeam)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'équipe</Label>
                  <Input
                    id="name"
                    {...teamForm.register('name')}
                  />
                  {teamForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {teamForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...teamForm.register('description')}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team_lead_id">Chef d'équipe</Label>
                  <Select 
                    onValueChange={(value) => teamForm.setValue('team_lead_id', value)}
                    defaultValue={teamForm.watch('team_lead_id')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un chef d'équipe (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsTeamDialogOpen(false)
                      teamForm.reset()
                      setEditingTeam(null)
                    }}
                    disabled={actionLoading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTeam ? 'Modifier' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="teams" className="space-y-4">
          <TabsList>
            <TabsTrigger value="teams">Équipes</TabsTrigger>
            <TabsTrigger value="members" disabled={!selectedTeam}>
              Membres {selectedTeam && `(${teamMembers.length})`}
            </TabsTrigger>
            <TabsTrigger value="activity">Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Toutes les équipes</CardTitle>
                <CardDescription>
                  {teams.length} équipe{teams.length > 1 ? 's' : ''} au total
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Icons.spinner className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Chef d'équipe</TableHead>
                        <TableHead>Membres</TableHead>
                        <TableHead>Créée le</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teams.map((team) => (
                        <TableRow 
                          key={team.id}
                          className={selectedTeam?.id === team.id ? 'bg-muted/50' : ''}
                        >
                          <TableCell className="font-medium">{team.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {team.description || '-'}
                          </TableCell>
                          <TableCell>
                            {team.team_lead ? (
                              <div className="flex items-center space-x-2">
                                <Shield className="h-3 w-3" />
                                <span className="text-sm">
                                  {team.team_lead.first_name} {team.team_lead.last_name}
                                </span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {team.member_count} membre{team.member_count! > 1 ? 's' : ''}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(team.created_at).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => setSelectedTeam(team)}
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  Voir les membres
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleEditTeam(team)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteTeam(team.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {teams.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Aucune équipe trouvée
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            {selectedTeam && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Membres de {selectedTeam.name}</CardTitle>
                      <CardDescription>
                        Gérez les membres de cette équipe
                      </CardDescription>
                    </div>
                    
                    <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Ajouter un membre
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajouter un membre</DialogTitle>
                          <DialogDescription>
                            Ajoutez un utilisateur à l'équipe {selectedTeam.name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <form onSubmit={memberForm.handleSubmit(onSubmitMember)} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="user_id">Utilisateur</Label>
                            <Select 
                              onValueChange={(value) => memberForm.setValue('user_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un utilisateur" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableUsers.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.first_name} {user.last_name} ({user.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {memberForm.formState.errors.user_id && (
                              <p className="text-sm text-destructive">
                                {memberForm.formState.errors.user_id.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="role">Rôle dans l'équipe</Label>
                            <Select 
                              onValueChange={(value) => memberForm.setValue('role', value as 'leader' | 'member')}
                              defaultValue="member"
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Membre</SelectItem>
                                <SelectItem value="leader">Chef d'équipe</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsMemberDialogOpen(false)
                                memberForm.reset()
                              }}
                              disabled={actionLoading}
                            >
                              Annuler
                            </Button>
                            <Button type="submit" disabled={actionLoading}>
                              {actionLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                              Ajouter
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Membre</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead>Rejoint le</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.user.avatar_url} />
                                  <AvatarFallback>
                                    {member.user.first_name[0]}{member.user.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  {member.user.first_name} {member.user.last_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{member.user.email}</TableCell>
                            <TableCell>
                              <Select
                                value={member.role}
                                onValueChange={(value) => updateMemberRole(member.id, value)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Membre</SelectItem>
                                  <SelectItem value="leader">Chef</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {new Date(member.joined_at).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMember(member.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {teamMembers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Aucun membre dans cette équipe
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Activité des équipes</CardTitle>
                <CardDescription>
                  Historique des actions sur les équipes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Fonctionnalité à venir
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}