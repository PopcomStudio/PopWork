import type { ProjectMemberRole, ProjectRoleInfo } from '../types/project-members'

/**
 * Configuration des roles de projet
 */
export const PROJECT_MEMBER_ROLES: Record<ProjectMemberRole, ProjectRoleInfo> = {
  project_manager: {
    value: 'project_manager',
    label: 'Chef de projet',
    description: 'Gere le projet',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  developer: {
    value: 'developer',
    label: 'Developpeur',
    description: 'Developpe les fonctionnalites',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  designer: {
    value: 'designer',
    label: 'Designer',
    description: 'Cree les maquettes UI/UX',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  integrator: {
    value: 'integrator',
    label: 'Integrateur',
    description: 'Integre les maquettes',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
  },
  tester: {
    value: 'tester',
    label: 'Testeur',
    description: 'Teste les fonctionnalites',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  consultant: {
    value: 'consultant',
    label: 'Consultant',
    description: 'Conseille sur le projet',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  observer: {
    value: 'observer',
    label: 'Observateur',
    description: 'Acces en lecture seule',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
}

/**
 * Liste des options de roles pour les selects
 */
export const PROJECT_ROLE_OPTIONS = Object.values(PROJECT_MEMBER_ROLES)

/**
 * Role par defaut lors de l'ajout d'un membre
 */
export const DEFAULT_PROJECT_ROLE: ProjectMemberRole = 'consultant'
