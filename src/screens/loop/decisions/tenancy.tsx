/**
 * Decisions about the tenancy itself: a pet request, a fixed term running out,
 * a routine inspection. Same shape as the money decisions: facts, the rule,
 * the choices, and a refusal in words whenever a choice is not lawful.
 */
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, CalendarCheck, PawPrint, Star, UserFocus } from '@phosphor-icons/react'
import type { ID } from '@/domain/types'
import { bondCaps, checkBond, checkInspectionSlot, checkPetRefusal, fixedTermWindow, inspectionWindow, planRentIncrease } from '@/domain/rules/tenancy'
import { addDays, dateOf, diffDays, fmtDate, isWorkingDay } from '@/domain/rules/calendar'
import { deemedReceived } from '@/domain/rules/core'
import { money, plural } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { calendarOf, usePack, useToday } from '@/data/hooks'
import { FIELD_PRICES, giveNonRenewalNotice, offerRenewal, respondToPet, scheduleInspection, snoozeAction } from '@/data/mutations'
import { Button, buttonClass } from '@/ui/Button'
import { Checkbox, Field, Input, Segmented, Select, Textarea } from '@/ui/controls'
import { Callout, Fact, Facts } from '@/ui/display'
import { Refusal, Why, Working } from '@/ui/Law'
import { cn } from '@/ui/cn'

/* ─────────────────────────────────── pets ───────────────────────────────── */

