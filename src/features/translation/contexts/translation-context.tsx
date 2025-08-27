"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { createClientComponentClient } from "@/lib/supabase"

import enTranslations from "../translations/en.json"
import frTranslations from "../translations/fr.json"

type TranslationData = typeof enTranslations

export type Language = "en" | "fr"
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
  fr: frTranslations
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr")
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>("24h")
  const [weekStartDay, setWeekStartDayState] = useState<WeekStartDay>("monday")
  const [workingDays, setWorkingDaysState] = useState<number>(5)
  const supabase = createClientComponentClient()

  const availableLanguages = [
    { code: "fr" as Language, name: "Français" },
    { code: "en" as Language, name: "English" }
  ]

  // Load language and time format preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      // First try to load from localStorage
      const savedLanguage = localStorage.getItem("language-preference")
      if (savedLanguage === "en" || savedLanguage === "fr") {
        setLanguageState(savedLanguage as Language)
      }

      const savedTimeFormat = localStorage.getItem("time-format-preference")
      if (savedTimeFormat === "12h" || savedTimeFormat === "24h") {
        setTimeFormatState(savedTimeFormat as TimeFormat)
      }

      const savedWeekStart = localStorage.getItem("week-start-preference")
      if (savedWeekStart === "monday" || savedWeekStart === "sunday" || savedWeekStart === "saturday") {
        setWeekStartDayState(savedWeekStart as WeekStartDay)
      }

      const savedWorkingDays = localStorage.getItem("working-days-preference")
      if (savedWorkingDays && ["5", "6", "7"].includes(savedWorkingDays)) {
        setWorkingDaysState(parseInt(savedWorkingDays))
      }

      // Then try to load from user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("language_preference, time_format_preference, week_start_day, working_days")
          .eq("id", user.id)
          .single()

        if (profile?.language_preference) {
          setLanguageState(profile.language_preference as Language)
        }
        if (profile?.time_format_preference) {
          setTimeFormatState(profile.time_format_preference as TimeFormat)
        }
        if (profile?.week_start_day) {
          setWeekStartDayState(profile.week_start_day as WeekStartDay)
        }
        if (profile?.working_days) {
          setWorkingDaysState(profile.working_days)
        }
      }
    }
    
    loadPreferences()
  }, [supabase])

  // Save language preference
  const setLanguage = useCallback(async (newLanguage: Language) => {
    setLanguageState(newLanguage)
    
    // Save to localStorage
    localStorage.setItem("language-preference", newLanguage)

    // Save to database
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from("users")
        .update({
          language_preference: newLanguage
        })
        .eq("id", user.id)
    }
  }, [supabase])

  // Save time format preference
  const setTimeFormat = useCallback(async (newTimeFormat: TimeFormat) => {
    setTimeFormatState(newTimeFormat)
    
    // Save to localStorage
    localStorage.setItem("time-format-preference", newTimeFormat)

    // Save to database
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from("users")
        .update({
          time_format_preference: newTimeFormat
        })
        .eq("id", user.id)
    }
  }, [supabase])

  // Save week start day preference
  const setWeekStartDay = useCallback(async (newWeekStartDay: WeekStartDay) => {
    setWeekStartDayState(newWeekStartDay)
    
    // Save to localStorage
    localStorage.setItem("week-start-preference", newWeekStartDay)

    // Save to database
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from("users")
        .update({
          week_start_day: newWeekStartDay
        })
        .eq("id", user.id)
    }
  }, [supabase])

  // Save working days preference
  const setWorkingDays = useCallback(async (newWorkingDays: number) => {
    setWorkingDaysState(newWorkingDays)
    
    // Save to localStorage
    localStorage.setItem("working-days-preference", newWorkingDays.toString())

    // Save to database
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from("users")
        .update({
          working_days: newWorkingDays
        })
        .eq("id", user.id)
    }
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