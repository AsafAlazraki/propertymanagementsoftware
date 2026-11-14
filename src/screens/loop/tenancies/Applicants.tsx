/**
 * Applicants. What a landlord may know about a person grows in three steps,
 * and this view only ever shows the step each applicant has reached. The
 * limits are the Privacy Commissioner's, read from the rule pack; the screen
 * enforces them by not having anywhere to put the rest.
 */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarBlank, CheckCircle, Eye, LockSimple, SealCheck, UsersThree } from '@phosphor-icons/react'
import type { Application, ApplicationStage, Property, RenterProfile, User } from '@/domain/types'
import { BAND_LABEL, passportOf } from '@/domain/passport'
import { dateOf, fmtDate, fmtRelative, fmtTime } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { bondCaps } from '@/domain/rules/tenancy'
import { useOrgRows, useStore } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { moveApplication } from '@/data/tenancy-mutations'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Avatar, Callout, Empty } from '@/ui/display'
import { Why } from '@/ui/Law'
import { Modal } from '@/ui/Sheet'
import { cn } from '@/ui/cn'

const PREFERRED: ApplicationStage[] = ['preferred', 'checks', 'approved']

/** Which of the pack's privacy stages an application has reached. */
function privacyStep(a: Application): 0 | 1 | 2 {
  if (PREFERRED.includes(a.stage)) return 2
  return a.occupants === 0 ? 0 : 1
}

