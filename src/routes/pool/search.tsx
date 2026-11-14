import { createFileRoute } from '@tanstack/react-router'
import { Search } from '@/screens/pool/Search'
import { parseHomeSearch } from '@/screens/pool/search/params'

export const Route = createFileRoute('/pool/search')({ validateSearch: parseHomeSearch, component: Search })
