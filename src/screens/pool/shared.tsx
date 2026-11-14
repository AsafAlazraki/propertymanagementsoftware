/**
 * The pieces every Pool screen leans on: who I am as a renter, where I live,
 * and how a repair or an application reads in plain words.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Heart } from '@phosphor-icons/react'
import type { Application, ID, Property, RenterProfile, Tenancy, Ticket, User } from '@/domain/types'
import type { JurisdictionPack, PrivacyStage } from '@/domain/jurisdictions/types'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { toggleSaved } from '@/data/pool-mutations'
import { cn } from '@/ui/cn'

export function firstName(fullName: string | undefined): string {
  return fullName?.split(' ')[0] ?? 'Your landlord'
}

/** `10:30 am`, `3 pm`. */
export function fmtTime(instant: string): string {
  const d = new Date(instant)
  const h = d.getHours()
  const m = d.getMinutes()
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h >= 12 ? 'pm' : 'am'}`
}

/** `Tue 17 Nov at 10:30 am`. */
export function fmtWhen(instant: string): string {
  return `${fmtDate(dateOf(instant))} at ${fmtTime(instant)}`
}

/**
 * The last thing that was not empty. A sheet that is closing still needs
 * something to show on its way out; this keeps the content it opened with.
 */
export function useLast<T>(value: T | null | undefined): T | null | undefined {
  const [last, setLast] = useState(value)
  if (value != null && value !== last) setLast(value)
  return value ?? last
}

/* ─────────────────────────────── who and where ──────────────────────────── */

export interface MyHome {
  tenancy: Tenancy
  property: Property
  /** The person who owns the landlord organisation. */
  landlord: User | undefined
  /** Everyone else on the agreement. */
  housemates: User[]
}

/** The home the signed-in renter lives in through Pool, if they have one. */
export function useMyHome(): MyHome | undefined {
  const me = useMe()
  const tenancies = useStore((s) => s.db.tenancies)
  const properties = useStore((s) => s.db.properties)
  const orgs = useStore((s) => s.db.orgs)
  const users = useStore((s) => s.db.users)
  return useMemo(() => {
    const tenancy = tenancies.find((t) => t.tenantIds.includes(me.id) && (t.status === 'active' || t.status === 'notice_given'))
    const property = properties.find((p) => p.id === tenancy?.propertyId)
    if (!tenancy || !property) return undefined
    const org = orgs.find((o) => o.id === tenancy.orgId)
    return {
      tenancy,
      property,
      landlord: users.find((u) => u.id === org?.ownerUserId),
      housemates: tenancy.tenantIds.filter((id) => id !== me.id).flatMap((id) => users.find((u) => u.id === id) ?? []),
    }
  }, [me.id, tenancies, properties, orgs, users])
}

export type ProfileRow = RenterProfile & { id: ID }

/** The renter's profile, or a blank one for someone who has not saved anything yet. */
export function useMyProfile(): ProfileRow {
  const me = useMe()
  const profiles = useStore((s) => s.db.renterProfiles)
  return useMemo(
    () =>
      profiles.find((p) => p.userId === me.id) ?? {
        id: `rp_${me.id.replace(/^u_/, '')}`,
        userId: me.id,
        headline: '',
        bio: '',
        employment: '',
        householdSize: 1,
        hasPets: false,
        references: [],
        history: [],
        savedPropertyIds: [],
        visibleToLandlords: true,
      },
    [profiles, me.id],
  )
}

export function useMyApplications(): Application[] {
  const me = useMe()
  const applications = useStore((s) => s.db.applications)
  return useMemo(() => applications.filter((a) => a.applicantId === me.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [applications, me.id])
}

/* ────────────────────────────────── repairs ─────────────────────────────── */

export const REPAIR_STEPS = ['Reported', 'Sorted', 'Booked', 'Work done', 'Closed'] as const

/** How far along a repair is, as an index into `REPAIR_STEPS`. */
export function repairStep(t: Pick<Ticket, 'status'>): number {
  switch (t.status) {
    case 'submitted':
      return 0
    case 'quote_requested':
    case 'quote_ready':
      return 1
    case 'approved':
    case 'scheduled':
    case 'in_progress':
      return 2
    case 'awaiting_invoice':
    case 'tenant_verifying':
    case 'disputed':
      return 3
    case 'closed':
      return 4
  }
}

/** Where a repair is right now, the way you would say it to a flatmate. */
export function repairLine(t: Ticket, who: { landlord: string; provider?: string }): string {
  const trade = who.provider ?? `a ${t.triage.suggestedTrade.toLowerCase()}`
  const Trade = who.provider ?? `A ${t.triage.suggestedTrade.toLowerCase()}`
  switch (t.status) {
    case 'submitted':
      // Nobody in the network does this kind of job yet, so the landlord has to find someone.
      return `With ${who.landlord} to arrange ${trade}`
    case 'quote_requested':
      return `Waiting on a quote from ${trade}`
    case 'quote_ready':
      return `With ${who.landlord} to approve the ${t.quote ? `${money(t.quote.amount)} ` : ''}quote`
    case 'approved':
      return t.scheduledFor ? `${Trade} is booked for ${fmtWhen(t.scheduledFor)}` : `Sent to ${trade} — they will book a time with you`
    case 'scheduled':
      return t.scheduledFor ? `${Trade} is coming ${fmtWhen(t.scheduledFor)}` : `${Trade} is booked`
    case 'in_progress':
      return `${Trade} is on the job`
    case 'awaiting_invoice':
      return 'Work done — waiting on the paperwork'
    case 'tenant_verifying':
      return 'Waiting on you — check the tradesperson’s report'
    case 'disputed':
      return `With ${who.landlord} to read both sides. Nothing is billed`
    case 'closed':
      return t.paidFrom === 'tenant' ? 'Closed — you agreed to cover it' : 'Fixed and closed'
  }
}

/* ──────────────────────────────── applications ──────────────────────────── */

/** An application with nothing but a viewing behind it: only name and contact details have been shared. */
export function isViewingOnly(a: Pick<Application, 'occupants'>): boolean {
  return a.occupants === 0
}

export function stageLine(a: Application, landlord: string): string {
  switch (a.stage) {
    case 'interest':
      return `Sent to ${landlord}. No checks have been run`
    case 'viewing_booked':
      return isViewingOnly(a) ? 'Viewing booked. You have not applied yet' : 'Applied, with a viewing booked'
    case 'preferred':
      return `You are ${landlord}’s preferred applicant`
    case 'checks':
      return 'Reference and credit checks under way, with your consent'
    case 'approved':
      return 'Approved — the home is yours to accept'
    case 'declined':
      return 'Not this time'
    case 'withdrawn':
      return 'You withdrew this one'
  }
}

/** Which of the Privacy Commissioner's three stages an application has reached. */
export function privacyStageOf(pack: JurisdictionPack, a: Pick<Application, 'stage' | 'occupants'>): { now: PrivacyStage; index: number } {
  const index = a.stage === 'preferred' || a.stage === 'checks' || a.stage === 'approved' ? 2 : isViewingOnly(a) ? 0 : 1
  return { now: pack.privacyStages[Math.min(index, pack.privacyStages.length - 1)], index }
}

/* ─────────────────────────────── small pieces ───────────────────────────── */

/** Saves a home to the renter's list. The heart fills; the toast says where to find it. */
export function SaveHeart({ propertyId, label, className, size = 'md' }: { propertyId: ID; label: string; className?: string; size?: 'md' | 'lg' }) {
  const me = useMe()
  const saved = useMyProfile().savedPropertyIds.includes(propertyId)
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${label} from saved homes` : `Save ${label}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const now = toggleSaved(me.id, propertyId)
        toast(now ? 'Saved' : 'Removed from saved', { description: now ? 'You will find it on your Home screen.' : undefined })
      }}
      className={cn(
        'pressable grid shrink-0 place-items-center rounded-full bg-surface/92 shadow-card backdrop-blur-sm transition-colors',
        size === 'lg' ? 'size-12' : 'size-11',
        saved ? 'text-accent' : 'text-ink-2 hoverable:hover:text-accent-text',
        className,
      )}
    >
      <Heart weight={saved ? 'fill' : 'bold'} className={cn('transition-transform duration-200 ease-out', size === 'lg' ? 'size-6' : 'size-5', saved && 'scale-110')} aria-hidden />
    </button>
  )
}

/** A Pool section heading: the display face, a notch smaller than the page title. */
export function Heading({ children, count, action, id, className }: { children: ReactNode; count?: number; action?: ReactNode; id?: string; className?: string }) {
  return (
    <div className={cn('mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2', className)}>
      <h2 id={id} className="display flex min-w-0 items-center gap-2 text-[20px] text-ink sm:text-[22px]">
        <span className="min-w-0">{children}</span>
        {count !== undefined && count > 0 && <span className="num grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 font-sans text-xs font-semibold tracking-normal text-accent-ink">{count}</span>}
      </h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Shown wherever something in the demo stands in for the real thing. */
export function DemoNote({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-xs leading-relaxed text-ink-3', className)}>{children}</p>
}
