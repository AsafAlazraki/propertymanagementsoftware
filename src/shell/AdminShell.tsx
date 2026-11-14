import { useMemo, useState } from 'react'
import { Link, Outlet, useMatchRoute } from '@tanstack/react-router'
import {
  Buildings,
  ChartLineUp,
  ChatsCircle,
  DotsThreeOutline,
  FirstAid,
  ListChecks,
  MapPinLine,
  Robot,
  Scales,
  Scroll,
  UploadSimple,
  Users,
} from '@phosphor-icons/react'
import { useStore } from '@/data/store'
import { useBrand, useThemeColor } from '@/app/theme'
import { AdminMark } from '@/ui/Brand'
import { Sheet } from '@/ui/Sheet'
import { Tip } from '@/ui/overlays'
import { useViewport } from '@/ui/hooks'
import { cn } from '@/ui/cn'
import { AccountMenu, CountWords, SkipLink, StorageWatch, TabLink, type NavItem } from './common'

interface Group {
  label: string
  items: NavItem[]
}

function useGroups(): Group[] {
  const tasks = useStore((s) => s.db.adminTasks)
  const feedback = useStore((s) => s.db.feedback)
  const changes = useStore((s) => s.db.ruleChanges)
  const incidents = useStore((s) => s.db.incidents)
  const turns = useStore((s) => s.db.copilotTurns)
  return useMemo(
    () => [
      {
        label: 'Today',
        items: [
          { to: '/admin', label: 'Overview', icon: ChartLineUp, exact: true, primary: true },
          {
            to: '/admin/queue',
            label: 'Action queue',
            icon: ListChecks,
            count: tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
            primary: true,
          },
        ],
      },
      {
        label: 'Customers',
        items: [
          { to: '/admin/orgs', label: 'Organisations', icon: Buildings, primary: true },
          { to: '/admin/people', label: 'People', icon: Users },
          {
            to: '/admin/feedback',
            label: 'Feedback',
            icon: ChatsCircle,
            count: feedback.filter((f) => f.status === 'new').length,
          },
        ],
      },
      {
        label: 'Engine',
        items: [
          {
            to: '/admin/rules',
            label: 'Rulewatch',
            icon: Scales,
            count: changes.filter((c) => c.status === 'pending_review' || c.status === 'needs_second_review').length,
            primary: true,
          },
          {
            to: '/admin/healing',
            label: 'Self-healing',
            icon: FirstAid,
            count: incidents.filter((i) => i.status === 'awaiting_approval').length,
          },
          {
            to: '/admin/assistant',
            label: 'Assistant',
            icon: Robot,
            count: turns.filter((t) => t.review === 'queued').length,
          },
        ],
      },
      {
        label: 'Operations',
        items: [
          { to: '/admin/network', label: 'Field network', icon: MapPinLine },
          { to: '/admin/migration', label: 'Migration', icon: UploadSimple },
          { to: '/admin/audit', label: 'Audit log', icon: Scroll },
        ],
      },
    ],
    [tasks, feedback, changes, incidents, turns],
  )
}

function SideLink({ item, rail }: { item: NavItem; rail: boolean }) {
  const Icon = item.icon
  const link = (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact ?? false }}
      className={cn(
        'relative flex items-center gap-2.5 rounded-md text-[13px] font-medium text-nav-ink-2 transition-colors duration-150 hoverable:hover:bg-nav-2 hoverable:hover:text-nav-ink',
        rail ? 'size-10 justify-center' : 'h-8 px-2',
      )}
      activeProps={{ className: 'bg-nav-2 !text-nav-ink', 'aria-current': 'page' }}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <Icon
            weight={isActive ? 'fill' : 'regular'}
            className={cn('size-[17px] shrink-0', isActive && 'text-glow')}
            aria-hidden
          />
          {rail ? <span className="sr-only">{item.label}</span> : <span className="flex-1 truncate">{item.label}</span>}
          {item.count ? (
            <span
              className={cn(
                'num grid h-4 min-w-4 place-items-center rounded-[4px] px-1 font-mono text-[10px] leading-none font-semibold',
                rail ? 'absolute -top-0.5 -right-0.5 bg-glow text-nav' : 'bg-nav-line text-nav-ink',
              )}
            >
              {item.count}
              <CountWords item={item} />
            </span>
          ) : null}
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

