import { createFileRoute } from '@tanstack/react-router'
import { Orgs, orgsSearch } from '@/screens/admin/Orgs'

export const Route = createFileRoute('/admin/orgs')({ validateSearch: orgsSearch, component: Orgs })
