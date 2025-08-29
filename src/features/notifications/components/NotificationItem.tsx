'use client'

import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { 
  Bell, 
  Check, 
  X, 
  Calendar,
  Briefcase,
  ListChecks,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Notification } from '@/shared/types/database'
import { Button } from '@/components/ui/button'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}

const notificationIcons: Record<string, React.ComponentType<any>> = {
  leave_approved: Check,
  leave_rejected: X,
  leave_request: Calendar,
  project_update: Briefcase,
  task_assigned: ListChecks,
  default: Bell,
}

const notificationColors: Record<string, string> = {
  leave_approved: 'text-green-600',
  leave_rejected: 'text-red-600',
  leave_request: 'text-blue-600',
  project_update: 'text-purple-600',
  task_assigned: 'text-orange-600',
  default: 'text-gray-600',
}

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete 
}: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || notificationIcons.default
  const iconColor = notificationColors[notification.type] || notificationColors.default

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg transition-colors cursor-pointer group",
        notification.read 
          ? "bg-background hover:bg-muted/50" 
          : "bg-muted hover:bg-muted/80"
      )}
      onClick={handleClick}
    >
      <div className={cn("mt-1", iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              !notification.read && "font-semibold"
            )}>
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {notification.message}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: fr
              })}
            </p>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.read && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkAsRead(notification.id)
                }}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4" />
                <span className="sr-only">Marquer comme lu</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(notification.id)
              }}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Supprimer</span>
            </Button>
          </div>
        </div>
      </div>

      {!notification.read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
      )}
    </div>
  )
}