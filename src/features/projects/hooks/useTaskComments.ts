'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { 
  TaskCommentExtended, 
  CommentReaction, 
  CommentMention,
  CommentEditorData,
  EmojiReaction 
} from '../types/kanban'
import { User } from '@/shared/types/database'

interface UseTaskCommentsReturn {
  comments: TaskCommentExtended[]
  loading: boolean
  error: string | null
  
  // Actions CRUD commentaires
  createComment: (data: CommentEditorData) => Promise<TaskCommentExtended>
  updateComment: (commentId: string, content: string, mentions: CommentMention[]) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  
  // Actions réactions
  addReaction: (commentId: string, emoji: string) => Promise<void>
  removeReaction: (commentId: string, emoji: string) => Promise<void>
  getReactionsSummary: (commentId: string) => EmojiReaction[]
  
  // Utilitaires
  refreshComments: () => Promise<void>
  getCommentById: (commentId: string) => TaskCommentExtended | undefined
  getCommentReplies: (parentCommentId: string) => TaskCommentExtended[]
  getFileComments: (attachmentId: string) => TaskCommentExtended[]
}

export function useTaskComments(taskId: string): UseTaskCommentsReturn {
  const [comments, setComments] = useState<TaskCommentExtended[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient()

  // Récupérer tous les commentaires d'une tâche avec leurs relations
  const fetchComments = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      // Récupérer les commentaires avec leurs utilisateurs
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:users(id, first_name, last_name, email),
          reactions:comment_reactions(
            id, emoji, created_at,
            user:users(id, first_name, last_name)
          ),
          mentions:comment_mentions(*)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (commentsError) throw commentsError

      // Transformer les données en format TaskCommentExtended
      const extendedComments: TaskCommentExtended[] = (commentsData || []).map(comment => ({
        id: comment.id,
        taskId: comment.task_id,
        userId: comment.user_id,
        content: comment.content,
        parentCommentId: comment.parent_comment_id,
        attachmentId: comment.attachment_id,
        mentions: comment.mentions || [],
        reactions: comment.reactions || [],
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
        isEdited: comment.updated_at !== comment.created_at,
        user: {
          id: comment.user.id,
          firstName: comment.user.first_name,
          lastName: comment.user.last_name,
          email: comment.user.email
        },
        replies: [] // Sera peuplé ci-dessous
      }))

      // Organiser en structure hiérarchique (parent -> enfants)
      const commentMap = new Map(extendedComments.map(c => [c.id, c]))
      const rootComments: TaskCommentExtended[] = []

      extendedComments.forEach(comment => {
        if (comment.parentCommentId) {
          const parent = commentMap.get(comment.parentCommentId)
          if (parent) {
            parent.replies = parent.replies || []
            parent.replies.push(comment)
          }
        } else {
          rootComments.push(comment)
        }
      })

      setComments(rootComments)
    } catch (err) {
      console.error('Erreur récupération commentaires:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [taskId, supabase])

  // Créer un nouveau commentaire
  const createComment = useCallback(async (data: CommentEditorData): Promise<TaskCommentExtended> => {
    try {
      const { data: newComment, error: createError } = await supabase
        .from('task_comments')
        .insert([{
          task_id: taskId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          content: data.content,
          parent_comment_id: data.parentCommentId,
          attachment_id: data.attachmentId
        }])
        .select(`
          *,
          user:users(id, first_name, last_name, email)
        `)
        .single()

      if (createError) throw createError

      // Créer les mentions si présentes
      if (data.mentions.length > 0) {
        const mentionsToInsert = data.mentions.map(mention => ({
          comment_id: newComment.id,
          type: mention.type,
          target_id: mention.targetId,
          start_index: mention.startIndex,
          end_index: mention.endIndex
        }))

        await supabase
          .from('comment_mentions')
          .insert(mentionsToInsert)
      }

      // Rafraîchir les commentaires
      await fetchComments()

      const extendedComment: TaskCommentExtended = {
        id: newComment.id,
        taskId: newComment.task_id,
        userId: newComment.user_id,
        content: newComment.content,
        parentCommentId: newComment.parent_comment_id,
        attachmentId: newComment.attachment_id,
        mentions: data.mentions,
        reactions: [],
        createdAt: newComment.created_at,
        updatedAt: newComment.updated_at,
        isEdited: false,
        user: {
          id: newComment.user.id,
          firstName: newComment.user.first_name,
          lastName: newComment.user.last_name,
          email: newComment.user.email
        },
        replies: []
      }

      return extendedComment
    } catch (err) {
      console.error('Erreur création commentaire:', err)
      throw new Error(err instanceof Error ? err.message : 'Erreur création commentaire')
    }
  }, [taskId, supabase, fetchComments])

  // Mettre à jour un commentaire
  const updateComment = useCallback(async (commentId: string, content: string, mentions: CommentMention[]) => {
    try {
      const { error: updateError } = await supabase
        .from('task_comments')
        .update({ 
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)

      if (updateError) throw updateError

      // Mettre à jour les mentions
      await supabase
        .from('comment_mentions')
        .delete()
        .eq('comment_id', commentId)

      if (mentions.length > 0) {
        const mentionsToInsert = mentions.map(mention => ({
          comment_id: commentId,
          type: mention.type,
          target_id: mention.targetId,
          start_index: mention.startIndex,
          end_index: mention.endIndex
        }))

        await supabase
          .from('comment_mentions')
          .insert(mentionsToInsert)
      }

      await fetchComments()
    } catch (err) {
      console.error('Erreur mise à jour commentaire:', err)
      throw new Error(err instanceof Error ? err.message : 'Erreur mise à jour commentaire')
    }
  }, [supabase, fetchComments])

  // Supprimer un commentaire
  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId)

      if (deleteError) throw deleteError
      await fetchComments()
    } catch (err) {
      console.error('Erreur suppression commentaire:', err)
      throw new Error(err instanceof Error ? err.message : 'Erreur suppression commentaire')
    }
  }, [supabase, fetchComments])

  // Ajouter une réaction
  const addReaction = useCallback(async (commentId: string, emoji: string) => {
    try {
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Utilisateur non authentifié')
      }

      const { error: reactionError } = await supabase
        .from('comment_reactions')
        .insert([{
          comment_id: commentId,
          user_id: user.id,
          emoji
        }])

      if (reactionError) {
        console.error('Erreur Supabase ajout réaction:', reactionError)
        throw reactionError
      }
      
      await fetchComments()
    } catch (err) {
      console.error('Erreur ajout réaction:', err)
      throw new Error(err instanceof Error ? err.message : 'Erreur ajout réaction')
    }
  }, [supabase, fetchComments])

  // Supprimer une réaction
  const removeReaction = useCallback(async (commentId: string, emoji: string) => {
    try {
      // Vérifier l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Utilisateur non authentifié')
      }

      const { error: removeError } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('emoji', emoji)
        .eq('user_id', user.id)

      if (removeError) {
        console.error('Erreur Supabase suppression réaction:', removeError)
        throw removeError
      }
      
      await fetchComments()
    } catch (err) {
      console.error('Erreur suppression réaction:', err)
      throw new Error(err instanceof Error ? err.message : 'Erreur suppression réaction')
    }
  }, [supabase, fetchComments])

  // Obtenir le résumé des réactions pour un commentaire
  const getReactionsSummary = useCallback((commentId: string): EmojiReaction[] => {
    const comment = getCommentById(commentId)
    if (!comment) return []

    const reactionsMap = new Map<string, EmojiReaction>()

    comment.reactions.forEach(reaction => {
      const existing = reactionsMap.get(reaction.emoji)
      if (existing) {
        existing.count++
        existing.users.push({
          id: reaction.user?.id || '',
          firstName: reaction.user?.firstName || '',
          lastName: reaction.user?.lastName || ''
        })
      } else {
        reactionsMap.set(reaction.emoji, {
          emoji: reaction.emoji,
          count: 1,
          users: [{
            id: reaction.user?.id || '',
            firstName: reaction.user?.firstName || '',
            lastName: reaction.user?.lastName || ''
          }],
          hasUserReacted: false // TODO: vérifier avec l'utilisateur actuel
        })
      }
    })

    return Array.from(reactionsMap.values())
  }, [])

  // Utilitaires
  const refreshComments = useCallback(async () => {
    await fetchComments()
  }, [fetchComments])

  const getCommentById = useCallback((commentId: string): TaskCommentExtended | undefined => {
    const findInComments = (comments: TaskCommentExtended[]): TaskCommentExtended | undefined => {
      for (const comment of comments) {
        if (comment.id === commentId) return comment
        if (comment.replies) {
          const found = findInComments(comment.replies)
          if (found) return found
        }
      }
      return undefined
    }
    return findInComments(comments)
  }, [comments])

  const getCommentReplies = useCallback((parentCommentId: string): TaskCommentExtended[] => {
    const parent = getCommentById(parentCommentId)
    return parent?.replies || []
  }, [getCommentById])

  const getFileComments = useCallback((attachmentId: string): TaskCommentExtended[] => {
    const findFileComments = (comments: TaskCommentExtended[]): TaskCommentExtended[] => {
      const result: TaskCommentExtended[] = []
      comments.forEach(comment => {
        if (comment.attachmentId === attachmentId) {
          result.push(comment)
        }
        if (comment.replies) {
          result.push(...findFileComments(comment.replies))
        }
      })
      return result
    }
    return findFileComments(comments)
  }, [comments])

  // Charger les commentaires au montage
  useEffect(() => {
    if (taskId) {
      fetchComments()
    }
  }, [taskId, fetchComments])

  // Temps réel Supabase pour les commentaires
  useEffect(() => {
    if (!taskId) return

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        () => {
          fetchComments() // Recharger les commentaires quand il y a des changements
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
        },
        () => {
          fetchComments() // Recharger quand les réactions changent
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_mentions',
        },
        () => {
          fetchComments() // Recharger quand les mentions changent
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId, supabase, fetchComments])

  return {
    comments,
    loading,
    error,
    
    // Actions CRUD
    createComment,
    updateComment,
    deleteComment,
    
    // Actions réactions
    addReaction,
    removeReaction,
    getReactionsSummary,
    
    // Utilitaires
    refreshComments,
    getCommentById,
    getCommentReplies,
    getFileComments
  }
}