function Locked({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-ink-3">
      <LockSimple weight="fill" className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

function ApplicantCard({
  a,
  user,
  profile,
  onDecline,
}: {
  a: Application
  user?: User
  profile?: RenterProfile
  onDecline: () => void
}) {
  const pack = usePack()
  const day = useToday()
  const step = privacyStep(a)
  const stage = pack.privacyStages[Math.min(step, pack.privacyStages.length - 1)]
  const name = user?.fullName ?? 'Applicant'
  const first = name.split(' ')[0]
  const passport = profile && step === 2 && profile.visibleToLandlords ? passportOf(profile, day) : null
  const move = (to: ApplicationStage, said: string) => {
    moveApplication(a.id, to, pack)
    toast.success(said)
  }

  return (
    <li className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <Avatar name={name} hue={user?.hue ?? 200} size={36} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[14px] font-semibold text-ink">
            {name}
            {step >= 1 && user?.identityVerified && (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-ok-text">
                <SealCheck weight="fill" className="size-3.5" aria-hidden /> identity checked
              </span>
            )}
          </p>
          <p className="text-xs text-ink-3">
            {step === 0 ? 'Booked a viewing' : 'Applied'} {fmtRelative(dateOf(a.submittedAt), day)}
          </p>
        </div>
        {a.stage === 'checks' && <Badge tone="info">Checks under way</Badge>}
        {a.stage === 'approved' && <Badge tone="ok">Offered</Badge>}
      </div>

      {a.viewingAt && (
        <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
          <Eye className="size-4 shrink-0 text-ink-3" aria-hidden />
          Viewing {fmtDate(dateOf(a.viewingAt))}, {fmtTime(a.viewingAt)}
        </p>
      )}

      {step >= 1 && (
        <>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <UsersThree className="size-4 text-ink-3" aria-hidden />
              {a.occupants} {a.occupants === 1 ? 'person' : 'people'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarBlank className="size-4 text-ink-3" aria-hidden />
              Wants to move in {fmtDate(a.moveIn, { weekday: false })}
            </span>
          </p>
          {a.message && (
            <blockquote className="border-l-2 border-line-strong pl-3 text-[13px] leading-relaxed text-ink">
              {a.message}
            </blockquote>
          )}
        </>
      )}

      {passport && profile && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-sunken p-3 text-[13px]">
          <div>
            <dt className="text-xs text-ink-3">Verified rental history</dt>
            <dd className="font-medium text-ink">
              {passport.verifiedMonths
                ? `${passport.verifiedMonths} months, ${passport.verifiedTenancies} ${passport.verifiedTenancies === 1 ? 'home' : 'homes'}`
                : 'None yet'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Rent paid on time</dt>
            <dd className="font-medium text-ink">
              {passport.pillars.punctuality.value === null
                ? 'No record yet'
                : `${Math.round(passport.pillars.punctuality.value)}%`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Referees confirmed</dt>
            <dd className="font-medium text-ink">
              {profile.references.filter((r) => r.verified).length} of {profile.references.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Rent Passport</dt>
            <dd className="font-medium text-ink">
              {passport.score === null ? 'Still building' : `${passport.score} · ${BAND_LABEL[passport.band]}`}
            </dd>
          </div>
        </dl>
      )}
      {step === 2 && profile && !profile.visibleToLandlords && (
        <Locked>{`${first} has not shared their Rent Passport. You can ask; they choose.`}</Locked>
      )}
      {step === 0 && (
        <Locked>{`${stage.stage}: you have their name and contact details, and nothing else until they apply.`}</Locked>
      )}
      {step === 1 && (
        <Locked>
          Referees, credit and their Rent Passport open only when they are the person you intend to offer the home to.
        </Locked>
      )}

      {a.stage !== 'approved' && (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {step === 1 && (
            <Button
              size="sm"
              intent="primary"
              onClick={() => move('preferred', `${first} is your preferred applicant`)}
            >
              Make preferred
            </Button>
          )}
          {a.stage === 'preferred' && (
            <Button
              size="sm"
              intent="secondary"
              onClick={() => move('checks', `Checks started, with ${first}’s consent`)}
            >
              Start the checks
            </Button>
          )}
          {step === 2 && (
            <Button size="sm" intent="primary" onClick={() => move('approved', `${first} has been offered the home`)}>
              Offer the home
            </Button>
          )}
          {step >= 1 && (
            <Button size="sm" intent="ghost" onClick={onDecline}>
              Not this time
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

function Listing({ property, apps }: { property: Property; apps: Application[] }) {
  const pack = usePack()
  const users = useStore((s) => s.db.users)
  const profiles = useStore((s) => s.db.renterProfiles)
  const [declining, setDeclining] = useState<Application | null>(null)
  const listing = property.listing
  const keep = pack.rules['privacy.unsuccessful_applicant_retention'].value
  const open = apps.filter((a) => a.stage !== 'declined' && a.stage !== 'withdrawn')
  const closed = apps.filter((a) => a.stage === 'declined')
  const offered = open.find((a) => a.stage === 'approved')
  const groups = [
    { key: 'preferred', title: 'Preferred', rows: open.filter((a) => privacyStep(a) === 2), step: 2 },
    { key: 'applied', title: 'Applied', rows: open.filter((a) => privacyStep(a) === 1), step: 1 },
    { key: 'viewing', title: 'Viewing only', rows: open.filter((a) => privacyStep(a) === 0), step: 0 },
  ].filter((g) => g.rows.length > 0)
  const userOf = (id: string) => users.find((u) => u.id === id)
  const decliningName = declining ? (userOf(declining.applicantId)?.fullName.split(' ')[0] ?? 'this applicant') : ''

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 rounded-lg bg-nav p-5 text-nav-ink">
        <div className="min-w-0">
          <p className="eyebrow !text-nav-ink-2">{listing?.status === 'live' ? 'Listed now' : 'Not listed'}</p>
          <h2 className="display mt-1 text-[20px]">{property.address.line1}</h2>
          {listing && (
            <p className="mt-1 text-[13px] text-nav-ink-2">
              <span className="num">{listing.views}</span> views · <span className="num">{open.length}</span>{' '}
              {open.length === 1 ? 'person' : 'people'} in the running · available{' '}
              {fmtDate(listing.availableFrom, { weekday: false })}
            </p>
          )}
        </div>
        {listing && (
          <div className="sm:text-right">
            <p className="num display text-[26px] leading-none text-glow">{money(listing.advertisedWeeklyRent)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-nav-ink-2 sm:justify-end">
              a week, for everyone <Why rule="listing.bidding_banned" tone="nav" />
            </p>
          </div>
        )}
      </header>

      {offered && listing && (
        <Callout
          tone="ok"
          icon={<CheckCircle weight="fill" />}
          title={`${userOf(offered.applicantId)?.fullName.split(' ')[0]} has the offer. What comes next`}
        >
          The agreement is signed before anyone moves in, with the healthy homes and insurance statements inside it. The
          bond can be at most {money(bondCaps(pack, listing.advertisedWeeklyRent).general)}, and it is lodged within the
          deadline once it is paid.
          <span className="mt-2 flex flex-wrap gap-1.5">
            <Why rule="bond.max_weeks" />
            <Why rule="bond.lodgement_deadline" />
          </span>
        </Callout>
      )}

      {groups.length === 0 && (
        <div className="rounded-lg bg-surface shadow-card">
          <Empty
            icon={<UsersThree />}
            title="Nobody has applied yet"
            body="People book a viewing from Pool first, and apply after they have seen the home. Each one appears here with only what you are allowed to know at that point."
          />
        </div>
      )}

      {groups.map((g) => {
        const rule = pack.privacyStages[Math.min(g.step, pack.privacyStages.length - 1)]
        return (
          <div key={g.key}>
            <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[14px] font-semibold text-ink">
                {g.title} <span className="num font-normal text-ink-3">· {g.rows.length}</span>
              </h3>
              <p className="text-xs text-ink-3">
                You may ask for: {rule.mayCollect.slice(0, 3).join(', ').toLowerCase()}
                {rule.mayCollect.length > 3 ? '…' : ''}
              </p>
            </div>
            <ul className={cn('grid grid-cols-1 gap-3', g.rows.length > 1 && 'md:grid-cols-2 2xl:grid-cols-3')}>
              {g.rows.map((a) => (
                <ApplicantCard
                  key={a.id}
                  a={a}
                  user={userOf(a.applicantId)}
                  profile={profiles.find((p) => p.userId === a.applicantId)}
                  onDecline={() => setDeclining(a)}
                />
              ))}
            </ul>
          </div>
        )
      })}

      {closed.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-ink">Not successful</h3>
            <Why rule="privacy.unsuccessful_applicant_retention" />
          </div>
          <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
            {closed.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 text-[13px] last:border-b-0"
              >
                <span className="text-ink">
                  {a.purged ? 'Details deleted' : (userOf(a.applicantId)?.fullName.split(' ')[0] ?? 'Applicant')}
                </span>
                <span className="text-xs text-ink-3">
                  {a.purged
                    ? 'Nothing is held.'
                    : a.purgeOn
                      ? `Their details are deleted on ${fmtDate(a.purgeOn, { weekday: false })}`
                      : 'Told they were not successful'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={declining !== null}
        onOpenChange={(o) => !o && setDeclining(null)}
        title={`Tell ${decliningName} it is a no?`}
        description={`They are told kindly, without a reason unless you add one later.${keep ? ` Their details are deleted after ${keep.n} ${keep.unit}.` : ''}`}
        size="sm"
        footer={
          <>
            <Button intent="ghost" onClick={() => setDeclining(null)}>
              Keep them in
            </Button>
            <Button
              intent="primary"
              onClick={() => {
                if (declining) moveApplication(declining.id, 'declined', pack)
                toast(`${decliningName} has been told`, { description: 'Their details will be deleted on schedule.' })
                setDeclining(null)
              }}
            >
              Yes, let them know
            </Button>
          </>
        }
      />
    </section>
  )
}

export function Applicants() {
  const properties = useOrgRows('properties')
  const applications = useOrgRows('applications')
  const listed = useMemo(
    () => properties.filter((p) => p.listing?.status === 'live' || applications.some((a) => a.propertyId === p.id)),
    [properties, applications],
  )

  if (listed.length === 0) {
    return (
      <div className="rounded-lg bg-surface shadow-card">
        <Empty
          icon={<UsersThree />}
          title="No home is looking for a tenant"
          body="When a home is listed, the people who book a viewing and apply are kept here — each with only what the law lets you ask for at that stage."
        />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {listed.map((p) => (
        <Listing key={p.id} property={p} apps={applications.filter((a) => a.propertyId === p.id)} />
      ))}
    </div>
  )
}
