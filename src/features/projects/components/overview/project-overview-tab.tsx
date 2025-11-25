"use client"

import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useProjectOverview } from '../../hooks/use-project-overview'
import { useProjectActivity } from '../../hooks/use-project-activity'
import { ProjectKPICards } from './project-kpi-cards'
import { ProjectInfoSidebar } from './project-info-sidebar'
import { ProjectTeamSummary } from './project-team-summary'
import { ProjectQuickLinks } from './project-quick-links'
import { ProjectTaskBreakdown } from './project-task-breakdown'
import { ProjectUpcomingDeadlines } from './project-upcoming-deadlines'
import { ProjectDeliverablesSummary } from './project-deliverables-summary'
import { ProjectRecentActivity } from './project-recent-activity'

interface ProjectOverviewTabProps {
  projectId: string
  onTabChange: (tab: string) => void
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[100px]" />
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 @lg:grid-cols-3 gap-6">
        <div className="@lg:col-span-2 space-y-6">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[250px]" />
          <Skeleton className="h-[200px]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[150px]" />
        </div>
      </div>
    </div>
  )
}

export function ProjectOverviewTab({ projectId, onTabChange }: ProjectOverviewTabProps) {
  const {
    project,
    tasks,
    members,
    deliverables,
    stats,
    loading: overviewLoading,
    error: overviewError,
  } = useProjectOverview(projectId)

  const {
    activities,
    loading: activityLoading,
    hasMore,
    loadMore,
  } = useProjectActivity(projectId)

  if (overviewLoading) {
    return <OverviewSkeleton />
  }

  if (overviewError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{overviewError}</AlertDescription>
      </Alert>
    )
  }

  if (!project) {
    return (
      <Alert>
        <AlertDescription>Projet non trouve</AlertDescription>
      </Alert>
    )
  }

  const progressPercent = project.task_count > 0
    ? Math.round((project.completed_tasks / project.task_count) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <ProjectKPICards
        healthScore={stats.healthScore}
        healthStatus={stats.healthStatus}
        progressPercent={progressPercent}
        completedTasks={project.completed_tasks}
        totalTasks={project.task_count}
        daysRemaining={stats.daysRemaining}
        timeSpent={stats.timeSpent}
        members={members}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 @lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="@lg:col-span-2 space-y-6">
          {/* Task Breakdown */}
          <ProjectTaskBreakdown
            tasksByStatus={stats.tasksByStatus}
            tasksByPriority={stats.tasksByPriority}
          />

          {/* Upcoming Deadlines */}
          <ProjectUpcomingDeadlines
            overdueTasks={stats.overdueTasks}
            upcomingTasks={stats.upcomingTasks}
          />

          {/* Deliverables Summary */}
          <ProjectDeliverablesSummary
            deliverables={deliverables}
            onNavigateToAdmin={() => onTabChange('administration')}
          />

          {/* Recent Activity */}
          <ProjectRecentActivity
            activities={activities}
            loading={activityLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Project Info */}
          <ProjectInfoSidebar project={project} />

          {/* Team Summary */}
          <ProjectTeamSummary
            members={members}
            teamByRole={stats.teamByRole}
            onNavigateToMembers={() => onTabChange('members')}
          />

          {/* Quick Links */}
          <ProjectQuickLinks onNavigate={onTabChange} />
        </div>
      </div>
    </div>
  )
}
