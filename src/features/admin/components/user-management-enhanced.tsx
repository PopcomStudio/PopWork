"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRolesPermissions, type UserWithRole, type Role } from '@/features/auth/hooks/use-roles-permissions'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { Icons } from '@/components/ui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClientComponentClient } from '@/lib/supabase'
import {
  Search,
  UserPlus,
  MoreHorizontal,
  Mail,
  Shield,
  User,
  Edit,
  Trash2,
  Send,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Filter,
  Download,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

const inviteFormSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  role_id: z.string().min(1, 'Un rôle doit être sélectionné'),
  team_id: z.string().optional(),
})

type InviteFormData = z.infer<typeof inviteFormSchema>

interface Invitation {
  id: string
  email: string
  role_id: string
  team_id: string | null
  token: string
  invited_by: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  role?: Role
  team?: { name: string }
  inviter?: { first_name: string; last_name: string }
}

export function UserManagementEnhanced() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('users')
  
  const supabase = createClientComponentClient()
  
  const {
    roles,
    fetchAllUsers,
    updateUserRole,
    loading: rolesLoading
  } = useRolesPermissions()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: '',
      role_id: '',
      team_id: '',
    }
  })

  const watchedRoleId = watch('role_id')

  // Charger les utilisateurs
  const loadUsers = async () => {
    try {
      setLoading(true)
      const userData = await fetchAllUsers()
      setUsers(userData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // Charger les invitations
  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select(`
          *,
          role:roles(name),
          team:teams(name),
          inviter:users!invited_by(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setInvitations(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des invitations')
    }
  }

  // Envoyer une invitation via Supabase Auth
  const sendInvitation = async (data: InviteFormData) => {
    try {
      // Utiliser l'API pour envoyer l'invitation via Supabase Auth
      const session = await supabase.auth.getSession()
      
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          email: data.email,
          role_id: data.role_id,
          team_id: data.team_id || null
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'invitation')
      }
      
      if (result.emailSent) {
        toast.success('Invitation envoyée !', {
          description: `Un email d'invitation a été envoyé à ${data.email}`,
        })
      } else {
        toast.success('Invitation créée !', {
          description: `Invitation créée pour ${data.email}. Vous pouvez copier le lien depuis l'onglet Invitations.`,
        })
      }
      
      // Rafraîchir les invitations
      await loadInvitations()
      
      // Fermer le dialog et réinitialiser le formulaire
      setIsInviteDialogOpen(false)
      reset()
    } catch (err) {
      toast.error('Erreur lors de l\'envoi de l\'invitation', {
        description: err instanceof Error ? err.message : 'Erreur inconnue'
      })
    }
  }

  // Renvoyer une invitation via Supabase Auth
  const resendInvitation = async (invitation: Invitation) => {
    try {
      // Utiliser l'API pour renvoyer l'invitation via Supabase Auth
      const session = await supabase.auth.getSession()
      
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
          email: invitation.email,
          role_id: invitation.role_id,
          team_id: invitation.team_id || null
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du renvoi de l\'invitation')
      }

      if (result.emailSent) {
        toast.success('Invitation renvoyée !', {
          description: `Un email d'invitation a été renvoyé à ${invitation.email}`,
        })
      } else {
        toast.success('Invitation mise à jour !', {
          description: `Invitation mise à jour pour ${invitation.email}. Vous pouvez copier le nouveau lien depuis l'onglet Invitations.`,
        })
      }
    } catch (err) {
      toast.error('Erreur lors du renvoi de l\'invitation')
    }
  }

  // Annuler une invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', invitationId)
      
      if (error) throw error
      
      toast.success('Invitation annulée')
      await loadInvitations()
    } catch (err) {
      toast.error('Erreur lors de l\'annulation')
    }
  }

  // Supprimer un utilisateur
  const deleteUser = async (userId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action supprimera toutes ses données et ne peut pas être annulée.')) return
    
    try {
      const session = await supabase.auth.getSession()
      
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({ userId })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la suppression')
      }
      
      toast.success('Utilisateur supprimé avec succès')
      await loadUsers()
    } catch (err) {
      toast.error('Erreur lors de la suppression', {
        description: err instanceof Error ? err.message : 'Erreur inconnue'
      })
    }
  }

  // Exporter les utilisateurs
  const exportUsers = () => {
    const csv = [
      ['Nom', 'Email', 'Rôle', 'Date création'].join(','),
      ...filteredUsers.map(user => [
        `${user.first_name} ${user.last_name}`,
        user.email,
        user.role?.name || '',
        new Date(user.created_at).toLocaleDateString('fr-FR')
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `utilisateurs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filtrer les utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || user.role?.name === filterRole
    
    return matchesSearch && matchesRole
  })

  // Sélection multiple
  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id))
    }
  }

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  useEffect(() => {
    if (!rolesLoading) {
      loadUsers()
      loadInvitations()
    }
  }, [rolesLoading])

  // Set default role when roles are loaded
  useEffect(() => {
    if (roles.length > 0 && !rolesLoading) {
      // Find 'client' role or use the first role as default
      const defaultRole = roles.find(role => role.name === 'client') || roles[0]
      setValue('role_id', defaultRole.id)
    }
  }, [roles, rolesLoading, setValue])

  const getRoleBadgeVariant = (roleName: string) => {
    const variants: Record<string, any> = {
      admin: 'destructive',
      manager: 'default',
      developer: 'secondary',
      client: 'outline',
    }
    return variants[roleName] || 'default'
  }

  const getInvitationStatus = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return { label: 'Acceptée', icon: CheckCircle, color: 'text-green-600' }
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return { label: 'Expirée', icon: XCircle, color: 'text-red-600' }
    }
    return { label: 'En attente', icon: Clock, color: 'text-yellow-600' }
  }

  return (
    <ProtectedRoute requiredPermission="admin.*">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h2>
            <p className="text-muted-foreground">
              Gérez les utilisateurs et envoyez des invitations
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportUsers}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Mail className="mr-2 h-4 w-4" />
                  Inviter un utilisateur
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Inviter un nouvel utilisateur</DialogTitle>
                  <DialogDescription>
                    Envoyez une invitation par email avec un lien d'inscription unique
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit(sendInvitation)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="utilisateur@example.com"
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role_id">Rôle</Label>
                    <Select value={watchedRoleId} onValueChange={(value) => setValue('role_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle">
                          {watchedRoleId && (
                            <div className="flex items-center space-x-2">
                              <Badge variant={getRoleBadgeVariant(roles.find(r => r.id === watchedRoleId)?.name || '') as any}>
                                {roles.find(r => r.id === watchedRoleId)?.name}
                              </Badge>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center space-x-2">
                              <Badge variant={getRoleBadgeVariant(role.name) as any}>
                                {role.name}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.role_id && (
                      <p className="text-sm text-destructive">{errors.role_id.message}</p>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsInviteDialogOpen(false)
                        reset()
                      }}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer l'invitation
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="users">
              Utilisateurs ({users.length})
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Invitations ({invitations.filter(i => !i.accepted_at).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les rôles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users table */}
            <Card>
              <CardHeader>
                <CardTitle>Liste des utilisateurs</CardTitle>
                <CardDescription>
                  {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
                  {selectedUsers.length > 0 && ` (${selectedUsers.length} sélectionné${selectedUsers.length > 1 ? 's' : ''})`}
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
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={
                              filteredUsers.length > 0 &&
                              selectedUsers.length === filteredUsers.length
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead>Dernière connexion</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() => toggleSelectUser(user.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>
                                  {user.first_name?.[0]}{user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {user.first_name} {user.last_name}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.role ? (
                              <Badge variant={getRoleBadgeVariant(user.role.name) as any}>
                                {user.role.name}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Aucun rôle</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {user.last_sign_in_at
                              ? format(new Date(user.last_sign_in_at), 'dd/MM/yyyy HH:mm', { locale: fr })
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Modifier le rôle
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Mail className="mr-2 h-4 w-4" />
                                  Envoyer un email
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteUser(user.id)}
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
                      {filteredUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Aucun utilisateur trouvé
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invitations envoyées</CardTitle>
                <CardDescription>
                  Gérez les invitations en attente et expirées
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Invité par</TableHead>
                      <TableHead>Date d'envoi</TableHead>
                      <TableHead>Expire le</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => {
                      const status = getInvitationStatus(invitation)
                      const StatusIcon = status.icon
                      
                      return (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>
                            {invitation.role && (
                              <Badge variant={getRoleBadgeVariant(invitation.role.name) as any}>
                                {invitation.role.name}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {invitation.inviter
                              ? `${invitation.inviter.first_name} ${invitation.inviter.last_name}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invitation.created_at), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invitation.expires_at), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center space-x-1 ${status.color}`}>
                              <StatusIcon className="h-4 w-4" />
                              <span className="text-sm">{status.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {!invitation.accepted_at && new Date(invitation.expires_at) > new Date() && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => resendInvitation(invitation)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Renvoyer
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const link = `${window.location.origin}/auth/accept-invite?token=${invitation.token}`
                                      navigator.clipboard.writeText(link)
                                      toast.success('Lien copié !')
                                    }}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copier le lien
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => cancelInvitation(invitation.id)}
                                    className="text-destructive"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Annuler
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {invitations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucune invitation envoyée
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  )
}