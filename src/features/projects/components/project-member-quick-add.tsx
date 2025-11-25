"use client"

import { useState } from 'react'
import { UserPlus, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ProjectMemberRole, AvailableUser } from '../types/project-members'
import {
  PROJECT_ROLE_OPTIONS,
  DEFAULT_PROJECT_ROLE,
  PROJECT_MEMBER_ROLES,
} from '../constants/project-member-roles'

interface ProjectMemberQuickAddProps {
  availableUsers: AvailableUser[]
  onAddMember: (userId: string, role: ProjectMemberRole) => Promise<void>
  disabled?: boolean
}

export function ProjectMemberQuickAdd({
  availableUsers,
  onAddMember,
  disabled = false,
}: ProjectMemberQuickAddProps) {
  const [open, setOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<ProjectMemberRole>(DEFAULT_PROJECT_ROLE)
  const [loading, setLoading] = useState(false)

  const selectedUser = availableUsers.find(u => u.id === selectedUserId)

  const handleAddMember = async () => {
    if (!selectedUserId) return

    try {
      setLoading(true)
      await onAddMember(selectedUserId, selectedRole)
      // Reset form
      setSelectedUserId(null)
      setSelectedRole(DEFAULT_PROJECT_ROLE)
      setOpen(false)
    } catch (error) {
      console.error('Erreur lors de l\'ajout du membre:', error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button disabled={disabled || availableUsers.length === 0}>
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un membre
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Ajouter un membre</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Selectionnez un utilisateur et son role
          </p>
        </div>

        {/* User selection */}
        <Command>
          <CommandInput placeholder="Rechercher un utilisateur..." />
          <CommandList>
            <CommandEmpty>Aucun utilisateur trouve</CommandEmpty>
            <CommandGroup heading="Utilisateurs disponibles">
              {availableUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.firstName} ${user.lastName} ${user.email}`}
                  onSelect={() => setSelectedUserId(user.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserId === user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.firstName, user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Role selection and confirm */}
        <div className="border-t p-3 space-y-3">
          {selectedUser && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedUser.avatarUrl} />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedUser.firstName, selectedUser.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Role dans le projet</Label>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ProjectMemberRole)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <Badge
                    variant="secondary"
                    className={`${PROJECT_MEMBER_ROLES[selectedRole].bgColor} ${PROJECT_MEMBER_ROLES[selectedRole].color} font-normal`}
                  >
                    {PROJECT_MEMBER_ROLES[selectedRole].label}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROJECT_ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <Badge
                      variant="secondary"
                      className={`${role.bgColor} ${role.color} font-normal`}
                    >
                      {role.label}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleAddMember}
            disabled={!selectedUserId || loading}
            className="w-full"
          >
            {loading ? "Ajout en cours..." : "Ajouter"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
