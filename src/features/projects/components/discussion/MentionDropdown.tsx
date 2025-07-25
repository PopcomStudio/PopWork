'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MentionSuggestion } from '../../types/kanban'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface MentionDropdownProps {
  suggestions: MentionSuggestion[]
  onSelect: (suggestion: MentionSuggestion) => void
  onClose: () => void
}

export function MentionDropdown({ suggestions, onSelect, onClose }: MentionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Gérer les touches de navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [suggestions, selectedIndex, onSelect, onClose])

  // Écouter les événements clavier
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Réinitialiser la sélection quand les suggestions changent
  useEffect(() => {
    setSelectedIndex(0)
  }, [suggestions])

  if (suggestions.length === 0) return null

  return (
    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
      <div className="p-2">
        <div className="text-xs text-gray-500 mb-2 px-2">
          Suggestions de mentions
        </div>
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.type}-${suggestion.id}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
              index === selectedIndex
                ? 'bg-blue-50 text-blue-700'
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {/* Avatar ou icône */}
            {suggestion.type === 'user' ? (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {suggestion.avatar}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-6 w-6 flex items-center justify-center text-sm">
                {suggestion.avatar}
              </div>
            )}

            {/* Informations */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {suggestion.label}
              </div>
              {suggestion.sublabel && (
                <div className="text-xs text-gray-500 truncate">
                  {suggestion.sublabel}
                </div>
              )}
            </div>

            {/* Badge du type */}
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              suggestion.type === 'user'
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {suggestion.type === 'user' ? 'Utilisateur' : 'Fichier'}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="border-t px-3 py-2 bg-gray-50">
        <div className="text-xs text-gray-500">
          ↑↓ pour naviguer • Entrée pour sélectionner • Échap pour fermer
        </div>
      </div>
    </div>
  )
}