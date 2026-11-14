import { createFileRoute } from '@tanstack/react-router'
import { Repairs } from '@/screens/loop/Repairs'

export const Route = createFileRoute('/loop/repairs')({
  validateSearch: (search: Record<string, unknown>): { job?: string } =>
    typeof search.job === 'string' && search.job ? { job: search.job } : {},
  component: RepairsRoute,
})

function RepairsRoute() {
  const { job } = Route.useSearch()
  return <Repairs job={job} />
}
