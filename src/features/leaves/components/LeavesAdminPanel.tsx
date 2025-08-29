'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useLeavesAdmin } from '../hooks/use-leaves-admin'
import { Leave } from '@/shared/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Check,
  X,
  Clock,
  Users,
  AlertCircle,
  Filter,
  Paperclip,
  Trash2,
  Eye,
  Download,
  Search,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'

const leaveTypeLabels = {
  vacation: 'Congés payés',
  sick: 'Congé maladie',
  other: 'Autre'
}

const statusLabels = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

export function LeavesAdminPanel() {
  const {
    allLeaves,
    loading,
    error,
    approveLeaveBatch,
    rejectLeaveBatch,
    deleteLeave,
    getLeaveStats
  } = useLeavesAdmin()

  const [statusFilter, setStatusFilter] = useState<Leave['status'] | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [attachmentViewerOpen, setAttachmentViewerOpen] = useState(false)
  const [viewingAttachment, setViewingAttachment] = useState<{url: string, name: string} | null>(null)
  const [columnVisibility, setColumnVisibility] = useState({
    employee: true,
    type: true,
    period: true,
    duration: true,
    status: true,
    reason: true,
    attachment: true,
    date: true,
    actions: true
  })

  const stats = getLeaveStats()

  const filteredLeaves = allLeaves
    .filter(leave => statusFilter === 'all' || leave.status === statusFilter)
    .filter(leave => {
      if (!searchQuery.trim()) return true
      
      const query = searchQuery.toLowerCase()
      const employeeName = leave.profiles ? 
        `${leave.profiles.first_name || ''} ${leave.profiles.last_name || ''}`.trim() ||
        leave.profiles.email ||
        'Utilisateur inconnu'
        : 'Utilisateur inconnu'
      
      return employeeName.toLowerCase().includes(query) ||
             leaveTypeLabels[leave.type].toLowerCase().includes(query) ||
             (leave.reason && leave.reason.toLowerCase().includes(query))
    })


  const handleSingleApprove = async (leaveId: string) => {
    await approveLeaveBatch([leaveId])
  }

  const handleSingleReject = async (leaveId: string, reason: string) => {
    await rejectLeaveBatch([leaveId], reason)
  }

  const handleSingleDelete = async (leaveId: string) => {
    await deleteLeave(leaveId)
  }

  const handleViewAttachment = (attachmentUrl: string, attachmentName: string) => {
    setViewingAttachment({ url: attachmentUrl, name: attachmentName })
    setAttachmentViewerOpen(true)
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total demandes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Toutes les demandes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approuvées</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Validées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejetées</CardTitle>
            <X className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Refusées</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaves Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestion des congés</CardTitle>
              <CardDescription>
                Gérez les demandes de congés de votre équipe
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2 flex-1 max-w-md">
                <Search className="h-4 w-4 opacity-50" />
                <Input
                  placeholder="Rechercher par employé, type ou motif..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="flex-1"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    <span className="hidden lg:inline">
                      {statusFilter === 'all' ? 'Toutes' : 
                       statusFilter === 'pending' ? 'En attente' :
                       statusFilter === 'approved' ? 'Approuvées' : 'Rejetées'}
                    </span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    <span className={statusFilter === 'all' ? 'font-medium' : ''}>
                      Toutes
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                    <span className={statusFilter === 'pending' ? 'font-medium' : ''}>
                      En attente
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('approved')}>
                    <span className={statusFilter === 'approved' ? 'font-medium' : ''}>
                      Approuvées
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('rejected')}>
                    <span className={statusFilter === 'rejected' ? 'font-medium' : ''}>
                      Rejetées
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ChevronDown className="h-4 w-4" />
                    <span className="hidden lg:inline ml-2">Colonnes</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.employee}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, employee: !!checked}))}
                  >
                    Employé
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.type}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, type: !!checked}))}
                  >
                    Type
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.period}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, period: !!checked}))}
                  >
                    Période
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.duration}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, duration: !!checked}))}
                  >
                    Durée
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.status}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, status: !!checked}))}
                  >
                    Statut
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.reason}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, reason: !!checked}))}
                  >
                    Motif
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.attachment}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, attachment: !!checked}))}
                  >
                    Pièce jointe
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.date}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, date: !!checked}))}
                  >
                    Date de demande
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={columnVisibility.actions}
                    onCheckedChange={(checked) => setColumnVisibility(prev => ({...prev, actions: !!checked}))}
                  >
                    Actions rapides
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune demande trouvée pour ce filtre
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columnVisibility.employee && <TableHead>Employé</TableHead>}
                  {columnVisibility.type && <TableHead>Type</TableHead>}
                  {columnVisibility.period && <TableHead>Période</TableHead>}
                  {columnVisibility.duration && <TableHead>Durée</TableHead>}
                  {columnVisibility.status && <TableHead>Statut</TableHead>}
                  {columnVisibility.reason && <TableHead>Motif</TableHead>}
                  {columnVisibility.attachment && <TableHead>Pièce jointe</TableHead>}
                  {columnVisibility.date && <TableHead>Date de demande</TableHead>}
                  {columnVisibility.actions && <TableHead>Actions rapides</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaves.map((leave) => (
                  <TableRow key={leave.id}>
                    {columnVisibility.employee && (
                      <TableCell className="font-medium">
                        {leave.profiles ? 
                          `${leave.profiles.first_name || ''} ${leave.profiles.last_name || ''}`.trim() ||
                          leave.profiles.email ||
                          'Utilisateur inconnu'
                          : 'Utilisateur inconnu'}
                      </TableCell>
                    )}
                    {columnVisibility.type && (
                      <TableCell>
                        <Badge variant="outline">
                          {leaveTypeLabels[leave.type]}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.period && (
                      <TableCell>
                        {format(new Date(leave.start_date), 'dd MMM', { locale: fr })} -{' '}
                        {format(new Date(leave.end_date), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                    )}
                    {columnVisibility.duration && (
                      <TableCell>
                        {leave.days_count} jour{leave.days_count > 1 ? 's' : ''}
                      </TableCell>
                    )}
                    {columnVisibility.status && (
                      <TableCell>
                        <Badge
                          className={cn(
                            statusColors[leave.status],
                            "text-xs"
                          )}
                        >
                          {statusLabels[leave.status]}
                        </Badge>
                      </TableCell>
                    )}
                    {columnVisibility.reason && (
                      <TableCell className="max-w-[200px] truncate">
                        {leave.reason}
                      </TableCell>
                    )}
                    {columnVisibility.attachment && (
                      <TableCell>
                        {leave.attachment_name && leave.attachment_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewAttachment(leave.attachment_url!, leave.attachment_name!)}
                            className="flex items-center gap-1 p-1 h-auto hover:text-primary transition-colors"
                          >
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm truncate max-w-[100px]">
                              {leave.attachment_name}
                            </span>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {columnVisibility.date && (
                      <TableCell>
                        {format(new Date(leave.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                    )}
                    {columnVisibility.actions && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {leave.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSingleApprove(leave.id)}
                                className="h-8 w-8 p-0"
                                title="Approuver"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSingleReject(leave.id, 'Rejeté par l\'administrateur')}
                                className="h-8 w-8 p-0"
                                title="Rejeter"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSingleDelete(leave.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* Attachment Viewer Dialog */}
      <Dialog open={attachmentViewerOpen} onOpenChange={setAttachmentViewerOpen}>
        <DialogContent 
          className="!max-w-[85vw] max-h-[95vh] !w-[85vw]" 
          style={{ width: '85vw', maxWidth: '85vw', minWidth: '85vw' }}
        >
          <DialogHeader>
            <DialogTitle>Pièce jointe</DialogTitle>
            <DialogDescription>
              {viewingAttachment?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[80vh] border rounded-lg overflow-hidden">
            {viewingAttachment && (
              viewingAttachment.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={viewingAttachment.url}
                  className="w-full h-full border-0"
                  title={viewingAttachment.name}
                />
              ) : (
                <img
                  src={viewingAttachment.url}
                  alt={viewingAttachment.name}
                  className="w-full h-full object-contain"
                />
              )
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => viewingAttachment?.url && window.open(viewingAttachment.url, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}