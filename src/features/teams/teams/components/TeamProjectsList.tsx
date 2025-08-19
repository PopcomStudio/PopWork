"use client";

import { useState } from "react";
import {
	FolderOpen,
	Plus,
	X,
	Edit,
	Building,
	Tag,
	Calendar,
	Eye,
	Pencil,
	Trash2,
	Settings,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeamProjects } from "../hooks/use-team-projects";
import type { TeamProjectWithDetails, AssignTeamToProjectData } from "../types";

interface TeamProjectsListProps {
	teamId: string;
}

export function TeamProjectsList({ teamId }: TeamProjectsListProps) {
	const {
		teamProjects,
		availableProjects,
		loading,
		error,
		assignTeamToProject,
		removeTeamFromProject,
		updateTeamProjectPermissions,
	} = useTeamProjects(teamId);

	const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
	const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
	const [selectedProject, setSelectedProject] =
		useState<TeamProjectWithDetails | null>(null);
	const [assignProjectForm, setAssignProjectForm] = useState({
		project_id: "",
		permissions: {
			can_view: true,
			can_edit: false,
			can_delete: false,
		},
	});
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const getStatusInfo = (status: string) => {
		switch (status) {
			case "draft":
				return {
					label: "Brouillon",
					variant: "secondary" as const,
					className: "bg-gray-100 text-gray-700",
				};
			case "active":
				return {
					label: "Actif",
					variant: "default" as const,
					className: "bg-blue-100 text-blue-800",
				};
			case "completed":
				return {
					label: "Terminé",
					variant: "default" as const,
					className: "bg-green-100 text-green-800",
				};
			case "archived":
				return {
					label: "Archivé",
					variant: "outline" as const,
					className: "bg-gray-100 text-gray-600",
				};
			default:
				return {
					label: status,
					variant: "secondary" as const,
					className: "",
				};
		}
	};

	const handleAssignProject = async () => {
		if (!assignProjectForm.project_id) return;

		try {
			setActionLoading("assign");
			await assignTeamToProject({
				team_id: teamId,
				project_id: assignProjectForm.project_id,
				permissions: assignProjectForm.permissions,
			});
			setIsAssignDialogOpen(false);
			setAssignProjectForm({
				project_id: "",
				permissions: {
					can_view: true,
					can_edit: false,
					can_delete: false,
				},
			});
		} catch (error) {
			console.error("Erreur lors de l'assignation du projet:", error);
		} finally {
			setActionLoading(null);
		}
	};

	const handleEditPermissions = (project: TeamProjectWithDetails) => {
		setSelectedProject(project);
		setIsPermissionsDialogOpen(true);
	};

	const handleUpdatePermissions = async (permissions: {
		can_view: boolean;
		can_edit: boolean;
		can_delete: boolean;
	}) => {
		if (!selectedProject) return;

		try {
			setActionLoading("permissions");
			await updateTeamProjectPermissions(selectedProject.id, permissions);
			setIsPermissionsDialogOpen(false);
			setSelectedProject(null);
		} catch (error) {
			console.error("Erreur lors de la mise à jour des permissions:", error);
		} finally {
			setActionLoading(null);
		}
	};

	const handleRemoveProject = async (
		assignmentId: string,
		projectName: string,
	) => {
		if (
			!confirm(
				`Êtes-vous sûr de vouloir retirer "${projectName}" de cette équipe ?`,
			)
		) {
			return;
		}

		try {
			setActionLoading(assignmentId);
			await removeTeamFromProject(assignmentId);
		} catch (error) {
			console.error("Erreur lors du retrait du projet:", error);
		} finally {
			setActionLoading(null);
		}
	};

	if (error) {
		return (
			<Alert variant="destructive">
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="space-y-6">
			{/* En-tête avec bouton d'assignation */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FolderOpen className="h-5 w-5" />
					<h2 className="text-xl font-semibold">
						Projets assignés ({teamProjects.length})
					</h2>
				</div>
				<Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Assigner un projet
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Assigner un projet à l'équipe</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Projet</Label>
								<Select
									value={assignProjectForm.project_id}
									onValueChange={(value) =>
										setAssignProjectForm((prev) => ({
											...prev,
											project_id: value,
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Sélectionner un projet" />
									</SelectTrigger>
									<SelectContent>
										{availableProjects.map((project) => (
											<SelectItem key={project.id} value={project.id}>
												<div className="flex flex-col">
													<div className="font-medium">{project.name}</div>
													<div className="text-sm text-muted-foreground">
														{project.company_name} • {project.service_name}
													</div>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-3">
								<Label>Permissions</Label>
								<div className="space-y-2">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="can-view"
											checked={assignProjectForm.permissions.can_view}
											onCheckedChange={(checked) =>
												setAssignProjectForm((prev) => ({
													...prev,
													permissions: {
														...prev.permissions,
														can_view: Boolean(checked),
													},
												}))
											}
										/>
										<label
											htmlFor="can-view"
											className="text-sm flex items-center gap-2"
										>
											<Eye className="h-4 w-4" />
											Peut consulter le projet
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="can-edit"
											checked={assignProjectForm.permissions.can_edit}
											onCheckedChange={(checked) =>
												setAssignProjectForm((prev) => ({
													...prev,
													permissions: {
														...prev.permissions,
														can_edit: Boolean(checked),
													},
												}))
											}
										/>
										<label
											htmlFor="can-edit"
											className="text-sm flex items-center gap-2"
										>
											<Pencil className="h-4 w-4" />
											Peut modifier le projet
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="can-delete"
											checked={assignProjectForm.permissions.can_delete}
											onCheckedChange={(checked) =>
												setAssignProjectForm((prev) => ({
													...prev,
													permissions: {
														...prev.permissions,
														can_delete: Boolean(checked),
													},
												}))
											}
										/>
										<label
											htmlFor="can-delete"
											className="text-sm flex items-center gap-2"
										>
											<Trash2 className="h-4 w-4" />
											Peut supprimer le projet
										</label>
									</div>
								</div>
							</div>

							<div className="flex justify-end gap-2">
								<Button
									variant="outline"
									onClick={() => setIsAssignDialogOpen(false)}
								>
									Annuler
								</Button>
								<Button
									onClick={handleAssignProject}
									disabled={
										!assignProjectForm.project_id || actionLoading === "assign"
									}
								>
									{actionLoading === "assign" ? "Assignation..." : "Assigner"}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Liste des projets */}
			{loading ? (
				<div className="grid gap-4 md:grid-cols-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="p-4">
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<Skeleton className="h-6 w-48" />
										<Skeleton className="h-6 w-20" />
									</div>
									<Skeleton className="h-4 w-full" />
									<div className="flex items-center gap-2">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-20" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : teamProjects.length === 0 ? (
				<div className="text-center py-16">
					<FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<p className="text-muted-foreground mb-2">
						Aucun projet assigné à cette équipe
					</p>
					<p className="text-sm text-muted-foreground mb-4">
						Assignez des projets pour permettre à l'équipe de collaborer
					</p>
					<Button onClick={() => setIsAssignDialogOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Assigner le premier projet
					</Button>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{teamProjects.map((assignment) => {
						const statusInfo = getStatusInfo(
							assignment.project?.status || "draft",
						);
						const isLoading = actionLoading === assignment.id;

						return (
							<Card key={assignment.id}>
								<CardContent className="p-4">
									<div className="space-y-3">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<h3 className="font-medium truncate">
													{assignment.project?.name}
												</h3>
												<p className="text-sm text-muted-foreground truncate">
													{assignment.project?.description ||
														"Aucune description"}
												</p>
											</div>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														disabled={isLoading}
													>
														<Settings className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => handleEditPermissions(assignment)}
													>
														<Edit className="h-4 w-4 mr-2" />
														Modifier les permissions
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() =>
															handleRemoveProject(
																assignment.id,
																assignment.project?.name || "ce projet",
															)
														}
														className="text-destructive"
													>
														<X className="h-4 w-4 mr-2" />
														Retirer de l'équipe
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>

										<div className="flex items-center gap-2">
											<Badge
												variant={statusInfo.variant}
												className={statusInfo.className}
											>
												{statusInfo.label}
											</Badge>
										</div>

										<div className="space-y-2 text-sm">
											<div className="flex items-center gap-2 text-muted-foreground">
												<Building className="h-4 w-4" />
												<span className="truncate">
													{assignment.project?.company_name}
												</span>
											</div>
											<div className="flex items-center gap-2 text-muted-foreground">
												<Tag className="h-4 w-4" />
												<span className="truncate">
													{assignment.project?.service_name}
												</span>
											</div>
											<div className="flex items-center gap-2 text-muted-foreground">
												<Calendar className="h-4 w-4" />
												<span>
													Assigné le{" "}
													{new Date(assignment.assigned_at).toLocaleDateString(
														"fr-FR",
													)}
												</span>
											</div>
										</div>

										{/* Permissions */}
										<div className="flex items-center gap-1 pt-2 border-t">
											{assignment.permissions?.can_view && (
												<Badge variant="outline" className="text-xs">
													<Eye className="h-3 w-3 mr-1" />
													Lecture
												</Badge>
											)}
											{assignment.permissions?.can_edit && (
												<Badge variant="outline" className="text-xs">
													<Pencil className="h-3 w-3 mr-1" />
													Écriture
												</Badge>
											)}
											{assignment.permissions?.can_delete && (
												<Badge
													variant="outline"
													className="text-xs text-red-600"
												>
													<Trash2 className="h-3 w-3 mr-1" />
													Suppression
												</Badge>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Dialog de modification des permissions */}
			<Dialog
				open={isPermissionsDialogOpen}
				onOpenChange={setIsPermissionsDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Modifier les permissions du projet</DialogTitle>
					</DialogHeader>
					{selectedProject && (
						<div className="space-y-4">
							<div className="p-3 bg-muted rounded-lg">
								<div className="font-medium">
									{selectedProject.project?.name}
								</div>
								<div className="text-sm text-muted-foreground">
									{selectedProject.project?.company_name} •{" "}
									{selectedProject.project?.service_name}
								</div>
							</div>

							<div className="space-y-3">
								<Label>Permissions de l'équipe</Label>
								<div className="space-y-2">
									<div className="flex items-center space-x-2">
										<Checkbox
											id="edit-can-view"
											checked={selectedProject.permissions?.can_view}
											onCheckedChange={(checked) => {
												const newPermissions = {
													...selectedProject.permissions,
													can_view: Boolean(checked),
												};
												setSelectedProject({
													...selectedProject,
													permissions: newPermissions,
												});
											}}
										/>
										<label
											htmlFor="edit-can-view"
											className="text-sm flex items-center gap-2"
										>
											<Eye className="h-4 w-4" />
											Peut consulter le projet
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="edit-can-edit"
											checked={selectedProject.permissions?.can_edit}
											onCheckedChange={(checked) => {
												const newPermissions = {
													...selectedProject.permissions,
													can_edit: Boolean(checked),
												};
												setSelectedProject({
													...selectedProject,
													permissions: newPermissions,
												});
											}}
										/>
										<label
											htmlFor="edit-can-edit"
											className="text-sm flex items-center gap-2"
										>
											<Pencil className="h-4 w-4" />
											Peut modifier le projet
										</label>
									</div>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="edit-can-delete"
											checked={selectedProject.permissions?.can_delete}
											onCheckedChange={(checked) => {
												const newPermissions = {
													...selectedProject.permissions,
													can_delete: Boolean(checked),
												};
												setSelectedProject({
													...selectedProject,
													permissions: newPermissions,
												});
											}}
										/>
										<label
											htmlFor="edit-can-delete"
											className="text-sm flex items-center gap-2"
										>
											<Trash2 className="h-4 w-4" />
											Peut supprimer le projet
										</label>
									</div>
								</div>
							</div>

							<div className="flex justify-end gap-2">
								<Button
									variant="outline"
									onClick={() => setIsPermissionsDialogOpen(false)}
								>
									Annuler
								</Button>
								<Button
									onClick={() =>
										handleUpdatePermissions(selectedProject.permissions!)
									}
									disabled={actionLoading === "permissions"}
								>
									{actionLoading === "permissions"
										? "Mise à jour..."
										: "Mettre à jour"}
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
