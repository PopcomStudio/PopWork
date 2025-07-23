"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRolesPermissions, type UserWithRole, type Role } from '@/features/auth/hooks/use-roles-permissions'
import { ProtectedRoute } from '@/features/auth/components/protected-route'
import { Icons } from '@/components/ui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'

const userFormSchema = z.object({
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email invalide'),
  role_id: z.string().min(1, 'Un rôle doit être sélectionné'),
})

type UserFormData = z.infer<typeof userFormSchema>

const roleColors: Record<string, string> = {
  admin: 'destructive',
  manager: 'default',
  developer: 'secondary',
  client: 'outline',
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const {
    roles,
    fetchAllUsers,
    createUserWithRole,
    updateUserRole,
    loading: rolesLoading
  } = useRolesPermissions()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
  })

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

  useEffect(() => {
    if (!rolesLoading) {
      loadUsers()
    }
  }, [rolesLoading])

  // Créer ou modifier un utilisateur
  const onSubmit = async (data: UserFormData) => {
    try {
      setActionLoading(true)
      
      if (editingUser) {
        // Mettre à jour le rôle
        await updateUserRole(editingUser.id, data.role_id)
      } else {
        // Créer un nouvel utilisateur
        await createUserWithRole(data)
      }

      await loadUsers()
      setIsDialogOpen(false)
      reset()
      setEditingUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setActionLoading(false)
    }
  }

  // Ouvrir le modal d'édition
  const handleEdit = (user: UserWithRole) => {
    setEditingUser(user)
    setValue('first_name', user.first_name)
    setValue('last_name', user.last_name)
    setValue('email', user.email)
    setValue('role_id', user.role_id)
    setIsDialogOpen(true)
  }

  // Fermer le modal
  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingUser(null)
    reset()
  }

  const getRoleBadgeVariant = (roleName: string) => {
    return roleColors[roleName] || 'default'
  }

  return (
    <ProtectedRoute requiredPermission="*">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h2>
            <p className="text-muted-foreground">
              Gérez les utilisateurs et leurs rôles dans le système
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingUser(null)}>
                Nouvel utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    disabled={editingUser !== null}
                  />
                  {errors.first_name && (
                    <p className="text-sm text-destructive">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    disabled={editingUser !== null}
                  />
                  {errors.last_name && (
                    <p className="text-sm text-destructive">{errors.last_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    disabled={editingUser !== null}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role_id">Rôle</Label>
                  <Select onValueChange={(value) => setValue('role_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un rôle" />
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

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={actionLoading}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={actionLoading}>
                    {actionLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    {editingUser ? 'Modifier' : 'Créer'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Liste des utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-8 w-8 animate-spin" />
                <span className="ml-2">Chargement des utilisateurs...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
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
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
} 