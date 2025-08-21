'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { CommentMention, MentionSuggestion, MentionMatch } from '../../types/kanban'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, X } from 'lucide-react'
import { MentionDropdown } from './MentionDropdown'

interface CommentEditorProps {
  initialContent?: string
  placeholder?: string
  submitLabel?: string
  onSubmit: (content: string, mentions: CommentMention[]) => void
  onCancel?: () => void
  availableUsers?: Array<{ id: string; firstName: string; lastName: string; email: string }>
  availableAttachments?: Array<{ id: string; fileName: string }>
}

export function CommentEditor({
  initialContent = '',
  placeholder = 'Ajouter un commentaire...',
  submitLabel = 'Commenter',
  onSubmit,
  onCancel,
  availableUsers = [],
  availableAttachments = []
}: CommentEditorProps) {
  const [content, setContent] = useState(initialContent)
  const [mentions, setMentions] = useState<CommentMention[]>([])
  const [currentMention, setCurrentMention] = useState<MentionMatch | null>(null)
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Détecter les mentions dans le texte
  const detectMention = useCallback((text: string, cursorPos: number): MentionMatch | null => {
    const textBeforeCursor = text.substring(0, cursorPos)
    const mentionRegex = /@(\w*)$/
    const match = textBeforeCursor.match(mentionRegex)

    if (match) {
      return {
        type: 'user', // Par défaut, on assume que c'est un utilisateur
        trigger: '@',
        query: match[1],
        startIndex: match.index!,
        endIndex: cursorPos
      }
    }

    return null
  }, [])

  // Générer les suggestions basées sur la requête
  const generateSuggestions = useCallback((query: string): MentionSuggestion[] => {
    const userSuggestions: MentionSuggestion[] = availableUsers
      .filter(user => 
        user.firstName.toLowerCase().includes(query.toLowerCase()) ||
        user.lastName.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      )
      .map(user => ({
        id: user.id,
        type: 'user' as const,
        label: `${user.firstName} ${user.lastName}`,
        sublabel: user.email,
        avatar: `${user.firstName[0]}${user.lastName[0]}`
      }))

    const attachmentSuggestions: MentionSuggestion[] = availableAttachments
      .filter(attachment => 
        attachment.fileName.toLowerCase().includes(query.toLowerCase())
      )
      .map(attachment => ({
        id: attachment.id,
        type: 'attachment' as const,
        label: attachment.fileName,
        sublabel: 'Pièce jointe',
        avatar: '📎'
      }))

    return [...userSuggestions, ...attachmentSuggestions].slice(0, 8)
  }, [availableUsers, availableAttachments])

  // Gérer les changements de contenu
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const cursorPos = e.target.selectionStart

    setContent(newContent)
    setCursorPosition(cursorPos)

    // Détecter une mention en cours
    const mention = detectMention(newContent, cursorPos)
    
    if (mention) {
      setCurrentMention(mention)
      const newSuggestions = generateSuggestions(mention.query)
      setSuggestions(newSuggestions)
      setShowSuggestions(newSuggestions.length > 0)
    } else {
      setCurrentMention(null)
      setShowSuggestions(false)
    }
  }, [detectMention, generateSuggestions])

  // Insérer une mention sélectionnée
  const insertMention = useCallback((suggestion: MentionSuggestion) => {
    if (!currentMention || !textareaRef.current) return

    const beforeMention = content.substring(0, currentMention.startIndex)
    const afterMention = content.substring(currentMention.endIndex)
    const mentionText = `@${suggestion.label}`
    const newContent = beforeMention + mentionText + afterMention

    // Créer l'objet mention
    const newMention: CommentMention = {
      id: '', // Sera généré côté serveur
      commentId: '', // Sera défini lors de la création du commentaire
      type: suggestion.type,
      targetId: suggestion.id,
      startIndex: currentMention.startIndex,
      endIndex: currentMention.startIndex + mentionText.length
    }

    // Ajuster les indices des mentions existantes
    const adjustedMentions = mentions.map(m => {
      if (m.startIndex > currentMention.startIndex) {
        const offset = mentionText.length - (currentMention.endIndex - currentMention.startIndex)
        return {
          ...m,
          startIndex: m.startIndex + offset,
          endIndex: m.endIndex + offset
        }
      }
      return m
    })

    setContent(newContent)
    setMentions([...adjustedMentions, newMention])
    setShowSuggestions(false)
    setCurrentMention(null)

    // Repositionner le curseur après la mention
    setTimeout(() => {
      const newCursorPos = currentMention.startIndex + mentionText.length
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      textareaRef.current?.focus()
    }, 0)
  }, [content, currentMention, mentions])

  // Gérer les touches spéciales
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        setCurrentMention(null)
        e.preventDefault()
      }
    }

    // Soumettre avec Ctrl+Enter ou Cmd+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }, [showSuggestions, suggestions])

  // Soumettre le commentaire
  const handleSubmit = useCallback(() => {
    if (content.trim()) {
      onSubmit(content.trim(), mentions)
      setContent('')
      setMentions([])
      setShowSuggestions(false)
      setCurrentMention(null)
    }
  }, [content, mentions, onSubmit])

  // Annuler l'édition
  const handleCancel = useCallback(() => {
    setContent(initialContent)
    setMentions([])
    setShowSuggestions(false)
    setCurrentMention(null)
    onCancel?.()
  }, [initialContent, onCancel])

  // Réinitialiser lors du changement de contenu initial
  useEffect(() => {
    setContent(initialContent)
  }, [initialContent])

  const isEmpty = content.trim().length === 0

  return (
    <div className="relative">
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Zone de texte */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[80px] border-0 resize-none focus-visible:ring-0"
          rows={3}
        />

        {/* Dropdown des suggestions */}
        {showSuggestions && (
          <MentionDropdown
            suggestions={suggestions}
            onSelect={insertMention}
            onClose={() => setShowSuggestions(false)}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between p-3 border-t bg-gray-50">
          <div className="text-xs text-gray-500">
            Utilisez @ pour mentionner quelqu'un ou un fichier • {content.length}/2000
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isEmpty}
            >
              <Send className="h-4 w-4 mr-1" />
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}