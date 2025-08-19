// Export all team-related types
export type {
	Team,
	TeamMember,
	TeamProjectAssignment,
	TeamAuditLog,
	TeamWithMembers,
	TeamWithProjects,
	TeamWithStats,
} from "@/shared/types/database";

// Additional types for team management
export interface CreateTeamData {
	name: string;
	description?: string;
	color?: string;
	avatar_url?: string;
	is_active?: boolean;
}

export interface UpdateTeamData extends CreateTeamData {
	id: string;
}

export interface TeamMemberWithUser extends TeamMember {
	user?: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		avatar_url?: string;
		roleName?: string;
	};
}

export interface TeamProjectWithDetails extends TeamProjectAssignment {
	project?: {
		id: string;
		name: string;
		description?: string;
		status: "draft" | "active" | "completed" | "archived";
		company_name?: string;
		service_name?: string;
	};
}

export interface AddTeamMemberData {
	team_id: string;
	user_id: string;
	role: "member" | "lead" | "admin";
	notification_preferences?: {
		email: boolean;
		in_app: boolean;
	};
}

export interface UpdateTeamMemberData {
	id: string;
	role: "member" | "lead" | "admin";
	notification_preferences?: {
		email: boolean;
		in_app: boolean;
	};
}

export interface AssignTeamToProjectData {
	team_id: string;
	project_id: string;
	permissions?: {
		can_view: boolean;
		can_edit: boolean;
		can_delete: boolean;
	};
}
