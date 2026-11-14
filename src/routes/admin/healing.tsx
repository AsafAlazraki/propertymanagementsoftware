import { createFileRoute } from '@tanstack/react-router'
import { Healing } from '@/screens/admin/Healing'
import { healingSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/healing')({ validateSearch: healingSearch, component: Healing })
