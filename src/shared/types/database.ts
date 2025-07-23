// Types de base pour la base de données Supabase

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roleId: string
  createdAt: string
  updatedAt: string
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
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  projectId: string
  createdAt: string
  updatedAt: string
  dueDate?: string
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
  userId: string
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
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