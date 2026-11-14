import { useMemo, useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { ChatCircleDots, House, IdentificationCard, MagnifyingGlass, UserCircle, Wrench } from '@phosphor-icons/react'
import { useStore } from '@/data/store'
import { useBrand, useThemeColor } from '@/app/theme'
import { PoolMark } from '@/ui/Brand'
import { useViewport } from '@/ui/hooks'
import { cn } from '@/ui/cn'
import { AccountMenu, CountWords, SkipLink, StorageWatch, TabLink, type NavItem } from './common'
import { Assistant } from './Assistant'

function useNav(): NavItem[] {
  const userId = useStore((s) => s.session?.userId)
  const tickets = useStore((s) => s.db.tickets)
  const tenancies = useStore((s) => s.db.tenancies)
  const waiting = useMemo(() => {
    const mine = new Set(tenancies.filter((t) => userId && t.tenantIds.includes(userId)).map((t) => t.id))
    return tickets.filter((t) => t.tenancyId && mine.has(t.tenancyId) && t.status === 'tenant_verifying').length
  }, [tickets, tenancies, userId])
  return [
    { to: '/pool', label: 'Home', icon: House, exact: true, primary: true },
    { to: '/pool/search', label: 'Search', icon: MagnifyingGlass, primary: true },
    {
      to: '/pool/repairs',
      label: 'Repairs',
      icon: Wrench,
      count: waiting,
      countLabel: 'waiting for you',
      primary: true,
    },
    { to: '/pool/passport', label: 'Passport', icon: IdentificationCard, primary: true },
    { to: '/pool/me', label: 'Me', icon: UserCircle, primary: true },
  ]
}

/**
 * Pool is a consumer app: no sidebar, ever. On a phone it is a tab bar under
 * the thumb; on anything wider the same five places sit in a top bar and the
 * content gets the full width — which the map search needs.
 */
export function PoolShell() {
  useBrand('pool')
  useThemeColor('#fdf9f2')
  const nav = useNav()
  const vp = useViewport()
  const [ask, setAsk] = useState(false)
  const top = !vp.phone

  return (
    <div className="min-h-dvh bg-bg text-[15px] text-ink">
      <SkipLink />
      <StorageWatch />
      <header
        className={cn(
          'sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-xl pt-safe',
          vp.short && 'static',
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-4 sm:px-6 lg:h-16 lg:px-8">
          <Link to="/pool" className="mr-2 flex items-center gap-2.5 rounded-md" aria-label="Pool — home">
            <PoolMark size={30} />
            <span className="display text-[19px]">Pool</span>
          </Link>
          {top && (
            <nav aria-label="Pool" className="flex items-center gap-0.5">
              {nav.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeOptions={{ exact: item.exact ?? false }}
                    className="pressable relative flex h-10 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium text-ink-2 transition-colors hoverable:hover:bg-sunken hoverable:hover:text-ink"
                    activeProps={{ className: 'bg-accent-soft !text-accent-text', 'aria-current': 'page' }}
                  >
                    {({ isActive }: { isActive: boolean }) => (
                      <>
                        <Icon weight={isActive ? 'fill' : 'regular'} className="size-[18px]" aria-hidden />
                        {item.label}
                        {item.count ? (
                          <span className="num grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] leading-none font-semibold text-accent-ink">
                            {item.count}
                            <CountWords item={item} />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Link>
                )
              })}
            </nav>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => setAsk(true)}
            className="pressable flex h-10 shrink-0 items-center gap-2 rounded-full whitespace-nowrap bg-sunken px-3.5 text-[14px] font-medium text-ink-2 hoverable:hover:text-ink"
          >
            <ChatCircleDots className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">Ask Pool</span>
            <span className="sm:hidden">Ask</span>
          </button>
          <AccountMenu compact />
        </div>
      </header>

      <main id="main" className={cn('min-w-0', vp.phone && 'pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]')}>
        <Outlet />
      </main>

      {vp.phone && (
        <nav
          aria-label="Pool"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/92 backdrop-blur-xl pb-safe"
        >
          {nav.map((item) => (
            <TabLink key={item.to} item={item} idleClass="text-ink-3" activeClass="!text-accent-text" />
          ))}
        </nav>
      )}

      <Assistant open={ask} onOpenChange={setAsk} portal="pool" />
    </div>
  )
}
