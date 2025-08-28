"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { createClientComponentClient } from "@/lib/supabase"

import enTranslations from "../translations/en.json"
import frTranslations from "../translations/fr.json"
import deTranslations from "../translations/de.json"
import esTranslations from "../translations/es.json"
import itTranslations from "../translations/it.json"
import ptTranslations from "../translations/pt.json"

type TranslationData = typeof enTranslations

export type Language = "en" | "fr" | "de" | "es" | "it" | "pt"
export type TimeFormat = "12h" | "24h"
export type WeekStartDay = "monday" | "sunday" | "saturday"

interface TranslationContextType {
  language: Language
  setLanguage: (language: Language) => void
  timeFormat: TimeFormat
  setTimeFormat: (format: TimeFormat) => void
  weekStartDay: WeekStartDay
  setWeekStartDay: (day: WeekStartDay) => void
  workingDays: number
  setWorkingDays: (days: number) => void
  t: (key: string, params?: Record<string, string>) => string
  translations: TranslationData
  availableLanguages: { code: Language; name: string }[]
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

const translations: Record<Language, TranslationData> = {
  en: enTranslations,
  fr: frTranslations,
  de: deTranslations,
  es: esTranslations,
  it: itTranslations,
  pt: ptTranslations
}

// Helper function to get initial language from localStorage
function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return "fr"
  const saved = localStorage.getItem("language-preference")
  if (saved && ["en", "fr", "de", "es", "it", "pt"].includes(saved)) {
    return saved as Language
  }
  return "fr"
}

// Helper function to get initial time format from localStorage
function getInitialTimeFormat(): TimeFormat {
  if (typeof window === 'undefined') return "24h"
  const saved = localStorage.getItem("time-format-preference")
  if (saved === "12h" || saved === "24h") {
    return saved as TimeFormat
  }
  return "24h"
}

// Helper function to get initial week start day from localStorage
function getInitialWeekStartDay(): WeekStartDay {
  if (typeof window === 'undefined') return "monday"
  const saved = localStorage.getItem("week-start-preference")
  if (saved === "monday" || saved === "sunday" || saved === "saturday") {
    return saved as WeekStartDay
  }
  return "monday"
}

// Helper function to get initial working days from localStorage
function getInitialWorkingDays(): number {
  if (typeof window === 'undefined') return 5
  const saved = localStorage.getItem("working-days-preference")
  if (saved && ["5", "6", "7"].includes(saved)) {
    return parseInt(saved)
  }
  return 5
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  // Initialize states directly from localStorage to avoid delay
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(getInitialTimeFormat)
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>(getInitialWeekStartDay)
  const [workingDays, setWorkingDaysState] = useState<number>(getInitialWorkingDays)
  const supabase = createClientComponentClient()

  const availableLanguages = [
    { code: "fr" as Language, name: "Français" },
    { code: "en" as Language, name: "English" },
    { code: "de" as Language, name: "Deutsch" },
    { code: "es" as Language, name: "Español" },
    { code: "it" as Language, name: "Italiano" },
    { code: "pt" as Language, name: "Português" }
  ]

  // Sync with database preferences (but don't override localStorage if no DB value)
  useEffect(() => {
    const syncWithDatabase = async () => {
      // Only sync with database if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("language_preference, time_format_preference, week_start_day, working_days")
          .eq("id", user.id)
          .single()

        // Only update from DB if localStorage doesn't have a value
        // This ensures localStorage takes priority for immediate loading
        if (profile?.language_preference && !localStorage.getItem("language-preference")) {
          setLanguageState(profile.language_preference as Language)
          localStorage.setItem("language-preference", profile.language_preference)
        }
        if (profile?.time_format_preference && !localStorage.getItem("time-format-preference")) {
          setTimeFormatState(profile.time_format_preference as TimeFormat)
          localStorage.setItem("time-format-preference", profile.time_format_preference)
        }
        if (profile?.week_start_day && !localStorage.getItem("week-start-preference")) {
          setWeekStartDayState(profile.week_start_day as WeekStartDay)
          localStorage.setItem("week-start-preference", profile.week_start_day)
        }
        if (profile?.working_days && !localStorage.getItem("working-days-preference")) {
          setWorkingDaysState(profile.working_days)
          localStorage.setItem("working-days-preference", profile.working_days.toString())
        }
      }
    }
    
    syncWithDatabase()
  }, [supabase])

  // Save language preference
  const setLanguage = useCallback((newLanguage: Language) => {
    // Update state immediately
    setLanguageState(newLanguage)
    
    // Save to localStorage immediately
    localStorage.setItem("language-preference", newLanguage)

    // Save to database asynchronously (non-blocking)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .update({
            language_preference: newLanguage
          })
          .eq("id", user.id)
          .then(() => {
            // Silently succeed
          })
          .catch(error => {
            console.error("Failed to update language preference in database:", error)
            // Still works locally even if DB update fails
          })
      }
    })
  }, [supabase])

  // Save time format preference
  const setTimeFormat = useCallback((newTimeFormat: TimeFormat) => {
    // Update state immediately
    setTimeFormatState(newTimeFormat)
    
    // Save to localStorage immediately
    localStorage.setItem("time-format-preference", newTimeFormat)

    // Save to database asynchronously (non-blocking)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .update({
            time_format_preference: newTimeFormat
          })
          .eq("id", user.id)
          .catch(error => {
            console.error("Failed to update time format preference in database:", error)
          })
      }
    })
  }, [supabase])

  // Save week start day preference
  const setWeekStartDay = useCallback((newWeekStartDay: WeekStartDay) => {
    // Update state immediately
    setWeekStartDayState(newWeekStartDay)
    
    // Save to localStorage immediately
    localStorage.setItem("week-start-preference", newWeekStartDay)

    // Save to database asynchronously (non-blocking)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .update({
            week_start_day: newWeekStartDay
          })
          .eq("id", user.id)
          .catch(error => {
            console.error("Failed to update week start preference in database:", error)
          })
      }
    })
  }, [supabase])

  // Save working days preference
  const setWorkingDays = useCallback((newWorkingDays: number) => {
    // Update state immediately
    setWorkingDaysState(newWorkingDays)
    
    // Save to localStorage immediately
    localStorage.setItem("working-days-preference", newWorkingDays.toString())

    // Save to database asynchronously (non-blocking)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("users")
          .update({
            working_days: newWorkingDays
          })
          .eq("id", user.id)
          .catch(error => {
            console.error("Failed to update working days preference in database:", error)
          })
      }
    })
  }, [supabase])

  // Helper function to get nested translation value
  const getTranslation = useCallback((key: string, lang: Language): string => {
    const keys = key.split(".")
    let value: unknown = translations[lang]

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        // If key not found in current language, try fallback to English
        if (lang !== "en") {
          return getTranslation(key, "en")
        }
        return key // Return the key itself if translation not found
      }
    }

    return typeof value === "string" ? value : key
  }, [])

  // Translation function with parameter support
  const t = useCallback((key: string, params?: Record<string, string>): string => {
    let translation = getTranslation(key, language)

    // Replace parameters in translation string
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(new RegExp(`{{${param}}}`, "g"), value)
      })
    }

    return translation
  }, [language, getTranslation])

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        timeFormat,
        setTimeFormat,
        weekStartDay,
        setWeekStartDay,
        workingDays,
        setWorkingDays,
        t,
        translations: translations[language],
        availableLanguages
      }}
    >
      {children}
    </TranslationContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(TranslationContext)
  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider")
  }
  return context
}