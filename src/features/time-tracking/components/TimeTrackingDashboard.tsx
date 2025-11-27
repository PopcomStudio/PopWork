'use client'

import React, { useState, useEffect } from 'react'
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTimeTrackingOptimized } from '../hooks/use-time-tracking-optimized'
import { TimeEntry } from '@/shared/types/database'
import { formatDurationReadable } from '../utils/time-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/dialog'
import {
  Clock,
  Play,
  Pause,
  Edit,
  Trash2,
  TrendingUp,
  Timer,
} from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { createClientComponentClient } from '@/lib/supabase'

type TimeRange = 'today' | 'week' | 'month' | 'custom'

// Helper to group entries by day
function groupEntriesByDay(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  return entries.reduce((groups, entry) => {
    const date = format(new Date(entry.start_time), 'yyyy-MM-dd')
    if (!groups[date]) groups[date] = []
    groups[date].push(entry)
    return groups
  }, {} as Record<string, TimeEntry[]>)
}

// Time Entry Card Component
interface TimeEntryCardProps {
  entry: TimeEntry
  taskName: string
  onEdit: (entry: TimeEntry) => void
  onDelete: (entryId: string) => void
}

function TimeEntryCard({ entry, taskName, onEdit, onDelete }: TimeEntryCardProps) {
  const isRunning = !entry.end_time

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
      {/* Time indicator */}
      <div className="flex flex-col items-center text-sm text-muted-foreground min-w-[60px]">
        <span>{format(new Date(entry.start_time), 'HH:mm')}</span>
        <span className="text-xs">-</span>
        <span>{entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'En cours'}</span>
      </div>

      {/* Vertical separator */}
      <div className={`w-0.5 h-12 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-border'}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{taskName}</p>
          {isRunning && (
            <Badge variant="default" className="bg-green-500 text-white text-xs">
              En cours
            </Badge>
          )}
        </div>
        {entry.description && (
          <p className="text-sm text-muted-foreground truncate mt-1">{entry.description}</p>
        )}
      </div>

      {/* Duration */}
      <Badge variant="secondary" className="font-mono">
        {formatDurationReadable(entry.duration || 0)}
      </Badge>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(entry)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(entry.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function TimeTrackingDashboard() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const {
    activeEntry,
    isTimerRunning,
    updateEntry,
    deleteEntry,
    getUserTimeEntries
  } = useTimeTrackingOptimized()

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<TimeEntry[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [tasks, setTasks] = useState<Record<string, { id: string; title: string; project_id: string }>>({})
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
      const taskDetails: Record<string, { id: string; title: string; project_id: string }> = {}

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
    await updateEntry(entry.id, entry)
    setEditingEntry(null)
    fetchTimeEntries()
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Supprimer cette entrée de temps ?')) {
      await deleteEntry(entryId)
      fetchTimeEntries()
    }
  }

  const totalTime = calculateTotalTime(filteredEntries)
  const dailyAverage = calculateDailyAverage(filteredEntries)
  const uniqueTasks = new Set(filteredEntries.map(e => e.task_id)).size
  const entriesByDay = groupEntriesByDay(filteredEntries)

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
                <p className="text-xs text-muted-foreground truncate">
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

      {/* Time range selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Entrées de temps</CardTitle>
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="custom">Date personnalisée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {timeRange === 'custom' && (
            <div className="mb-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date: Date | undefined) => date && setSelectedDate(date)}
                locale={fr}
                className="rounded-md border w-fit"
              />
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Aucune entrée de temps pour cette période</p>
              <p className="text-sm mt-1">Démarrez un timer depuis une tâche pour commencer</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(entriesByDay)
                .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
                .map(([date, entries]) => {
                  const dayTotal = entries.reduce((sum, e) => sum + (e.duration || 0), 0)
                  return (
                    <div key={date}>
                      {/* Day header */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg capitalize">
                          {format(parseISO(date), 'EEEE d MMMM', { locale: fr })}
                        </h3>
                        <Badge variant="outline" className="font-mono">
                          {formatDurationReadable(dayTotal)}
                        </Badge>
                      </div>

                      {/* Entries for the day */}
                      <div className="space-y-2">
                        {entries
                          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                          .map(entry => (
                            <TimeEntryCard
                              key={entry.id}
                              entry={entry}
                              taskName={tasks[entry.task_id]?.title || 'Tâche inconnue'}
                              onEdit={setEditingEntry}
                              onDelete={handleDeleteEntry}
                            />
                          ))}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;entrée de temps</DialogTitle>
            <DialogDescription>
              Modifiez la description de cette entrée de temps
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
                  className="mt-1.5"
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
