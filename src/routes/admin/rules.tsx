import { createFileRoute } from '@tanstack/react-router'
import { Rulewatch } from '@/screens/admin/Rulewatch'
import { rulesSearch } from '@/screens/admin/search'

export const Route = createFileRoute('/admin/rules')({ validateSearch: rulesSearch, component: Rulewatch })