export function PetDecision({ variationId, done }: { variationId: ID; done: () => void }) {
  const pack = usePack()
  const day = useToday()
  const v = useStore((s) => s.db.variations.find((x) => x.id === variationId))
  const t = useStore((s) => s.db.tenancies.find((x) => x.id === v?.tenancyId))
  const tenant = useStore((s) => s.db.users.find((u) => u.id === t?.tenantIds[0]))
  const me = useStore((s) => s.db.users.find((u) => u.id === s.session?.userId))
  const [choice, setChoice] = useState<'yes' | 'conditions' | 'no'>('conditions')
  const caps = t ? bondCaps(pack, t.weeklyRent) : { general: 0, pet: 0 }
  const [conditions, setConditions] = useState<string[]>(['pet_bond', 'restrain'])
  const [petBond, setPetBond] = useState(String(caps.pet ?? 0))
  const [ground, setGround] = useState('')
  const [detail, setDetail] = useState('')
  const [tried, setTried] = useState(false)
  if (!v || !t || !tenant) return null

  const first = tenant.fullName.split(' ')[0]
  const left = v.respondBy ? diffDays(day, v.respondBy) : null
  const bondAmount = Number(petBond) || 0
  const bondVerdict = choice === 'conditions' && conditions.includes('pet_bond') ? checkBond(pack, t.weeklyRent, t.bond.amount, bondAmount) : { ok: true }
  const refusalVerdict = choice === 'no' ? checkPetRefusal(pack, ground || undefined, detail) : { ok: true }
  const toggle = (key: string) => setConditions((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]))

  const submit = () => {
    setTried(true)
    if (!bondVerdict.ok || !refusalVerdict.ok) return
    respondToPet(
      variationId,
      choice === 'no' ? { decision: 'refuse', conditions: [], petBond: 0, ground, detail } : { decision: 'consent', conditions: choice === 'conditions' ? conditions : [], petBond: bondAmount },
      pack,
      me?.fullName ?? 'Landlord',
    )
    toast.success(choice === 'no' ? 'Refusal sent in writing' : 'Consent sent', { description: choice === 'no' ? `${first} has your grounds, and can ask the Tribunal to review them.` : `${first} has been asked to sign the conditions in Pool.` })
    done()
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex gap-3.5 rounded-lg bg-sunken p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent-text shadow-card">
          <PawPrint weight="fill" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">{v.summary}</p>
          <p className="mt-0.5 text-xs text-ink-3">
            {[v.detail.age, v.detail.desexed ? 'desexed' : null, v.detail.indoors].filter(Boolean).join(' · ')}
          </p>
          {v.detail.note && <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">“{String(v.detail.note)}”</p>}
          <p className="mt-2 text-xs text-ink-3">— {tenant.fullName}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-ink-2">
          {left === null ? 'Answer in writing.' : left >= 0 ? <>Answer in writing by <strong className="font-semibold text-ink">{fmtDate(v.respondBy!)}</strong> — {plural(left, 'day')} left.</> : <>An answer was due {fmtDate(v.respondBy!)}.</>}
        </p>
        <Why rule="pets.response_deadline" />
      </div>

      <Segmented
        label="Your answer"
        value={choice}
        onChange={setChoice}
        className="w-full"
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'conditions', label: 'Yes, with conditions' },
          { value: 'no', label: 'No' },
        ]}
      />

      {choice === 'yes' && <p className="text-[13px] leading-relaxed text-ink-2">Consent with no conditions. {first} is still fully liable for any damage the pet causes — that is the law whether or not you take a pet bond.</p>}

      {choice === 'conditions' && (
        <div className="grid gap-3">
          <p className="eyebrow">Conditions the Act names as reasonable</p>
          {pack.petConditions.map((c) => (
            <Checkbox key={c.key} checked={conditions.includes(c.key)} onCheckedChange={() => toggle(c.key)}>
              {c.label}
            </Checkbox>
          ))}
          {conditions.includes('pet_bond') && (
            <Field label="Pet bond" hint={`Up to two weeks of rent: ${money(caps.pet ?? 0)} at ${money(t.weeklyRent)} a week. Lodged with Tenancy Services like any bond.`}>
              {(p) => <Input {...p} inputMode="numeric" prefix="$" value={petBond} onChange={(e) => setPetBond(e.target.value.replace(/[^0-9]/g, ''))} aria-invalid={!bondVerdict.ok || undefined} />}
            </Field>
          )}
          <Refusal verdict={bondVerdict} />
        </div>
      )}

      {choice === 'no' && (
        <div className="grid gap-3">
          <Callout tone="warn">A refusal has to rest on a reasonable ground and say what it is. Refusing without one is an unlawful act — up to $1,500.</Callout>
          <Field label="The ground you are relying on">
            {(p) => (
              <Select {...p} value={ground} onChange={(e) => setGround(e.target.value)}>
                <option value="">Choose a ground…</option>
                {pack.petRefusalGrounds.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="The facts behind it" hint="What is it about this home, or this animal? This is what the Tribunal would read.">
            {(p) => <Textarea {...p} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="For example: the section is unfenced and borders State Highway 6." />}
          </Field>
          {tried && <Refusal verdict={refusalVerdict} />}
          <Why rule="pets.refusal_needs_grounds" className="justify-self-start" />
        </div>
      )}

      <Button intent="primary" size="lg" block onClick={submit}>
        {choice === 'no' ? 'Send the refusal' : choice === 'yes' ? 'Send consent' : 'Send consent with these conditions'}
      </Button>
    </div>
  )
}

/* ─────────────────────────────── fixed term ─────────────────────────────── */

export function FixedTermDecision({ tenancyId, actionId, done }: { tenancyId: ID; actionId: string; done: () => void }) {
  const pack = usePack()
  const day = useToday()
  const t = useStore((s) => s.db.tenancies.find((x) => x.id === tenancyId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === t?.propertyId))
  const tenant = useStore((s) => s.db.users.find((u) => u.id === t?.tenantIds[0]))
  const me = useStore((s) => s.db.users.find((u) => u.id === s.session?.userId))
  const [choice, setChoice] = useState<'renew' | 'roll' | 'end'>('renew')
  const [months, setMonths] = useState('12')
  if (!t || !t.endDate || !property || !tenant) return null

  const cal = calendarOf(pack, property)
  const w = fixedTermWindow(pack, cal, t.endDate, day)
  const first = tenant.fullName.split(' ')[0]
  const served = deemedReceived(pack, cal, day, 'email', new Date().getHours())
  const inTime = w ? served.received <= w.closes && served.received >= w.opens : false
  // Rent at renewal: an increase still has to clear the 12-month rule.
  const rentPlan = planRentIncrease(pack, cal, { ...t, type: 'periodic' }, { sentOn: day, method: 'email' })
  const newTermStart = addDays(t.endDate, 1)
  const canIncrease = rentPlan.gate <= newTermStart

  const options = [
    { key: 'renew' as const, title: 'Offer a new fixed term', body: `${first} signs in Pool; certainty for both of you.` },
    { key: 'roll' as const, title: 'Let it roll on', body: 'Do nothing. It becomes a periodic tenancy on the same terms.' },
    { key: 'end' as const, title: 'End it with the term', body: 'Give notice now that it will not continue. No reason needed.' },
  ]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Facts>
        <Fact label="Fixed term ends">{fmtDate(t.endDate, { year: 'always' })}</Fact>
        <Fact label="Notice must land by">{w ? fmtDate(w.closes) : '—'}</Fact>
        <Fact label="Time to decide">{w ? plural(w.daysToChange, 'day') : '—'}</Fact>
      </Facts>
      <Why rule="fixed_term.notice_window" className="justify-self-start" />

      <div role="radiogroup" aria-label="What happens when the term ends" className="grid gap-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={choice === o.key}
            onClick={() => setChoice(o.key)}
            className={cn('pressable flex items-start gap-3 rounded-lg p-3.5 text-left transition-shadow', choice === o.key ? 'bg-accent-soft shadow-[inset_0_0_0_2px_var(--accent)]' : 'bg-surface shadow-card hoverable:hover:shadow-pop')}
          >
            <span aria-hidden className={cn('mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full', choice === o.key ? 'bg-accent' : 'shadow-[inset_0_0_0_1.5px_var(--line-strong)]')}>
              {choice === o.key && <span className="size-1.5 rounded-full bg-accent-ink" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-ink">{o.title}</span>
              <span className="mt-0.5 block text-[13px] text-ink-2">{o.body}</span>
            </span>
          </button>
        ))}
      </div>

      {choice === 'renew' && (
        <div className="grid gap-3">
          <Field label="Length of the new term">
            {(p) => (
              <Select {...p} value={months} onChange={(e) => setMonths(e.target.value)}>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
              </Select>
            )}
          </Field>
          <Callout tone={canIncrease ? 'info' : 'neutral'} title={`Rent stays at ${money(t.weeklyRent)} a week`}>
            {canIncrease
              ? 'A renewal carries the rent over. If you want to review it, that is a separate 60-day notice — the review tool is under Tenancies.'
              : `A renewal carries the rent over, and an increase cannot take effect before ${fmtDate(rentPlan.gate, { year: 'always' })} — 12 months from when rent was last set.`}
            <div className="mt-2">
              <Why rule="rent_increase.min_interval_months" />
            </div>
          </Callout>
          <Button
            intent="primary"
            size="lg"
            block
            onClick={() => {
              offerRenewal(tenancyId, Number(months), t.weeklyRent, me?.fullName ?? 'Landlord')
              toast.success('Renewal offered', { description: `${first} has it in Pool to sign. I will chase it before the window closes.` })
              done()
            }}
          >
            Offer {months} months to {first}
          </Button>
        </div>
      )}

      {choice === 'roll' && (
        <div className="grid gap-3">
          <p className="text-[13px] leading-relaxed text-ink-2">
            After {fmtDate(t.endDate)} either of you can end it by notice: 90 days from you, 21 from {first}. Nothing needs signing.
          </p>
          <Button
            intent="primary"
            size="lg"
            block
            onClick={() => {
              snoozeAction(actionId)
              toast('Noted — it will roll on as periodic', { description: 'I will not ask again for this term.' })
              done()
            }}
          >
            Let it roll on
          </Button>
        </div>
      )}

      {choice === 'end' && (
        <div className="grid gap-3">
          <Working
            steps={[
              ...served.steps,
              { label: 'Window for this notice', detail: w ? `${fmtDate(w.opens)} to ${fmtDate(w.closes)}` : undefined, rule: 'fixed_term.notice_window' },
              { label: inTime ? 'Inside the window — this notice counts' : 'Outside the window — this notice would not count', date: served.received },
            ]}
          />
          {!inTime && w && (
            <Refusal verdict={{ ok: false, rule: 'fixed_term.notice_window', reason: 'A notice sent now would land outside the window.', fix: w.status === 'not_open' ? `Send it on or after ${fmtDate(w.opens)}.` : 'The tenancy will roll on as periodic; from then you can give 90 days of notice.' }} />
          )}
          <Callout tone="neutral">Ending a tenancy is a big step for the person living there. If the reason is something that could be fixed, a conversation first costs nothing.</Callout>
          <Button
            intent="danger"
            size="lg"
            block
            disabled={!inTime}
            onClick={() => {
              giveNonRenewalNotice(tenancyId, pack, served.received)
              toast.success('Notice served', { description: `The tenancy ends ${fmtDate(t.endDate!, { year: 'always' })}. Re-letting starts automatically.` })
              done()
            }}
          >
            Serve notice by email now
          </Button>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────── inspections ────────────────────────────── */

const HOURS = [9, 11, 13, 15, 17]
const hourLabel = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'pm' : 'am'}`

export function InspectionDecision({ inspectionId, done }: { inspectionId: ID; done: () => void }) {
  const pack = usePack()
  const day = useToday()
  const i = useStore((s) => s.db.inspections.find((x) => x.id === inspectionId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === i?.propertyId))
  const inspections = useStore((s) => s.db.inspections)
  const inspector = useStore((s) => s.db.providers.find((p) => p.kind === 'inspector' && p.vetting === 'vetted'))
  const [mode, setMode] = useState<'diy' | 'delegated'>('delegated')
  const [hour, setHour] = useState(11)

  const cal = property ? calendarOf(pack, property) : pack.calendar
  const last = useMemo(
    () => inspections.filter((x) => x.propertyId === i?.propertyId && x.status === 'completed' && x.type === 'routine').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0],
    [inspections, i?.propertyId],
  )
  const window = useMemo(() => inspectionWindow(pack, cal, { sentOn: day, method: 'email', hour: new Date().getHours() }, last?.completedAt ? dateOf(last.completedAt) : undefined), [pack, cal, day, last])
  const dates = useMemo(() => {
    const out: string[] = []
    for (let d = window.earliest; out.length < 8 && (!window.latest || d <= window.latest); d = addDays(d, 1)) if (isWorkingDay(d, cal) || out.length < 3) out.push(d)
    return out
  }, [window, cal])
  const [date, setDate] = useState<string | null>(null)
  const chosen = date ?? dates[0]
  if (!i || !property) return null
  const verdict = chosen ? checkInspectionSlot(pack, window, chosen, hour) : { ok: false, reason: 'No lawful date is available on a notice sent today.' }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            { key: 'delegated', icon: UserFocus, title: `Delegate — ${money(FIELD_PRICES.routine_inspection)}`, body: inspector ? `${inspector.name} does it and files the report within a day.` : 'A vetted local inspector does it.' },
            { key: 'diy', icon: CalendarCheck, title: 'Do it yourself — free', body: 'A guided room-by-room checklist on your phone. Works with no signal.' },
          ] as const
        ).map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={mode === o.key}
            onClick={() => setMode(o.key)}
            className={cn('pressable flex flex-col gap-2 rounded-lg p-4 text-left transition-shadow', mode === o.key ? 'bg-accent-soft shadow-[inset_0_0_0_2px_var(--accent)]' : 'bg-surface shadow-card hoverable:hover:shadow-pop')}
          >
            <o.icon weight={mode === o.key ? 'fill' : 'regular'} className={cn('size-6', mode === o.key ? 'text-accent-text' : 'text-ink-3')} />
            <span className="text-[14px] font-semibold text-ink">{o.title}</span>
            <span className="text-[13px] text-ink-2">{o.body}</span>
          </button>
        ))}
      </div>

      {mode === 'delegated' && inspector && (
        <p className="flex items-center gap-1.5 text-xs text-ink-3">
          <Star weight="fill" className="size-3.5 text-warn" aria-hidden />
          <span className="num font-medium text-ink">{inspector.rating.toFixed(1)}</span> from {inspector.jobs} inspections · identity, insurance and police vetting checked
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="eyebrow">Pick a day</p>
          <Why rule="entry.inspection_notice_min" />
        </div>
        <div role="radiogroup" aria-label="Inspection day" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:-mx-6 md:px-6">
          {dates.map((d) => {
            const on = d === chosen
            const [wd, dd, mm] = fmtDate(d, { year: 'never' }).split(' ')
            return (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setDate(d)}
                className={cn('pressable grid w-16 shrink-0 justify-items-center rounded-md py-2.5 transition-colors', on ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink hoverable:hover:bg-accent-soft')}
              >
                <span className={cn('text-[11px]', on ? 'opacity-80' : 'text-ink-3')}>{wd}</span>
                <span className="num text-[19px] leading-tight font-semibold">{dd}</span>
                <span className={cn('text-[11px]', on ? 'opacity-80' : 'text-ink-3')}>{mm}</span>
              </button>
            )
          })}
        </div>
        <div role="radiogroup" aria-label="Inspection time" className="mt-3 flex flex-wrap gap-2">
          {HOURS.map((h) => (
            <button key={h} type="button" role="radio" aria-checked={h === hour} onClick={() => setHour(h)} className={cn('pressable num h-9 rounded-md px-3.5 text-[13px] font-medium coarse:h-11', h === hour ? 'bg-ink text-bg' : 'bg-sunken text-ink-2 hoverable:hover:text-ink')}>
              {hourLabel(h)}
            </button>
          ))}
        </div>
        <Refusal verdict={verdict} className="mt-3" />
      </div>

      <details className="group rounded-lg bg-sunken">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-[13px] font-medium text-ink">
          How these dates were worked out
          <ArrowRight className="size-4 text-ink-3 transition-transform duration-200 group-open:rotate-90" aria-hidden />
        </summary>
        <div className="px-4 pb-4">
          <Working steps={window.steps} />
        </div>
      </details>

      <Button
        intent="primary"
        size="lg"
        block
        disabled={!verdict.ok || !chosen}
        onClick={() => {
          if (!chosen) return
          scheduleInspection(inspectionId, chosen, hour, mode, pack)
          toast.success(mode === 'delegated' ? 'Inspector booked and notice served' : 'Inspection scheduled and notice served', {
            description: `${fmtDate(chosen)} at ${hourLabel(hour)}. The tenants have been told in writing.`,
          })
          done()
        }}
      >
        {mode === 'delegated' ? `Book ${inspector?.name.split(' ')[0] ?? 'an inspector'} and serve notice` : 'Schedule it and serve notice'}
      </Button>
      {mode === 'diy' && (
        <Link to="/loop/inspections" onClick={done} className={buttonClass({ intent: 'ghost', block: true })}>
          See how the guided checklist works
        </Link>
      )}
    </div>
  )
}
