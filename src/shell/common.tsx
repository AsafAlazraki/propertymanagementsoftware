import type { ComponentType, ReactNode } from 'react'
import { Link, useNavigate, type LinkProps } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowsClockwise, Eye, House, Monitor, Moon, SignOut, Sun, UserSwitch, Wrench } from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import { useStore, useMe } from '@/data/store'
import { PERSONAS, signInAs, signOut, stopViewingAs } from '@/app/session'
import { ActionMenu, type MenuEntry } from '@/ui/overlays'
import { Avatar } from '@/ui/display'
import { cn } from '@/ui/cn'

export interface NavItem {
  to: LinkProps['to']
  label: string
  icon: ComponentType<IconProps>
  exact?: boolean
  count?: number
  /** Shown in the phone tab bar. The rest live under "More". */
  primary?: boolean
}

const ROLE_LABEL: Record<string, string> = {
  landlord: 'Landlord',
  co_owner: 'Co-owner',
  advisor: 'Accountant',
  tenant: 'Tenant',
  prospective_renter: 'Looking for a home',
  platform_admin: 'Platform team',
  tradesperson: 'Tradesperson',
  field_provider: 'Field provider',
}

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role
}

/**
 * The account control every portal shares. Because the prototype's sign-in is a
 * choice of persona, this is also where you step between Loop, Pool and the
 * team console — and it always says whose eyes you are looking through.
 */
export function AccountMenu({ tone = 'surface', compact = false }: { tone?: 'surface' | 'nav'; compact?: boolean }) {
  const me = useMe()
  const session = useStore((s) => s.session)
  const theme = useStore((s) => s.prefs.theme)
  const setPrefs = useStore((s) => s.setPrefs)
  const resetDemo = useStore((s) => s.resetDemo)
  const navigate = useNavigate()

  const go = (persona: (typeof PERSONAS)[keyof typeof PERSONAS], to: '/loop' | '/pool' | '/admin') => {
    signInAs(persona)
    void navigate({ to })
  }

  const items: MenuEntry[] = [
    ...(session?.portal !== 'loop' ? [{ label: 'Loop — as Hana, landlord', icon: <House />, onSelect: () => go(PERSONAS.landlord, '/loop') }] : []),
    ...(session?.portal !== 'pool' || me.id !== PERSONAS.tenant.userId ? [{ label: 'Pool — as Mia, Hana’s tenant', icon: <UserSwitch />, onSelect: () => go(PERSONAS.tenant, '/pool') }] : []),
    ...(session?.portal !== 'pool' || me.id !== PERSONAS.applicant.userId ? [{ label: 'Pool — as Chloe, house-hunting', icon: <UserSwitch />, onSelect: () => go(PERSONAS.applicant, '/pool') }] : []),
    ...(session?.portal !== 'admin' ? [{ label: 'Team console — as Riley', icon: <Wrench />, onSelect: () => go(PERSONAS.admin, '/admin') }] : []),
    {
      label: theme === 'light' ? 'Theme: light' : theme === 'dark' ? 'Theme: dark' : 'Theme: match device',
      icon: theme === 'light' ? <Sun /> : theme === 'dark' ? <Moon /> : <Monitor />,
      reason: 'Tap to change',
      separatorBefore: true,
      onSelect: () => setPrefs({ theme: theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light' }),
    },
    {
      label: 'Reset the demo',
      icon: <ArrowsClockwise />,
      reason: 'Puts every record back as it started',
      onSelect: () => {
        resetDemo()
        toast.success('Demo reset', { description: 'Everything is back to how it started, dated from today.' })
      },
    },
    {
      label: 'Back to the welcome screen',
      icon: <SignOut />,
      separatorBefore: true,
      onSelect: () => {
        signOut()
        void navigate({ to: '/' })
      },
    },
  ]

  return (
    <ActionMenu
      align="end"
      items={items}
      trigger={
        <button
          type="button"
          aria-label={`Account: viewing as ${me.fullName}`}
          className={cn(
            'pressable flex min-w-0 items-center gap-2.5 rounded-md text-left transition-colors duration-150',
            compact ? 'p-1' : 'w-full p-2',
            tone === 'nav' ? 'hoverable:hover:bg-nav-2' : 'hoverable:hover:bg-sunken',
          )}
        >
          <Avatar name={me.fullName} hue={me.hue} size={compact ? 32 : 34} />
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-[13px] font-medium', tone === 'nav' ? 'text-nav-ink' : 'text-ink')}>{me.fullName}</span>
              <span className={cn('block truncate text-[11px]', tone === 'nav' ? 'text-nav-ink-2' : 'text-ink-3')}>{roleLabel(me.role)} · demo</span>
            </span>
          )}
        </button>
      }
    />
  )
}

/** Shown while a platform admin is looking at an organisation as its owner. */
export function ViewingAsBar() {
  const session = useStore((s) => s.session)
  const org = useStore((s) => s.db.orgs.find((o) => o.id === s.session?.orgId))
  const navigate = useNavigate()
  if (!session?.impersonatedBy) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warn px-4 py-1.5 text-center text-[13px] font-medium text-[oklch(0.25_0.06_70)]">
      <span className="inline-flex items-center gap-1.5">
        <Eye weight="bold" className="size-4" />
        Support view: you are looking at {org?.name ?? 'an organisation'} as its owner. This visit is in the audit log.
      </span>
      <button
        type="button"
        className="rounded-sm underline underline-offset-2"
        onClick={() => {
          stopViewingAs()
          void navigate({ to: '/admin/orgs' })
        }}
      >
        Return to the team console
      </button>
    </div>
  )
}

export function SkipLink() {
  return (
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-pop">
      Skip to content
    </a>
  )
}

/** A phone tab: icon over one word, 4–5 across, always labelled. */
export function TabLink({ item, activeClass, idleClass }: { item: NavItem; activeClass: string; idleClass: string }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact ?? false }}
      className={cn('pressable relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium', idleClass)}
      activeProps={{ className: activeClass, 'aria-current': 'page' }}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <span className="relative">
            <Icon weight={isActive ? 'fill' : 'regular'} className="size-6" aria-hidden />
            {item.count ? (
              <span className="num absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-white">{item.count}</span>
            ) : null}
          </span>
          <span className="max-w-full truncate">{item.label}</span>
        </>
      )}
    </Link>
  )
}

/** The scroll container every screen sits in. */
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn('mx-auto w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-8', wide ? 'max-w-[1600px]' : 'max-w-[1320px]', className)}>{children}</div>
}
