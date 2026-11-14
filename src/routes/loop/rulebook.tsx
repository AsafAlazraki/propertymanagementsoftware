import { createFileRoute } from '@tanstack/react-router'
import { Rulebook, type RulebookTab } from '@/screens/loop/Rulebook'

const TABS: RulebookTab[] = ['rules', 'dates', 'penalties', 'changes', 'compare']

export const Route = createFileRoute('/loop/rulebook')({
  validateSearch: (search: Record<string, unknown>): { tab?: RulebookTab } =>
    TABS.includes(search.tab as RulebookTab) ? { tab: search.tab as RulebookTab } : {},
  component: RulebookRoute,
})

function RulebookRoute() {
  const { tab } = Route.useSearch()
  return <Rulebook tab={tab ?? 'rules'} />
}
