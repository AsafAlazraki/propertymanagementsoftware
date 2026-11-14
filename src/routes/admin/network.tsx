import { createFileRoute } from '@tanstack/react-router'
import { Network, networkSearch } from '@/screens/admin/Network'

export const Route = createFileRoute('/admin/network')({ validateSearch: networkSearch, component: Network })
