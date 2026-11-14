/**
 * Pool — the Rent Passport.
 *
 * What this screen does that no other does: it shows a renter their record as
 * something they own and carry, not a score someone keeps about them. So it is
 * built as the object — a cover, a data page, stamps for each home — and every
 * number sits beside the facts that made it. A renter with no history has no
 * score at all, and is told so plainly: nothing yet is not bad.
 */
import { useMemo, useState, type Ref } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { Check, Export, Flag, Plus, SealCheck, Trash, UserCircleCheck, X } from '@phosphor-icons/react'
import type { RenterProfile } from '@/domain/types'
import { BAND_LABEL, PASSPORT_WEIGHTS, passportOf, type Passport as PassportFacts } from '@/domain/passport'
import { dateOf, diffDays, fmtDate } from '@/domain/rules/calendar'
import { plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { addPastTenancy, flagPassportFact, removePastTenancy, setPassportVisible } from '@/data/pool-mutations'
import { Page } from '@/shell/common'
import { PoolMark } from '@/ui/Brand'
import { Button } from '@/ui/Button'
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/ui/controls'
import { Avatar, Bar, Num, Ring } from '@/ui/display'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { Heading, useMyHome, useMyProfile } from './shared'

type History = RenterProfile['history'][number]

const VERIFIED_BY: Record<History['verifiedBy'], { stamp: string; line: string }> = {
  loop_ledger: { stamp: 'Verified · rent ledger', line: 'Verified from the rent ledger: each payment, as it cleared.' },
  landlord_reference: { stamp: 'Confirmed · landlord', line: 'Confirmed by the landlord you rented from.' },
  self_reported: { stamp: 'Awaiting confirmation', line: 'Added by you. It does not count until that landlord confirms it.' },
}

function span(from: string, to: string): string {
  const months = Math.max(1, Math.round(diffDays(from, to) / 30.44))
  const y = Math.floor(months / 12)
  const m = months % 12
  return [y ? plural(y, 'year') : '', m ? plural(m, 'month') : ''].filter(Boolean).join(', ')
}

const monthYear = (iso: string) => fmtDate(iso, { weekday: false, year: 'always' }).replace(/^\d+ /, '')

/* ───────────────────────────────── the booklet ──────────────────────────── */

function Booklet({ passport }: { passport: PassportFacts }) {
  const me = useMe()
  const [given, ...rest] = me.fullName.toUpperCase().split(' ')
  const surname = rest.join('<') || given
  const mrz1 = `P<NZL${surname}<<${given}`.padEnd(34, '<').slice(0, 34)
  const mrz2 = `${me.id.replace(/[^a-z0-9]/gi, '').toUpperCase()}<<${passport.score === null ? 'BUILDING' : String(passport.score).padStart(3, '0')}<<POOL`.padEnd(34, '<').slice(0, 34)
  return (
    <article aria-label={`Rent Passport of ${me.fullName}`} className="overflow-hidden rounded-xl shadow-pop">
      {/* the cover */}
      <div className="relative overflow-hidden bg-accent px-6 pt-6 pb-7 text-accent-ink">
        <svg aria-hidden viewBox="0 0 200 200" className="absolute -right-10 -bottom-14 size-56 opacity-20">
          {[30, 52, 74, 96].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="6" />
          ))}
        </svg>
        <div className="relative flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase">Rent Passport</p>
          <span aria-hidden className="rounded-[8px] ring-2 ring-accent-ink/40">
            <PoolMark size={26} />
          </span>
        </div>
        <p className="display relative mt-9 text-[30px] leading-[1.02]">{me.fullName}</p>
        <p className="relative mt-2 font-mono text-[10px] tracking-[0.18em] uppercase opacity-85">Pool · Aotearoa New Zealand</p>
      </div>

      {/* the data page */}
      <div className="bg-surface p-5">
        <div className="flex items-center gap-4">
          {passport.score === null ? (
            <div role="img" aria-label="No score yet. Your Passport is building." className="grid size-[124px] shrink-0 place-items-center rounded-full border-[3px] border-dashed border-line-strong text-center">
              <div>
                <p className="display text-[19px] text-ink">{BAND_LABEL.building}</p>
                <p className="text-[11px] text-ink-3">no score yet</p>
              </div>
            </div>
          ) : (
            <Ring value={passport.score} size={124} stroke={11} tone="accent" label={`Rent Passport score ${passport.score} out of 100: ${BAND_LABEL[passport.band]}`}>
              <div>
                <Num value={passport.score} className="display text-[40px] leading-none text-ink" />
                <p className="mt-0.5 text-[11px] font-medium text-accent-text">{BAND_LABEL[passport.band]}</p>
              </div>
            </Ring>
          )}
          <dl className="grid min-w-0 flex-1 gap-2.5 text-[13px]">
            <div>
              <dt className="eyebrow">Holder</dt>
              <dd className="flex items-center gap-2 font-semibold text-ink">
                <Avatar name={me.fullName} hue={me.hue} size={22} />
                <span className="truncate">{me.fullName}</span>
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Identity</dt>
              <dd className={cn('flex items-center gap-1 font-medium', me.identityVerified ? 'text-ok-text' : 'text-ink-2')}>
                {me.identityVerified && <SealCheck weight="fill" className="size-4" aria-hidden />}
                {me.identityVerified ? 'Verified' : 'Not verified yet'}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Verified renting</dt>
              <dd className="font-medium text-ink">{passport.verifiedMonths > 0 ? `${passport.verifiedMonths >= 12 ? `${(passport.verifiedMonths / 12).toFixed(1)} years` : plural(passport.verifiedMonths, 'month')} · ${plural(passport.verifiedTenancies, 'home')}` : 'None yet'}</dd>
            </div>
          </dl>
        </div>
        <p aria-hidden className="mt-5 overflow-hidden border-t border-dashed border-line-strong pt-3 font-mono text-[10.5px] leading-[1.5] tracking-[0.12em] whitespace-nowrap text-ink-3">
          {mrz1}
          <br />
          {mrz2}
        </p>
      </div>
    </article>
  )
}

