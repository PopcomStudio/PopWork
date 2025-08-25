"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Calendar, Users, Clock } from "lucide-react";
import { useTeamProjects } from "../hooks/use-team-projects";

interface TeamProjectsListProps {
  teamId: string;
}

export function TeamProjectsList({ teamId }: TeamProjectsListProps) {
  const { teamProjects, loading } = useTeamProjects(teamId);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (teamProjects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Aucun projet assigné</p>
          <p className="text-sm text-muted-foreground mt-1">
            Cette équipe n&apos;a pas encore de projets assignés
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {teamProjects.map((project) => (
        <Card key={project.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{project.name}</CardTitle>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {project.description}
                  </p>
                )}
              </div>
              <Badge
                variant={
                  project.status === "in_progress"
                    ? "default"
                    : project.status === "completed"
                    ? "secondary"
                    : "outline"
                }
              >
                {project.status === "in_progress"
                  ? "En cours"
                  : project.status === "completed"
                  ? "Terminé"
                  : project.status === "on_hold"
                  ? "En pause"
                  : "Planifié"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {project.start_date
                    ? new Date(project.start_date).toLocaleDateString("fr-FR")
                    : "Non définie"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {project.end_date
                    ? new Date(project.end_date).toLocaleDateString("fr-FR")
                    : "Non définie"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {project.member_count || 0} membres
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}