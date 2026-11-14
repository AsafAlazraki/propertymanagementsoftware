import { createFileRoute } from '@tanstack/react-router'
import { People, peopleSearch } from '@/screens/admin/People'

export const Route = createFileRoute('/admin/people')({ validateSearch: peopleSearch, component: People })
