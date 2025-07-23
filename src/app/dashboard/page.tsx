"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Skeleton pour les cartes de statistiques
function SectionCardsSkeleton() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="@container/card">
          <CardHeader>
            <CardDescription>
              <Skeleton className="h-4 w-24" />
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              <Skeleton className="h-8 w-20" />
            </CardTitle>
            <CardAction>
              <div className="border rounded-full px-2 py-1 flex items-center gap-1">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-10" />
              </div>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex gap-2 items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </div>
            <div>
              <Skeleton className="h-4 w-40" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

// Skeleton pour le graphique
function ChartSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  )
}

// Skeleton pour le tableau
function DataTableSkeleton() {
  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  const { 
    tasks, 
    stats, 
    loading, 
    error 
  } = useDashboardData()

  // Transformer les tâches pour le DataTable (structure ajustée)
  const tableData = tasks.map((task, index) => ({
    id: index + 1,
    header: task.title,
    type: task.projectName,
    status: task.status === 'done' ? 'success' : task.status === 'in_progress' ? 'processing' : 'pending',
    priority: task.priority,
    reviewer: task.assignedTo.join(', ') || 'Non assigné',
  }))

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {loading ? (
                <>
                  <SectionCardsSkeleton />
                  <div className="px-4 lg:px-6">
                    <ChartSkeleton />
                  </div>
                  <div className="px-4 lg:px-6">
                    <DataTableSkeleton />
                  </div>
                </>
              ) : error ? (
                <Alert variant="destructive" className="mx-4 lg:mx-6">
                  <AlertDescription>
                    Erreur lors du chargement : {error}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <SectionCards stats={stats} />
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive />
                  </div>
                  <div className="px-4 lg:px-6">
                    <DataTable data={tableData} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
