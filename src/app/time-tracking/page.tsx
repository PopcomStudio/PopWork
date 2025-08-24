import { PageLayout } from "@/components/PageLayout"
import { TimeTrackingDashboard } from "@/features/time-tracking/components/TimeTrackingDashboard"

export default function TimeTrackingPage() {
  return (
    <PageLayout>
      <TimeTrackingDashboard />
    </PageLayout>
  )
}