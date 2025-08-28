'use client'

import { useState, useCallback, useEffect } from 'react'
import { TaskCommentExtended, CommentEditorData, EmojiReaction } from '../types/kanban'

// Données mockées pour les tests
const mockComments: TaskCommentExtended[] = [
  {
    id: '1',
    taskId: 'task-1',
    userId: 'user-1',
    content: 'Excellent travail sur cette tâche ! @John Doe qu\'est-ce que tu en penses ?',
    parentCommentId: null,
    attachmentId: null,
    mentions: [
      {
        id: 'mention-1',
        commentId: '1',
        type: 'user',
        targetId: 'user-2',
        startIndex: 45,
        endIndex: 54
      }
    ],
    reactions: [
      {
        emoji: '👍',
        count: 2,
        users: ['user-1', 'user-3'],
        hasReacted: false
      },
      {
        emoji: '❤️',
        count: 1,
        users: ['user-2'],
        hasReacted: false
      }
    ],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    isEdited: false,
    user: {
      id: 'user-1',
      firstName: 'Alice',
      lastName: 'Dupont',
      email: 'alice@popwork.com'
    },
    replies: [
      {
        id: '2',
        taskId: 'task-1',
        userId: 'user-2',
        content: 'Merci Alice ! Je pense que c\'est vraiment bien parti 🚀',
        parentCommentId: '1',
        attachmentId: null,
        mentions: [],
        reactions: [
          {
            emoji: '🚀',
            count: 1,
            users: ['user-1'],
            hasReacted: false
          }
        ],
        createdAt: '2024-01-15T11:15:00Z',
        updatedAt: '2024-01-15T11:15:00Z',
        isEdited: false,
        user: {
          id: 'user-2',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@popwork.com'
        },
        replies: []
      }
    ]
  }
]

export interface UseTaskCommentsReturn {
  comments: TaskCommentExtended[]
  loading: boolean
  error: string | null
  createComment: (data: CommentEditorData) => Promise<TaskCommentExtended>
  replyToComment: (parentId: string, data: CommentEditorData) => Promise<TaskCommentExtended>
  editComment: (commentId: string, data: CommentEditorData) => Promise<TaskCommentExtended>
  deleteComment: (commentId: string) => Promise<void>
  toggleReaction: (commentId: string, emoji: string) => Promise<void>
  getReactionsSummary: (commentId: string) => EmojiReaction[]
}

