/**
 * Decisions about money: lodging a bond, chasing late rent, approving a quote.
 * Each is the body of a sheet. It shows the facts, the rule, and the choices —
 * and calls `done` when the landlord has made one.
 */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowSquareOut, ChatCircleText, CheckCircle, Copy, Headset, Phone, Star } from '@phosphor-icons/react'
import type { ID } from '@/domain/types'
import { arrearsState, bondLodgement, remedyDeadline } from '@/domain/rules/tenancy'
import { dateOf, fmtDate, fmtRelative } from '@/domain/rules/calendar'
import { money, plural } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { calendarOf, usePack, useToday } from '@/data/hooks'
import { approveQuote, declineQuote, logArrearsCall, recordBondLodged, requestConciergeCall, sendRemedyNotice } from '@/data/mutations'
import { Button, buttonClass } from '@/ui/Button'
import { Field, Input, Textarea } from '@/ui/controls'
import { Callout, Fact, Facts, Timeline } from '@/ui/display'
import { DayTrack, Why, Working } from '@/ui/Law'
import { cn } from '@/ui/cn'

const BOND_HUB = 'https://www.tenancy.govt.nz/rent-bond-and-bills/bond/'

export function BondDecision({ tenancyId, done }: { tenancyId: ID; done: () => void }) {
  const pack = usePack()
  const day = useToday()
  const t = useStore((s) => s.db.tenancies.find((x) => x.id === tenancyId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === t?.propertyId))
  const users = useStore((s) => s.db.users)
  const [ref, setRef] = useState('')
  const [tried, setTried] = useState(false)
  if (!t || !property || !t.bond.receivedOn) return null

  const b = bondLodgement(pack, calendarOf(pack, property), t.bond.receivedOn, undefined, day)
  const tone = b.status === 'overdue' || b.status === 'urgent' ? 'danger' : b.status === 'due_soon' ? 'warn' : 'accent'
  const tenants = t.tenantIds.map((id) => users.find((u) => u.id === id)?.fullName).filter(Boolean).join(', ')
  const details = `${property.address.line1}, ${property.address.suburb} ${property.address.postcode}\nTenant: ${tenants}\nWeekly rent: ${money(t.weeklyRent)}\nBond: ${money(t.bond.amount)}\nTenancy began: ${fmtDate(t.startDate, { weekday: false, year: 'always' })}`
  const invalid = ref.trim().length < 4

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <p className="num text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink">
            {b.workingDaysLeft >= 0 ? b.workingDaysLeft : -b.workingDaysLeft}
            <span className="ml-1.5 text-[13px] font-medium tracking-normal text-ink-2">working {Math.abs(b.workingDaysLeft) === 1 ? 'day' : 'days'} {b.workingDaysLeft >= 0 ? 'left' : 'overdue'}</span>
          </p>
          <Why rule="bond.lodgement_deadline" />
        </div>
        <DayTrack total={b.totalWorkingDays} used={b.workingDaysUsed} tone={tone} />
        <div className="mt-1.5 flex justify-between text-[11px] text-ink-3">
          <span>Received {fmtDate(t.bond.receivedOn)}</span>
          <span>Deadline {fmtDate(b.deadline)}</span>
        </div>
      </div>

      <Working
        steps={[
          { label: `${money(t.bond.amount)} received from ${tenants.split(',')[0]}`, date: t.bond.receivedOn },
          { label: '23 working days to lodge it', date: b.deadline, rule: 'bond.lodgement_deadline', detail: 'Weekends, public holidays, Nelson Anniversary Day and 24 December – 3 January are not working days.' },
        ]}
      />

      <div>
        <p className="eyebrow mb-2">Lodge it</p>
        <ol className="grid gap-3 text-[13px] text-ink-2">
          <li className="flex gap-3">
            <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink">1</span>
            <div className="min-w-0 flex-1">
              <p className="text-ink">Open Bond Hub and start a new lodgement.</p>
              <a href={BOND_HUB} target="_blank" rel="noreferrer" className={cn(buttonClass({ intent: 'secondary', size: 'sm' }), 'mt-2')}>
                Open Bond Hub <ArrowSquareOut className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink">2</span>
            <div className="min-w-0 flex-1">
              <p className="text-ink">Enter these details exactly as they are in the agreement.</p>
              <pre className="mt-2 overflow-x-auto rounded-md bg-sunken p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink">{details}</pre>
              <Button
                size="sm"
                intent="ghost"
                className="mt-1 -ml-2"
                icon={<Copy className="size-3.5" />}
                onClick={() => {
                  void navigator.clipboard?.writeText(details)
                  toast('Copied the tenancy details')
                }}
              >
                Copy
              </Button>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-semibold text-ink">3</span>
            <div className="min-w-0 flex-1">
              <Field label="Paste the bond reference Bond Hub gives you" error={tried && invalid ? 'Enter the reference from your Bond Hub confirmation so the lodgement can be proved later.' : undefined}>
                {(p) => <Input {...p} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="For example BND-7204-1183" autoComplete="off" />}
              </Field>
            </div>
          </li>
        </ol>
      </div>

      <Callout tone="neutral">
        In this prototype you lodge in Bond Hub yourself and record the reference here. Tenancy Services publishes a bond API for software like this; once connected, this whole sheet becomes one button.
      </Callout>

      <Button
        intent="primary"
        size="lg"
        block
        icon={<CheckCircle weight="fill" className="size-[18px]" />}
        onClick={() => {
          setTried(true)
          if (invalid) return
          recordBondLodged(tenancyId, ref)
          toast.success('Bond recorded as lodged', { description: `Reference ${ref.trim()} is on file for ${property.address.line1}.` })
          done()
        }}
      >
        Record the bond as lodged
      </Button>
    </div>
  )
}

