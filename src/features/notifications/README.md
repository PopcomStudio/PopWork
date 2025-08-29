# Notifications Feature

## Overview
The notifications feature provides a comprehensive notification system for the PopWork application, including real-time updates, preferences management, and integration with various application events.

## Components

### NotificationBell
A header component that displays the notification bell icon with unread count badge.

### NotificationsList
Main component for displaying all notifications with filtering and management options.

### NotificationItem
Individual notification display component with type-specific icons and colors.

### NotificationPreferences
User preferences management for notification types and delivery methods.

### NotificationsPage
Full page component combining notifications list and preferences in tabs.

## Usage

### Creating Notifications

#### From Server-Side Code
```typescript
import { NotificationService } from '@/features/notifications'

// Simple notification
await NotificationService.createNotification({
  userId: 'user-uuid',
  type: 'general',
  title: 'Notification Title',
  message: 'Notification message',
  data: { additionalInfo: 'value' }
})

// Leave approval notification
await NotificationService.notifyLeaveApproved(userId, {
  startDate: '2024-01-01',
  endDate: '2024-01-05',
  daysCount: 5,
  approvedBy: 'manager-uuid'
})

// Task assignment notification
await NotificationService.notifyTaskAssigned(userId, {
  taskId: 'task-uuid',
  taskTitle: 'Complete report',
  projectName: 'Q4 Planning',
  dueDate: '2024-01-15'
})
```

#### From Database Triggers
Notifications are automatically created when:
- Leave requests are approved or rejected (via database trigger)
- Future: Task assignments, project updates, etc.

### Using in Components

#### Display Notification Bell
```tsx
import { NotificationBell } from '@/features/notifications'

export function Header() {
  return (
    <header>
      <NotificationBell />
    </header>
  )
}
```

#### Use Notifications Hook
```tsx
import { useNotifications } from '@/features/notifications'

export function MyComponent() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications()

  // Component logic
}
```

## Notification Types

- `leave_approved` - Leave request approved
- `leave_rejected` - Leave request rejected
- `leave_request` - New leave request (for admins)
- `project_update` - Project status or details changed
- `task_assigned` - Task assigned to user
- `task_completed` - Task marked as complete
- `invoice_sent` - Invoice sent to client
- `invoice_paid` - Invoice payment received
- `general` - General notifications

## Database Schema

### notifications table
- `id` (UUID) - Primary key
- `user_id` (UUID) - User receiving the notification
- `type` (VARCHAR) - Notification type
- `title` (TEXT) - Notification title
- `message` (TEXT) - Notification message
- `data` (JSONB) - Additional data
- `read` (BOOLEAN) - Read status
- `read_at` (TIMESTAMPTZ) - When notification was read
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

### notification_preferences table
- `id` (UUID) - Primary key
- `user_id` (UUID) - User ID (unique)
- `email_enabled` (BOOLEAN) - Email notifications enabled
- `push_enabled` (BOOLEAN) - Push notifications enabled
- `leave_requests` (BOOLEAN) - Leave request notifications
- `project_updates` (BOOLEAN) - Project update notifications
- `task_assignments` (BOOLEAN) - Task assignment notifications
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

## Real-time Updates
The notification system uses Supabase real-time subscriptions to instantly update the notification count and list when new notifications are created.

## Future Enhancements
- Email notification delivery
- Push notifications (browser/mobile)
- Notification grouping
- Notification templates
- Scheduled notifications
- Notification analytics