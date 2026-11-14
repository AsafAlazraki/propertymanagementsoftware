import { createFileRoute } from '@tanstack/react-router'
import { Healing, healingSearch } from '@/screens/admin/Healing'

export const Route = createFileRoute('/admin/healing')({ validateSearch: healingSearch, component: Healing })
