'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { useLeaves } from '../hooks/use-leaves'
import { useFrenchLeaveCalculator } from '../hooks/use-french-leave-calculator'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { Leave } from '@/shared/types/database'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Palmtree,
  Plus,
  Trash2,
  Clock,
  Calendar as CalendarIcon,
  AlertTriangle,
  Info,
} from 'lucide-react'

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

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'approved':
      return 'default'
    case 'rejected':
      return 'destructive'
    default:
      return 'secondary'
  }
}

export function LeavesManagement() {
  const { user } = useAuth()
  const { leaves, leaveBalance, loading, error, createLeaveRequest, deleteLeaveRequest, refetchBalance } = useLeaves()
  const { 
    checkLeaveExpirationWarning,
    recalculateUserLeaves,
    loading: calculatorLoading
  } = useFrenchLeaveCalculator()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [leaveType, setLeaveType] = useState<string>('')
  const [reason, setReason] = useState('')
  const [expirationWarning, setExpirationWarning] = useState<{
    isExpiring: boolean
    daysUntilExpiration: number
    expirationDate: Date
  } | null>(null)

  useEffect(() => {
    setExpirationWarning(checkLeaveExpirationWarning())
  }, [checkLeaveExpirationWarning])

  useEffect(() => {
    if (user && !calculatorLoading) {
      recalculateUserLeaves(user.id)
    }
  }, [user, recalculateUserLeaves, calculatorLoading])

  // Refresh balance when leaves change (e.g., when one gets approved)
  useEffect(() => {
    const approvedLeaves = leaves.filter(l => l.status === 'approved')
    if (approvedLeaves.length > 0 && refetchBalance) {
      refetchBalance()
    }
  }, [leaves, refetchBalance])

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (!refetchBalance) return
    
    const interval = setInterval(() => {
      refetchBalance()
    }, 30000)

    return () => clearInterval(interval)
  }, [refetchBalance])

  const handleCreateLeave = async () => {
    if (!dateRange?.from || !dateRange?.to || !leaveType || !reason.trim()) {
      return
    }

    const success = await createLeaveRequest({
      start_date: dateRange.from.toISOString(),
      end_date: dateRange.to.toISOString(),
      type: leaveType as Leave['type'],
      reason: reason.trim(),
    })

    if (success) {
      setIsDialogOpen(false)
      setDateRange(undefined)
      setLeaveType('')
      setReason('')
    }
  }

  const handleDeleteLeave = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) {
      await deleteLeaveRequest(id)
    }
  }

  const getAvailableDays = (type: string) => {
    if (!leaveBalance) return 0
    
    switch (type) {
      case 'conges_payes':
        return leaveBalance.paid_leave_days - leaveBalance.used_paid_leave_days
      case 'rtt':
        return (leaveBalance.rtt_days || 0) - (leaveBalance.used_rtt_days || 0)
      case 'sick':
        return 'Illimité' // No legal limit for sick leave in France
      default:
        return 0
    }
  }

  const calculateProgress = (used: number, total: number) => {
    if (total === 0) return 0
    return Math.min((used / total) * 100, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Expiration Warning */}
      {expirationWarning?.isExpiring && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention !</strong> Vos congés non utilisés expirent dans {expirationWarning.daysUntilExpiration} jours 
            (le {format(expirationWarning.expirationDate, 'dd MMMM yyyy', { locale: fr })}). 
            Les congés non posés avant cette date seront perdus selon le code du travail.
          </AlertDescription>
        </Alert>
      )}

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Congés payés disponibles</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {leaveBalance ? getAvailableDays('conges_payes') : 0} jours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              sur {leaveBalance?.paid_leave_days || 0} jours acquis
            </p>
            {leaveBalance && (
              <Progress 
                value={calculateProgress(leaveBalance.used_paid_leave_days, leaveBalance.paid_leave_days)}
                className="h-2"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {leaveBalance?.used_paid_leave_days || 0} jours utilisés
            </p>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>RTT disponibles</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {leaveBalance ? getAvailableDays('rtt') : 0} jours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              sur {leaveBalance?.rtt_days || 0} jours acquis
            </p>
            {leaveBalance && (
              <Progress 
                value={leaveBalance.rtt_days > 0 ? calculateProgress(leaveBalance.used_rtt_days || 0, leaveBalance.rtt_days) : 0}
                className="h-2"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {leaveBalance?.used_rtt_days || 0} jours utilisés
            </p>
          </CardContent>
        </Card>
      </div>


      {/* Leaves Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mes demandes de congés</CardTitle>
              <CardDescription>
                Gérez vos demandes de congés et RTT
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle demande
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune demande de congés pour le moment
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {leaveTypeLabels[leave.type as keyof typeof leaveTypeLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(leave.start_date), 'dd/MM/yyyy', { locale: fr })} - 
                      {format(new Date(leave.end_date), 'dd/MM/yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>{leave.days_count} jour(s)</TableCell>
                    <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(leave.status)}>
                        {statusLabels[leave.status as keyof typeof statusLabels]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {leave.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLeave(leave.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Leave Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nouvelle demande de congés</DialogTitle>
            <DialogDescription>
              Créez une nouvelle demande de congés ou RTT selon le code du travail français.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="leave-type">Type de congé</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conges_payes">
                    Congés payés ({getAvailableDays('conges_payes')} jours disponibles)
                  </SelectItem>
                  <SelectItem value="rtt">
                    RTT ({getAvailableDays('rtt')} jours disponibles)
                  </SelectItem>
                  <SelectItem value="sick">
                    Arrêt maladie (sans limite légale)
                  </SelectItem>
                  <SelectItem value="maternity">Congé maternité</SelectItem>
                  <SelectItem value="paternity">Congé paternité</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Période</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd LLL y', { locale: fr })} -{' '}
                          {format(dateRange.to, 'dd LLL y', { locale: fr })}
                        </>
                      ) : (
                        format(dateRange.from, 'dd LLL y', { locale: fr })
                      )
                    ) : (
                      <span>Sélectionnez les dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Motif</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Décrivez brièvement le motif de votre demande..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateLeave}
              disabled={!dateRange?.from || !dateRange?.to || !leaveType || !reason.trim()}
            >
              Créer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}