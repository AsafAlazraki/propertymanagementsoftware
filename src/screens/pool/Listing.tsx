/**
 * Pool — one home.
 *
 * What this screen does that no other does: it answers the three things a
 * renter cannot find out anywhere else before applying. What will it really
 * cost to move in (worked out from the legal ceilings, not a guess). Is it
 * warm and dry (from the home's own compliance record). And what, exactly,
 * will the landlord learn about me if I book a viewing or apply.
 */
import { useMemo, useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Bathtub, Bed, CalendarCheck, Car, Check, Drop, Fan, HouseLine, IdentificationCard, MagnifyingGlass, PawPrint, Ruler, SealCheck, Stack, ThermometerHot, Warning, Wind, X, type Icon } from '@phosphor-icons/react'
import type { Application, HealthyHomes, Property } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { BAND_LABEL, passportOf } from '@/domain/passport'
import { bondCaps } from '@/domain/rules/tenancy'
import { checkRentOffer } from '@/domain/rules/text'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { applyForHome, bookViewing, cancelViewing } from '@/data/pool-mutations'
import { Page } from '@/shell/common'
import { Button, buttonClass } from '@/ui/Button'
import { Field, Input, Textarea } from '@/ui/controls'
import { Money } from '@/ui/display'
import { Refusal, Why } from '@/ui/Law'
import { PropertyArt } from '@/ui/PropertyArt'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { fmtTime, fmtWhen, Heading, isViewingOnly, SaveHeart, stageLine, useMyApplications, useMyHome, useMyProfile } from './shared'
import { useOwnerFirstName } from './home/Applications'

const route = getRouteApi('/pool/listing/$id')

const KIND: Record<Property['kind'], string> = { house: 'House', townhouse: 'Townhouse', unit: 'Unit', apartment: 'Apartment' }

/* ───────────────────────────── warm and dry ─────────────────────────────── */

const STANDARDS: { key: keyof Omit<HealthyHomes, 'statementSignedAt'>; check: string; icon: Icon }[] = [
  { key: 'heating', check: 'hh_heating', icon: ThermometerHot },
  { key: 'insulation', check: 'hh_insulation', icon: Stack },
  { key: 'ventilation', check: 'hh_ventilation', icon: Fan },
  { key: 'moisture', check: 'hh_moisture', icon: Drop },
  { key: 'draught', check: 'hh_draught', icon: Wind },
]

