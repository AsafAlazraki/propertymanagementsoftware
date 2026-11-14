/**
 * The Loop palette: one box that finds a screen, a home, a person or a repair,
 * and hands anything it cannot find to the assistant as a question.
 *
 * A landlord should never have to know where something lives. Typing what
 * they are thinking — "Mia", "heat pump", "bond" — is enough.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { ArrowBendDownLeft, ChatCircleDots, HouseLine, MagnifyingGlass, User, Wrench } from '@phosphor-icons/react'
import { useStore } from '@/data/store'
import { activeTenancy } from '@/data/hooks'
import { useHotkey } from '@/ui/hooks'
import type { NavItem } from './common'

const ITEM =
  'flex min-h-10 cursor-default items-center gap-3 rounded-md px-3 py-2 text-[14px] text-ink outline-none select-none data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-text coarse:min-h-12'

export function Palette({
  open,
  onOpenChange,
  nav,
  onAsk,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  nav: NavItem[]
  onAsk: (question: string) => void
}) {
  const navigate = useNavigate()
  const orgId = useStore((s) => s.session?.orgId)
  const properties = useStore((s) => s.db.properties)
  const tenancies = useStore((s) => s.db.tenancies)
  const tickets = useStore((s) => s.db.tickets)
  const users = useStore((s) => s.db.users)
  const [query, setQuery] = useState('')

  useHotkey('mod+k', (e) => {
    e.preventDefault()
    onOpenChange(!open)
  })

  const homes = useMemo(() => properties.filter((p) => p.orgId === orgId), [properties, orgId])
  const people = useMemo(
    () =>
      homes.flatMap((p) => {
        const t = activeTenancy(tenancies, p.id)
        return (t?.tenantIds ?? []).map((id) => ({ id, name: users.find((u) => u.id === id)?.fullName ?? '', home: p }))
      }),
    [homes, tenancies, users],
  )
  const repairs = useMemo(() => tickets.filter((t) => t.orgId === orgId && t.status !== 'closed'), [tickets, orgId])
  const q = query.trim()

  const go = (run: () => void) => {
    onOpenChange(false)
    setQuery('')
    run()
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQuery('')
      }}
      label="Search Loop, or ask a question"
      // Plain "contains" matching. Fuzzy matching finds "heat" inside "Beachcomber Lane", which helps nobody.
      filter={(value, search) => (value.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}
      overlayClassName="fixed inset-0 z-50 bg-scrim"
      contentClassName="fixed top-[8vh] left-1/2 z-50 flex max-h-[min(34rem,80dvh)] w-[min(38rem,calc(100vw-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-xl bg-surface text-ink shadow-sheet outline-none"
    >
      <div className="flex items-center gap-3 border-b border-line px-4">
        <MagnifyingGlass className="size-[18px] shrink-0 text-ink-3" aria-hidden />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Find a home, a person, a repair — or ask a question"
          className="h-14 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
        />
        <kbd className="hidden rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[11px] text-ink-3 sm:block">
          esc
        </kbd>
      </div>
      <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase">
        {q.length > 2 && (
          <Command.Group heading="Ask">
            <Command.Item forceMount value={`ask ${q}`} onSelect={() => go(() => onAsk(q))} className={ITEM}>
              <ChatCircleDots weight="fill" className="size-[18px] shrink-0 text-accent-text" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                Ask Loop: <span className="font-medium">“{q}”</span>
              </span>
              <ArrowBendDownLeft className="size-4 shrink-0 text-ink-3" aria-hidden />
            </Command.Item>
          </Command.Group>
        )}
        <Command.Group heading="Go to">
          {nav.map((item) => (
            <Command.Item
              key={item.to}
              value={`go ${item.label}`}
              onSelect={() => go(() => void navigate({ to: item.to }))}
              className={ITEM}
            >
              <item.icon className="size-[18px] shrink-0 text-ink-3" aria-hidden />
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>
        {homes.length > 0 && (
          <Command.Group heading="Homes">
            {homes.map((p) => (
              <Command.Item
                key={p.id}
                value={`home ${p.address.line1} ${p.address.suburb}`}
                onSelect={() => go(() => void navigate({ to: '/loop/properties/$id', params: { id: p.id } }))}
                className={ITEM}
              >
                <HouseLine className="size-[18px] shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{p.address.line1}</span>
                <span className="shrink-0 text-xs text-ink-3">{p.address.suburb}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {people.length > 0 && (
          <Command.Group heading="People">
            {people.map((x) => (
              <Command.Item
                key={x.id}
                value={`person ${x.name} tenant`}
                onSelect={() => go(() => void navigate({ to: '/loop/properties/$id', params: { id: x.home.id } }))}
                className={ITEM}
              >
                <User className="size-[18px] shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{x.name}</span>
                <span className="shrink-0 text-xs text-ink-3">rents {x.home.address.line1}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {repairs.length > 0 && (
          <Command.Group heading="Open repairs">
            {repairs.map((t) => (
              <Command.Item
                key={t.id}
                value={`repair ${t.title} ${t.category}`}
                onSelect={() => go(() => void navigate({ to: '/loop/repairs', search: { job: t.id } }))}
                className={ITEM}
              >
                <Wrench className="size-[18px] shrink-0 text-ink-3" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="shrink-0 text-xs text-ink-3">
                  {homes.find((p) => p.id === t.propertyId)?.address.line1}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
      <p className="border-t border-line px-4 py-2.5 text-xs text-ink-3">
        Answers come from the rule pack and your own records, with their sources. If Loop does not know, it says so.
      </p>
    </Command.Dialog>
  )
}
