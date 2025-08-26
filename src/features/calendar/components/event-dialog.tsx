"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarDate, getLocalTimeZone, today, parseDate } from "@internationalized/date"
import type { DateRange } from "react-aria-components"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarEvent, CreateEventData, UpdateEventData, EventColor } from "../types"
import { useForm } from "react-hook-form"
import { Trash2, CalendarIcon } from "lucide-react"
import { RangeCalendar } from "@/components/ui/calendar-rac"
import { TimeField, DateInput } from "@/components/ui/datefield-rac"
import { TimePicker } from "@/components/time-picker"
import { Time } from "@internationalized/date"
import { ClockIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EventDialogProps {
  event: CalendarEvent | null
  isOpen: boolean
  onClose: () => void
  onSave: (eventData: CreateEventData | UpdateEventData) => void
  onDelete?: (eventId: string) => void
}

interface FormData {
  title: string
  description: string
  dateRange: DateRange | null
  start_time: Time
  end_time: Time
  all_day: boolean
  color: EventColor
  location: string
}

const colorOptions: { value: EventColor; label: string; class: string }[] = [
  { value: "sky", label: "Bleu", class: "bg-sky-500" },
  { value: "emerald", label: "Vert", class: "bg-emerald-500" },
  { value: "amber", label: "Jaune", class: "bg-amber-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "rose", label: "Rouge", class: "bg-rose-500" },
  { value: "violet", label: "Violet", class: "bg-violet-500" },
]

export function EventDialog({ event, isOpen, onClose, onSave, onDelete }: EventDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  
  const form = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      dateRange: null,
      start_time: new Time(9, 0),
      end_time: new Time(10, 0),
      all_day: false,
      color: "sky",
      location: "",
    }
  })

  const allDay = form.watch("all_day")

  useEffect(() => {
    if (event) {
      // Mode édition
      const startDate = new Date(event.start)
      const endDate = new Date(event.end)
      
      form.reset({
        title: event.title || "",
        description: event.description || "",
        dateRange: {
          start: parseDate(format(startDate, "yyyy-MM-dd")),
          end: parseDate(format(endDate, "yyyy-MM-dd")),
        },
        start_time: event.allDay ? new Time(9, 0) : new Time(startDate.getHours(), startDate.getMinutes()),
        end_time: event.allDay ? new Time(10, 0) : new Time(endDate.getHours(), endDate.getMinutes()),
        all_day: event.allDay || false,
        color: (event.color as EventColor) || "sky",
        location: event.location || "",
      })
    } else {
      // Mode création
      const now = today(getLocalTimeZone())
      const tomorrow = now.add({ days: 1 })

      form.reset({
        title: "",
        description: "",
        dateRange: {
          start: now,
          end: tomorrow,
        },
        start_time: new Time(9, 0),
        end_time: new Time(10, 0),
        all_day: false,
        color: "sky",
        location: "",
      })
    }
  }, [event, form])

  // Fermer le calendrier quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }

    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCalendarOpen])

  const onSubmit = (data: FormData) => {
    if (!data.dateRange?.start) {
      return // DateRange validation should be handled by form validation
    }

    console.log('=== DEBUG TIME CONVERSION ===')
    console.log('Form data.start_time:', data.start_time)
    console.log('Form data.end_time:', data.end_time)
    console.log('Form data.all_day:', data.all_day)

    const startDate = data.dateRange.start.toDate(getLocalTimeZone())
    const endDate = data.dateRange.end?.toDate(getLocalTimeZone()) || startDate

    console.log('startDate from calendar:', startDate)
    console.log('endDate from calendar:', endDate)
    console.log('getLocalTimeZone():', getLocalTimeZone())

    const startTimeString = `${data.start_time.hour.toString().padStart(2, '0')}:${data.start_time.minute.toString().padStart(2, '0')}`
    const endTimeString = `${data.end_time.hour.toString().padStart(2, '0')}:${data.end_time.minute.toString().padStart(2, '0')}`

    console.log('startTimeString:', startTimeString)
    console.log('endTimeString:', endTimeString)

    // Créer une date complète avec l'heure locale et récupérer l'ISO string
    const createLocalDateTime = (date: Date, timeString: string) => {
      const [hours, minutes] = timeString.split(':').map(Number)
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes)
      return localDate.toISOString()
    }

    const startDateTime = data.all_day 
      ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0).toISOString()
      : createLocalDateTime(startDate, startTimeString)
    
    const endDateTime = data.all_day
      ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).toISOString()
      : createLocalDateTime(endDate, endTimeString)

    console.log('Final startDateTime:', startDateTime)
    console.log('Final endDateTime:', endDateTime)

    const eventData = {
      title: data.title,
      description: data.description || undefined,
      start_date: startDateTime,
      end_date: endDateTime,
      all_day: data.all_day,
      color: data.color,
      location: data.location || undefined,
    }

    console.log('Final eventData:', eventData)
    console.log('=== END DEBUG ===');

    if (event) {
      // Mode édition
      onSave({ id: event.id, ...eventData } as UpdateEventData)
    } else {
      // Mode création
      onSave(eventData as CreateEventData)
    }

    handleClose()
  }

  const handleDelete = async () => {
    if (!event || !onDelete) return
    
    setIsDeleting(true)
    onDelete(event.id)
    setIsDeleting(false)
    handleClose()
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {event ? "Modifier l'événement" : "Nouvel événement"}
          </DialogTitle>
          <DialogDescription>
            {event 
              ? "Modifiez les détails de cet événement partagé."
              : "Créez un nouvel événement partagé visible par toute l'équipe."
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              rules={{ required: "Le titre est obligatoire" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Titre de l'événement" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Description optionnelle" 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="all_day"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Toute la journée</FormLabel>
                    <FormDescription>
                      L'événement dure toute la journée
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dateRange"
              rules={{ 
                required: "La période est obligatoire",
                validate: (value) => {
                  if (!value?.start) return "La date de début est obligatoire"
                  return true
                }
              }}
              render={({ field }) => {
                const formatDateRange = () => {
                  if (!field.value?.start) return "Sélectionner une période"
                  const start = field.value.start.toDate(getLocalTimeZone())
                  const end = field.value.end ? field.value.end.toDate(getLocalTimeZone()) : start
                  
                  // Si pas de date de fin ou si c'est la même date
                  if (!field.value.end || field.value.start.compare(field.value.end) === 0) {
                    return format(start, "d MMM yyyy", { locale: fr })
                  }
                  
                  return `${format(start, "d MMM yyyy", { locale: fr })} - ${format(end, "d MMM yyyy", { locale: fr })}`
                }

                return (
                  <FormItem className="relative">
                    <FormLabel>Période *</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]",
                        !field.value && "text-muted-foreground"
                      )}
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                    >
                      <span className="truncate">
                        {formatDateRange()}
                      </span>
                      <CalendarIcon
                        size={16}
                        className="text-muted-foreground/80 group-hover:text-foreground shrink-0 transition-colors"
                        aria-hidden="true"
                      />
                    </Button>
                    
                    {isCalendarOpen && (
                      <div 
                        ref={calendarRef}
                        className="absolute top-full left-0 mt-1 z-[9999] bg-white border rounded-md shadow-lg"
                      >
                        <RangeCalendar
                          className="rounded-md p-2"
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </div>
                    )}
                    
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            {!allDay && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de début</FormLabel>
                      <TimePicker value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heure de fin</FormLabel>
                      <TimePicker value={field.value} onChange={field.onChange} />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Couleur</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une couleur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${option.class}`} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu</FormLabel>
                  <FormControl>
                    <Input placeholder="Lieu optionnel" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              {event && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </Button>
              )}
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1 sm:flex-none"
                >
                  Annuler
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 sm:flex-none"
                >
                  {event ? "Modifier" : "Créer"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}