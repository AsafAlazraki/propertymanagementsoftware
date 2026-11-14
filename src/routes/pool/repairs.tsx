import { createFileRoute } from '@tanstack/react-router'
import { Repairs } from '@/screens/pool/Repairs'
import { parseRepairsSearch } from '@/screens/pool/repairs/params'

export const Route = createFileRoute('/pool/repairs')({ validateSearch: parseRepairsSearch, component: Repairs })
