import { createFileRoute } from '@tanstack/react-router'
import { Network } from '@/screens/admin/Network'
import { networkSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/network')({ validateSearch: networkSearch, component: Network })
