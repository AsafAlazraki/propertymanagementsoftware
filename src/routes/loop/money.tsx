import { createFileRoute } from '@tanstack/react-router'
import { Money, type MoneyTab } from '@/screens/loop/Money'

const TABS: MoneyTab[] = ['feed', 'ledger', 'tax', 'savings']

export const Route = createFileRoute('/loop/money')({
  validateSearch: (search: Record<string, unknown>): { tab?: MoneyTab } =>
    TABS.includes(search.tab as MoneyTab) ? { tab: search.tab as MoneyTab } : {},
  component: MoneyRoute,
})

function MoneyRoute() {
  const { tab } = Route.useSearch()
  return <Money tab={tab ?? 'feed'} />
}
