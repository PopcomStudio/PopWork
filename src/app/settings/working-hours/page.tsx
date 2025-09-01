import { PageLayout } from "@/components/PageLayout"
import { EmployeeWorkingHoursSettings } from "@/features/leaves/components/EmployeeWorkingHoursSettings"

export default function WorkingHoursSettingsPage() {
  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configuration du temps de travail</h1>
          <p className="text-muted-foreground">
            Gérez vos horaires de travail et calculez automatiquement vos droits aux congés selon le code du travail français.
          </p>
        </div>
        <EmployeeWorkingHoursSettings />
      </div>
    </PageLayout>
  )
}