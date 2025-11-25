"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ProjectMemberRole } from '../types/project-members'
import { PROJECT_MEMBER_ROLES, PROJECT_ROLE_OPTIONS } from '../constants/project-member-roles'

interface ProjectMemberRoleSelectProps {
  value: ProjectMemberRole
  onValueChange: (value: ProjectMemberRole) => void
  disabled?: boolean
}

export function ProjectMemberRoleSelect({
  value,
  onValueChange,
  disabled = false,
}: ProjectMemberRoleSelectProps) {
  const [open, setOpen] = useState(false)
  const currentRole = PROJECT_MEMBER_ROLES[value]

  const handleSelect = (role: ProjectMemberRole) => {
    onValueChange(role)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "cursor-pointer transition-opacity hover:opacity-80",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Badge
            variant="secondary"
            className={`${currentRole.bgColor} ${currentRole.color} font-normal`}
          >
            {currentRole.label}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start">
        <div className="space-y-0.5">
          {PROJECT_ROLE_OPTIONS.map((role) => {
            const isSelected = role.value === value
            return (
              <button
                key={role.value}
                onClick={() => handleSelect(role.value)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent"
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    isSelected ? "opacity-100" : "opacity-0"
                  )}
                />
                <Badge
                  variant="secondary"
                  className={`${role.bgColor} ${role.color} font-normal`}
                >
                  {role.label}
                </Badge>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Version badge pour affichage lecture seule
interface ProjectMemberRoleBadgeProps {
  role: ProjectMemberRole
}

export function ProjectMemberRoleBadge({ role }: ProjectMemberRoleBadgeProps) {
  const roleInfo = PROJECT_MEMBER_ROLES[role]

  return (
    <Badge
      variant="secondary"
      className={`${roleInfo.bgColor} ${roleInfo.color} font-normal`}
    >
      {roleInfo.label}
    </Badge>
  )
}
