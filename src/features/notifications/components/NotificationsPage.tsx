'use client'

import { NotificationsList } from './NotificationsList'
import { Card, CardContent } from '@/components/ui/card'

export function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Consultez toutes vos notifications
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <NotificationsList />
        </CardContent>
      </Card>
    </div>
  )
}