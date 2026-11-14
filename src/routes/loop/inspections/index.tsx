import { createFileRoute } from '@tanstack/react-router'
import { Inspections } from '@/screens/loop/Inspections'

export const Route = createFileRoute('/loop/inspections/')({
  validateSearch: (search: Record<string, unknown>): { book?: string; report?: string } => ({
    ...(typeof search.book === 'string' && search.book ? { book: search.book } : {}),
    ...(typeof search.report === 'string' && search.report ? { report: search.report } : {}),
  }),
  component: InspectionsRoute,
})

function InspectionsRoute() {
  const { book, report } = Route.useSearch()
  return <Inspections book={book} report={report} />
}
