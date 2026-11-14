import { createFileRoute } from '@tanstack/react-router'
import { InspectionStudio } from '@/screens/loop/inspections/Studio'

export const Route = createFileRoute('/loop/inspections/$id')({ component: StudioRoute })

function StudioRoute() {
  const { id } = Route.useParams()
  return <InspectionStudio id={id} />
}
