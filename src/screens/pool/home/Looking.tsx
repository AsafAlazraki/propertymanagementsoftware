/**
 * Home, for someone who is looking: where each application stands and what it
 * has shared, the homes they have saved, and the way into search. It also
 * covers the renter whose landlord is not on Loop — they can link that tenancy
 * themselves, labelled as their own word rather than a verified record.
 */
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, Bed, HeartStraight, HouseLine, IdentificationCard, LinkSimple, MagnifyingGlass, PaperPlaneTilt } from '@phosphor-icons/react'
import type { Application, Property } from '@/domain/types'
import { BAND_LABEL, passportOf } from '@/domain/passport'
import { fmtDate } from '@/domain/rules/calendar'
import { plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { linkExternalTenancy, unlinkExternalTenancy } from '@/data/pool-mutations'
import { Button, buttonClass } from '@/ui/Button'
import { Checkbox, Field, Input } from '@/ui/controls'
import { Money } from '@/ui/display'
import { PropertyArt } from '@/ui/PropertyArt'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { Heading, SaveHeart, useMyProfile, type ProfileRow } from '../shared'
import { ApplicationCard } from './Applications'

/* ───────────────────────────────── saved homes ──────────────────────────── */

export function SavedHomes({ profile }: { profile: ProfileRow }) {
  const properties = useStore((s) => s.db.properties)
  const saved = useMemo(() => profile.savedPropertyIds.flatMap((id) => properties.find((p) => p.id === id) ?? []), [profile.savedPropertyIds, properties])
  return (
    <section aria-labelledby="saved-homes" className="min-w-0">
      <Heading id="saved-homes">Saved homes</Heading>
      {saved.length === 0 ? (
        <div className="rounded-xl bg-surface px-5 py-8 text-center shadow-card">
          <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-accent-soft text-accent-text">
            <HeartStraight weight="fill" className="size-5" aria-hidden />
          </span>
          <p className="text-[15px] font-semibold text-ink">No saved homes yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-ink-2">Tap the heart on any home in search and it waits for you here, so you can compare before you apply.</p>
          <Link to="/pool/search" className={cn(buttonClass({ intent: 'soft' }), 'mt-4 rounded-full')}>
            Search homes
          </Link>
        </div>
      ) : (
        <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
          {saved.map((p) => (
            <SavedCard key={p.id} property={p} />
          ))}
        </ul>
      )}
    </section>
  )
}

function SavedCard({ property: p }: { property: Property }) {
  const live = p.listing?.status === 'live'
  return (
    <li className="relative w-[15.5rem] shrink-0 snap-start sm:w-auto">
      <Link to="/pool/listing/$id" params={{ id: p.id }} className="pressable group block overflow-hidden rounded-xl bg-surface shadow-card transition-shadow hoverable:hover:shadow-pop">
        <PropertyArt kind={p.kind} art={p.art} label="Illustration" className={cn('aspect-[16/10] w-full', !live && 'opacity-60 grayscale')} />
        <div className="p-3.5">
          <p className="flex items-baseline gap-1">
            {p.listing ? <Money value={p.listing.advertisedWeeklyRent} className="display text-[20px] text-ink" /> : null}
            <span className="text-xs text-ink-3">{live ? 'a week, fixed' : 'no longer listed'}</span>
          </p>
          <p className="mt-0.5 truncate text-[14px] font-medium text-ink">{p.address.line1}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-ink-3">
            {p.address.suburb} · <Bed className="size-3.5" aria-hidden /> {p.beds}
            {live && p.listing ? ` · from ${fmtDate(p.listing.availableFrom, { weekday: false })}` : ''}
          </p>
        </div>
      </Link>
      <SaveHeart propertyId={p.id} label={p.address.line1} className="absolute top-2 right-2" />
    </li>
  )
}

/* ─────────────────────────── a landlord not on Loop ─────────────────────── */

function LinkTenancySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const day = useToday()
  const [address, setAddress] = useState('')
  const [rent, setRent] = useState('')
  const [landlordName, setLandlordName] = useState('')
  const [since, setSince] = useState('')
  const [invite, setInvite] = useState(true)
  const [tried, setTried] = useState(false)

  const errors = {
    address: address.trim().length < 6 ? 'Enter the street address, for example 12 Example Street, Stoke.' : undefined,
    rent: !(Number(rent) > 0) ? 'Enter the weekly rent as a number.' : undefined,
    landlordName: landlordName.trim().length < 2 ? 'Enter your landlord’s or property manager’s name.' : undefined,
    since: !since ? 'Choose the day your tenancy started.' : since > day ? 'A start date in the future cannot be linked yet.' : undefined,
  }
  const ok = !errors.address && !errors.rent && !errors.landlordName && !errors.since

  const submit = () => {
    setTried(true)
    if (!ok) return
    linkExternalTenancy(me.id, { address, weeklyRent: Number(rent), landlordName, since, invite })
    toast.success('Tenancy linked', { description: 'It shows on your Home screen as added by you.' })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      eyebrow="Renting somewhere already?"
      title="Link a tenancy with a landlord who is not on Loop"
      description="Pool keeps the basics in one place for you. Because your landlord is not connected, it stays your own record: nothing here is verified, and it does not build your Passport until they confirm it."
      footer={
        <Button intent="primary" size="lg" className="rounded-full" block onClick={submit}>
          Link this tenancy
        </Button>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <Field label="Address of the home" error={tried ? errors.address : undefined}>
          {(p) => <Input {...p} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="12 Example Street, Stoke" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weekly rent" error={tried ? errors.rent : undefined}>
            {(p) => <Input {...p} inputMode="numeric" prefix="$" value={rent} onChange={(e) => setRent(e.target.value.replace(/[^0-9]/g, ''))} />}
          </Field>
          <Field label="Tenancy started" error={tried ? errors.since : undefined}>
            {(p) => <Input {...p} type="date" max={day} value={since} onChange={(e) => setSince(e.target.value)} />}
          </Field>
        </div>
        <Field label="Landlord or property manager" error={tried ? errors.landlordName : undefined}>
          {(p) => <Input {...p} value={landlordName} onChange={(e) => setLandlordName(e.target.value)} autoComplete="off" />}
        </Field>
        <div className="rounded-lg bg-sunken p-3.5">
          <Checkbox checked={invite} onCheckedChange={setInvite}>
            I would like them invited to Loop, so rent and repairs can connect
          </Checkbox>
          <p className="mt-1 pl-7 text-xs leading-relaxed text-ink-3">In this demo no invitation is sent; your choice is saved on the record.</p>
        </div>
      </div>
    </Sheet>
  )
}

function ExternalHome({ profile }: { profile: ProfileRow }) {
  const me = useMe()
  const ext = profile.externalTenancy
  if (!ext) return null
  return (
    <section aria-label="The tenancy you linked" className="rounded-xl bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
          <HouseLine weight="fill" className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Your home · added by you, not verified</p>
          <h2 className="display mt-1 text-[22px] text-ink">{ext.address}</h2>
          <p className="mt-1 text-[14px] text-ink-2">
            <Money value={ext.weeklyRent} className="font-semibold text-ink" /> a week · with {ext.landlordName} · since {fmtDate(ext.since, { weekday: false, year: 'always' })}
          </p>
        </div>
      </div>
      <p className="mt-4 rounded-lg bg-sunken p-3.5 text-[13px] leading-relaxed text-ink-2">
        {ext.landlordName} is not on Loop, so Pool cannot see your rent landing, send them a repair, or check your bond. {ext.invitedLandlord ? 'You asked for them to be invited; if they join, this becomes a connected tenancy and starts building your Passport.' : 'If they join Loop, this becomes a connected tenancy.'}
      </p>
      <button
        type="button"
        onClick={() => {
          unlinkExternalTenancy(me.id)
          toast('Tenancy unlinked')
        }}
        className="mt-3 min-h-11 rounded-sm text-[13px] font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hoverable:hover:text-ink"
      >
        Remove this link
      </button>
    </section>
  )
}

/* ─────────────────────────────────── view ───────────────────────────────── */

export function Looking({ applications }: { applications: Application[] }) {
  const day = useToday()
  const profile = useMyProfile()
  const live = useStore((s) => s.db.properties.filter((p) => p.listing?.status === 'live').length)
  const [linking, setLinking] = useState(false)
  const passport = passportOf(profile, day)
  const open = applications.filter((a) => a.stage !== 'declined' && a.stage !== 'withdrawn')
  const closed = applications.filter((a) => a.stage === 'declined' || a.stage === 'withdrawn')

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
        <ExternalHome profile={profile} />

        <section aria-labelledby="applications">
          <Heading id="applications" count={open.length}>
            Your applications
          </Heading>
          {applications.length === 0 ? (
            <div className="rounded-xl bg-surface px-5 py-9 text-center shadow-card">
              <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-accent-soft text-accent-text">
                <PaperPlaneTilt weight="fill" className="size-5" aria-hidden />
              </span>
              <p className="text-[15px] font-semibold text-ink">No applications yet</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-ink-2">When you apply, each one shows here with its stage and exactly what the landlord can see about you at that stage.</p>
              <Link to="/pool/search" className={cn(buttonClass({ intent: 'primary' }), 'mt-4 rounded-full')}>
                Find a home
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {open.map((a) => (
                <ApplicationCard key={a.id} application={a} />
              ))}
              {closed.map((a) => (
                <ApplicationCard key={a.id} application={a} />
              ))}
            </div>
          )}
        </section>

        <SavedHomes profile={profile} />
      </div>

      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:sticky lg:top-24 lg:grid-cols-1 short:lg:static">
        <section aria-label="Search homes" className="relative overflow-hidden rounded-xl bg-accent p-5 text-accent-ink sm:p-6">
          <MagnifyingGlass weight="bold" aria-hidden className="absolute -right-5 -bottom-6 size-32 opacity-15" />
          <p className="relative font-mono text-[11px] tracking-[0.08em] uppercase opacity-85">Nelson and Tasman</p>
          <p className="display relative mt-2 text-[28px]">
            {live} {live === 1 ? 'home is' : 'homes are'} open right now.
          </p>
          <p className="relative mt-2 text-[14px] leading-relaxed opacity-90">Each one has a single weekly rent. There is nowhere to offer more, so you are never outbid on price.</p>
          <Link to="/pool/search" className="pressable relative mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-surface px-5 text-[15px] font-semibold text-ink shadow-pop">
            Search homes
            <ArrowRight weight="bold" className="size-4" aria-hidden />
          </Link>
        </section>

        <div className="grid min-w-0 content-start gap-4">
          <Link to="/pool/passport" className="pressable group flex items-center gap-3.5 rounded-xl bg-surface p-4 shadow-card transition-shadow hoverable:hover:shadow-pop sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
              <IdentificationCard weight="fill" className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">
                Rent Passport: {passport.score === null ? BAND_LABEL.building : `${passport.score} · ${BAND_LABEL[passport.band]}`}
              </span>
              <span className="block text-[13px] leading-snug text-ink-2">
                {passport.score === null ? 'No score yet — and nothing yet is not bad. See what will build it.' : `${plural(passport.verifiedTenancies, 'verified tenancy', 'verified tenancies')} behind it. It goes with every application.`}
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>

          {!profile.externalTenancy && (
            <button type="button" onClick={() => setLinking(true)} className="pressable flex items-center gap-3.5 rounded-xl border border-dashed border-line-strong p-4 text-left transition-colors hoverable:hover:bg-surface sm:p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
                <LinkSimple weight="bold" className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">Already renting?</span>
                <span className="block text-[13px] leading-snug text-ink-2">Link a tenancy with a landlord who is not on Loop.</span>
              </span>
            </button>
          )}
        </div>
      </aside>

      <LinkTenancySheet open={linking} onClose={() => setLinking(false)} />
    </div>
  )
}
