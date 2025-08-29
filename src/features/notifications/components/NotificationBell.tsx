'use client'

import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '../hooks/use-notifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const router = useRouter()
  const { unreadCount } = useNotifications()

  const handleClick = () => {
    router.push('/notifications')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="relative"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className={cn(
          "absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500",
          "text-white text-xs flex items-center justify-center font-medium",
          unreadCount > 99 && "text-[10px]"
        )}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      <span className="sr-only">
        Notifications {unreadCount > 0 && `(${unreadCount} non lues)`}
      </span>
    </Button>
  )
}