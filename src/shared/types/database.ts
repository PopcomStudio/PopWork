// Types de base pour la base de données Supabase

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roleId: string
  createdAt: string
  updatedAt: string
  avatarUrl?: string
}

export interface Role {
  id: string
  name: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  name: string
  address: string
  siret: string
  email: string
  phone: string
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  name: string
  address: string
  phone: string
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  serviceId: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  companyId: string
  serviceId: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project_id: string
  due_date?: string
  created_at: string
  updated_at: string
}

export interface TaskAssignee {
  id: string
  taskId: string
  userId: string
  assignedAt: string
}

export interface ProjectAssignee {
  id: string
  projectId: string
  userId: string
  assignedAt: string
}

export interface TaskTimer {
  id: string
  taskId: string
  userId: string
  startTime: string
  endTime?: string
  duration?: number
  createdAt: string
}

export interface TimeEntry {
  id: string
  task_id: string
  user_id: string
  start_time: string
  end_time?: string
  duration?: number
  description?: string
  created_at: string
  updated_at: string
}

export interface TaskTimeSummary {
  task_id: string
  unique_contributors: number
  total_duration: number
  first_entry: string
  last_entry: string
}

export interface UserTaskTimeSummary {
  task_id: string
  user_id: string
  entry_count: number
  total_duration: number
  avg_duration: number
  first_entry: string
  last_entry: string
}

export interface Tag {
  id: string
  name: string
  color: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface TaskTag {
  id: string
  taskId: string
  tagId: string
  createdAt: string
}

export interface Invoice {
  id: string
  number: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  amount: number
  companyId: string
  serviceId: string
  dueDate: string
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export interface ActivityLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  changes: Record<string, unknown>
  createdAt: string
}

export interface Document {
  id: string
  name: string
  type: string
  url: string
  userId: string
  isPrivate: boolean
  createdAt: string
}

export interface Leave {
  id: string
  user_id: string
  start_date: string
  end_date: string
  type: 'vacation' | 'sick' | 'other'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  days_count: number
  attachment_url?: string
  attachment_name?: string
  created_at: string
  updated_at: string
}

export interface LeaveBalance {
  id: string
  user_id: string
  year: number
  paid_leave_days: number
  used_paid_leave_days: number
  sick_days: number
  used_sick_days: number
  updated_at: string
}

export interface MagicLink {
  id: string
  token: string
  projectId: string
  contactId: string
  expiresAt: string
  isActive: boolean
  createdAt: string
}

export interface ClientFeedback {
  id: string
  magicLinkId: string
  rating: number
  comment: string
  createdAt: string
} 