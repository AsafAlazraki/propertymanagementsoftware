import { createFileRoute } from '@tanstack/react-router'
import { Orgs } from '@/screens/admin/Orgs'
import { orgsSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/orgs')({ validateSearch: orgsSearch, component: Orgs })
