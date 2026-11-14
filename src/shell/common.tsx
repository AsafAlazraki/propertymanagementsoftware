import { useEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from 'react'
import { Link, useNavigate, type LinkProps } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ArrowsClockwise,
  Eye,
  House,
  Monitor,
  Moon,
  Prohibit,
  SignOut,
  Sun,
  UserSwitch,
  Wrench,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import { useStore, useMe, useSaveState } from '@/data/store'
import { PERSONAS, signInAs, signOut, stopViewingAs } from '@/app/session'
import { ActionMenu, type MenuEntry } from '@/ui/overlays'
import { Button } from '@/ui/Button'
import { Avatar } from '@/ui/display'
import { Modal } from '@/ui/Sheet'
import { cn } from '@/ui/cn'

export interface NavItem {
  to: LinkProps['to']
  label: string
  icon: ComponentType<IconProps>
  exact?: boolean
  count?: number
  /** What the count is a count of, for a screen reader: "3 waiting". Defaults to "waiting". */
  countLabel?: string
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

/** The words a screen reader hears after a navigation count, so "Command 3" becomes "Command 3 waiting". */
export function CountWords({ item }: { item: Pick<NavItem, 'countLabel'> }) {
  return <span className="sr-only"> {item.countLabel ?? 'waiting'}</span>
}

/**
 * The one confirmation for putting the demo back, used by the account menu in
 * every portal and by Loop's Settings. The reset itself is `resetDemoData`,
 * which also removes the photos the outgoing records were holding; it is
 * loaded only when someone confirms, so Pool and the team console do not carry
 * the landlord mutations for a button most visits never press.
 */
export function ResetDemoModal({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The control to hand focus back to, when the one that opened this is a menu item that has since closed. */
  returnFocus?: RefObject<HTMLElement | null>
}) {
  const [busy, setBusy] = useState(false)
  const reset = async () => {
    setBusy(true)
    try {
      const { resetDemoData } = await import('@/data/ops-mutations')
      resetDemoData()
      onOpenChange(false)
      toast.success('Demo reset', { description: 'Every record is back to how it started, dated from today.' })
    } catch {
      toast.error('The demo could not be reset', {
        description:
          'The code that does it did not load, which usually means no connection. Nothing was changed. Try again when you are online.',
      })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      finalFocus={returnFocus}
      title="Reset the demo data?"
      description="Every change made in this browser is undone, in Loop, Pool and the team console alike: bookings, repairs, notices, inspections and their photos, feedback and settings. Your colour theme stays. This cannot be undone."
      footer={
        <>
          <Button intent="ghost" onClick={() => onOpenChange(false)}>
            Keep everything
          </Button>
          <Button intent="danger" loading={busy} onClick={() => void reset()}>
            Reset the demo
          </Button>
        </>
      }
    />
  )
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
  const [resetting, setResetting] = useState(false)
  const account = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  const go = (persona: (typeof PERSONAS)[keyof typeof PERSONAS], to: '/loop' | '/pool' | '/admin') => {
    signInAs(persona)
    void navigate({ to })
  }

  const items: MenuEntry[] = [
    ...(session?.portal !== 'loop'
      ? [{ label: 'Loop — as Hana, landlord', icon: <House />, onSelect: () => go(PERSONAS.landlord, '/loop') }]
      : []),
    ...(session?.portal !== 'pool' || me.id !== PERSONAS.tenant.userId
      ? [{ label: 'Pool — as Mia, Hana’s tenant', icon: <UserSwitch />, onSelect: () => go(PERSONAS.tenant, '/pool') }]
      : []),
    ...(session?.portal !== 'pool' || me.id !== PERSONAS.applicant.userId
      ? [
          {
            label: 'Pool — as Chloe, house-hunting',
            icon: <UserSwitch />,
            onSelect: () => go(PERSONAS.applicant, '/pool'),
          },
        ]
      : []),
    ...(session?.portal !== 'admin'
      ? [{ label: 'Team console — as Riley', icon: <Wrench />, onSelect: () => go(PERSONAS.admin, '/admin') }]
      : []),
    {
      label: theme === 'light' ? 'Theme: light' : theme === 'dark' ? 'Theme: dark' : 'Theme: match device',
      icon: theme === 'light' ? <Sun /> : theme === 'dark' ? <Moon /> : <Monitor />,
      reason: 'Tap to change',
      separatorBefore: true,
      onSelect: () => setPrefs({ theme: theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light' }),
    },
    {
      // Asks first: this sits one row under the theme switch, and it cannot be undone.
      label: 'Reset the demo…',
      icon: <ArrowsClockwise />,
      reason: 'Puts every record back as it started',
      onSelect: () => setResetting(true),
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
    <>
      <ResetDemoModal open={resetting} onOpenChange={setResetting} returnFocus={account} />
      <ActionMenu
        align="end"
        items={items}
        trigger={
          <button
            ref={account}
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
                <span
                  className={cn('block truncate text-[13px] font-medium', tone === 'nav' ? 'text-nav-ink' : 'text-ink')}
                >
                  {me.fullName}
                </span>
                <span className={cn('block truncate text-[11px]', tone === 'nav' ? 'text-nav-ink-2' : 'text-ink-3')}>
                  {roleLabel(me.role)} · demo
                </span>
              </span>
            )}
          </button>
        }
      />
    </>
  )
}

/** Shown while a platform admin is looking at an organisation as its owner. */
export function ViewingAsBar() {
  const session = useStore((s) => s.session)
  const org = useStore((s) => s.db.orgs.find((o) => o.id === s.session?.orgId))
  const navigate = useNavigate()
  if (!session?.impersonatedBy) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warn px-4 py-1.5 text-center text-[13px] font-medium text-warn-ink">
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

/**
 * Shown across Loop while the team has the organisation marked suspended.
 *
 * It gives the team's reason in their words, and it says what a suspension does
 * in this prototype, which is nothing beyond this bar: no landlord mutation
 * reads the status, so the bar must not say that changes are switched off.
 */
export function SuspendedBar() {
  const org = useStore((s) => s.db.orgs.find((o) => o.id === s.session?.orgId))
  if (org?.status !== 'suspended') return null
  return (
    <div
      role="status"
      className="flex items-start justify-center gap-2 bg-danger-soft px-4 py-2 text-[13px] leading-relaxed text-danger-text"
    >
      <Prohibit weight="fill" className="mt-[3px] size-4 shrink-0" aria-hidden />
      <p className="max-w-[110ch] min-w-0">
        <span className="font-semibold">The Loop team has suspended this account.</span>{' '}
        {org.suspendedReason ? <>Their reason: “{org.suspendedReason}”</> : 'No reason was recorded.'}{' '}
        <span className="text-ink">
          In this prototype a suspension is this notice and nothing more: every screen still works, and changes you make
          are still saved.
        </span>
      </p>
    </div>
  )
}

/** The refused save the person has already been told about, so changing portal does not say it twice. */
let toldAbout: string | null = null
const SAVE_TOAST = 'loop-pool-save-state'

/**
 * Says so, once, when this browser stops keeping changes (see `useSaveState`),
 * and once more when it starts again. Every shell renders it; it draws nothing.
 */
export function StorageWatch() {
  const failedAt = useSaveState((s) => s.failedAt)
  const reason = useSaveState((s) => s.reason)
  useEffect(() => {
    if (failedAt && toldAbout !== failedAt) {
      toldAbout = failedAt
      const since = new Date(failedAt).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })
      const atRisk = `Everything since ${since} is only in this tab and will be lost when it closes or reloads.`
      toast.error('Changes are not being saved', {
        id: SAVE_TOAST,
        duration: Infinity,
        description:
          reason === 'full'
            ? `This browser’s storage for the site is full. ${atRisk} Take a copy of what you need, then choose Reset the demo in the account menu to make room.`
            : `This browser refused to store the change. ${atRisk} Check that the browser lets this site keep data; a private window often does not.`,
        action: { label: 'OK', onClick: () => {} },
      })
    } else if (!failedAt && toldAbout) {
      toldAbout = null
      toast.success('Saving again', {
        id: SAVE_TOAST,
        duration: 8000,
        description: 'This browser is keeping your changes again. Everything on screen now is stored.',
      })
    }
  }, [failedAt, reason])
  return null
}

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-pop"
    >
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
      className={cn(
        'pressable relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-medium',
        idleClass,
      )}
      activeProps={{ className: activeClass, 'aria-current': 'page' }}
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <span className="relative">
            <Icon weight={isActive ? 'fill' : 'regular'} className="size-6" aria-hidden />
            {item.count ? (
              <span
                aria-hidden
                className="num absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-danger-ink"
              >
                {item.count}
              </span>
            ) : null}
          </span>
          <span className="max-w-full truncate">{item.label}</span>
          {/* The badge above is a picture of the count; this is the count as words, after the label. */}
          {item.count ? (
            <span className="sr-only">
              {' '}
              {item.count} {item.countLabel ?? 'waiting'}
            </span>
          ) : null}
        </>
      )}
    </Link>
  )
}

/** The scroll container every screen sits in. */
export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-5 sm:px-6 lg:px-8 lg:py-8',
        wide ? 'max-w-[1600px]' : 'max-w-[1320px]',
        className,
      )}
    >
      {children}
    </div>
  )
}
