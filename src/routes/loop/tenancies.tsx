import { createFileRoute } from '@tanstack/react-router'
import { Tenancies, type TenanciesView } from '@/screens/loop/Tenancies'

const VIEWS: TenanciesView[] = ['agreements', 'applicants', 'changes', 'notices']

export const Route = createFileRoute('/loop/tenancies')({
  validateSearch: (search: Record<string, unknown>): { view?: TenanciesView; review?: string } => ({
    ...(VIEWS.includes(search.view as TenanciesView) ? { view: search.view as TenanciesView } : {}),
    ...(typeof search.review === 'string' && search.review ? { review: search.review } : {}),
  }),
  component: TenanciesRoute,
})

function TenanciesRoute() {
  const { view, review } = Route.useSearch()
  return <Tenancies view={view ?? 'agreements'} review={review} />
}
