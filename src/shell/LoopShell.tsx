import { useMemo, useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import {
  ClipboardText,
  DotsThreeOutline,
  GearSix,
  Handshake,
  HouseLine,
  Lightning,
  MagnifyingGlass,
  Scales,
  UsersThree,
  Wallet,
  Wrench,
} from '@phosphor-icons/react'
import { useStore } from '@/data/store'
import { resolvePack } from '@/domain/jurisdictions'
import { landlordActions } from '@/domain/actions'
import { today } from '@/domain/rules/calendar'
import { useBrand, useThemeColor } from '@/app/theme'
import { LoopMark } from '@/ui/Brand'
import { Tip } from '@/ui/overlays'
import { Sheet } from '@/ui/Sheet'
import { useViewport } from '@/ui/hooks'
import { cn } from '@/ui/cn'
import { AccountMenu, SkipLink, TabLink, ViewingAsBar, type NavItem } from './common'
import { AskButton, Assistant } from './Assistant'

function useNav(): NavItem[] {
  const db = useStore((s) => s.db)
  const orgId = useStore((s) => s.session?.orgId)
  const actionCount = useMemo(() => {
    if (!orgId) return 0
    const pack = resolvePack('NZ', db.packVersions)
    return landlordActions(db, orgId, pack, today()).filter((a) => a.priority <= 2).length
  }, [db, orgId])
  const openRepairs = useMemo(() => db.tickets.filter((t) => t.orgId === orgId && t.status !== 'closed').length, [db.tickets, orgId])
  return [
    { to: '/loop', label: 'Command', icon: Lightning, exact: true, count: actionCount, primary: true },
    { to: '/loop/properties', label: 'Properties', icon: HouseLine, primary: true },
    { to: '/loop/money', label: 'Money', icon: Wallet, primary: true },
    { to: '/loop/repairs', label: 'Repairs', icon: Wrench, count: openRepairs, primary: true },
    { to: '/loop/inspections', label: 'Inspections', icon: ClipboardText },
    { to: '/loop/tenancies', label: 'Tenancies', icon: Handshake },
    { to: '/loop/services', label: 'Services', icon: UsersThree },
    { to: '/loop/rulebook', label: 'Rulebook', icon: Scales },
    { to: '/loop/settings', label: 'Settings', icon: GearSix },
  ]
}

function SideLink({ item, rail }: { item: NavItem; rail: boolean }) {
  const Icon = item.icon
  const link = (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact ?? false }}
      className={cn(
        'group relative flex items-center gap-3 rounded-md text-[13px] font-medium text-nav-ink-2 transition-colors duration-150 hoverable:hover:bg-nav-2 hoverable:hover:text-nav-ink',
        rail ? 'size-11 justify-center' : 'h-9 px-2.5',
      )}
      activeProps={{ className: 'bg-nav-2 !text-nav-ink', 'aria-current': 'page' }}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          {isActive && <span aria-hidden className={cn('absolute rounded-full bg-glow', rail ? 'top-2.5 bottom-2.5 -left-2.5 w-[3px]' : 'top-2 bottom-2 -left-3 w-[3px]')} />}
          <Icon weight={isActive ? 'fill' : 'regular'} className={cn('size-[19px] shrink-0', isActive && 'text-glow')} aria-hidden />
          {!rail && <span className="flex-1 truncate">{item.label}</span>}
          {item.count ? (
            <span className={cn('num grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] leading-none font-semibold', rail ? 'absolute -top-0.5 -right-0.5 bg-glow text-nav' : isActive ? 'bg-glow text-nav' : 'bg-nav-line text-nav-ink')}>
              {item.count}
            </span>
          ) : null}
          {rail && <span className="sr-only">{item.label}</span>}
        </>
      )}
    </Link>
  )
  return rail ? (
    <Tip label={item.label} side="right">
      {link}
    </Tip>
  ) : (
    link
  )
}

