import { createServerComponentClient } from '@/lib/supabase'
import { Notification } from '@/shared/types/database'

export type NotificationType = 
  | 'leave_approved' 
  | 'leave_rejected' 
  | 'leave_request'
  | 'project_update'
  | 'task_assigned'
  | 'task_completed'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'general'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
}

export class NotificationService {
  static async createNotification({
    userId,
    type,
    title,
    message,
    data = {}
  }: CreateNotificationParams): Promise<Notification | null> {
    const supabase = createServerComponentClient()
    
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data,
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating notification:', error)
        return null
      }

      return notification
    } catch (error) {
      console.error('Failed to create notification:', error)
      return null
    }
  }

  static async createBulkNotifications(
    notifications: CreateNotificationParams[]
  ): Promise<Notification[]> {
    const supabase = createServerComponentClient()
    
    try {
      const notificationData = notifications.map(n => ({
        user_id: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data || {},
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()

      if (error) {
        console.error('Error creating bulk notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to create bulk notifications:', error)
      return []
    }
  }

  // Helper methods for specific notification types
  static async notifyLeaveApproved(
    userId: string,
    leaveDetails: {
      startDate: string
      endDate: string
      daysCount: number
      approvedBy?: string
    }
  ) {
    return this.createNotification({
      userId,
      type: 'leave_approved',
      title: 'Demande de congé approuvée',
      message: `Votre demande de congé du ${new Date(leaveDetails.startDate).toLocaleDateString('fr-FR')} au ${new Date(leaveDetails.endDate).toLocaleDateString('fr-FR')} (${leaveDetails.daysCount} jours) a été approuvée.`,
      data: leaveDetails
    })
  }

  static async notifyLeaveRejected(
    userId: string,
    leaveDetails: {
      startDate: string
      endDate: string
      daysCount: number
      rejectedReason?: string
    }
  ) {
    const message = `Votre demande de congé du ${new Date(leaveDetails.startDate).toLocaleDateString('fr-FR')} au ${new Date(leaveDetails.endDate).toLocaleDateString('fr-FR')} (${leaveDetails.daysCount} jours) a été refusée.`
    const fullMessage = leaveDetails.rejectedReason 
      ? `${message} Raison: ${leaveDetails.rejectedReason}`
      : message

    return this.createNotification({
      userId,
      type: 'leave_rejected',
      title: 'Demande de congé refusée',
      message: fullMessage,
      data: leaveDetails
    })
  }

  static async notifyTaskAssigned(
    userId: string,
    taskDetails: {
      taskId: string
      taskTitle: string
      projectName: string
      dueDate?: string
    }
  ) {
    return this.createNotification({
      userId,
      type: 'task_assigned',
      title: 'Nouvelle tâche assignée',
      message: `La tâche "${taskDetails.taskTitle}" du projet "${taskDetails.projectName}" vous a été assignée.`,
      data: taskDetails
    })
  }

  static async notifyProjectUpdate(
    userIds: string[],
    projectDetails: {
      projectId: string
      projectName: string
      updateType: 'status_change' | 'deadline_change' | 'team_change'
      description: string
    }
  ) {
    const notifications = userIds.map(userId => ({
      userId,
      type: 'project_update' as NotificationType,
      title: `Mise à jour du projet "${projectDetails.projectName}"`,
      message: projectDetails.description,
      data: projectDetails
    }))

    return this.createBulkNotifications(notifications)
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const supabase = createServerComponentClient()
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Failed to get unread count:', error)
      return 0
    }
  }
}