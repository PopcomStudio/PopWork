import { format } from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { TimeFormat, Language } from "../contexts/translation-context"

export function formatTime(date: Date, timeFormat: TimeFormat, language: Language = "fr"): string {
  const locale = language === "fr" ? fr : enUS
  const formatString = timeFormat === "24h" ? "HH:mm" : "h:mm a"
  return format(date, formatString, { locale })
}

export function formatTimeRange(start: Date, end: Date, timeFormat: TimeFormat, language: Language = "fr"): string {
  const startTime = formatTime(start, timeFormat, language)
  const endTime = formatTime(end, timeFormat, language)
  return `${startTime} - ${endTime}`
}

export function formatDateTime(date: Date, timeFormat: TimeFormat, language: Language = "fr"): string {
  const locale = language === "fr" ? fr : enUS
  const dateFormatString = language === "fr" ? "d MMMM yyyy" : "MMMM d, yyyy"
  const timeFormatString = timeFormat === "24h" ? "HH:mm" : "h:mm a"
  return format(date, `${dateFormatString} ${timeFormatString}`, { locale })
}

export function getTimeFormatPattern(timeFormat: TimeFormat): string {
  return timeFormat === "24h" ? "HH:mm" : "h:mm a"
}

export function getTimeFormatExample(timeFormat: TimeFormat): string {
  return timeFormat === "24h" ? "14:30" : "2:30 PM"
}