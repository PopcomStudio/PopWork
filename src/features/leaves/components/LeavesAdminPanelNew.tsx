'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useLeavesAdmin } from '../hooks/use-leaves-admin'
import { useFrenchLeaveCalculator } from '../hooks/use-french-leave-calculator'
import { Leave, LeaveBalance, EmployeeLeaveProfile } from '@/shared/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Check,
  X,
  Clock,
  Users,
  AlertCircle,
  Filter,
  Settings,
  Calendar,
  BarChart3,
  AlertTriangle,
  Info,
  Palmtree,
  RefreshCw,
} from 'lucide-react'

// French leave type labels
const leaveTypeLabels = {
  conges_payes: 'Congés payés',
  rtt: 'RTT',
  sick: 'Arrêt maladie',
  maternity: 'Congé maternité',
  paternity: 'Congé paternité',
  other: 'Autre'
}

const statusLabels = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200'
}

const contractTypeLabels = {
  full_time: 'Temps plein',
  part_time: 'Temps partiel',
  intern: 'Stagiaire',
  freelance: 'Freelance'
}

interface EmployeeBalance extends LeaveBalance {
  user: {
    first_name: string
    last_name: string
    email: string
  }
  employee_profile?: EmployeeLeaveProfile
}

export function LeavesAdminPanelNew() {
  const { allLeaves, loading, error, approveLeaveBatch, rejectLeave } = useLeavesAdmin()
  const { recalculateUserLeaves, checkLeaveExpirationWarning } = useFrenchLeaveCalculator()

  const [filteredLeaves, setFilteredLeaves] = useState<Leave[]>([])
  const [selectedLeaves, setSelectedLeaves] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectingLeave, setRejectingLeave] = useState<Leave | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [employeeBalances, setEmployeeBalances] = useState<EmployeeBalance[]>([])
  const [balancesLoading, setBalancesLoading] = useState(true)
  const [expirationWarning, setExpirationWarning] = useState<{
    isExpiring: boolean
    daysUntilExpiration: number
    expirationDate: Date
  } | null>(null)

  // Initialize expiration warning
  useEffect(() => {
    setExpirationWarning(checkLeaveExpirationWarning())
  }, [checkLeaveExpirationWarning])

  // Fetch employee balances
  const fetchEmployeeBalances = async () => {
    setBalancesLoading(true)
    try {
      // This would need to be implemented in the admin hook
      // For now, we'll use a placeholder
      setEmployeeBalances([])
    } catch (err) {
      console.error('Error fetching employee balances:', err)
    } finally {
      setBalancesLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployeeBalances()
  }, [])

  // Filter leaves based on search and filters
  useEffect(() => {
    let filtered = allLeaves

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(leave =>
        leave.profiles?.first_name?.toLowerCase().includes(query) ||
        leave.profiles?.last_name?.toLowerCase().includes(query) ||
        leave.reason?.toLowerCase().includes(query) ||
        leaveTypeLabels[leave.type as keyof typeof leaveTypeLabels]?.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(leave => leave.status === statusFilter)
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(leave => leave.type === typeFilter)
    }

    setFilteredLeaves(filtered)
  }, [allLeaves, searchQuery, statusFilter, typeFilter])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeaves(filteredLeaves.filter(l => l.status === 'pending').map(l => l.id))
    } else {
      setSelectedLeaves([])
    }
  }

  const handleSelectLeave = (leaveId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeaves(prev => [...prev, leaveId])
    } else {
      setSelectedLeaves(prev => prev.filter(id => id !== leaveId))
    }
  }

  const handleBatchApprove = async () => {
    if (selectedLeaves.length === 0) return

    const success = await approveLeaveBatch(selectedLeaves)
    if (success) {
      setSelectedLeaves([])
    }
  }

  const handleReject = async () => {
    if (!rejectingLeave || !rejectReason.trim()) return

    const success = await rejectLeave(rejectingLeave.id, rejectReason.trim())
    if (success) {
      setShowRejectDialog(false)
      setRejectingLeave(null)
      setRejectReason('')
    }
  }

  const openRejectDialog = (leave: Leave) => {
    setRejectingLeave(leave)
    setShowRejectDialog(true)
  }

  const getLeaveStats = () => {
    const stats = {
      total: allLeaves.length,
      pending: allLeaves.filter(l => l.status === 'pending').length,
      approved: allLeaves.filter(l => l.status === 'approved').length,
      rejected: allLeaves.filter(l => l.status === 'rejected').length,
      conges_payes: allLeaves.filter(l => l.type === 'conges_payes').length,
      rtt: allLeaves.filter(l => l.type === 'rtt').length,
      sick: allLeaves.filter(l => l.type === 'sick').length
    }
    return stats
  }

  const stats = getLeaveStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion des Congés - Administration</h2>
          <p className="text-muted-foreground">
            Gérez les demandes de congés selon le code du travail français
          </p>
        </div>
        <Button variant="outline" onClick={fetchEmployeeBalances}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {/* Expiration Warning for Administrators */}
      {expirationWarning?.isExpiring && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-700">
            <strong>Attention !</strong> Les congés non utilisés de vos employés expirent dans{' '}
            {expirationWarning.daysUntilExpiration} jours 
            (le {format(expirationWarning.expirationDate, 'dd MMMM yyyy', { locale: fr })}). 
            Rappellez-leur que les congés non posés sont perdus selon le code du travail.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">Demandes de Congés</TabsTrigger>
          <TabsTrigger value="balances">Soldes Employés</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Demandes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Attente</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Congés Payés</CardTitle>
                <Palmtree className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.conges_payes}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  2,5j/mois • Max 30j/an
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RTT + Maladie</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.rtt + stats.sick}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  RTT: {stats.rtt} • Maladie: {stats.sick}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Input
                    placeholder="Rechercher par employé, type ou motif..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64"
                  />

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="approved">Approuvé</SelectItem>
                      <SelectItem value="rejected">Refusé</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      <SelectItem value="conges_payes">Congés payés</SelectItem>
                      <SelectItem value="rtt">RTT</SelectItem>
                      <SelectItem value="sick">Arrêt maladie</SelectItem>
                      <SelectItem value="maternity">Congé maternité</SelectItem>
                      <SelectItem value="paternity">Congé paternité</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedLeaves.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedLeaves.length} sélectionnée(s)
                    </span>
                    <Button onClick={handleBatchApprove} size="sm">
                      <Check className="mr-2 h-4 w-4" />
                      Approuver la sélection
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leaves Table */}
          <Card>
            <CardHeader>
              <CardTitle>Demandes de Congés</CardTitle>
              <CardDescription>
                {filteredLeaves.length} demande(s) trouvée(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredLeaves.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune demande de congé trouvée
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          checked={selectedLeaves.length > 0 && selectedLeaves.length === filteredLeaves.filter(l => l.status === 'pending').length}
                        />
                      </TableHead>
                      <TableHead>Employé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell>
                          {leave.status === 'pending' && (
                            <input
                              type="checkbox"
                              checked={selectedLeaves.includes(leave.id)}
                              onChange={(e) => handleSelectLeave(leave.id, e.target.checked)}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {leave.profiles?.first_name} {leave.profiles?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {leave.profiles?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {leaveTypeLabels[leave.type as keyof typeof leaveTypeLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(leave.start_date), 'dd/MM/yyyy', { locale: fr })} - 
                            {format(new Date(leave.end_date), 'dd/MM/yyyy', { locale: fr })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{leave.days_count}</span> jour(s)
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={leave.reason}>
                            {leave.reason}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[leave.status as keyof typeof statusColors]}>
                            {statusLabels[leave.status as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {leave.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveLeaveBatch([leave.id])}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRejectDialog(leave)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Soldes des Employés</CardTitle>
              <CardDescription>
                Vue d'ensemble des droits aux congés selon le code du travail français
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Période de référence :</strong> Du 1er juin au 31 mai • 
                  <strong> Calcul :</strong> 2,5 jours/mois (max 30j/an) • 
                  <strong> RTT :</strong> Basé sur heures &gt; 35h/sem •
                  <strong> Maladie :</strong> Sans limite légale
                </AlertDescription>
              </Alert>
              <div className="mt-4 text-center text-muted-foreground">
                Fonctionnalité en développement - Tableau des soldes employés à venir
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Système</CardTitle>
              <CardDescription>
                Paramètres pour le système de congés français
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Configuration actuelle :</strong><br />
                  • Durée légale : 35h/semaine<br />
                  • Période de référence : 1er juin - 31 mai<br />
                  • Congés payés : 2,5 jours/mois travaillé (max 30j/an)<br />
                  • RTT : Calculé automatiquement selon heures travaillées<br />
                  • Expiration : 31 mai (congés non posés perdus)
                </AlertDescription>
              </Alert>
              <div className="mt-4 text-center text-muted-foreground">
                Configuration avancée en développement
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refuser la demande de congés</DialogTitle>
            <DialogDescription>
              Refuser la demande de {rejectingLeave?.profiles?.first_name} {rejectingLeave?.profiles?.last_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reject-reason">Motif du refus *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Expliquez pourquoi cette demande est refusée..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              <X className="mr-2 h-4 w-4" />
              Refuser la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}