export function LoopShell() {
  useBrand('loop')
  useThemeColor('#101a2e')
  const nav = useNav()
  const vp = useViewport()
  const org = useStore((s) => s.db.orgs.find((o) => o.id === s.session?.orgId))
  const [more, setMore] = useState(false)
  const [ask, setAsk] = useState(false)
  const rail = vp.rail
  const side = vp.sidebar || vp.rail

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <SkipLink />
      <ViewingAsBar />
      <div className={cn(side && 'flex')}>
        {side && (
          <aside className={cn('sticky top-0 z-30 flex h-dvh shrink-0 flex-col bg-nav text-nav-ink', rail ? 'w-[4.5rem] items-center px-2 py-3' : 'w-[15.5rem] px-3 py-4')}>
            <Link to="/loop" className={cn('mb-4 flex items-center gap-2.5 rounded-md', rail ? 'justify-center' : 'px-1.5')} aria-label="Loop — command centre">
              <LoopMark size={30} className="rounded-[9px] ring-1 ring-nav-line" />
              {!rail && (
                <span className="min-w-0">
                  <span className="display block text-[17px] leading-tight">Loop</span>
                  <span className="block truncate text-[11px] text-nav-ink-2">{org?.name}</span>
                </span>
              )}
            </Link>

            {rail ? (
              <Tip label="Ask Loop" side="right">
                <button type="button" onClick={() => setAsk(true)} className="pressable mb-3 grid size-11 place-items-center rounded-md bg-nav-2 text-nav-ink-2 hoverable:hover:text-nav-ink" aria-label="Ask Loop">
                  <MagnifyingGlass className="size-[18px]" />
                </button>
              </Tip>
            ) : (
              <AskButton onOpen={() => setAsk(true)} label="Ask Loop anything" className="mb-4" />
            )}

            <nav aria-label="Loop" className={cn('flex flex-1 flex-col gap-0.5 no-scrollbar overflow-y-auto overflow-x-hidden', rail ? 'items-center' : 'pl-0')}>
              {nav.slice(0, 7).map((item) => (
                <SideLink key={item.to} item={item} rail={rail} />
              ))}
              <span aria-hidden className={cn('my-2 h-px bg-nav-line', rail ? 'w-8' : 'mx-1')} />
              {nav.slice(7).map((item) => (
                <SideLink key={item.to} item={item} rail={rail} />
              ))}
            </nav>

            <div className={cn('mt-3 border-t border-nav-line pt-3', rail && 'flex justify-center')}>
              <AccountMenu tone="nav" compact={rail} />
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          {!side && (
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-nav px-4 text-nav-ink pt-safe">
              <Link to="/loop" className="flex min-w-0 items-center gap-2.5" aria-label="Loop — command centre">
                <LoopMark size={28} className="rounded-[9px] ring-1 ring-nav-line" />
                <span className="min-w-0">
                  <span className="display block text-[16px] leading-tight">Loop</span>
                  <span className="block truncate text-[11px] text-nav-ink-2">{org?.name}</span>
                </span>
              </Link>
              <span className="flex-1" />
              <button type="button" onClick={() => setAsk(true)} className="pressable grid size-10 place-items-center rounded-md text-nav-ink-2 hoverable:hover:bg-nav-2" aria-label="Ask Loop">
                <MagnifyingGlass className="size-5" />
              </button>
              <AccountMenu tone="nav" compact />
            </header>
          )}

          <main id="main" className={cn('min-w-0', !side && 'pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]')}>
            <Outlet />
          </main>
        </div>
      </div>

      {!side && (
        <nav aria-label="Loop" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/92 backdrop-blur-xl pb-safe">
          {nav
            .filter((n) => n.primary)
            .map((item) => (
              <TabLink key={item.to} item={item} idleClass="text-ink-3" activeClass="!text-accent-text" />
            ))}
          <button type="button" onClick={() => setMore(true)} className="pressable flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium text-ink-3">
            <DotsThreeOutline className="size-6" aria-hidden />
            <span>More</span>
          </button>
        </nav>
      )}

      <Sheet open={more} onOpenChange={setMore} title="More of Loop">
        <ul className="-mx-2 grid gap-1">
          {nav
            .filter((n) => !n.primary)
            .map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <Link to={item.to} onClick={() => setMore(false)} className="pressable flex min-h-12 items-center gap-3.5 rounded-md px-3 text-[15px] font-medium text-ink hoverable:hover:bg-sunken" activeProps={{ className: 'bg-accent-soft !text-accent-text' }}>
                    <Icon className="size-[22px] text-ink-3" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              )
            })}
        </ul>
      </Sheet>

      <Assistant open={ask} onOpenChange={setAsk} portal="loop" />
    </div>
  )
}
