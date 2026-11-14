import { createFileRoute } from '@tanstack/react-router'
import { Rulewatch, rulesSearch } from '@/screens/admin/Rulewatch'

export const Route = createFileRoute('/admin/rules')({ validateSearch: rulesSearch, component: Rulewatch })