export function ArrearsDecision({ tenancyId, done }: { tenancyId: ID; done: () => void }) {
  const pack = usePack()
  const day = useToday()
  const t = useStore((s) => s.db.tenancies.find((x) => x.id === tenancyId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === t?.propertyId))
  const tenant = useStore((s) => s.db.users.find((u) => u.id === t?.tenantIds[0]))
  const me = useStore((s) => s.db.users.find((u) => u.id === s.session?.userId))
  const allEvents = useStore((s) => s.db.arrearsEvents)
  const events = useMemo(() => allEvents.filter((e) => e.tenancyId === tenancyId).slice(0, 5), [allEvents, tenancyId])
  const [mode, setMode] = useState<'choose' | 'call'>('choose')
  const [note, setNote] = useState('')
  if (!t || !property || !tenant) return null

  const cal = calendarOf(pack, property)
  const a = arrearsState(pack, cal, t, day)
  const first = tenant.fullName.split(' ')[0]
  const remedy = remedyDeadline(pack, cal, { sentOn: day, method: 'email' })
  const stage = a.atTribunalThreshold ? 'tribunal' : a.daysLate >= 3 ? 'notice' : 'talk'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Facts>
        <Fact label="Owing">
          <span className="num text-danger-text">{money(a.owed)}</span>
        </Fact>
        <Fact label="Late by">{plural(a.daysLate, 'day')}</Fact>
        <Fact label="Reaches the Tribunal threshold">{fmtDate(a.tribunalOn)}</Fact>
      </Facts>

      {stage === 'talk' && mode === 'choose' && (
        <div className="grid gap-2.5">
          <p className="text-[13px] leading-relaxed text-ink-2">
            Day one is for a conversation, not a notice. Most late payments are a bank delay or a changed pay day, and a friendly call settles them before they become arrears.
          </p>
          <button type="button" onClick={() => setMode('call')} className="pressable flex items-start gap-3.5 rounded-lg bg-surface p-4 text-left shadow-card hoverable:hover:shadow-pop">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
              <Phone weight="fill" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">Call {first} yourself</span>
              <span className="mt-0.5 block text-[13px] text-ink-2">One tap to dial, with a few words to open with. Two minutes.</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              requestConciergeCall(tenancyId)
              toast.success('The Loop team will call today', { description: `Someone will phone ${first} before 5 pm and write up what they hear, here.` })
              done()
            }}
            className="pressable flex items-start gap-3.5 rounded-lg bg-surface p-4 text-left shadow-card hoverable:hover:shadow-pop"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-info-soft text-info-text">
              <Headset weight="fill" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">Have Loop call and report back</span>
              <span className="mt-0.5 block text-[13px] text-ink-2">A person on the Loop team phones {first} today and logs what they say. Included in your plan.</span>
            </span>
          </button>
        </div>
      )}

      {stage === 'talk' && mode === 'call' && (
        <div className="grid gap-4">
          <a href={`tel:${tenant.phone.replace(/\s/g, '')}`} className={buttonClass({ intent: 'primary', size: 'lg', block: true })}>
            <Phone weight="fill" className="size-[18px]" aria-hidden />
            Call {first} · <span className="num">{tenant.phone}</span>
          </a>
          <div className="rounded-lg bg-sunken p-4">
            <p className="eyebrow mb-2 flex items-center gap-1.5">
              <ChatCircleText className="size-3.5" aria-hidden /> A way to open
            </p>
            <p className="text-[14px] leading-relaxed text-ink">
              “Hi {first}, it’s {me?.fullName.split(' ')[0] ?? 'your landlord'}. Just a quick one — this week’s rent hasn’t come through on my side. Is everything all right? If it’s a bank thing or your pay day has moved, that’s fine, I’d just like to know when to expect it.”
            </p>
          </div>
          <Field label="What did they say?" hint="This goes on the tenancy’s record. If it ever reaches the Tribunal, a dated note of a reasonable call is worth a great deal.">
            {(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: pay day moved to Thursday; will pay then." />}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="primary"
              onClick={() => {
                logArrearsCall(tenancyId, note)
                toast.success('Call logged', { description: 'I will tell you the moment the rent arrives.' })
                done()
              }}
            >
              Log the call
            </Button>
            <Button intent="ghost" onClick={() => setMode('choose')}>
              Back
            </Button>
          </div>
        </div>
      )}

      {stage === 'notice' && (
        <div className="grid gap-4">
          <p className="text-[13px] leading-relaxed text-ink-2">
            Three days on, it is time to put it in writing. A notice to remedy gives {first} at least 14 days to pay. It is not an eviction — it is the step that keeps your options open.
          </p>
          <Working steps={remedy.steps} />
          <Button
            intent="primary"
            size="lg"
            block
            onClick={() => {
              sendRemedyNotice(tenancyId, remedy.deadline, a.owed, pack)
              toast.success('Notice to remedy sent', { description: `${first} has until ${fmtDate(remedy.deadline)} to pay ${money(a.owed)}.` })
              done()
            }}
          >
            Send the 14-day notice by email
          </Button>
        </div>
      )}

      {stage === 'tribunal' && (
        <Callout tone="danger" title="Rent is 21 days or more behind">
          At this point the Tribunal must end the tenancy unless the rent is caught up. The application costs $29. Everything you file is shown to {first}, so the pack removes your bank details and home address first. Open Tenancies to review it.
        </Callout>
      )}

      <Callout tone="neutral" title="What you cannot do">
        Charge a late fee, change the locks, or take belongings. A late fee clause has no legal effect.
        <div className="mt-2">
          <Why rule="arrears.remedy_notice" />
        </div>
      </Callout>

      {events.length > 0 && (
        <div>
          <p className="eyebrow mb-2.5">On the record</p>
          <Timeline items={events.map((e) => ({ id: e.id, at: fmtRelative(dateOf(e.at), day), title: e.note ?? e.kind, tone: e.kind === 'cleared' ? 'ok' : 'neutral' }))} />
        </div>
      )}
    </div>
  )
}

