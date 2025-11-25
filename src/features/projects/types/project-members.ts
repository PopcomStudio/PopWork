/**
 * Types pour la gestion des membres de projet
 */

// Roles specifiques aux projets
export type ProjectMemberRole =
  | 'project_manager'
  | 'developer'
  | 'designer'
  | 'integrator'
  | 'tester'
  | 'consultant'
  | 'observer'

// Membre de projet avec details utilisateur
export interface ProjectMemberWithUser {
  id: string
  projectId: string
  userId: string
  role: ProjectMemberRole
  assignedAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatarUrl?: string
    globalRole: string
  }
}

// Donnees pour ajouter un membre
export interface AddProjectMemberData {
  projectId: string
  userId: string
  role: ProjectMemberRole
}

// Donnees pour mettre a jour un membre
export interface UpdateProjectMemberData {
  id: string
  role: ProjectMemberRole
}

// Utilisateur disponible pour ajout au projet
export interface AvailableUser {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string
  globalRole: string
}

// Metadata d'un role pour affichage
export interface ProjectRoleInfo {
  value: ProjectMemberRole
  label: string
  description: string
  color: string
  bgColor: string
}
