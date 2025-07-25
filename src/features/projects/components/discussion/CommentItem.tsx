'use client'

import React, { useState, useCallback } from 'react'
import { TaskCommentExtended, EmojiReaction } from '../../types/kanban'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  IconMessage2, 
  IconDots, 
  IconEdit, 
  IconTrash,
  IconHeart,
  IconThumbUp,
  IconMoodSmile
} from '@tabler/icons-react'
import { ReactionBar } from './ReactionBar'
import { CommentEditor } from './CommentEditor'

interface CommentItemProps {
  comment: TaskCommentExtended
  level?: number
  currentUserId?: string
  onReply?: (parentCommentId: string, content: string, mentions: any[]) => void
  onEdit?: (commentId: string, content: string, mentions: any[]) => void
  onDelete?: (commentId: string) => void
  onReaction?: (commentId: string, emoji: string) => void
  onRemoveReaction?: (commentId: string, emoji: string) => void
  getReactionsSummary?: (commentId: string) => EmojiReaction[]
}

export function CommentItem({ 
  comment, 
  level = 0, 
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onRemoveReaction,
  getReactionsSummary
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const isOwner = currentUserId === comment.userId
  const reactions = getReactionsSummary?.(comment.id) || []
  const hasReplies = comment.replies && comment.replies.length > 0

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Il y a quelques minutes'
    if (diffInHours < 24) return `Il y a ${diffInHours}h`
    if (diffInHours < 48) return 'Hier'
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleEdit = useCallback((content: string, mentions: any[]) => {
    onEdit?.(comment.id, content, mentions)
    setIsEditing(false)
  }, [comment.id, onEdit])

  const handleReply = useCallback((content: string, mentions: any[]) => {
    // Pour les réponses, on passe le contenu directement au parent
    // qui se chargera de créer le commentaire avec parentCommentId
    onReply?.(comment.id, content, mentions)
    setIsReplying(false)
  }, [comment.id, onReply])

  const handleQuickReaction = useCallback((emoji: string) => {
    onReaction?.(comment.id, emoji)
  }, [comment.id, onReaction])

  const renderMentions = (content: string) => {
    // Remplacer les mentions par des spans colorés
    return content.split(/(@\w+)/g).map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-blue-600 font-medium bg-blue-50 px-1 rounded">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <div className={`comment-item relative ${level > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex gap-3 py-2 hover:bg-gray-50/50 rounded-lg px-2 transition-colors group">
        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
            {comment.user.firstName[0]}{comment.user.lastName[0]}
          </AvatarFallback>
        </Avatar>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0 relative">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {comment.user.firstName} {comment.user.lastName}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <Badge variant="secondary" className="text-xs">
                Modifié
              </Badge>
            )}
            {comment.attachmentId && (
              <Badge variant="outline" className="text-xs">
                📎 Fichier
              </Badge>
            )}
          </div>

          {/* Contenu du commentaire */}
          {isEditing ? (
            <CommentEditor
              initialContent={comment.content}
              onSubmit={handleEdit}
              onCancel={() => setIsEditing(false)}
              placeholder="Modifier votre commentaire..."
              submitLabel="Sauvegarder"
              availableUsers={[]}
              availableAttachments={[]}
            />
          ) : (
            <div className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
              {renderMentions(comment.content)}
            </div>
          )}

          {/* Actions flottantes au survol - style Teams/Discord */}
          <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto pointer-events-none transition-opacity duration-200 z-10">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1">
              {/* Réactions rapides */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-blue-50 text-base"
                onClick={() => handleQuickReaction('👍')}
                title="👍"
              >
                👍
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-red-50 text-base"
                onClick={() => handleQuickReaction('❤️')}
                title="❤️"
              >
                ❤️
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-yellow-50 text-base"
                onClick={() => handleQuickReaction('😄')}
                title="😄"
              >
                😄
              </Button>
              
              {/* Séparateur */}
              <div className="w-px h-4 bg-gray-200 mx-1" />
              
              {/* Action répondre */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100"
                onClick={() => setIsReplying(true)}
                title="Répondre"
              >
                <IconMessage2 className="h-4 w-4" />
              </Button>

              {/* Actions du propriétaire */}
              {isOwner && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-gray-100"
                    onClick={() => setIsEditing(true)}
                    title="Modifier"
                  >
                    <IconEdit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-red-50 text-red-500"
                    onClick={() => onDelete?.(comment.id)}
                    title="Supprimer"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {/* Menu plus d'options */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-gray-100"
                title="Plus d'options"
              >
                <IconDots className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Réactions */}
          {reactions.length > 0 && (
            <ReactionBar
              reactions={reactions}
              onReactionClick={(emoji) => {
                const reaction = reactions.find(r => r.emoji === emoji)
                if (reaction?.hasUserReacted) {
                  onRemoveReaction?.(comment.id, emoji)
                } else {
                  onReaction?.(comment.id, emoji)
                }
              }}
            />
          )}

          {/* Éditeur de réponse */}
          {isReplying && (
            <div className="mt-3">
              <CommentEditor
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
                placeholder="Répondre à ce commentaire..."
                submitLabel="Répondre"
                availableUsers={[]}
                availableAttachments={[]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Réponses */}
      {hasReplies && (
        <div className="ml-3">
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              level={level + 1}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReaction={onReaction}
              onRemoveReaction={onRemoveReaction}
              getReactionsSummary={getReactionsSummary}
            />
          ))}
        </div>
      )}
    </div>
  )
}