/**
 * One repair, start to finish: where it is now, what was reported, how it was
 * sorted and why, who is coming, and every step so far.
 *
 * When a tradesperson has recorded the cause as damage, the top of the sheet
 * becomes the tenant's check: their note, the most the law lets anyone ask
 * for, and two honest answers — that's fair, or I don't agree.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { CalendarCheck, Check, Key, Quotes, Scales, Star } from '@phosphor-icons/react'
import type { ID, Ticket } from '@/domain/types'
import { LIABILITY_EXAMPLES, URGENCY } from '@/domain/triage'
import { checkTenantInvoice, tenantLiabilityCap } from '@/domain/rules/tenancy'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { useNameOf, usePack } from '@/data/hooks'
import { usePhotoUrl } from '@/data/photos'
import { acceptFault, disputeFault } from '@/data/pool-mutations'
import { Button } from '@/ui/Button'
import { Field, Textarea } from '@/ui/controls'
import { Fact, Facts, Money, Timeline } from '@/ui/display'
import { Why } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { firstName, fmtTime, fmtWhen, REPAIR_STEPS, repairLine, repairStep, useLast, type MyHome } from '../shared'
import { URGENCY_TONE } from './ReportFlow'

function Photo({ id }: { id: ID }) {
  const url = usePhotoUrl(id)
  if (!url) return null
  return (
    <li className="aspect-square overflow-hidden rounded-lg bg-sunken">
      <img src={url} alt="A photo added to this report" className="size-full object-cover" />
    </li>
  )
}

/* ─────────────────────────────── the fault check ────────────────────────── */

