"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ProjectMemberWithUser } from '../types/project-members'

interface ProjectMemberRemoveDialogProps {
  member: ProjectMemberWithUser | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading?: boolean
}

export function ProjectMemberRemoveDialog({
  member,
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: ProjectMemberRemoveDialogProps) {
  if (!member) return null

  const memberName = `${member.user.firstName} ${member.user.lastName}`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer du projet</AlertDialogTitle>
          <AlertDialogDescription>
            Etes-vous sur de vouloir retirer <strong>{memberName}</strong> de ce projet ?
            Cette action est reversible, vous pourrez le rajouter plus tard.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Suppression..." : "Retirer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
