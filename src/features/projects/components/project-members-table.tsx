"use client"

import * as React from "react"
import { useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Search,
  MoreVertical,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import type { ProjectMemberWithUser, ProjectMemberRole, AvailableUser } from '../types/project-members'
import { ProjectMemberRoleSelect } from './project-member-role-select'
import { ProjectMemberQuickAdd } from './project-member-quick-add'
import { ProjectMemberRemoveDialog } from './project-member-remove-dialog'

interface ProjectMembersTableProps {
  members: ProjectMemberWithUser[]
  availableUsers: AvailableUser[]
  loading: boolean
  onAddMember: (userId: string, role: ProjectMemberRole) => Promise<void>
  onUpdateRole: (memberId: string, role: ProjectMemberRole) => Promise<void>
  onRemoveMember: (memberId: string) => Promise<void>
}

export function ProjectMembersTable({
  members,
  availableUsers,
  loading,
  onAddMember,
  onUpdateRole,
  onRemoveMember,
}: ProjectMembersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [memberToRemove, setMemberToRemove] = useState<ProjectMemberWithUser | null>(null)
  const [removeLoading, setRemoveLoading] = useState(false)

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const columns: ColumnDef<ProjectMemberWithUser>[] = [
    {
      accessorKey: "user.firstName",
      header: "Membre",
      cell: ({ row }) => {
        const member = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.user.avatarUrl} />
              <AvatarFallback className="text-xs">
                {getInitials(member.user.firstName, member.user.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">
                {member.user.firstName} {member.user.lastName}
              </div>
            </div>
          </div>
        )
      },
      filterFn: (row, columnId, filterValue) => {
        const member = row.original
        const fullName = `${member.user.firstName} ${member.user.lastName}`.toLowerCase()
        const email = member.user.email.toLowerCase()
        const filter = filterValue.toLowerCase()
        return fullName.includes(filter) || email.includes(filter)
      },
    },
    {
      accessorKey: "user.email",
      header: "Email",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.user.email}
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role projet",
      cell: ({ row }) => (
        <ProjectMemberRoleSelect
          value={row.original.role}
          onValueChange={(role) => onUpdateRole(row.original.id, role)}
        />
      ),
    },
    {
      accessorKey: "user.globalRole",
      header: "Role global",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.user.globalRole}
        </Badge>
      ),
    },
    {
      accessorKey: "assignedAt",
      header: "Assigne le",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.assignedAt).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setMemberToRemove(row.original)}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Retirer du projet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  const table = useReactTable({
    data: members,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const handleRemoveConfirm = async () => {
    if (!memberToRemove) return
    try {
      setRemoveLoading(true)
      await onRemoveMember(memberToRemove.id)
      setMemberToRemove(null)
    } catch (error) {
      console.error('Erreur lors du retrait:', error)
    } finally {
      setRemoveLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="border rounded-lg">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header avec recherche et bouton ajouter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <ProjectMemberQuickAdd
          availableUsers={availableUsers}
          onAddMember={onAddMember}
        />
      </div>

      {/* Table */}
      {members.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">Aucun membre</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ce projet n&apos;a pas encore de membres assignes.
          </p>
          <ProjectMemberQuickAdd
            availableUsers={availableUsers}
            onAddMember={onAddMember}
          />
        </div>
      ) : (
        <>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      Aucun resultat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {table.getFilteredRowModel().rows.length} membre(s)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {table.getState().pagination.pageIndex + 1} sur{" "}
                  {table.getPageCount()}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog de confirmation de suppression */}
      <ProjectMemberRemoveDialog
        member={memberToRemove}
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        onConfirm={handleRemoveConfirm}
        loading={removeLoading}
      />
    </div>
  )
}