export function useTaskComments(taskId: string): UseTaskCommentsReturn {
  const [comments, setComments] = useState<TaskCommentExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Simuler le chargement des commentaires
  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      // Simuler un délai réseau
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Filtrer les commentaires pour cette tâche
      const taskComments = mockComments.filter(c => c.taskId === taskId)
      setComments(taskComments)
      setError(null)
    } catch (err) {
      console.error('Erreur récupération commentaires:', err)
      setError('Erreur lors du chargement des commentaires')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  // Créer un nouveau commentaire
  const createComment = useCallback(async (data: CommentEditorData): Promise<TaskCommentExtended> => {
    const newComment: TaskCommentExtended = {
      id: `comment-${Date.now()}`,
      taskId,
      userId: 'current-user',
      content: data.content,
      parentCommentId: null,
      attachmentId: null,
      mentions: data.mentions || [],
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEdited: false,
      user: {
        id: 'current-user',
        firstName: 'Utilisateur',
        lastName: 'Actuel',
        email: 'user@popwork.com'
      },
      replies: []
    }

    mockComments.push(newComment)
    await fetchComments()
    return newComment
  }, [taskId, fetchComments])

  // Répondre à un commentaire
  const replyToComment = useCallback(async (parentId: string, data: CommentEditorData): Promise<TaskCommentExtended> => {
    const reply: TaskCommentExtended = {
      id: `reply-${Date.now()}`,
      taskId,
      userId: 'current-user',
      content: data.content,
      parentCommentId: parentId,
      attachmentId: null,
      mentions: data.mentions || [],
      reactions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEdited: false,
      user: {
        id: 'current-user',
        firstName: 'Utilisateur',
        lastName: 'Actuel',
        email: 'user@popwork.com'
      },
      replies: []
    }

    // Ajouter la réponse aux données mockées
    const parentComment = mockComments.find(c => c.id === parentId)
    if (parentComment) {
      parentComment.replies = parentComment.replies || []
      parentComment.replies.push(reply)
    }

    await fetchComments()
    return reply
  }, [taskId, fetchComments])

  // Modifier un commentaire
  const editComment = useCallback(async (commentId: string, data: CommentEditorData): Promise<TaskCommentExtended> => {
    // Trouver et modifier le commentaire
    const findAndUpdate = (comments: TaskCommentExtended[]): TaskCommentExtended | null => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          comment.content = data.content
          comment.mentions = data.mentions || []
          comment.updatedAt = new Date().toISOString()
          comment.isEdited = true
          return comment
        }
        if (comment.replies) {
          const found = findAndUpdate(comment.replies)
          if (found) return found
        }
      }
      return null
    }

    const updatedComment = findAndUpdate(mockComments)
    if (!updatedComment) {
      throw new Error('Commentaire non trouvé')
    }

    await fetchComments()
    return updatedComment
  }, [fetchComments])

  // Supprimer un commentaire
  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    // Fonction récursive pour supprimer
    const removeComment = (comments: TaskCommentExtended[]): boolean => {
      const index = comments.findIndex(c => c.id === commentId)
      if (index !== -1) {
        comments.splice(index, 1)
        return true
      }
      
      for (const comment of comments) {
        if (comment.replies && removeComment(comment.replies)) {
          return true
        }
      }
      return false
    }

    removeComment(mockComments)
    await fetchComments()
  }, [fetchComments])

  // Basculer une réaction
  const toggleReaction = useCallback(async (commentId: string, emoji: string): Promise<void> => {
    const userId = 'current-user'
    
    // Fonction récursive pour trouver et modifier les réactions
    const updateReactions = (comments: TaskCommentExtended[]): boolean => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          const existingReaction = comment.reactions.find(r => r.emoji === emoji)
          
          if (existingReaction) {
            if (existingReaction.users.includes(userId)) {
              // Retirer la réaction
              existingReaction.users = existingReaction.users.filter(u => u !== userId)
              existingReaction.count = existingReaction.users.length
              existingReaction.hasReacted = false
              
              // Supprimer la réaction si plus personne ne l'a
              if (existingReaction.count === 0) {
                comment.reactions = comment.reactions.filter(r => r.emoji !== emoji)
              }
            } else {
              // Ajouter la réaction
              existingReaction.users.push(userId)
              existingReaction.count = existingReaction.users.length
              existingReaction.hasReacted = true
            }
          } else {
            // Créer nouvelle réaction
            comment.reactions.push({
              emoji,
              count: 1,
              users: [userId],
              hasReacted: true
            })
          }
          return true
        }
        
        if (comment.replies && updateReactions(comment.replies)) {
          return true
        }
      }
      return false
    }

    updateReactions(mockComments)
    await fetchComments()
  }, [fetchComments])

  // Obtenir le résumé des réactions
  const getReactionsSummary = useCallback((commentId: string): EmojiReaction[] => {
    // Fonction récursive pour trouver le commentaire
    const findComment = (comments: TaskCommentExtended[]): TaskCommentExtended | null => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          return comment
        }
        if (comment.replies) {
          const found = findComment(comment.replies)
          if (found) return found
        }
      }
      return null
    }

    const comment = findComment(comments)
    return comment?.reactions || []
  }, [comments])

  // Charger les commentaires au montage
  useEffect(() => {
    if (taskId) {
      fetchComments()
    }
  }, [taskId, fetchComments])

  return {
    comments,
    loading,
    error,
    createComment,
    replyToComment,
    editComment,
    deleteComment,
    toggleReaction,
    getReactionsSummary
  }
}