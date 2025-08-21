import { TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  totalRevenue: number
  pendingInvoices: number
}

interface SectionCardsProps {
  stats?: DashboardStats
}

export function SectionCards({ stats }: SectionCardsProps) {
  // Utiliser les vraies données ou des valeurs par défaut
  const revenue = stats?.totalRevenue || 1250
  const activeProjects = stats?.activeProjects || 3
  const completedTasks = stats?.completedTasks || 12
  const pendingInvoices = stats?.pendingInvoices || 2

  // Calculer les pourcentages (simulation)
  const revenueGrowth = stats ? "+15.2%" : "+12.5%"
  const projectGrowth = stats ? "+8.1%" : "-20%"
  const taskCompletion = stats ? "+23.4%" : "+12.5%"
  const invoiceGrowth = stats ? "-5.2%" : "+4.5%"
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Chiffre d&apos;affaires</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              {revenueGrowth}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            En hausse ce mois-ci <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Factures payées ce trimestre
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Projets actifs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeProjects}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {parseFloat(projectGrowth) > 0 ? <TrendingUp /> : <TrendingDown />}
              {projectGrowth}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {parseFloat(projectGrowth) > 0 ? 'En progression' : 'En baisse'} <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Projets en cours de développement
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Tâches terminées</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {completedTasks}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <TrendingUp />
              {taskCompletion}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Productivité élevée <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Objectifs de l&apos;équipe atteints</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Factures en attente</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pendingInvoices}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              {parseFloat(invoiceGrowth) > 0 ? <TrendingUp /> : <TrendingDown />}
              {invoiceGrowth}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Suivi des paiements <TrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">Facturation en cours</div>
        </CardFooter>
      </Card>
    </div>
  )
}