function FaultCheck({ ticket, home, onDone }: { ticket: Ticket; home: MyHome; onDone: () => void }) {
  const me = useMe()
  const pack = usePack()
  const provider = useStore((s) => s.db.providers.find((p) => p.id === ticket.providerId))
  const [disputing, setDisputing] = useState(false)
  const [reason, setReason] = useState('')
  const [nudged, setNudged] = useState(false)
  const invoice = ticket.invoice
  if (!invoice) return null

  const landlord = firstName(home.landlord?.fullName)
  const rent = home.tenancy.weeklyRent
  const weeks = pack.rules['damage.careless_cap_weeks'].value
  const insurance = { insured: Boolean(home.property.insurance.insurer), excess: home.property.insurance.excess }
  const { cap } = tenantLiabilityCap(pack, 'careless', rent, insurance)
  const verdict = checkTenantInvoice(pack, invoice.amount, 'careless', rent, insurance)
  const cappedByExcess = weeks !== null && cap !== null && cap < weeks * rent
  const tooShort = reason.trim().length < 10

  return (
    <section aria-label="Check the tradesperson’s report" className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-xl bg-accent-soft p-4 sm:p-5">
      <div>
        <p className="eyebrow !text-accent-text">Waiting on you</p>
        <h3 className="display mt-1 text-[22px] text-ink">Is this fair?</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">The tradesperson recorded the cause as damage rather than wear. That is their view, not a decision. Nothing is billed until you answer.</p>
      </div>

      <figure className="rounded-lg bg-surface p-4 shadow-card">
        <Quotes weight="fill" className="size-5 text-accent-text" aria-hidden />
        <blockquote className="mt-1.5 text-[15px] leading-relaxed text-ink">{invoice.providerNote}</blockquote>
        <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-[13px] text-ink-2">
          <span>
            {provider?.name ?? 'The tradesperson'}, {fmtDate(dateOf(invoice.submittedAt))}
          </span>
          <span>
            Their bill: <Money value={invoice.amount} className="text-[17px] font-semibold text-ink" />
          </span>
        </figcaption>
      </figure>

      <div className="rounded-lg bg-surface p-4 shadow-card">
        <p className="eyebrow">The most anyone can ask you for</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
          {cap === null || weeks === null ? (
            'There is no set ceiling for this kind of damage here.'
          ) : cappedByExcess ? (
            <>
              For careless damage, <strong className="font-semibold">{money(cap)}</strong> — {landlord}’s insurance excess, because it is lower than {weeks} weeks of rent ({money(weeks * rent)}).
            </>
          ) : (
            <>
              For careless damage, <strong className="font-semibold">{money(cap)}</strong> — {weeks} weeks of rent.
            </>
          )}{' '}
          {verdict.ok ? `This bill is ${money(invoice.amount)}, which is under it.` : `This bill is over it, so the most you would pay is ${money(verdict.billable)}; the rest stays with ${landlord}.`}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">Fair wear and tear is never yours to pay, and neither is a genuine accident that was not careless.</p>
        <div className="mt-2.5">
          <Why rule="damage.careless_cap_weeks" label="The ceiling on careless damage" />
        </div>
      </div>

      <details className="group rounded-lg bg-surface shadow-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[14px] font-medium text-ink">
          What usually counts as wear, and what as damage
          <span aria-hidden className="text-ink-3 transition-transform duration-200 group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold text-ok-text">Usually wear — the landlord’s</p>
            <ul className="mt-1.5 grid gap-1 text-[13px] leading-relaxed text-ink-2">
              {LIABILITY_EXAMPLES.wearAndTear.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-warn-text">Usually damage — the tenant’s</p>
            <ul className="mt-1.5 grid gap-1 text-[13px] leading-relaxed text-ink-2">
              {LIABILITY_EXAMPLES.tenant.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-ink-3 sm:col-span-2">Examples from Tenancy Services. Each case turns on its own facts.</p>
        </div>
      </details>

      <AnimatePresence initial={false} mode="wait">
        {disputing ? (
          <motion.div key="dispute" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="grid gap-3">
            <Field label="What do you see differently?" hint={`${landlord} reads this beside the tradesperson’s note.`} error={nudged && tooShort ? 'Say in a sentence or two why you do not think this was damage.' : undefined}>
              {(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: the basin was already draining slowly when we moved in, and it is in the entry report." />}
            </Field>
            <p className="text-[13px] leading-relaxed text-ink-2">
              Nothing is billed while this is open. If the two of you cannot agree, the {pack.tribunal.name} decides — and it is for the landlord to show it is more than fair wear and tear.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button intent="ghost" size="lg" onClick={() => setDisputing(false)}>
                Back
              </Button>
              <Button
                intent="primary"
                size="lg"
                className="flex-1 rounded-full"
                onClick={() => {
                  setNudged(true)
                  if (tooShort) return
                  disputeFault(ticket.id, me.id, reason)
                  toast(`Sent to ${landlord}`, { description: 'They will read both accounts. Nothing is billed while it is open.' })
                  onDone()
                }}
              >
                Send to {landlord}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="grid gap-2 sm:grid-cols-2">
            <Button
              intent="primary"
              size="lg"
              className="rounded-full"
              icon={<Check weight="bold" className="size-4" />}
              onClick={() => {
                const billed = acceptFault(ticket.id, me.id, pack)
                toast.success('Thanks for sorting it', { description: `${money(billed ?? verdict.billable)} is on your tenancy as owing to ${landlord}. Nothing is taken automatically.` })
                onDone()
              }}
            >
              That’s fair
            </Button>
            <Button size="lg" className="rounded-full" icon={<Scales weight="fill" className="size-4" />} onClick={() => setDisputing(true)}>
              I don’t agree
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ─────────────────────────────────── sheet ──────────────────────────────── */

export function TicketSheet({ ticket: current, home, onClose }: { ticket: Ticket | null; home: MyHome; onClose: () => void }) {
  const ticket = useLast(current)
  const me = useMe()
  const nameOf = useNameOf()
  const provider = useStore((s) => s.db.providers.find((p) => p.id === ticket?.providerId))
  const landlord = firstName(home.landlord?.fullName)
  const at = ticket ? repairStep(ticket) : 0

  return (
    <Sheet open={current !== null} onOpenChange={(o) => !o && onClose()} size="lg" eyebrow={ticket ? [ticket.category, ticket.room].filter(Boolean).join(' · ') : undefined} title={ticket?.title ?? ''}>
      {ticket && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          {ticket.status === 'tenant_verifying' && <FaultCheck ticket={ticket} home={home} onDone={onClose} />}

          <section aria-label="Where it is now">
            <p className="display text-[22px] text-ink text-balance">{repairLine(ticket, { landlord, provider: provider?.name })}.</p>
            <ol className="mt-4 grid grid-cols-5 gap-1">
              {REPAIR_STEPS.map((s, i) => (
                <li key={s} className="min-w-0">
                  <span aria-hidden className={cn('block h-1.5 rounded-full', i <= at ? 'bg-accent' : 'bg-line')} style={{ opacity: i < at ? 0.45 : 1 }} />
                  <span className={cn('mt-1.5 block truncate text-[11px]', i === at ? 'font-semibold text-ink' : 'text-ink-3')}>
                    {s}
                    {i === at && <span className="sr-only"> — current step</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {ticket.scheduledFor && ticket.status !== 'closed' && (
            <section aria-label="The visit" className="rounded-lg bg-sunken p-4">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <CalendarCheck weight="fill" className="size-5 text-accent-text" aria-hidden />
                {fmtWhen(ticket.scheduledFor)}
              </p>
              {provider && (
                <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-ink-2">
                  {provider.name} · {provider.trade}
                  {provider.rating > 0 && (
                    <span className="inline-flex items-center gap-1">
                      · <Star weight="fill" className="size-3.5 text-warn" aria-hidden />
                      <span className="num font-medium text-ink">{provider.rating.toFixed(1)}</span> from {provider.jobs} jobs
                    </span>
                  )}
                </p>
              )}
              {ticket.entryNoticeServedAt && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">Entry notice was served in writing on {fmtDate(dateOf(ticket.entryNoticeServedAt))}.</p>}
              {ticket.keyCode && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-ink-2">
                  <Key weight="fill" className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                  If you are out, they have a one-time key code that only works from {fmtTime(ticket.keyCode.validFrom)} to {fmtTime(ticket.keyCode.validTo)}.
                </p>
              )}
              <div className="mt-2.5">
                <Why rule="entry.repairs_notice_min" label="Notice before they come in" />
              </div>
            </section>
          )}

          <section aria-label="What was reported">
            <p className="eyebrow mb-1.5">
              Reported by {ticket.reportedBy === me.id ? 'you' : firstName(nameOf(ticket.reportedBy))} · {fmtDate(dateOf(ticket.createdAt))}
            </p>
            <p className="text-[15px] leading-relaxed text-ink">{ticket.description}</p>
            {ticket.triage.selfHelpTried && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">Tried first: {ticket.triage.selfHelpTried}</p>}
            {ticket.photoIds.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {ticket.photoIds.map((id) => (
                  <Photo key={id} id={id} />
                ))}
              </ul>
            )}
          </section>

          <section aria-label="How it was sorted" className="rounded-lg bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold', URGENCY_TONE[ticket.triage.urgency])}>{URGENCY[ticket.triage.urgency].label}</span>
              <span className="text-[13px] text-ink-3">{URGENCY[ticket.triage.urgency].test}</span>
            </div>
            <p className="mt-2.5 text-[14px] leading-relaxed text-ink">{ticket.triage.reasoning}</p>
            {ticket.triage.possibleTenantFault && <p className="mt-2 text-[13px] leading-relaxed text-ink-2">Flagged to check the cause. That is a prompt for the tradesperson to look, not a finding about you.</p>}
          </section>

          {ticket.quote && (
            <section aria-label="The quote">
              <p className="eyebrow mb-1">The quote{provider ? ` from ${provider.name}` : ''}</p>
              <Facts>
                {ticket.quote.lines.map((l) => (
                  <Fact key={l.label} label={l.label}>
                    {money(l.amount)}
                  </Fact>
                ))}
                <Fact label="Total">
                  <span className="text-[15px] font-semibold">{money(ticket.quote.amount)}</span>
                </Fact>
              </Facts>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">This is {landlord}’s to approve and pay. You are not being asked for anything.</p>
            </section>
          )}

          {ticket.invoice && ticket.status !== 'tenant_verifying' && (
            <section aria-label="The outcome" className="rounded-lg bg-sunken p-4">
              <p className="eyebrow mb-1.5">What the tradesperson found</p>
              <p className="text-[14px] leading-relaxed text-ink">{ticket.invoice.providerNote}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                {money(ticket.invoice.amount)} ·{' '}
                {ticket.status === 'disputed'
                  ? `recorded as damage, which you do not agree with. ${landlord} is reading both accounts; nothing is billed.`
                  : ticket.paidFrom === 'tenant'
                    ? 'you agreed this one was yours to cover.'
                    : ticket.invoice.cause === 'wear_and_tear'
                      ? `fair wear and tear, paid by ${landlord}.`
                      : `paid by ${landlord}.`}
              </p>
              {ticket.tenantResponse?.note && <p className="mt-2 border-t border-line pt-2 text-[13px] leading-relaxed text-ink-2">What you said: “{ticket.tenantResponse.note}”</p>}
            </section>
          )}

          <section aria-label="Every step so far">
            <p className="eyebrow mb-3">Every step so far</p>
            <Timeline
              items={ticket.events
                .slice()
                .reverse()
                .map((e, i) => ({
                  id: `${e.at}-${i}`,
                  at: fmtWhen(e.at),
                  title: e.text,
                  tone: e.by === 'tenant' ? ('accent' as const) : e.by === 'provider' ? ('ok' as const) : e.by === 'landlord' ? ('warn' as const) : ('neutral' as const),
                }))}
            />
          </section>
        </div>
      )}
    </Sheet>
  )
}