/* ─────────────────────────────── the three pillars ──────────────────────── */

interface PillarView {
  key: keyof typeof PASSPORT_WEIGHTS
  name: string
  value: number | null
  detail: string
  facts: string[]
}

function Pillars({ pillars, building }: { pillars: PillarView[]; building: boolean }) {
  return (
    <section aria-labelledby="pillars">
      <Heading id="pillars">{building ? 'What will build it' : 'How the number is made'}</Heading>
      <p className="-mt-1 mb-4 max-w-[62ch] text-[14px] leading-relaxed text-ink-2">{building ? 'Three things, weighted as shown, and nothing else. Each starts counting the first time there is a verified fact behind it.' : 'Three things, weighted as shown, and nothing else. Each is worked out only from facts that were verified — the ones listed under it.'}</p>
      {/* the weights, drawn to scale */}
      <div aria-hidden className="mb-3 flex gap-1 overflow-hidden rounded-full">
        {pillars.map((p, i) => (
          <span key={p.key} className={cn('h-2.5', i === 0 ? 'bg-accent' : i === 1 ? 'bg-accent/65' : 'bg-accent/35')} style={{ width: `${PASSPORT_WEIGHTS[p.key]}%` }} />
        ))}
      </div>
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3 lg:grid-cols-[minmax(0,1fr)] xl:grid-cols-3">
        {pillars.map((p) => (
          <li key={p.key} className="flex min-w-0 flex-col rounded-xl bg-surface p-4 shadow-card sm:p-5">
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-semibold text-ink">{p.name}</span>
              <span className="display num text-[22px] text-accent-text">{PASSPORT_WEIGHTS[p.key]}%</span>
            </p>
            {p.value === null ? (
              <p className="mt-2 inline-flex h-6 items-center self-start rounded-full bg-sunken px-2.5 text-xs font-medium text-ink-2">Building</p>
            ) : (
              <div className="mt-2.5 flex items-center gap-2.5">
                <Bar value={p.value} label={`${p.name}: ${p.value} out of 100`} className="h-2" />
                <span className="num text-[13px] font-semibold text-ink">{p.value}</span>
              </div>
            )}
            <p className="mt-2.5 text-[14px] leading-relaxed text-ink">{p.detail}</p>
            {p.facts.length > 0 && (
              <ul className="mt-3 grid gap-1.5 border-t border-line pt-3 text-[13px] leading-relaxed text-ink-2">
                {p.facts.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check weight="bold" className="mt-0.5 size-3.5 shrink-0 text-ok-text" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ─────────────────────────────────── stamps ─────────────────────────────── */

function Stamp({ h, today, tilt, onFlag, onRemove, ref }: { h: History; today: string; tilt: number; onFlag: (fact: string) => void; onRemove: () => void; ref?: Ref<HTMLLIElement> }) {
  const counted = h.verifiedBy !== 'self_reported'
  const who = VERIFIED_BY[h.verifiedBy]
  return (
    <motion.li ref={ref} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', duration: 0.4, bounce: 0 }} className={cn('relative min-w-0 rounded-xl border-2 border-dashed p-4 pt-6 sm:p-5 sm:pt-7', counted ? 'border-accent-line bg-surface' : 'border-line-strong')}>
      <span
        className={cn('absolute -top-3 left-4 inline-flex h-6 items-center gap-1 rounded-md border-2 bg-bg px-2 font-mono text-[10px] font-semibold tracking-[0.12em] uppercase', counted ? 'border-accent text-accent-text' : 'border-line-strong text-ink-3')}
        style={{ transform: `rotate(${counted ? tilt : 0}deg)` }}
      >
        {counted && <SealCheck weight="fill" className="size-3.5" aria-hidden />}
        {who.stamp}
      </span>
      <p className="display text-[19px] text-ink">{h.address}</p>
      <p className="mt-1 text-[13px] text-ink-2">
        {monthYear(h.from)} – {h.to ? monthYear(h.to) : 'now'} · {span(h.from, h.to ?? today)}
      </p>
      {counted ? (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-ink-3">Rent on time</dt>
            <dd className="display num text-[26px] text-ink">{h.onTimePct}%</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-3">Care of the home</dt>
            <dd className="display num text-[26px] text-ink">
              {h.careScore.toFixed(1)}
              <span className="font-sans text-[13px] font-normal tracking-normal text-ink-3"> of 5</span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-4 rounded-lg bg-sunken p-3 text-[13px] leading-relaxed text-ink-2">Not counted yet, and no figures are shown: Pool does not take anyone’s word for a rent record, including yours.</p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-3">
        <p className="min-w-0 flex-1 basis-48 text-xs leading-relaxed text-ink-3">{who.line}</p>
        {counted ? (
          <button type="button" onClick={() => onFlag(`${h.address}: ${h.onTimePct}% of rent on time, care ${h.careScore.toFixed(1)} of 5, ${monthYear(h.from)} to ${h.to ? monthYear(h.to) : 'now'}`)} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[13px] font-medium text-ink-2 hoverable:hover:text-ink">
            <Flag className="size-4" aria-hidden />
            This is wrong
          </button>
        ) : (
          <button type="button" onClick={onRemove} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[13px] font-medium text-ink-2 hoverable:hover:text-danger-text">
            <Trash className="size-4" aria-hidden />
            Remove
          </button>
        )}
      </div>
    </motion.li>
  )
}

function AddTenancySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const me = useMe()
  const day = useToday()
  const [address, setAddress] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [still, setStill] = useState(false)
  const [nudged, setNudged] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setAddress('')
      setFrom('')
      setTo('')
      setStill(false)
      setNudged(false)
    }
  }
  const errors = {
    address: address.trim().length < 6 ? 'Enter the street address and suburb or town.' : undefined,
    from: !from ? 'Choose the month you moved in.' : from > day ? 'A move-in date cannot be in the future.' : undefined,
    to: still ? undefined : !to ? 'Choose when you moved out, or tick that you still live there.' : to < from ? 'The move-out date is before the move-in date.' : to > day ? 'A move-out date cannot be in the future.' : undefined,
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      eyebrow="Rent Passport"
      title="Add a home you have rented"
      description="It appears as a stamp marked ‘awaiting confirmation’. It adds nothing to your score until that landlord confirms it — which is what makes the score worth something."
      footer={
        <Button
          intent="primary"
          size="lg"
          className="rounded-full"
          block
          onClick={() => {
            setNudged(true)
            if (errors.address || errors.from || errors.to) return
            addPastTenancy(me.id, { address, from, to: still ? undefined : to })
            toast.success('Added', { description: 'It is on your Passport, awaiting confirmation.' })
            onClose()
          }}
        >
          Add it to my Passport
        </Button>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <Field label="Address" error={nudged ? errors.address : undefined}>
          {(p) => <Input {...p} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="4/12 Example Street, Nelson" autoComplete="off" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Moved in" error={nudged ? errors.from : undefined}>
            {(p) => <Input {...p} type="date" max={day} value={from} onChange={(e) => setFrom(e.target.value)} />}
          </Field>
          <Field label="Moved out" error={nudged ? errors.to : undefined}>
            {(p) => <Input {...p} type="date" max={day} min={from || undefined} value={still ? '' : to} disabled={still} onChange={(e) => setTo(e.target.value)} />}
          </Field>
        </div>
        <Checkbox checked={still} onCheckedChange={setStill}>
          I still live there
        </Checkbox>
        <p className="rounded-lg bg-sunken p-3.5 text-[13px] leading-relaxed text-ink-2">You are not asked how well you paid or how you kept the place. Those figures only ever come from a rent ledger or a landlord’s confirmation.</p>
      </div>
    </Sheet>
  )
}

function FlagSheet({ fact, facts, onClose }: { fact: string | null; facts: string[]; onClose: () => void }) {
  const me = useMe()
  const [chosen, setChosen] = useState('')
  const [why, setWhy] = useState('')
  const [nudged, setNudged] = useState(false)
  const [wasFact, setWasFact] = useState(fact)
  if (fact !== wasFact) {
    setWasFact(fact)
    if (fact !== null) {
      setChosen(fact)
      setWhy('')
      setNudged(false)
    }
  }
  const tooShort = why.trim().length < 10
  return (
    <Sheet
      open={fact !== null}
      onOpenChange={(o) => !o && onClose()}
      eyebrow="Rent Passport"
      title="Something on your record is wrong"
      description="You have the right to have it looked at. This goes to a person on the Pool team, not to your landlord."
      footer={
        <Button
          intent="primary"
          size="lg"
          className="rounded-full"
          block
          onClick={() => {
            setNudged(true)
            if (tooShort || !chosen) return
            flagPassportFact(me.id, chosen, why)
            toast.success('Flagged for review', { description: 'A person will check it against the records and reply to you in Me.' })
            onClose()
          }}
        >
          Send for review
        </Button>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <Field label="Which fact?">
          {(p) => (
            <Select {...p} value={chosen} onChange={(e) => setChosen(e.target.value)}>
              {facts.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="What is wrong with it?" hint="Say what it should be, and how you know — a bank record, an inspection report, a date." error={nudged && tooShort ? 'Add a sentence, so the person checking knows what to look for.' : undefined}>
          {(p) => <Textarea {...p} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: the payment on 3 March was sent on the due date; my bank shows it leaving that morning." />}
        </Field>
        <p className="text-xs leading-relaxed text-ink-3">The fact stays as it is while it is checked. In this demo the review happens in the team console.</p>
      </div>
    </Sheet>
  )
}

/* ─────────────────────────────────── view ───────────────────────────────── */

export function Passport() {
  const me = useMe()
  const day = useToday()
  const pack = usePack()
  const profile = useMyProfile()
  const home = useMyHome()
  const ledger = useStore((s) => s.db.ledger)
  const inspections = useStore((s) => s.db.inspections)
  const [adding, setAdding] = useState(false)
  const [flag, setFlag] = useState<string | null>(null)
  const passport = useMemo(() => passportOf(profile, day), [profile, day])
  const first = me.fullName.split(' ')[0]

  const verified = useMemo(() => profile.history.filter((h) => h.verifiedBy !== 'self_reported'), [profile.history])
  const verifiedRefs = profile.references.filter((r) => r.verified).length

  const pillars: PillarView[] = useMemo(() => {
    const tid = home?.tenancy.id
    const rent = tid ? ledger.filter((l) => l.tenancyId === tid && l.kind === 'rent' && l.dueDate) : []
    const onTime = rent.filter((l) => l.date <= (l.dueDate ?? l.date)).length
    const walked = tid ? inspections.filter((i) => i.tenancyId === tid && i.status === 'completed' && i.overallScore !== undefined) : []
    return [
      {
        key: 'punctuality',
        name: 'Rent paid on time',
        ...passport.pillars.punctuality,
        facts: [...verified.map((h) => `${h.address}: ${h.onTimePct}% on time`), ...(rent.length ? [`In the last 12 months here, ${onTime} of ${rent.length} payments landed on or before the due date`] : [])],
      },
      {
        key: 'care',
        name: 'Care of the home',
        ...passport.pillars.care,
        facts: [...verified.map((h) => `${h.address}: ${h.careScore.toFixed(1)} of 5`), ...walked.map((i) => `Inspection on ${fmtDate(dateOf(i.completedAt ?? i.scheduledFor ?? day), { weekday: false, year: 'always' })}: ${i.overallScore?.toFixed(1)} of 5`)],
      },
      {
        key: 'tenure',
        name: 'Time and references',
        ...passport.pillars.tenure,
        facts: passport.score === null ? [] : [`${plural(passport.verifiedMonths, 'month')} verified. Five years is a full mark`, `${plural(verifiedRefs, 'reference')} verified. Two is a full mark`],
      },
    ]
  }, [home, ledger, inspections, passport, verified, verifiedRefs, day])

  const flaggable = [...verified.map((h) => `${h.address}: ${h.onTimePct}% of rent on time, care ${h.careScore.toFixed(1)} of 5, ${monthYear(h.from)} to ${h.to ? monthYear(h.to) : 'now'}`), ...profile.references.map((r) => `Reference: ${r.name}, ${r.relation} — ${r.verified ? 'verified' : 'not verified'}`), ...(passport.score !== null ? [`My score of ${passport.score}`] : [])]
  const never = [...new Set([...(pack.privacyStages[1]?.mustNotCollect ?? []), ...(pack.privacyStages[2]?.mustNotCollect ?? [])])]

  const share = async () => {
    const summary =
      passport.score === null
        ? `${me.fullName} — Rent Passport on Pool. No verified renting history yet, so there is no score. Nothing yet is not bad.`
        : `${me.fullName} — Rent Passport on Pool. ${passport.score} of 100 (${BAND_LABEL[passport.band]}). ${passport.pillars.punctuality.detail} ${passport.pillars.care.detail} ${passport.pillars.tenure.detail} Verified facts only.`
    try {
      if (typeof navigator.share === 'function') await navigator.share({ title: 'My Rent Passport', text: summary })
      else {
        await navigator.clipboard.writeText(summary)
        toast.success('Summary copied', { description: 'Paste it into a message or an email.' })
      }
    } catch (e) {
      // Closing the share sheet is not an error worth reporting.
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast.error('That could not be shared from this browser', { description: 'Nothing was sent.' })
    }
  }

  return (
    <Page>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:sticky lg:top-24 lg:grid-cols-1 short:lg:static">
          <Booklet passport={passport} />
          <div className="grid min-w-0 content-start gap-4">
            <section aria-label="Who can see this" className="rounded-xl bg-surface p-5 shadow-card">
              <Switch
                checked={profile.visibleToLandlords}
                onCheckedChange={(on) => {
                  setPassportVisible(me.id, on)
                  toast(on ? 'Your Passport goes with your applications' : 'Your Passport is hidden', { description: on ? 'Landlords you apply to see the facts beside the number.' : 'Landlords you apply to see the application only.' })
                }}
                label="Show my Passport to landlords I apply to"
                description={profile.visibleToLandlords ? 'On. Only a landlord you have applied to can see it — nobody can look you up.' : 'Off. Nobody sees it but you.'}
              />
            </section>
            <Button size="lg" className="rounded-full" block icon={<Export weight="bold" className="size-[18px]" />} onClick={() => void share()}>
              Share a summary
            </Button>
            <p className="px-1 text-xs leading-relaxed text-ink-3">Sharing sends the facts as text. There is no public link to your Passport, in this demo or by design.</p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10">
          <header>
            <p className="eyebrow">Yours, and it goes where you go</p>
            <h1 className="display mt-2 max-w-[20ch] text-[32px] text-ink sm:text-[42px]">{passport.score === null ? `Nothing on record yet, ${first}. That is not a bad thing.` : `${BAND_LABEL[passport.band]}, and here is exactly why.`}</h1>
            <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-ink-2">
              {passport.score === null
                ? 'A Passport only counts what has been verified, so someone renting for the first time has no score rather than a low one. A landlord you apply to sees “Building” and your application — never a number that marks you down for being new.'
                : 'Your Passport is a summary of verified facts: rent that cleared, inspections that happened, references a landlord confirmed. A landlord sees those facts beside the number, and applications are never ranked or declined by it.'}
            </p>
          </header>

          <Pillars pillars={pillars} building={passport.score === null} />

          <section aria-labelledby="stamps">
            <Heading
              id="stamps"
              action={
                <Button intent="soft" className="rounded-full" icon={<Plus weight="bold" className="size-4" />} onClick={() => setAdding(true)}>
                  Add a home
                </Button>
              }
            >
              Homes you have rented
            </Heading>
            {profile.history.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-line-strong px-6 py-10 text-center">
                <p className="display text-[20px] text-ink">No stamps yet</p>
                <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-ink-2">Each home you rent becomes a stamp: the address, the dates, how the rent was paid and how the place was kept — and who verified it. Your first one starts the day you rent through Pool, or you can add a past home for its landlord to confirm.</p>
                <Button intent="primary" className="mt-4 rounded-full" icon={<Plus weight="bold" className="size-4" />} onClick={() => setAdding(true)}>
                  Add a home you have rented
                </Button>
              </div>
            ) : (
              <ul className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-6 pt-3 md:grid-cols-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {profile.history.map((h, i) => (
                    <Stamp key={`${h.address}-${h.from}`} h={h} today={day} tilt={i % 2 === 0 ? -3 : 2} onFlag={setFlag} onRemove={() => {
                        removePastTenancy(me.id, h.address, h.from)
                        toast('Removed from your Passport')
                      }}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>

          <section aria-labelledby="references">
            <Heading id="references">References</Heading>
            {profile.references.length === 0 ? (
              <p className="rounded-xl bg-surface px-4 py-4 text-[14px] leading-relaxed text-ink-2 shadow-card sm:px-5">No references yet. A landlord you rent from through Pool becomes one automatically; when you apply for a home you can name others, and they are only contacted once you are the preferred applicant.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl bg-surface shadow-card">
                {profile.references.map((r) => (
                  <li key={`${r.name}-${r.relation}`} className="flex items-center gap-3.5 p-4 sm:px-5">
                    <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', r.verified ? 'bg-ok-soft text-ok-text' : 'bg-sunken text-ink-3')}>
                      <UserCircleCheck weight="fill" className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">{r.name}</p>
                      <p className="truncate text-[13px] text-ink-2">{r.relation}</p>
                    </div>
                    <span className={cn('shrink-0 text-xs font-medium', r.verified ? 'text-ok-text' : 'text-ink-3')}>{r.verified ? 'Verified' : 'Not verified — does not count yet'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="goes-in" className="rounded-xl bg-surface p-5 shadow-card sm:p-6">
            <Heading id="goes-in">What goes in, and what never does</Heading>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-[13px] font-semibold text-ok-text">Goes in — only once verified</p>
                <ul className="mt-2 grid gap-2 text-[14px] leading-snug text-ink">
                  {['Rent that cleared, and whether it was on time', 'Inspection results', 'How long you have rented', 'References a landlord has confirmed'].map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check weight="bold" className="mt-0.5 size-4 shrink-0 text-ok-text" aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink-2">Never goes in, and is never asked for</p>
                <ul className="mt-2 grid gap-2 text-[14px] leading-snug text-ink-2">
                  {never.map((x) => (
                    <li key={x} className="flex gap-2">
                      <X weight="bold" className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-2">Opinions never go in either — only things that happened. And if a fact is wrong, say so: every stamp has a “This is wrong” link that goes to a person.</p>
            {flaggable.length > 0 && (
              <button type="button" onClick={() => setFlag(flaggable[0])} className="mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[14px] font-medium text-accent-text underline decoration-accent-line underline-offset-4">
                <Flag className="size-4" aria-hidden />
                Flag something as wrong
              </button>
            )}
          </section>
        </div>
      </div>

      <AddTenancySheet open={adding} onClose={() => setAdding(false)} />
      <FlagSheet fact={flag} facts={flaggable} onClose={() => setFlag(null)} />
    </Page>
  )
}
