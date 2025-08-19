"use client";

import React from "react";
import {
	Users,
	Briefcase,
	MoreHorizontal,
	Edit,
	Trash2,
	Power,
	PowerOff,
	Calendar,
} from "lucide-react";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { TeamWithStats } from "../types";

interface TeamsCardsViewProps {
	teams: TeamWithStats[];
	viewMode: "cards" | "list";
	onEditTeam: (team: TeamWithStats) => void;
	onDeleteTeam: (teamId: string) => void;
	onToggleStatus: (teamId: string, isActive: boolean) => void;
}

export function TeamsCardsView({
	teams,
	viewMode,
	onEditTeam,
	onDeleteTeam,
	onToggleStatus,
}: TeamsCardsViewProps) {
	const getTeamInitials = (name: string) => {
		return name
			.split(" ")
			.map((word) => word[0])
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const getStatusBadge = (isActive: boolean) => (
		<Badge variant={isActive ? "default" : "secondary"}>
			{isActive ? "Active" : "Inactive"}
		</Badge>
	);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	if (viewMode === "list") {
		return (
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Équipe</TableHead>
							<TableHead>Statut</TableHead>
							<TableHead className="text-right">Membres</TableHead>
							<TableHead className="text-right">Projets</TableHead>
							<TableHead>Créée le</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{teams.map((team) => (
							<TableRow key={team.id}>
								<TableCell>
									<div className="flex items-center gap-3">
										<Avatar className="h-8 w-8">
											{team.avatar_url ? (
												<AvatarImage src={team.avatar_url} alt={team.name} />
											) : null}
											<AvatarFallback
												className="text-xs font-semibold"
												style={{ backgroundColor: team.color || "#6366f1" }}
											>
												{getTeamInitials(team.name)}
											</AvatarFallback>
										</Avatar>
										<div>
											<div className="font-medium">{team.name}</div>
											{team.description && (
												<div className="text-sm text-muted-foreground line-clamp-1">
													{team.description}
												</div>
											)}
										</div>
									</div>
								</TableCell>
								<TableCell>{getStatusBadge(team.is_active)}</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Users className="h-4 w-4 text-muted-foreground" />
										<span>{team.member_count}</span>
									</div>
								</TableCell>
								<TableCell className="text-right">
									<div className="flex items-center justify-end gap-1">
										<Briefcase className="h-4 w-4 text-muted-foreground" />
										<span>{team.project_count}</span>
									</div>
								</TableCell>
								<TableCell>
									<div className="flex items-center gap-1 text-sm text-muted-foreground">
										<Calendar className="h-4 w-4" />
										{formatDate(team.created_at)}
									</div>
								</TableCell>
								<TableCell className="text-right">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" className="h-8 w-8 p-0">
												<span className="sr-only">Ouvrir le menu</span>
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuLabel>Actions</DropdownMenuLabel>
											<DropdownMenuItem onClick={() => onEditTeam(team)}>
												<Edit className="mr-2 h-4 w-4" />
												Modifier
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => onToggleStatus(team.id, !team.is_active)}
											>
												{team.is_active ? (
													<>
														<PowerOff className="mr-2 h-4 w-4" />
														Désactiver
													</>
												) : (
													<>
														<Power className="mr-2 h-4 w-4" />
														Activer
													</>
												)}
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												className="text-destructive"
												onClick={() => onDeleteTeam(team.id)}
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Supprimer
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{teams.map((team) => (
				<Card
					key={team.id}
					className={cn(
						"group hover:shadow-md transition-shadow",
						!team.is_active && "opacity-75",
					)}
				>
					<CardHeader className="space-y-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3 flex-1 min-w-0">
								<Avatar className="h-10 w-10 flex-shrink-0">
									{team.avatar_url ? (
										<AvatarImage src={team.avatar_url} alt={team.name} />
									) : null}
									<AvatarFallback
										className="font-semibold"
										style={{ backgroundColor: team.color || "#6366f1" }}
									>
										{getTeamInitials(team.name)}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-2">
										<h3 className="font-semibold leading-none truncate">
											{team.name}
										</h3>
										<div className="text-xs text-muted-foreground whitespace-nowrap">
											Créée le {formatDate(team.created_at)}
										</div>
									</div>
								</div>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
									>
										<span className="sr-only">Ouvrir le menu</span>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Actions</DropdownMenuLabel>
									<DropdownMenuItem onClick={() => onEditTeam(team)}>
										<Edit className="mr-2 h-4 w-4" />
										Modifier
								</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => onToggleStatus(team.id, !team.is_active)}
									>
										{team.is_active ? (
											<>
												<PowerOff className="mr-2 h-4 w-4" />
												Désactiver
											</>
										) : (
											<>
												<Power className="mr-2 h-4 w-4" />
												Activer
											</>
										)}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive"
										onClick={() => onDeleteTeam(team.id)}
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Supprimer
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</CardHeader>

					<CardContent className="space-y-4">
						{team.description && (
							<p className="text-sm text-muted-foreground line-clamp-2">
								{team.description}
							</p>
						)}

						<div className="grid grid-cols-2 gap-4 text-center">
							<div className="space-y-1">
								<div className="flex items-center justify-center gap-1">
									<Users className="h-4 w-4 text-muted-foreground" />
								</div>
								<div className="text-2xl font-bold">{team.member_count}</div>
								<div className="text-xs text-muted-foreground">Membres</div>
							</div>

							<div className="space-y-1">
								<div className="flex items-center justify-center gap-1">
									<Briefcase className="h-4 w-4 text-muted-foreground" />
								</div>
								<div className="text-2xl font-bold">{team.project_count}</div>
								<div className="text-xs text-muted-foreground">Projets</div>
							</div>
						</div>
					</CardContent>

					<CardFooter>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => onEditTeam(team)}
						>
							<Edit className="mr-2 h-4 w-4" />
							Gérer l&apos;équipe
						</Button>
					</CardFooter>
				</Card>
			))}
		</div>
	);
}