function WarmAndDry({ property, owner }: { property: Property; owner: string }) {
  const pack = usePack()
  const hh = property.healthyHomes
  const met = STANDARDS.filter((s) => hh[s.key].status === 'compliant' || hh[s.key].status === 'exempt').length
  return (
    <section aria-labelledby="warm-dry">
      <Heading id="warm-dry">Warm and dry</Heading>
      <p className="-mt-1 mb-3 max-w-[60ch] text-[14px] leading-relaxed text-ink-2">
        {met} of the {STANDARDS.length} healthy homes standards are on record as met. This comes from the home’s own compliance record, as {owner} recorded it — not from the advert.
      </p>
      <ul className="divide-y divide-line rounded-xl bg-surface shadow-card">
        {STANDARDS.map((s) => {
          const item = hh[s.key]
          const def = pack.complianceChecks.find((c) => c.key === s.check)
          const ok = item.status === 'compliant' || item.status === 'exempt'
          return (
            <li key={s.key} className="flex gap-3.5 p-4 sm:px-5">
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', ok ? 'bg-ok-soft text-ok-text' : item.status === 'non_compliant' ? 'bg-danger-soft text-danger-text' : 'bg-warn-soft text-warn-text')}>
                <s.icon weight="fill" className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold text-ink">
                  {def?.label ?? s.key}
                  <span className={cn('inline-flex items-center gap-1 text-xs font-medium', ok ? 'text-ok-text' : item.status === 'non_compliant' ? 'text-danger-text' : 'text-warn-text')}>
                    {ok ? <SealCheck weight="fill" className="size-3.5" aria-hidden /> : <Warning weight="fill" className="size-3.5" aria-hidden />}
                    {item.status === 'compliant' ? 'On record as met' : item.status === 'exempt' ? 'Exempt' : item.status === 'non_compliant' ? 'Not met yet' : 'Not confirmed'}
                  </span>
                </p>
                {item.detail && <p className="mt-0.5 text-[14px] leading-relaxed text-ink">{item.detail}</p>}
                <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
                  {def ? `The standard: ${def.why.charAt(0).toLowerCase()}${def.why.slice(1)}` : ''}
                  {item.checkedAt ? ` Checked ${fmtDate(item.checkedAt, { weekday: false, year: 'always' })}.` : ''}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-2.5 text-xs leading-relaxed text-ink-3">
        {property.smokeAlarms.lastChecked ? `Smoke alarms were last tested ${fmtDate(property.smokeAlarms.lastChecked, { weekday: false, year: 'always' })}. ` : 'No smoke alarm test is on record yet. '}
        {hh.statementSignedAt ? 'A signed healthy homes statement is on file.' : 'A signed healthy homes statement has to be part of the agreement you sign.'}
      </p>
    </section>
  )
}

/* ───────────────────────────── what it costs ────────────────────────────── */

function MoveInCost({ rent, pets, owner }: { rent: number; pets: boolean; owner: string }) {
  const pack = usePack()
  const caps = bondCaps(pack, rent)
  const advanceWeeks = pack.rules['rent.in_advance_max_weeks'].value
  const advance = advanceWeeks * rent
  const rows: { label: string; note: string; amount: number; rule: 'bond.max_weeks' | 'rent.in_advance_max_weeks' | 'listing.letting_fee_banned' }[] = [
    { label: 'Bond', note: `at most ${pack.rules['bond.max_weeks'].value} weeks of rent`, amount: caps.general, rule: 'bond.max_weeks' },
    { label: 'Rent in advance', note: `at most ${advanceWeeks} weeks`, amount: advance, rule: 'rent.in_advance_max_weeks' },
    { label: 'Letting fee', note: 'nobody may charge you one', amount: 0, rule: 'listing.letting_fee_banned' },
  ]
  return (
    <section aria-label="What it costs to move in" className="rounded-xl bg-surface p-5 shadow-card">
      <p className="eyebrow">To move in, at the very most</p>
      <p className="mt-1">
        <Money value={caps.general + advance} className="display text-[34px] text-ink" />
      </p>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.label} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
            <span className="min-w-0 flex-1 basis-40">
              <span className="block text-[14px] font-medium text-ink">{r.label}</span>
              <span className="block text-xs text-ink-3">{r.note}</span>
            </span>
            <Why rule={r.rule} />
            <span className="num w-16 text-right text-[15px] font-semibold text-ink">{money(r.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-ink-3">
        These are the legal ceilings, worked out from the rent — {owner} may ask for less.
        {pets && caps.pet !== null ? ` If you ask to bring a pet, a pet bond of up to ${money(caps.pet)} can be added.` : ''}
      </p>
      {pets && caps.pet !== null && (
        <div className="mt-2">
          <Why rule="bond.pet_max_weeks" label="Pet bond" />
        </div>
      )}
    </section>
  )
}

/* ─────────────────────────────── the sheets ─────────────────────────────── */

function SharedList({ may, never, who }: { may: string[]; never: string[]; who: string }) {
  return (
    <div className="grid gap-3 rounded-lg bg-sunken p-4">
      <div>
        <p className="eyebrow">What {who} gets at this stage</p>
        <ul className="mt-2 grid gap-1.5">
          {may.map((m) => (
            <li key={m} className="flex gap-2 text-[14px] text-ink">
              <Check weight="bold" className="mt-0.5 size-4 shrink-0 text-ok-text" aria-hidden />
              {m}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="eyebrow">Never asked for</p>
        <ul className="mt-2 grid gap-1.5">
          {never.map((m) => (
            <li key={m} className="flex gap-2 text-[14px] text-ink-2">
              <X weight="bold" className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
              {m}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function ViewingSheet({ open, property, owner, initial, onClose }: { open: boolean; property: Property; owner: string; initial: string | null; onClose: () => void }) {
  const me = useMe()
  const pack = usePack()
  const times = useUpcomingViewings(property)
  const [picked, setPicked] = useState<string | null>(initial)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setPicked(initial ?? times[0] ?? null)
  }
  const stage = pack.privacyStages[0]
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      eyebrow={property.address.line1}
      title="Book a viewing"
      description="See it before you decide anything. Booking is not applying."
      footer={
        <Button
          intent="primary"
          size="lg"
          className="rounded-full"
          block
          disabled={!picked}
          onClick={() => {
            if (!picked) return
            bookViewing(me.id, property.id, picked)
            toast.success('Viewing booked', { description: `${fmtWhen(picked)}. It is on your Home screen.` })
            onClose()
          }}
        >
          {picked ? `Book ${fmtWhen(picked)}` : 'Choose a time'}
        </Button>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <div role="radiogroup" aria-label="Viewing times" className="grid gap-2">
          {times.map((t) => {
            const on = t === picked
            return (
              <button key={t} type="button" role="radio" aria-checked={on} onClick={() => setPicked(t)} className={cn('pressable flex min-h-14 items-center gap-3 rounded-lg px-4 text-left transition-shadow', on ? 'bg-accent-soft shadow-[inset_0_0_0_2px_var(--accent)]' : 'bg-surface shadow-card')}>
                <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded-full', on ? 'bg-accent' : 'shadow-[inset_0_0_0_1.5px_var(--line-strong)]')}>
                  {on && <span className="size-2 rounded-full bg-accent-ink" />}
                </span>
                <span className="text-[15px] font-medium text-ink">{fmtWhen(t)}</span>
              </button>
            )
          })}
        </div>
        {stage && (
          <>
            <SharedList who={owner} may={[`Your name — ${me.fullName}`, `Your contact details — ${me.email}, ${me.phone}`]} never={stage.mustNotCollect.map((m) => (m === 'Anything else' ? 'Anything else. Not your Passport, not your history, not an application form.' : m))} />
            <p className="text-xs leading-relaxed text-ink-3">A landlord cannot make you fill in an application just to look at a home. If you view it and decide not to apply, your details are not kept.</p>
          </>
        )}
      </div>
    </Sheet>
  )
}

function ApplySheet({ open, property, owner, onClose }: { open: boolean; property: Property; owner: string; onClose: () => void }) {
  const me = useMe()
  const pack = usePack()
  const day = useToday()
  const profile = useMyProfile()
  const listing = property.listing
  const earliest = listing && listing.availableFrom > day ? listing.availableFrom : day
  const [moveIn, setMoveIn] = useState(earliest)
  const [occupants, setOccupants] = useState(String(profile.householdSize))
  const [message, setMessage] = useState('')
  const [verdict, setVerdict] = useState<Verdict>({ ok: true })
  const [nudged, setNudged] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setMoveIn(profile.moveInFrom && profile.moveInFrom > earliest ? profile.moveInFrom : earliest)
      setOccupants(String(profile.householdSize))
      setMessage('')
      setVerdict({ ok: true })
      setNudged(false)
    }
  }
  if (!listing) return null
  const rent = listing.advertisedWeeklyRent
  const people = Number(occupants)
  const errors = {
    moveIn: !moveIn ? 'Choose the day you would like to move in.' : moveIn < earliest ? `The home is free from ${fmtDate(earliest)}.` : undefined,
    occupants: !(people >= 1 && people <= 12) ? 'Enter how many people will live there, including you.' : undefined,
  }
  const passport = passportOf(profile, day)
  const stage = pack.privacyStages[1]

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      eyebrow={property.address.line1}
      title="Apply with your Passport"
      description={`You are applying at ${money(rent)} a week — the advertised rent. There is no box to offer more, here or anywhere in Pool.`}
      footer={
        <Button
          intent="primary"
          size="lg"
          className="rounded-full"
          block
          onClick={() => {
            setNudged(true)
            if (errors.moveIn || errors.occupants) return
            const result = applyForHome(me.id, property.id, { moveIn, occupants: people, message }, pack)
            setVerdict(result)
            if (!result.ok) return
            toast.success('Application sent', { description: `${owner} has it. No checks are run unless you become the preferred applicant.` })
            onClose()
          }}
        >
          Apply at {money(rent)} a week
        </Button>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Why rule="listing.bidding_banned" label="No rent bidding" />
          <Why rule="listing.fixed_price_required" label="One stated rent" />
        </div>
        <Refusal verdict={verdict} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Move in from" error={nudged ? errors.moveIn : undefined}>
            {(p) => <Input {...p} type="date" min={earliest} value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />}
          </Field>
          <Field label="People living there" hint="Including you." error={nudged ? errors.occupants : undefined}>
            {(p) => <Input {...p} inputMode="numeric" value={occupants} onChange={(e) => setOccupants(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />}
          </Field>
        </div>
        <Field label={`A note to ${owner}`} optional hint="What you would want a landlord to know. Skip anything you would rather not say — you are never required to explain your job, family or background.">
          {(p) => <Textarea {...p} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="For example: I work nearby and I am looking for somewhere to stay for a few years." />}
        </Field>

        <div className="flex items-start gap-3 rounded-lg bg-surface p-4 shadow-card">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
            <IdentificationCard weight="fill" className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 text-[14px] leading-relaxed">
            <p className="font-semibold text-ink">
              Your Rent Passport {profile.visibleToLandlords ? 'goes with it' : 'stays hidden'}: {passport.score === null ? BAND_LABEL.building : `${passport.score}, ${BAND_LABEL[passport.band]}`}
            </p>
            <p className="text-ink-2">
              {!profile.visibleToLandlords
                ? `You have switched it off, so ${owner} sees this application and nothing from your record.`
                : passport.score === null
                  ? `You have no verified history yet, so there is no score — ${owner} is shown “Building”, never a low number.`
                  : `${owner} sees the verified facts behind the number, beside it. Applications are never ranked or declined by it.`}
            </p>
            <Link to="/pool/passport" className="mt-1 inline-flex min-h-11 items-center rounded-sm font-medium text-accent-text underline decoration-accent-line underline-offset-4">
              See what is in it
            </Link>
          </div>
        </div>

        {stage && <SharedList who={owner} may={stage.mayCollect} never={stage.mustNotCollect} />}
        <p className="text-xs leading-relaxed text-ink-3">
          Reference, credit and criminal record checks stay locked until {owner} marks you as the preferred applicant, and each needs your consent. If you miss out, your details are deleted — see how long they are kept.
        </p>
        <Why rule="privacy.unsuccessful_applicant_retention" label="How long details are kept" className="justify-self-start" />
      </div>
    </Sheet>
  )
}

function useUpcomingViewings(property: Property | undefined): string[] {
  const day = useToday()
  return useMemo(() => (property?.listing?.viewingTimes ?? []).filter((t) => dateOf(t) >= day).sort(), [property, day])
}

/* ─────────────────────────────── the decision ───────────────────────────── */

function Decision({ property, owner, application, isMine, onApply, onBook }: { property: Property; owner: string; application: Application | undefined; isMine: boolean; onApply: () => void; onBook: (time: string | null) => void }) {
  const day = useToday()
  const pack = usePack()
  const listing = property.listing!
  const live = listing.status === 'live'
  const times = useUpcomingViewings(property)
  const offer = checkRentOffer(pack, listing.advertisedWeeklyRent, listing.advertisedWeeklyRent)
  const applied = application && !isViewingOnly(application)

  return (
    <section aria-label="Rent and next steps" className="rounded-xl bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <p className="flex items-baseline gap-2">
          <Money value={listing.advertisedWeeklyRent} className="display text-[44px] leading-none text-ink" />
          <span className="text-[15px] text-ink-2">a week</span>
        </p>
        <Why rule="listing.bidding_banned" label="Fixed — no bidding" />
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
        One price for everyone. {listing.availableFrom <= day ? 'Available now.' : `Available from ${fmtDate(listing.availableFrom)}.`}
      </p>

      <div className="mt-5 grid gap-2.5">
        {isMine ? (
          <div className="rounded-lg bg-accent-soft p-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <HouseLine weight="fill" className="size-5 text-accent-text" aria-hidden />
              This is your home
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-2">You already live here, so there is nothing to apply for. Your rent and repairs are on Home.</p>
            <Link to="/pool" className={cn(buttonClass({ intent: 'primary' }), 'mt-3 rounded-full')}>
              Go to Home
            </Link>
          </div>
        ) : !live ? (
          <Refusal verdict={{ ok: false, reason: 'This home is not taking applications.', fix: listing.status === 'let' ? 'It has been let. Homes like it are in search.' : 'The listing has been paused. If it reopens, it will show in search again.' }} />
        ) : (
          <>
            {application && (
              <div className="rounded-lg bg-accent-soft p-4">
                <p className="text-[15px] font-semibold text-ink">{stageLine(application, owner)}.</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                  {application.viewingAt ? `Viewing ${fmtWhen(application.viewingAt)}. ` : ''}
                  {applied ? `Sent ${fmtDate(dateOf(application.submittedAt))}.` : 'Only your name and contact details have been shared.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4">
                  <Link to="/pool" className="inline-flex min-h-11 items-center gap-1 rounded-sm text-[14px] font-medium text-accent-text underline decoration-accent-line underline-offset-4">
                    See it on Home <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                  {application.viewingAt && dateOf(application.viewingAt) >= day && (
                    <button
                      type="button"
                      onClick={() => {
                        cancelViewing(application.id)
                        toast('Viewing cancelled', { description: `${owner} has been told.` })
                      }}
                      className="min-h-11 rounded-sm text-[14px] font-medium text-ink-2 underline decoration-line-strong underline-offset-4"
                    >
                      Cancel the viewing
                    </button>
                  )}
                </div>
              </div>
            )}
            <Refusal verdict={offer} />
            {!applied && (
              <Button intent="primary" size="lg" className="h-14 rounded-full text-[16px]" block onClick={onApply} icon={<IdentificationCard weight="fill" className="size-5" />}>
                Apply with your Passport
              </Button>
            )}
            {!application?.viewingAt && times.length > 0 && (
              <Button intent={applied ? 'primary' : 'soft'} size="lg" className="rounded-full" block onClick={() => onBook(null)} icon={<CalendarCheck weight="fill" className="size-5" />}>
                Book a viewing
              </Button>
            )}
            {!application && <p className="text-center text-xs leading-relaxed text-ink-3">A viewing shares your name and contact details, nothing else. Applying shares only what the application stage allows.</p>}
          </>
        )}
      </div>
    </section>
  )
}

/* ─────────────────────────────────── view ───────────────────────────────── */

export function Listing() {
  const { id } = route.useParams()
  const property = useStore((s) => s.db.properties.find((p) => p.id === id))
  const ownerOf = useOwnerFirstName()
  const myHome = useMyHome()
  const applications = useMyApplications()
  const times = useUpcomingViewings(property)
  const [applying, setApplying] = useState(false)
  const [booking, setBooking] = useState<{ open: boolean; time: string | null }>({ open: false, time: null })

  if (!property?.listing) {
    // A home with no listing: either it is the renter's own, or the link is stale.
    const own = property !== undefined && myHome?.property.id === property.id
    return (
      <Page>
        <div className="mx-auto max-w-xl rounded-xl bg-surface px-6 py-12 text-center shadow-card">
          <span className={cn('mx-auto mb-4 grid size-14 place-items-center rounded-full', own ? 'bg-accent-soft text-accent-text' : 'bg-sunken text-ink-3')}>
            <HouseLine weight="fill" className="size-7" aria-hidden />
          </span>
          <h1 className="display text-[28px] text-ink">{own ? 'This is your home' : 'That home is not listed'}</h1>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-2">
            {own ? `You live at ${property.address.line1}, so it is not up for rent and there is nothing to apply for. Your rent, repairs and bond are on Home.` : 'The link may be old, or the home may have been let and its listing taken down. Everything that is open right now is in search.'}
          </p>
          {own ? (
            <Link to="/pool" className={cn(buttonClass({ intent: 'primary', size: 'lg' }), 'mt-6 rounded-full')}>
              Go to Home
            </Link>
          ) : (
            <Link to="/pool/search" className={cn(buttonClass({ intent: 'primary', size: 'lg' }), 'mt-6 rounded-full')}>
              <MagnifyingGlass weight="bold" className="size-4" aria-hidden />
              Search homes
            </Link>
          )}
        </div>
      </Page>
    )
  }

  const { listing, address } = property
  const owner = ownerOf(property.orgId)
  const application = applications.find((a) => a.propertyId === property.id && a.stage !== 'withdrawn' && a.stage !== 'declined')
  const closed = applications.find((a) => a.propertyId === property.id && (a.stage === 'withdrawn' || a.stage === 'declined'))
  const isMine = myHome?.property.id === property.id
  const canAct = listing.status === 'live' && !isMine
  const facts: { icon: Icon; value: string; label: string }[] = [
    { icon: Bed, value: String(property.beds), label: property.beds === 1 ? 'bedroom' : 'bedrooms' },
    { icon: Bathtub, value: String(property.baths), label: property.baths === 1 ? 'bathroom' : 'bathrooms' },
    { icon: Car, value: String(property.parking), label: property.parking === 1 ? 'car park' : 'car parks' },
    { icon: Ruler, value: `${property.floorArea} m²`, label: 'floor area' },
  ]

  return (
    <Page>
      <Link to="/pool/search" search={{ sel: property.id }} className="mb-4 inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[14px] font-medium text-ink-2 hoverable:hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        All homes
      </Link>

      <div className="relative">
        <PropertyArt kind={property.kind} art={property.art} label="Illustration" className="aspect-[16/10] w-full rounded-xl sm:aspect-[21/9] short:aspect-[32/9]" />
        <SaveHeart propertyId={property.id} label={address.line1} size="lg" className="absolute top-3 right-3" />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
          <header>
            <p className="eyebrow">
              {KIND[property.kind]} · {address.suburb}, {address.city}
            </p>
            <h1 className="display mt-2 text-[30px] text-ink sm:text-[40px]">{listing.headline}</h1>
            <p className="mt-2 text-[15px] text-ink-2">
              {address.line1}, {address.suburb} {address.postcode}
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {facts.map((f) => (
                <li key={f.label} className="rounded-lg bg-surface p-3.5 shadow-card">
                  <f.icon weight="fill" className="size-5 text-accent-text" aria-hidden />
                  <p className="num mt-2 text-[19px] leading-none font-semibold text-ink">{f.value}</p>
                  <p className="mt-1 text-xs text-ink-3">{f.label}</p>
                </li>
              ))}
            </ul>
          </header>

          {/* On a phone the price and the two actions come before the long read. */}
          <div className="grid gap-4 lg:hidden">
            <Decision property={property} owner={owner} application={application} isMine={isMine} onApply={() => setApplying(true)} onBook={(time) => setBooking({ open: true, time })} />
          </div>

          <section aria-label="About this home">
            <p className="max-w-[65ch] text-[16px] leading-relaxed text-ink">{listing.description}</p>
            {closed && !application && <p className="mt-3 text-[13px] text-ink-3">{closed.stage === 'withdrawn' ? 'You withdrew an earlier application for this home. You are free to apply again.' : 'An earlier application of yours for this home was not successful.'}</p>}
            <ul className="mt-5 flex flex-wrap gap-2">
              {listing.features.map((f) => (
                <li key={f} className="inline-flex h-9 items-center rounded-full bg-surface px-3.5 text-[13px] font-medium text-ink shadow-card">
                  {f}
                </li>
              ))}
              {listing.petsConsidered && (
                <li className="inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-[13px] font-medium text-accent-text">
                  <PawPrint weight="fill" className="size-3.5" aria-hidden />
                  Pets considered
                </li>
              )}
            </ul>
            <p className="mt-3 text-xs text-ink-3">Built {property.yearBuilt}. There are no photographs in this demo: the picture is an illustration drawn from the home’s record.</p>
          </section>

          <section aria-labelledby="viewings">
            <Heading id="viewings">See it in person</Heading>
            {times.length === 0 ? (
              <p className="rounded-xl bg-surface px-4 py-4 text-[14px] leading-relaxed text-ink-2 shadow-card sm:px-5">No open viewings are scheduled right now. If you apply, {owner} can arrange a time with you.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {times.map((t) => {
                  const mine = application?.viewingAt === t
                  return (
                    <li key={t} className={cn('flex items-center gap-3 rounded-xl p-4', mine ? 'bg-accent-soft' : 'bg-surface shadow-card')}>
                      <CalendarCheck weight="fill" className={cn('size-6 shrink-0', mine ? 'text-accent-text' : 'text-ink-3')} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-ink">{fmtDate(dateOf(t))}</p>
                        <p className="text-[13px] text-ink-2">{mine ? `You are booked · ${fmtTime(t)}` : fmtTime(t)}</p>
                      </div>
                      {canAct && !application?.viewingAt && (
                        <Button intent="soft" className="rounded-full" onClick={() => setBooking({ open: true, time: t })}>
                          Book
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <WarmAndDry property={property} owner={owner} />
        </div>

        <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:sticky lg:top-24 short:lg:static">
          <div className="hidden lg:block">
            <Decision property={property} owner={owner} application={application} isMine={isMine} onApply={() => setApplying(true)} onBook={(time) => setBooking({ open: true, time })} />
          </div>
          <MoveInCost rent={listing.advertisedWeeklyRent} pets={listing.petsConsidered} owner={owner} />
          <p className="px-1 text-xs leading-relaxed text-ink-3">
            Listed {listing.publishedAt ? fmtDate(dateOf(listing.publishedAt)) : 'recently'} by {owner}, who manages it through Loop.
          </p>
        </aside>
      </div>

      <ApplySheet open={applying} property={property} owner={owner} onClose={() => setApplying(false)} />
      <ViewingSheet open={booking.open} property={property} owner={owner} initial={booking.time} onClose={() => setBooking((b) => ({ ...b, open: false }))} />
    </Page>
  )
}
