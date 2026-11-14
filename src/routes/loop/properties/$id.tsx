import { createFileRoute } from '@tanstack/react-router'
import { PropertyScreen, type PropertyTab } from '@/screens/loop/property/Property'

const TABS: PropertyTab[] = ['overview', 'compliance', 'money', 'records']

export const Route = createFileRoute('/loop/properties/$id')({
  validateSearch: (search: Record<string, unknown>): { tab?: PropertyTab } => (TABS.includes(search.tab as PropertyTab) ? { tab: search.tab as PropertyTab } : {}),
  component: PropertyRoute,
})

function PropertyRoute() {
  const { id } = Route.useParams()
  const { tab } = Route.useSearch()
  return <PropertyScreen id={id} tab={tab ?? 'overview'} />
}
