/**
 * Pool — Repairs.
 *
 * What this screen does that no other does: it lets a renter ask for a repair
 * without fear and then watch it happen. Every repair says, in a sentence, who
 * has it right now. The rules of the house — what goes straight to a
 * tradesperson, what the landlord approves first, who pays for what — are on
 * the page rather than in someone's head.
 */
import { useMemo, type Ref } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CheckCircle, HouseLine, MagnifyingGlass, Scales, Siren, Wrench } from '@phosphor-icons/react'
import type { Ticket } from '@/domain/types'
import { URGENCY } from '@/domain/triage'
import { dateOf, fmtDate, fmtRelative } from '@/domain/rules/calendar'
import { durationText } from '@/domain/rules/core'
import { money } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { useNameOf, usePack, useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Button, buttonClass } from '@/ui/Button'
import { Why } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { firstName, Heading, REPAIR_STEPS, repairLine, repairStep, useMyHome, useMyProfile, type MyHome } from './shared'
import { ReportFlow, URGENCY_TONE } from './repairs/ReportFlow'
import { TicketSheet } from './repairs/TicketSheet'

const route = getRouteApi('/pool/repairs')

function RepairCard({ ticket, landlord, onOpen, ref }: { ticket: Ticket; landlord: string; onOpen: () => void; ref?: Ref<HTMLLIElement> }) {
  const me = useMe()
  const day = useToday()
  const nameOf = useNameOf()
  const provider = useStore((s) => s.db.providers.find((p) => p.id === ticket.providerId)?.name)
  const at = repairStep(ticket)
  const waiting = ticket.status === 'tenant_verifying'
  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
      className={cn('group relative rounded-xl p-4 transition-shadow sm:p-5', waiting ? 'bg-accent-soft' : 'bg-surface shadow-card hoverable:hover:shadow-pop')}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold', URGENCY_TONE[ticket.triage.urgency], waiting && ticket.triage.urgency === 'routine' && 'bg-surface')}>{URGENCY[ticket.triage.urgency].label}</span>
        <span className="min-w-0 truncate text-[13px] text-ink-3">
          {[ticket.room, `${ticket.reportedBy === me.id ? 'you' : firstName(nameOf(ticket.reportedBy))} reported it ${fmtRelative(dateOf(ticket.createdAt), day)}`].filter(Boolean).join(' · ')}
        </span>
      </div>
      {/* The title is the control; its hit area is stretched over the whole card. */}
      <h3 className="mt-2 text-[13px] text-ink-2">
        <button type="button" onClick={onOpen} className="rounded-sm text-left after:absolute after:inset-0 after:rounded-xl">
          {ticket.title}
        </button>
      </h3>
      <p className="mt-0.5 flex items-start gap-2 text-[17px] leading-snug font-semibold tracking-[-0.01em] text-ink text-balance">
        <span className="min-w-0 flex-1">{repairLine(ticket, { landlord, provider })}.</span>
        <ArrowRight className="mt-1 size-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
      </p>
      <div role="img" aria-label={`Step ${at + 1} of ${REPAIR_STEPS.length}: ${REPAIR_STEPS[at]}`} className="mt-4 grid grid-cols-5 gap-1">
        {REPAIR_STEPS.map((s, i) => (
          <span key={s} className="min-w-0">
            <span className={cn('block h-1.5 rounded-full', i <= at ? 'bg-accent' : waiting ? 'bg-surface' : 'bg-line')} style={{ opacity: i < at ? 0.45 : 1 }} />
            <span className={cn('mt-1.5 hidden truncate text-[11px] sm:block', i === at ? 'font-semibold text-ink' : 'text-ink-3')}>{s}</span>
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] font-semibold text-ink sm:hidden">{REPAIR_STEPS[at]}</p>
    </motion.li>
  )
}

/** The rules of the house, in the place a renter is about to rely on them. */
function HowItWorks({ home }: { home: MyHome }) {
  const pack = usePack()
  const landlord = firstName(home.landlord?.fullName)
  const limit = home.property.sinkingFund.autoApproveLimit
  const hours = pack.rules['entry.hours'].value
  const notice = durationText(pack.rules['entry.repairs_notice_min'].value)
  const hour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'pm' : 'am'}`
  const points = [
    { n: '1', title: 'A one-minute fix comes first', body: 'Plenty of reports turn out to be a tripped switch or a heat pump on the wrong mode. You get the safe steps before anything is sent.' },
    { n: '2', title: 'Urgent goes straight out', body: `Anything urgent goes to a tradesperson without waiting for ${landlord}. So does a routine job that usually costs under ${money(limit)}. Above that, ${landlord} approves a quote first.` },
    { n: '3', title: 'You are told before anyone comes in', body: `At least ${notice} of notice${hours ? `, and only between ${hour(hours.from)} and ${hour(hours.to)}` : ''} — unless you agree a time, or it is an emergency.` },
    { n: '4', title: 'Wear and tear is never yours', body: 'If a tradesperson thinks something was damage, you read their report and answer before anything is billed. Careless damage has a legal ceiling.' },
  ]
  return (
    <aside aria-label="How repairs work in this home" className="rounded-xl border border-dashed border-line-strong p-5">
      <p className="eyebrow">How repairs work here</p>
      <ol className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {points.map((p) => (
          <li key={p.n} className="flex gap-3">
            <span className="display num grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] text-accent-text">{p.n}</span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink">{p.title}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{p.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        <Why rule="entry.repairs_notice_min" label="Notice for repairs" />
        <Why rule="damage.careless_cap_weeks" label="Careless damage" />
      </div>
    </aside>
  )
}

function NoTenancy() {
  const profile = useMyProfile()
  const ext = profile.externalTenancy
  return (
    <Page>
      <div className="mx-auto max-w-xl rounded-xl bg-surface px-6 py-12 text-center shadow-card">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-accent-soft text-accent-text">{ext ? <HouseLine weight="fill" className="size-7" aria-hidden /> : <Wrench weight="fill" className="size-7" aria-hidden />}</span>
        <h1 className="display text-[28px] text-ink">{ext ? 'Repairs need a connected landlord' : 'Repairs live with your tenancy'}</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-ink-2">
          {ext
            ? `You linked ${ext.address} yourself, and ${ext.landlordName} is not on Loop — so a report from here would have nowhere to go. Contact them directly for now; if they join, repairs connect.`
            : 'Once you rent a home through Pool, this is where you report a problem, try the quick fix first, and watch the repair happen step by step.'}
        </p>
        <Link to="/pool/search" className={cn(buttonClass({ intent: 'primary', size: 'lg' }), 'mt-6 rounded-full')}>
          <MagnifyingGlass weight="bold" className="size-4" aria-hidden />
          Search homes
        </Link>
      </div>
    </Page>
  )
}

export function Repairs() {
  const home = useMyHome()
  return home ? <RepairsFor home={home} /> : <NoTenancy />
}

function RepairsFor({ home }: { home: MyHome }) {
  const pack = usePack()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const landlord = firstName(home.landlord?.fullName)
  const allTickets = useStore((s) => s.db.tickets)
  const mine = useMemo(() => allTickets.filter((t) => t.tenancyId === home.tenancy.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [allTickets, home.tenancy.id])
  const waiting = mine.filter((t) => t.status === 'tenant_verifying')
  const open = mine.filter((t) => t.status !== 'closed' && t.status !== 'tenant_verifying')
  const done = mine.filter((t) => t.status === 'closed')
  const selected = mine.find((t) => t.id === search.ticket) ?? null

  const show = (ticket?: string) => void navigate({ search: { ticket }, replace: !ticket })
  const report = (on: boolean) => void navigate({ search: on ? { report: true } : {}, replace: !on })

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 sm:mb-8">
        <div className="min-w-0 max-w-2xl">
          <p className="eyebrow mb-1.5">{home.property.address.line1}</p>
          <h1 className="display text-[32px] text-ink sm:text-[42px]">{waiting.length > 0 ? 'One thing needs your eye.' : open.length > 0 ? `${open.length === 1 ? 'One repair' : `${open.length} repairs`} under way.` : 'Nothing is broken.'}</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-2">Tell us what is wrong and we will get the right person to it. Asking for a repair is your right, and it never counts against you.</p>
        </div>
        <Button intent="primary" size="lg" className="h-14 w-full rounded-full px-7 text-[16px] sm:w-auto" icon={<Wrench weight="fill" className="size-5" />} onClick={() => report(true)}>
          Report a problem
        </Button>
      </header>

      <p className="mb-6 flex items-start gap-2.5 rounded-xl bg-danger-soft p-3.5 text-[14px] leading-relaxed text-ink sm:items-center">
        <Siren weight="fill" className="mt-0.5 size-[18px] shrink-0 text-danger-text sm:mt-0" aria-hidden />
        <span>
          <strong className="font-semibold text-danger-text">Fire, a gas smell, or anyone in danger?</strong> Call {pack.emergencyNumber} first. Tell {landlord} second.
        </span>
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
          {waiting.length > 0 && (
            <section aria-labelledby="repairs-waiting">
              <Heading id="repairs-waiting" count={waiting.length}>
                Waiting on you
              </Heading>
              <ul className="grid gap-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {waiting.map((t) => (
                    <RepairCard key={t.id} ticket={t} landlord={landlord} onOpen={() => show(t.id)} />
                  ))}
                </AnimatePresence>
              </ul>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-ink-2">
                <Scales weight="fill" className="size-4 text-accent-text" aria-hidden />A tradesperson says the cause was damage. Open it to read what they found and answer.
              </p>
            </section>
          )}

          <section aria-labelledby="repairs-open">
            <Heading id="repairs-open">Under way</Heading>
            {open.length === 0 ? (
              <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-card">
                <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-ok-soft text-ok-text">
                  <CheckCircle weight="fill" className="size-6" aria-hidden />
                </span>
                <p className="text-[16px] font-semibold text-ink">Nothing under way</p>
                <p className="mx-auto mt-1 max-w-sm text-[14px] leading-relaxed text-ink-2">When you report a problem it shows here, with who has it and what happens next. Small things are worth reporting too — a drip is cheaper to fix than a swollen cupboard.</p>
                <Button intent="soft" className="mt-4 rounded-full" onClick={() => report(true)}>
                  Report a problem
                </Button>
              </div>
            ) : (
              <ul className="grid gap-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {open.map((t) => (
                    <RepairCard key={t.id} ticket={t} landlord={landlord} onOpen={() => show(t.id)} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>

          <section aria-labelledby="repairs-done">
            <Heading id="repairs-done">Fixed</Heading>
            {done.length === 0 ? (
              <p className="rounded-xl bg-surface px-4 py-4 text-[14px] text-ink-2 shadow-card sm:px-5">Finished repairs are kept here, so there is a record of what was done to your home and when.</p>
            ) : (
              <ul className="divide-y divide-line rounded-xl bg-surface shadow-card">
                {done.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => show(t.id)} className="group flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left sm:px-5">
                      <CheckCircle weight="fill" className="size-5 shrink-0 text-ok" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-ink">{t.title}</span>
                        <span className="block truncate text-[13px] text-ink-3">
                          {t.paidFrom === 'tenant' ? 'You covered it' : `Paid by ${landlord}`} · reported {fmtDate(dateOf(t.createdAt))}
                        </span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 lg:sticky lg:top-24 short:lg:static">
          <HowItWorks home={home} />
        </div>
      </div>

      <TicketSheet ticket={selected} home={home} onClose={() => show(undefined)} />
      <ReportFlow open={search.report === true} home={home} onClose={() => report(false)} onSent={(id) => show(id)} />
    </Page>
  )
}
