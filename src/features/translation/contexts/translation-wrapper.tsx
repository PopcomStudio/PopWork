"use client"

import React, { ReactNode, useState, useEffect } from "react"
import { TranslationProvider } from "./translation-context"

interface TranslationWrapperProps {
  children: ReactNode
}

export function TranslationWrapper({ children }: TranslationWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial client render, hide content to prevent flash
  if (!mounted) {
    return (
      <div style={{ opacity: 0, pointerEvents: 'none' }}>
        <TranslationProvider>
          {children}
        </TranslationProvider>
      </div>
    )
  }

  // After mounting, render normally with localStorage values loaded
  return (
    <TranslationProvider>
      {children}
    </TranslationProvider>
  )
}