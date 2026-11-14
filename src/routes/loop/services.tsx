import { createFileRoute } from '@tanstack/react-router'
import type { FieldService } from '@/domain/fieldServices'
import { Services } from '@/screens/loop/Services'

const BOOKABLE: FieldService[] = ['routine_inspection', 'viewing', 'entry_exit_report', 'tribunal_representation']

export const Route = createFileRoute('/loop/services')({
  validateSearch: (search: Record<string, unknown>): { book?: FieldService } =>
    BOOKABLE.includes(search.book as FieldService) ? { book: search.book as FieldService } : {},
  component: ServicesRoute,
})

function ServicesRoute() {
  const { book } = Route.useSearch()
  return <Services book={book} />
}
