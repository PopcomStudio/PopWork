"use client"

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'comment_added'
  | 'file_uploaded'
  | 'member_added'
  | 'member_removed'
  | 'project_updated'

export interface ActivityItem {
  id: string
  type: ActivityType
  userId: string
  userName: string
  userInitials: string
  targetName: string
  targetId: string
  createdAt: string
}

export interface ProjectActivityData {
  activities: ActivityItem[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

const ACTIVITY_LIMIT = 10

// Map activity_log actions to ActivityType
function mapActionToType(action: string, entityType: string): ActivityType {
  if (entityType === 'task') {
    if (action === 'create') return 'task_created'
    if (action === 'update') return 'task_updated'
    if (action === 'complete') return 'task_completed'
  }
  if (entityType === 'comment' || action === 'comment') return 'comment_added'
  if (entityType === 'file' || action === 'upload') return 'file_uploaded'
  if (entityType === 'member') {
    if (action === 'add' || action === 'create') return 'member_added'
    if (action === 'remove' || action === 'delete') return 'member_removed'
  }
  if (entityType === 'project') return 'project_updated'
  return 'task_updated'
}

export function useProjectActivity(projectId: string): ProjectActivityData {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const supabase = createClientComponentClient()

  const fetchActivities = useCallback(async (reset = true) => {
    try {
      if (reset) {
        setLoading(true)
        setOffset(0)
      }
      setError(null)

      const currentOffset = reset ? 0 : offset
      const allActivities: ActivityItem[] = []

      // First, get all task IDs for this project
      const { data: projectTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', projectId)

      const taskIds = projectTasks?.map(t => t.id) || []

      // Fetch from activity_log for project-related activities
      const { data: activityData, error: activityError } = await supabase
        .from('activity_log')
        .select(`
          id, action, entity_type, entity_id, changes, created_at,
          users(id, first_name, last_name)
        `)
        .or(`entity_id.eq.${projectId},entity_id.in.(${taskIds.join(',')})`)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + ACTIVITY_LIMIT - 1)

      if (!activityError && activityData) {
        activityData.forEach((activity: any) => {
          const user = Array.isArray(activity.users) ? activity.users[0] : activity.users
          if (user) {
            const firstName = user.first_name || ''
            const lastName = user.last_name || ''
            const changes = activity.changes || {}

            allActivities.push({
              id: activity.id,
              type: mapActionToType(activity.action, activity.entity_type),
              userId: user.id,
              userName: `${firstName} ${lastName}`.trim() || 'Utilisateur',
              userInitials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U',
              targetName: changes.title || changes.name || activity.entity_type || 'Élément',
              targetId: activity.entity_id,
              createdAt: activity.created_at,
            })
          }
        })
      }

      // Also fetch recent comments for this project's tasks
      if (taskIds.length > 0) {
        const { data: commentData, error: commentError } = await supabase
          .from('task_comments')
          .select(`
            id, content, created_at, task_id,
            users(id, first_name, last_name),
            tasks(id, title)
          `)
          .in('task_id', taskIds)
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + ACTIVITY_LIMIT - 1)

        if (!commentError && commentData) {
          commentData.forEach((comment: any) => {
            const user = Array.isArray(comment.users) ? comment.users[0] : comment.users
            const task = Array.isArray(comment.tasks) ? comment.tasks[0] : comment.tasks
            if (user) {
              const firstName = user.first_name || ''
              const lastName = user.last_name || ''
              // Avoid duplicates from activity_log
              const existingComment = allActivities.find(a => a.id === `comment-${comment.id}`)
              if (!existingComment) {
                allActivities.push({
                  id: `comment-${comment.id}`,
                  type: 'comment_added',
                  userId: user.id,
                  userName: `${firstName} ${lastName}`.trim() || 'Utilisateur',
                  userInitials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U',
                  targetName: task?.title || 'Tâche',
                  targetId: comment.task_id,
                  createdAt: comment.created_at,
                })
              }
            }
          })
        }
      }

      // Fetch recent file uploads for this project
      const { data: fileData, error: fileError } = await supabase
        .from('project_files')
        .select(`
          id, file_name, created_at,
          users(id, first_name, last_name)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + ACTIVITY_LIMIT - 1)

      if (!fileError && fileData) {
        fileData.forEach((file: any) => {
          const user = Array.isArray(file.users) ? file.users[0] : file.users
          if (user) {
            const firstName = user.first_name || ''
            const lastName = user.last_name || ''
            // Avoid duplicates from activity_log
            const existingFile = allActivities.find(a => a.id === `file-${file.id}`)
            if (!existingFile) {
              allActivities.push({
                id: `file-${file.id}`,
                type: 'file_uploaded',
                userId: user.id,
                userName: `${firstName} ${lastName}`.trim() || 'Utilisateur',
                userInitials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U',
                targetName: file.file_name,
                targetId: file.id,
                createdAt: file.created_at,
              })
            }
          }
        })
      }

      // Sort all activities by date (newest first)
      allActivities.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      // Take only the first ACTIVITY_LIMIT items
      const limitedActivities = allActivities.slice(0, ACTIVITY_LIMIT)

      if (reset) {
        setActivities(limitedActivities)
      } else {
        setActivities(prev => [...prev, ...limitedActivities])
      }

      setHasMore(allActivities.length >= ACTIVITY_LIMIT)
      setOffset(currentOffset + ACTIVITY_LIMIT)

    } catch (err) {
      console.error('Error fetching project activity:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [projectId, supabase, offset])

  const loadMore = useCallback(async () => {
    await fetchActivities(false)
  }, [fetchActivities])

  const refetch = useCallback(async () => {
    await fetchActivities(true)
  }, [fetchActivities])

  useEffect(() => {
    fetchActivities(true)
  }, [projectId]) // Only refetch when projectId changes

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
  }
}
