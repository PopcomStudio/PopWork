"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { createClientComponentClient } from "@/lib/supabase"

import enTranslations from "../translations/en.json"
import frTranslations from "../translations/fr.json"

type TranslationData = typeof enTranslations

export type Language = "en" | "fr"

interface TranslationContextType {
  language: Language
  setLanguage: (language: Language) => void
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
  const supabase = createClientComponentClient()

  const availableLanguages = [
    { code: "fr" as Language, name: "Français" },
    { code: "en" as Language, name: "English" }
  ]

  // Load language preference from localStorage on mount
  useEffect(() => {
    const loadLanguagePreference = async () => {
      // First try to load from localStorage
      const savedLanguage = localStorage.getItem("language-preference")
      if (savedLanguage === "en" || savedLanguage === "fr") {
        setLanguageState(savedLanguage as Language)
      }

      // Then try to load from user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("language_preference")
          .eq("id", user.id)
          .single()

        if (profile?.language_preference) {
          setLanguageState(profile.language_preference as Language)
        }
      }
    }
    
    loadLanguagePreference()
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
        .from("profiles")
        .update({
          language_preference: newLanguage
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