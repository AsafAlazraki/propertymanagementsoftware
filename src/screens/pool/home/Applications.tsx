/**
 * An application, told straight: where it is, and exactly what the landlord
 * can see about you at this stage — which is the thing renters are never told.
 */
import { useMemo, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CalendarCheck, Check, EyeSlash, LockSimple, Scales, X } from '@phosphor-icons/react'
import type { Application, ID } from '@/domain/types'
import { fmtDate } from '@/domain/rules/calendar'
import { plural } from '@/domain/rules/format'
import { BAND_LABEL, passportOf } from '@/domain/passport'
import { useMe, useStore } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { Money } from '@/ui/display'
import { Why } from '@/ui/Law'
import { PropertyArt } from '@/ui/PropertyArt'
import { cn } from '@/ui/cn'
import { firstName, fmtWhen, isViewingOnly, privacyStageOf, stageLine, useMyProfile } from '../shared'

/** The first name of whoever owns the organisation a listing belongs to. */
export function useOwnerFirstName(): (orgId: ID) => string {
  const orgs = useStore((s) => s.db.orgs)
  const users = useStore((s) => s.db.users)
  return useMemo(() => {
    const names = new Map(orgs.map((o) => [o.id, firstName(users.find((u) => u.id === o.ownerUserId)?.fullName)]))
    return (orgId: ID) => names.get(orgId) ?? 'the landlord'
  }, [orgs, users])
}

function StageTrack({ a }: { a: Application }) {
  const reached = a.stage === 'preferred' || a.stage === 'checks' || a.stage === 'approved'
  const steps = [
    { label: 'Applied', done: !isViewingOnly(a) },
    { label: 'Viewing', done: Boolean(a.viewingAt) || reached },
    { label: 'Preferred', done: reached },
    { label: 'Checks', done: a.stage === 'checks' || a.stage === 'approved' },
    { label: 'Yours', done: a.stage === 'approved' },
  ]
  const last = steps.map((s) => s.done).lastIndexOf(true)
  return (
    <ol aria-label="How far this application has got" className="grid grid-cols-5 px-2 pb-4">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex min-w-0 flex-col items-center gap-1.5 text-center">
          {i > 0 && <span aria-hidden className={cn('absolute top-[9px] right-1/2 h-0.5 w-full', i <= last && s.done ? 'bg-accent' : 'bg-line')} />}
          <span className={cn('relative grid size-5 place-items-center rounded-full', s.done ? 'bg-accent text-accent-ink' : 'bg-surface shadow-[inset_0_0_0_2px_var(--line-strong)]', i === last && 'ring-4 ring-accent-soft')}>
            {s.done && <Check weight="bold" className="size-3" aria-hidden />}
          </span>
          <span className={cn('max-w-full truncate text-[11px]', i === last ? 'font-semibold text-ink' : s.done ? 'text-ink-2' : 'text-ink-3')}>
            {s.label}
            <span className="sr-only">{s.done ? ' — done' : ' — not yet'}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function ApplicationCard({ application, action }: { application: Application; action?: ReactNode }) {
  const pack = usePack()
  const property = useStore((s) => s.db.properties.find((p) => p.id === application.propertyId))
  const ownerOf = useOwnerFirstName()
  const me = useMe()
  const day = useToday()
  const profile = useMyProfile()
  const passport = useMemo(() => passportOf(profile, day), [profile, day])
  if (!property) return null
  const owner = ownerOf(property.orgId)
  const closed = application.stage === 'declined' || application.stage === 'withdrawn'
  const { now, index } = privacyStageOf(pack, application)
  const next = pack.privacyStages[index + 1]
  const never = pack.privacyStages[1]?.mustNotCollect ?? []
  // What has actually left the renter's hands for this application, as opposed to what the stage would allow.
  const shared = isViewingOnly(application)
    ? ['Your name', 'Your contact details']
    : [
        'Your name and contact details',
        `${plural(application.occupants, 'person', 'people')} moving in`,
        `Move in from ${fmtDate(application.moveIn)}`,
        ...(application.message ? ['Your note'] : []),
        ...(me.identityVerified ? ['That your identity is verified'] : []),
        ...(profile.visibleToLandlords ? [`Your Rent Passport: ${passport.score === null ? BAND_LABEL.building : `${passport.score}, ${BAND_LABEL[passport.band]}`}`] : []),
      ]

  return (
    <article className="min-w-0 overflow-hidden rounded-xl bg-surface shadow-card">
      <div className="flex gap-3.5 p-4 sm:gap-4 sm:p-5">
        <Link to="/pool/listing/$id" params={{ id: property.id }} className="shrink-0 rounded-lg" aria-label={`Open the listing for ${property.address.line1}`}>
          <PropertyArt kind={property.kind} art={property.art} className="size-[72px] rounded-lg sm:size-24" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">{property.address.line1}</p>
          <p className="truncate text-[13px] text-ink-2">
            {property.address.suburb} · <Money value={application.offeredWeeklyRent} className="font-semibold text-ink" /> a week, fixed
          </p>
          <p className={cn('mt-2 text-[14px] leading-snug text-pretty', closed ? 'text-ink-2' : 'font-medium text-ink')}>{stageLine(application, owner)}.</p>
          {application.viewingAt && !closed && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">
              <CalendarCheck weight="fill" className="size-3.5" aria-hidden />
              Viewing {fmtWhen(application.viewingAt)}
            </p>
          )}
        </div>
      </div>

      {!closed && <StageTrack a={application} />}

      <div className="border-t border-line bg-surface-2 p-4 sm:px-5">
        {closed ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-ink-2">
            <EyeSlash className="size-4 shrink-0 text-ink-3" aria-hidden />
            <span className="min-w-0 flex-1">
              {application.purged
                ? `Your details are gone from ${owner}’s records.`
                : application.purgeOn
                  ? `Your details are deleted from ${owner}’s records on ${fmtDate(application.purgeOn)}.`
                  : `Your details are no longer shown to ${owner}.`}
            </span>
            <Why rule="privacy.unsuccessful_applicant_retention" label="How long they are kept" />
          </div>
        ) : (
          <>
            <p className="eyebrow">Shared with {owner} so far — and nothing else</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {shared.map((item) => (
                <li key={item} className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs text-ink shadow-card">
                  <Check weight="bold" className="size-3 shrink-0 text-ok-text" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 grid gap-1.5 text-xs leading-relaxed text-ink-3">
              <p className="flex gap-1.5">
                <Scales className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  The most a landlord may ask for at the “{now.stage.toLowerCase()}” stage: {now.mayCollect.join(', ').toLowerCase()}.
                </span>
              </p>
              {next && (
                <p className="flex gap-1.5">
                  <LockSimple className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  <span>
                    {index === 0 ? 'Only if you choose to apply' : 'Locked until you are the preferred applicant'}: {next.mayCollect.join(', ').toLowerCase()}.
                  </span>
                </p>
              )}
              <p className="flex gap-1.5">
                <X weight="bold" className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>Never asked: {never.join(', ').toLowerCase()}.</span>
              </p>
            </div>
          </>
        )}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </article>
  )
}
