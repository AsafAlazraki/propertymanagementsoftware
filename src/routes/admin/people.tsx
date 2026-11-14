import { createFileRoute } from '@tanstack/react-router'
import { People } from '@/screens/admin/People'
import { peopleSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/people')({ validateSearch: peopleSearch, component: People })
