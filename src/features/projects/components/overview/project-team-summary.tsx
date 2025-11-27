"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Users, ArrowRight } from 'lucide-react'
import type { ProjectMemberWithUser } from '../../types/project-members'

interface ProjectTeamSummaryProps {
  members: ProjectMemberWithUser[]
  teamByRole: Record<string, number>
  onNavigateToMembers: () => void
}

const ROLE_LABELS: Record<string, string> = {
  project_manager: 'Chef de projet',
  developer: 'Developpeur',
  designer: 'Designer',
  integrator: 'Integrateur',
  tester: 'Testeur',
  consultant: 'Consultant',
  observer: 'Observateur',
}

export function ProjectTeamSummary({
  members,
  teamByRole,
  onNavigateToMembers,
}: ProjectTeamSummaryProps) {
  const visibleMembers = members.slice(0, 5)
  const overflowCount = members.length - 5

  // Format role summary
  const roleSummary = Object.entries(teamByRole)
    .filter(([, count]) => count > 0)
    .map(([role, count]) => {
      const label = ROLE_LABELS[role] || role
      return `${count} ${label.toLowerCase()}${count > 1 ? 's' : ''}`
    })
    .slice(0, 3)
    .join(', ')

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </CardTitle>
          <span className="text-sm text-muted-foreground">{members.length} membres</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length > 0 ? (
          <>
            {/* Avatar Stack */}
            <TooltipProvider>
              <div className="flex -space-x-2">
                {visibleMembers.map((member) => (
                  <Tooltip key={member.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-9 w-9 border-2 border-background cursor-default">
                        <AvatarFallback className="text-xs">
                          {member.user.firstName.charAt(0)}{member.user.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{member.user.firstName} {member.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[member.role] || member.role}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {overflowCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted border-2 border-background text-xs font-medium cursor-default">
                        +{overflowCount}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{overflowCount} autres membres</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>

            {/* Role Summary */}
            {roleSummary && (
              <p className="text-xs text-muted-foreground">{roleSummary}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun membre assigne</p>
        )}

        {/* Navigate Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
          onClick={onNavigateToMembers}
        >
          Voir tous les membres
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