export function QuoteDecision({ ticketId, done }: { ticketId: ID; done: () => void }) {
  const tk = useStore((s) => s.db.tickets.find((t) => t.id === ticketId))
  if (!tk?.quote) return null
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <p className="text-[13px] leading-relaxed text-ink-2">{tk.description}</p>
        <Callout tone="accent" className="mt-3" title={`Sorted as ${tk.triage.urgency}`}>
          {tk.triage.reasoning}
          {tk.triage.selfHelpTried && <span className="mt-1 block text-ink-2">Already tried: {tk.triage.selfHelpTried}</span>}
        </Callout>
      </div>
      <QuoteOffer ticketId={ticketId} done={done} />
    </div>
  )
}

/** The quote itself: who, what for, what it does to the fund, and the two answers. */
export function QuoteOffer({ ticketId, done }: { ticketId: ID; done: () => void }) {
  const tk = useStore((s) => s.db.tickets.find((t) => t.id === ticketId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === tk?.propertyId))
  const provider = useStore((s) => s.db.providers.find((p) => p.id === tk?.providerId))
  const entity = useStore((s) => s.db.entities.find((e) => e.id === property?.entityId))
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  if (!tk?.quote || !property) return null

  const after = property.sinkingFund.balance - tk.quote.amount
  const needsSecond = entity?.dualApprovalThreshold !== undefined && tk.quote.amount > entity.dualApprovalThreshold

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="overflow-hidden rounded-lg shadow-card">
        <div className="flex items-center gap-3 bg-surface px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{provider?.name ?? 'Tradesperson'}</p>
            <p className="text-xs text-ink-3">{provider?.trade}</p>
          </div>
          {provider && provider.rating > 0 && (
            <p className="num flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink">
              <Star weight="fill" className="size-3.5 text-warn" aria-hidden /> {provider.rating.toFixed(1)}
              <span className="font-normal text-ink-3">· {provider.jobs} jobs</span>
            </p>
          )}
        </div>
        <table className="w-full border-t border-line text-[13px]">
          <caption className="sr-only">Quote, line by line</caption>
          <tbody>
            {tk.quote.lines.map((l) => (
              <tr key={l.label} className="border-b border-line">
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-ink-2">
                  {l.label}
                </th>
                <td className="num px-4 py-2.5 text-right text-ink">{money(l.amount)}</td>
              </tr>
            ))}
            <tr className="bg-surface-2">
              <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                Total, including GST
              </th>
              <td className="num px-4 py-3 text-right text-[15px] font-semibold text-ink">{money(tk.quote.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Facts>
        <Fact label="Your automatic limit">{money(property.sinkingFund.autoApproveLimit)}</Fact>
        <Fact label="Sinking fund now">{money(property.sinkingFund.balance)}</Fact>
        <Fact label="Sinking fund after this">
          <span className={cn(after < 0 && 'text-danger-text')}>{money(after)}</span>
        </Fact>
        {entity?.dualApprovalThreshold !== undefined && <Fact label="Second trustee needed above">{money(entity.dualApprovalThreshold)}</Fact>}
      </Facts>

      {needsSecond && <Callout tone="warn">This is above the trust’s two-trustee threshold. Your approval sends it to the second trustee before anything is booked.</Callout>}

      {declining ? (
        <div className="grid gap-3">
          <Field label="What should the next quote take into account?" optional>
            {(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: is a repair possible rather than a replacement?" />}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="secondary"
              onClick={() => {
                declineQuote(ticketId, reason)
                toast('Second quote requested', { description: 'The tenant has been told a decision is still coming.' })
                done()
              }}
            >
              Ask for another quote
            </Button>
            <Button intent="ghost" onClick={() => setDeclining(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <Button
            intent="primary"
            size="lg"
            block
            onClick={() => {
              approveQuote(ticketId)
              toast.success('Approved and booked', { description: `${provider?.name ?? 'The tradesperson'} is booked, and the tenant has 24 hours of notice.` })
              done()
            }}
          >
            Approve {money(tk.quote.amount)} and book it
          </Button>
          <Button intent="ghost" block onClick={() => setDeclining(true)}>
            Not this quote
          </Button>
        </div>
      )}
    </div>
  )
}