/** The team console: dense, keyboard-friendly, and unmistakably not the customer's product. */
export function AdminShell() {
  useBrand('admin')
  useThemeColor('#17161b')
  const groups = useGroups()
  const all = groups.flatMap((g) => g.items)
  const vp = useViewport()
  const [more, setMore] = useState(false)
  const rail = vp.rail
  const side = vp.sidebar || vp.rail
  // On a phone the screens under "More" have no tab of their own, so More is marked while one is open.
  const matchRoute = useMatchRoute()
  const inMore = all.some((n) => !n.primary && matchRoute({ to: n.to, fuzzy: true }) !== false)

  return (
    <div className="min-h-dvh bg-bg text-[13px] text-ink">
      <SkipLink />
      <StorageWatch />
      <div className={cn(side && 'flex')}>
        {side && (
          <aside
            className={cn(
              'sticky top-0 z-30 flex h-dvh shrink-0 flex-col bg-nav text-nav-ink',
              rail ? 'w-16 items-center px-2 py-3' : 'w-56 px-2.5 py-3.5',
            )}
          >
            <Link
              to="/admin"
              className={cn('mb-4 flex items-center gap-2.5 rounded-md', rail ? 'justify-center' : 'px-1.5')}
              aria-label="Team console — overview"
            >
              <AdminMark size={28} />
              {!rail && (
                <span className="min-w-0">
                  <span className="block text-[13px] leading-tight font-semibold">Team console</span>
                  <span className="block font-mono text-[10px] tracking-wide text-nav-ink-2 uppercase">
                    Loop &amp; Pool
                  </span>
                </span>
              )}
            </Link>
            <nav
              aria-label="Team console"
              className={cn('flex flex-1 flex-col overflow-y-auto', rail ? 'items-center gap-0.5' : 'gap-4')}
            >
              {groups.map((g) => (
                <div key={g.label} className={cn('flex flex-col gap-0.5', rail && 'items-center')}>
                  {!rail && (
                    <p className="px-2 pb-1 font-mono text-[10px] tracking-[0.08em] text-nav-ink-2/70 uppercase">
                      {g.label}
                    </p>
                  )}
                  {g.items.map((item) => (
                    <SideLink key={item.to} item={item} rail={rail} />
                  ))}
                  {rail && <span aria-hidden className="my-1.5 h-px w-6 bg-nav-line last:hidden" />}
                </div>
              ))}
            </nav>
            <div className={cn('mt-3 border-t border-nav-line pt-2.5', rail && 'flex justify-center')}>
              <AccountMenu tone="nav" compact={rail} />
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1">
          {!side && (
            <header className="sticky top-0 z-30 flex h-13 items-center gap-2.5 bg-nav px-4 py-2 text-nav-ink pt-safe">
              <Link to="/admin" className="flex items-center gap-2.5" aria-label="Team console — overview">
                <AdminMark size={28} />
                <span className="text-[14px] font-semibold">Team console</span>
              </Link>
              <span className="flex-1" />
              <AccountMenu tone="nav" compact />
            </header>
          )}
          <main id="main" className={cn('min-w-0', !side && 'pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]')}>
            <Outlet />
          </main>
        </div>
      </div>

      {!side && (
        <nav
          aria-label="Team console"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/92 backdrop-blur-xl pb-safe"
        >
          {all
            .filter((n) => n.primary)
            .map((item) => (
              <TabLink
                key={item.to}
                item={{ ...item, label: item.label.replace('Action queue', 'Queue').replace('Organisations', 'Orgs') }}
                idleClass="text-ink-3"
                activeClass="!text-accent-text"
              />
            ))}
          <button
            type="button"
            onClick={() => setMore(true)}
            aria-current={inMore ? 'true' : undefined}
            className={cn(
              'pressable flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium',
              inMore ? 'text-accent-text' : 'text-ink-3',
            )}
          >
            <DotsThreeOutline weight={inMore ? 'fill' : 'regular'} className="size-6" aria-hidden />
            <span>More</span>
          </button>
        </nav>
      )}

      <Sheet open={more} onOpenChange={setMore} title="More of the console">
        <ul className="-mx-2 grid gap-1">
          {all
            .filter((n) => !n.primary)
            .map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setMore(false)}
                    className="pressable flex min-h-12 items-center gap-3.5 rounded-md px-3 text-[15px] font-medium text-ink hoverable:hover:bg-sunken"
                    activeProps={{ className: 'bg-accent-soft !text-accent-text' }}
                  >
                    <Icon className="size-[22px] text-ink-3" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    {item.count ? (
                      <span className="num rounded-full bg-sunken px-2 text-xs text-ink-2">
                        {item.count}
                        <CountWords item={item} />
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
        </ul>
      </Sheet>
    </div>
  )
}
