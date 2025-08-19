"use client";

import { useState } from "react";
import {
	Users,
	UserPlus,
	UserMinus,
	Edit,
	Shield,
	UserCheck,
	User,
	Bell,
	BellOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useTeamMembers } from "../hooks/use-team-members";
import type {
	TeamMemberWithUser,
	AddTeamMemberData,
	UpdateTeamMemberData,
} from "../types";

interface TeamMembersListProps {
	teamId: string;
}

export function TeamMembersList({ teamId }: TeamMembersListProps) {
	const {
		members,
		availableUsers,
		loading,
		error,
		addTeamMember,
		updateTeamMember,
		removeTeamMember,
		changeTeamMemberRole,
	} = useTeamMembers(teamId);

	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [selectedMember, setSelectedMember] =
		useState<TeamMemberWithUser | null>(null);
	const [addMemberForm, setAddMemberForm] = useState({
		user_id: "",
		role: "member" as const,
		notifications: {
			email: true,
			in_app: true,
		},
	});
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	const getRoleInfo = (role: string) => {
		switch (role) {
			case "admin":
				return {
					label: "Administrateur",
					icon: Shield,
					color: "text-red-600",
					bgColor: "bg-red-100",
				};
			case "lead":
				return {
					label: "Responsable",
					icon: UserCheck,
					color: "text-blue-600",
					bgColor: "bg-blue-100",
				};
			default:
				return {
					label: "Membre",
					icon: User,
					color: "text-gray-600",
					bgColor: "bg-gray-100",
				};
		}
	};

	const handleAddMember = async () => {
		if (!addMemberForm.user_id) return;

		try {
			setActionLoading("add");
			await addTeamMember({
				team_id: teamId,
				user_id: addMemberForm.user_id,
				role: addMemberForm.role,
				notification_preferences: addMemberForm.notifications,
			});
			setIsAddDialogOpen(false);
			setAddMemberForm({
				user_id: "",
				role: "member",
				notifications: { email: true, in_app: true },
			});
		} catch (error) {
			console.error("Erreur lors de l'ajout du membre:", error);
		} finally {
			setActionLoading(null);
		}
	};

	const handleEditMember = (member: TeamMemberWithUser) => {
		setSelectedMember(member);
		setIsEditDialogOpen(true);
	};

	const handleUpdateMember = async (role: "member" | "lead" | "admin") => {
		if (!selectedMember) return;

		try {
			setActionLoading("update");
			await updateTeamMember({
				id: selectedMember.id,
				role,
				notification_preferences: selectedMember.notification_preferences,
			});
			setIsEditDialogOpen(false);
			setSelectedMember(null);
		} catch (error) {
			console.error("Erreur lors de la mise à jour du membre:", error);
		} finally {
			setActionLoading(null);
		}
	};

	const handleRemoveMember = async (memberId: string, memberName: string) => {
		if (
			!confirm(`Êtes-vous sûr de vouloir retirer ${memberName} de l'équipe ?`)
		) {
			return;
		}

		try {
			setActionLoading(memberId);
			await removeTeamMember(memberId);
		} catch (error) {
			console.error("Erreur lors du retrait du membre:", error);
		} finally {
			setActionLoading(null);
		}
	};

	const getUserInitials = (firstName: string, lastName: string) => {
		return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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
			{/* En-tête avec bouton d'ajout */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					<h2 className="text-xl font-semibold">
						Membres de l'équipe ({members.length})
					</h2>
				</div>
				<Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
					<DialogTrigger asChild>
						<Button>
							<UserPlus className="h-4 w-4 mr-2" />
							Ajouter un membre
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Ajouter un membre à l'équipe</DialogTitle>
						</DialogHeader>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Utilisateur</Label>
								<Select
									value={addMemberForm.user_id}
									onValueChange={(value) =>
										setAddMemberForm((prev) => ({ ...prev, user_id: value }))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Sélectionner un utilisateur" />
									</SelectTrigger>
									<SelectContent>
										{availableUsers.map((user) => (
											<SelectItem key={user.id} value={user.id}>
												<div className="flex items-center gap-2">
													<Avatar className="h-6 w-6">
														<AvatarImage src={user.avatar_url} />
														<AvatarFallback className="text-xs">
															{getUserInitials(user.firstName, user.lastName)}
														</AvatarFallback>
													</Avatar>
													<div>
														<div className="font-medium">
															{user.firstName} {user.lastName}
														</div>
														<div className="text-sm text-muted-foreground">
															{user.email}
														</div>
													</div>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Rôle</Label>
								<Select
									value={addMemberForm.role}
									onValueChange={(value) =>
										setAddMemberForm((prev) => ({
											...prev,
											role: value as "member" | "lead" | "admin",
										}))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="member">Membre</SelectItem>
										<SelectItem value="lead">Responsable</SelectItem>
										<SelectItem value="admin">Administrateur</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-3">
								<Label>Notifications</Label>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="email-notifications"
										checked={addMemberForm.notifications.email}
										onCheckedChange={(checked) =>
											setAddMemberForm((prev) => ({
												...prev,
												notifications: {
													...prev.notifications,
													email: Boolean(checked),
												},
											}))
										}
									/>
									<label htmlFor="email-notifications" className="text-sm">
										Notifications par email
									</label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="in-app-notifications"
										checked={addMemberForm.notifications.in_app}
										onCheckedChange={(checked) =>
											setAddMemberForm((prev) => ({
												...prev,
												notifications: {
													...prev.notifications,
													in_app: Boolean(checked),
												},
											}))
										}
									/>
									<label htmlFor="in-app-notifications" className="text-sm">
										Notifications dans l'application
									</label>
								</div>
							</div>

							<div className="flex justify-end gap-2">
								<Button
									variant="outline"
									onClick={() => setIsAddDialogOpen(false)}
								>
									Annuler
								</Button>
								<Button
									onClick={handleAddMember}
									disabled={!addMemberForm.user_id || actionLoading === "add"}
								>
									{actionLoading === "add" ? "Ajout..." : "Ajouter"}
								</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>

			{/* Liste des membres */}
			{loading ? (
				<div className="grid gap-4 md:grid-cols-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="p-4">
								<div className="flex items-center gap-3">
									<Skeleton className="h-12 w-12 rounded-full" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-24" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : members.length === 0 ? (
				<div className="text-center py-16">
					<Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<p className="text-muted-foreground mb-2">
						Aucun membre dans cette équipe
					</p>
					<p className="text-sm text-muted-foreground mb-4">
						Commencez par ajouter des membres à votre équipe
					</p>
					<Button onClick={() => setIsAddDialogOpen(true)}>
						<UserPlus className="h-4 w-4 mr-2" />
						Ajouter le premier membre
					</Button>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{members.map((member) => {
						const roleInfo = getRoleInfo(member.role);
						const RoleIcon = roleInfo.icon;
						const isLoading = actionLoading === member.id;

						return (
							<Card key={member.id}>
								<CardContent className="p-4">
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3 flex-1">
											<Avatar className="h-12 w-12">
												<AvatarImage src={member.user?.avatar_url} />
												<AvatarFallback>
													{member.user
														? getUserInitials(
																member.user.firstName,
																member.user.lastName,
															)
														: "?"}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<div className="font-medium truncate">
													{member.user
														? `${member.user.firstName} ${member.user.lastName}`
														: "Utilisateur supprimé"}
												</div>
												<div className="text-sm text-muted-foreground truncate">
													{member.user?.email}
												</div>
												<div className="flex items-center gap-2 mt-2">
													<Badge
														variant="secondary"
														className={`${roleInfo.bgColor} ${roleInfo.color}`}
													>
														<RoleIcon className="h-3 w-3 mr-1" />
														{roleInfo.label}
													</Badge>
													<div className="flex items-center gap-1">
														{member.notification_preferences?.email ? (
															<Bell className="h-3 w-3 text-muted-foreground" />
														) : (
															<BellOff className="h-3 w-3 text-muted-foreground" />
														)}
													</div>
												</div>
												<div className="text-xs text-muted-foreground mt-1">
													Rejoint le{" "}
													{new Date(member.joined_at).toLocaleDateString(
														"fr-FR",
													)}
												</div>
											</div>
										</div>

										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm" disabled={isLoading}>
													<Edit className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => handleEditMember(member)}
												>
													<Edit className="h-4 w-4 mr-2" />
													Modifier le rôle
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() =>
														handleRemoveMember(
															member.id,
															member.user
																? `${member.user.firstName} ${member.user.lastName}`
																: "ce membre",
														)
													}
													className="text-destructive"
												>
													<UserMinus className="h-4 w-4 mr-2" />
													Retirer de l'équipe
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}

			{/* Dialog de modification de membre */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Modifier le rôle du membre</DialogTitle>
					</DialogHeader>
					{selectedMember && (
						<div className="space-y-4">
							<div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
								<Avatar>
									<AvatarImage src={selectedMember.user?.avatar_url} />
									<AvatarFallback>
										{selectedMember.user
											? getUserInitials(
													selectedMember.user.firstName,
													selectedMember.user.lastName,
												)
											: "?"}
									</AvatarFallback>
								</Avatar>
								<div>
									<div className="font-medium">
										{selectedMember.user
											? `${selectedMember.user.firstName} ${selectedMember.user.lastName}`
											: "Utilisateur"}
									</div>
									<div className="text-sm text-muted-foreground">
										{selectedMember.user?.email}
									</div>
								</div>
							</div>

							<div className="space-y-2">
								<Label>Nouveau rôle</Label>
								<div className="space-y-2">
									<Button
										variant={
											selectedMember.role === "member" ? "default" : "outline"
										}
										className="w-full justify-start"
										onClick={() => handleUpdateMember("member")}
										disabled={actionLoading === "update"}
									>
										<User className="h-4 w-4 mr-2" />
										Membre
									</Button>
									<Button
										variant={
											selectedMember.role === "lead" ? "default" : "outline"
										}
										className="w-full justify-start"
										onClick={() => handleUpdateMember("lead")}
										disabled={actionLoading === "update"}
									>
										<UserCheck className="h-4 w-4 mr-2" />
										Responsable
									</Button>
									<Button
										variant={
											selectedMember.role === "admin" ? "default" : "outline"
										}
										className="w-full justify-start"
										onClick={() => handleUpdateMember("admin")}
										disabled={actionLoading === "update"}
									>
										<Shield className="h-4 w-4 mr-2" />
										Administrateur
									</Button>
								</div>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
