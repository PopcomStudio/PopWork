'use client'

import React, { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTimeTrackingOptimized } from '../hooks/use-time-tracking-optimized'
import { TimeEntry } from '@/shared/types/database'
import { formatDuration, formatDurationReadable } from '../utils/time-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Clock, 
  Play, 
  Pause, 
  Calendar as CalendarIcon,
  Filter,
  Download,
  Edit,
  Trash2,
  TrendingUp,
  Timer,
  Users
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { createClientComponentClient } from '@/lib/supabase'

type TimeRange = 'today' | 'week' | 'month' | 'custom'

export function TimeTrackingDashboard() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const { 
    activeEntry, 
    isTimerRunning,
    startTimer,
    stopTimer,
    updateEntry,
    deleteEntry,
    getUserTimeEntries 
  } = useTimeTrackingOptimized()

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [tasks, setTasks] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  // Fetch time entries
  useEffect(() => {
    fetchTimeEntries()
  }, [user])

  // Filter entries based on time range
  useEffect(() => {
    filterEntriesByTimeRange()
  }, [timeEntries, timeRange, selectedDate])

  const fetchTimeEntries = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const entries = await getUserTimeEntries()
      setTimeEntries(entries)
      
      // Fetch task details for all entries
      const taskIds = [...new Set(entries.map(e => e.task_id))]
      const taskDetails: Record<string, any> = {}
      
      for (const taskId of taskIds) {
        const { data } = await supabase
          .from('tasks')
          .select('id, title, project_id')
          .eq('id', taskId)
          .single()
        
        if (data) {
          taskDetails[taskId] = data
        }
      }
      
      setTasks(taskDetails)
    } catch (error) {
      console.error('Error fetching time entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterEntriesByTimeRange = () => {
    let filtered = [...timeEntries]
    const now = new Date()
    
    switch (timeRange) {
      case 'today':
        filtered = timeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time)
          return format(entryDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
        })
        break
      
      case 'week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        filtered = timeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time)
          return isWithinInterval(entryDate, { start: weekStart, end: weekEnd })
        })
        break
      
      case 'month':
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        filtered = timeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time)
          return isWithinInterval(entryDate, { start: monthStart, end: monthEnd })
        })
        break
      
      case 'custom':
        filtered = timeEntries.filter(entry => {
          const entryDate = new Date(entry.start_time)
          return format(entryDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
        })
        break
    }
    
    setFilteredEntries(filtered)
  }

  const calculateTotalTime = (entries: TimeEntry[]) => {
    return entries.reduce((total, entry) => total + (entry.duration || 0), 0)
  }

  const calculateDailyAverage = (entries: TimeEntry[]) => {
    if (entries.length === 0) return 0
    
    const days = new Set(
      entries.map(entry => format(new Date(entry.start_time), 'yyyy-MM-dd'))
    ).size
    
    return Math.floor(calculateTotalTime(entries) / days)
  }

  const handleEditEntry = async (entry: TimeEntry) => {
    // Update the entry
    await updateEntry(entry.id, entry)
    setEditingEntry(null)
    fetchTimeEntries()
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) {
      await deleteEntry(entryId)
      fetchTimeEntries()
    }
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Tâche', 'Durée', 'Description']
    const rows = filteredEntries.map(entry => [
      format(new Date(entry.start_time), 'dd/MM/yyyy HH:mm', { locale: fr }),
      tasks[entry.task_id]?.title || 'Tâche inconnue',
      formatDurationReadable(entry.duration || 0),
      entry.description || ''
    ])
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `time-tracking-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const totalTime = calculateTotalTime(filteredEntries)
  const dailyAverage = calculateDailyAverage(filteredEntries)
  const uniqueTasks = new Set(filteredEntries.map(e => e.task_id)).size

  return (
    <div className="space-y-6">
      {/* Header with quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps total</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDurationReadable(totalTime)}</div>
            <p className="text-xs text-muted-foreground">
              {timeRange === 'today' ? "Aujourd'hui" : 
               timeRange === 'week' ? 'Cette semaine' :
               timeRange === 'month' ? 'Ce mois' : 'Période sélectionnée'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne journalière</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDurationReadable(dailyAverage)}</div>
            <p className="text-xs text-muted-foreground">Par jour travaillé</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tâches actives</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTasks}</div>
            <p className="text-xs text-muted-foreground">Tâches avec du temps enregistré</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chronomètre</CardTitle>
            {isTimerRunning ? (
              <Pause className="h-4 w-4 text-green-500" />
            ) : (
              <Play className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            {isTimerRunning && activeEntry ? (
              <div>
                <div className="text-lg font-bold text-green-500">En cours</div>
                <p className="text-xs text-muted-foreground">
                  {tasks[activeEntry.task_id]?.title || 'Tâche en cours'}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-lg font-bold">Arrêté</div>
                <p className="text-xs text-muted-foreground">Aucun chronomètre actif</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time range selector and actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Entrées de temps</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="custom">Date personnalisée</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {timeRange === 'custom' && (
            <div className="mb-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
                locale={fr}
                className="rounded-md border"
              />
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune entrée de temps pour cette période
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tâche</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {format(new Date(entry.start_time), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {tasks[entry.task_id]?.title || 'Tâche inconnue'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {formatDurationReadable(entry.duration || 0)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {entry.description || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingEntry(entry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEntry(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'entrée de temps</DialogTitle>
            <DialogDescription>
              Modifiez les détails de cette entrée de temps
            </DialogDescription>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editingEntry.description || ''}
                  onChange={(e) => setEditingEntry({
                    ...editingEntry,
                    description: e.target.value
                  })}
                  placeholder="Description de l'activité..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Annuler
            </Button>
            <Button onClick={() => editingEntry && handleEditEntry(editingEntry)}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}