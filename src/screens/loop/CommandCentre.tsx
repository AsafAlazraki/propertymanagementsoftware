/**
 * The command centre.
 *
 * What this screen does that no other does: it is the only place a landlord
 * has to look. Not a dashboard of charts to interpret — a short list of
 * decisions, each one already worked out, beside the proof that everything
 * else was handled. The headline is a sentence, because the first thing an
 * owner wants to know is "is anything on fire?", not a number.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate, type LinkProps } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowRight,
  Bank,
  CalendarBlank,
  CheckCircle,
  ClipboardText,
  ClockCountdown,
  CurrencyDollar,
  DotsThree,
  FileText,
  HouseLine,
  Megaphone,
  PawPrint,
  Scales,
  ShieldCheck,
  ShieldWarning,
  Sparkle,
  UsersThree,
  Wrench,
} from '@phosphor-icons/react'
import type { IconProps } from '@phosphor-icons/react'
import type { ComponentType } from 'react'
import type { ActionItem, ActionKind } from '@/domain/actions'
import { minutesSaved } from '@/domain/actions'
import { portfolioFinance, propertyFinance, savingsVsManager } from '@/domain/finance'
import { portfolioScore } from '@/domain/rules/compliance'
import { bondLodgement } from '@/domain/rules/tenancy'
import { dateOf, diffDays, fmtDate, fmtRelative } from '@/domain/rules/calendar'
import { useMe, useStore } from '@/data/store'
import { activeTenancy, calendarOf, useActions, useComplianceReports, usePack, useToday } from '@/data/hooks'
import { snoozeAction, unsnoozeAll } from '@/data/mutations'
import { Page } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Money, Num } from '@/ui/display'
import { DayTrack, Why } from '@/ui/Law'
import { ActionMenu } from '@/ui/overlays'
import { PropertyArt } from '@/ui/PropertyArt'
import { cn } from '@/ui/cn'
import { DECIDED_IN_SHEET, DecisionSheet, destinationOf } from './decisions'

const ICON: Record<ActionKind, ComponentType<IconProps>> = {
  bond: ShieldWarning,
  arrears: CurrencyDollar,
  quote: Wrench,
  dispute: Scales,
  pet: PawPrint,
  variation: FileText,
  fixed_term: CalendarBlank,
  inspection: ClipboardText,
  rent_review: Megaphone,
  compliance: ShieldCheck,
  insurance: ShieldCheck,
  applications: UsersThree,
  bank: Bank,
}

const TONE = {
  danger: { chip: 'bg-danger-soft text-danger-text', icon: 'bg-danger-soft text-danger-text', bar: 'bg-danger' },
  warn: { chip: 'bg-warn-soft text-warn-text', icon: 'bg-warn-soft text-warn-text', bar: 'bg-warn' },
  info: { chip: 'bg-sunken text-ink-2', icon: 'bg-sunken text-ink-2', bar: 'bg-line-strong' },
  accent: { chip: 'bg-accent-soft text-accent-text', icon: 'bg-accent-soft text-accent-text', bar: 'bg-accent' },
} as const

const GROUPS: { priority: 1 | 2 | 3; label: string }[] = [
  { priority: 1, label: 'Today' },
  { priority: 2, label: 'This week' },
  { priority: 3, label: 'When you have a moment' },
]

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function headline(urgent: number, week: number): string {
  if (urgent === 0 && week === 0) return 'Nothing needs you. Loop has it.'
  if (urgent === 0) return `Nothing urgent. ${week === 1 ? 'One thing' : `${words(week)} things`} for this week.`
  return `${urgent === 1 ? 'One thing needs' : `${words(urgent)} things need`} you today.`
}

function words(n: number): string {
  return ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][n] ?? String(n)
}

/* ───────────────────────────────── a decision ───────────────────────────── */

function ActionRow({ action, onOpen }: { action: ActionItem; onOpen: (a: ActionItem) => void }) {
  const Icon = ICON[action.kind]
  const tone = TONE[action.tone]
  const pack = usePack()
  const day = useToday()
  const property = useStore((s) => s.db.properties.find((p) => p.id === action.propertyId))
  const tenancy = useStore((s) => (action.kind === 'bond' ? s.db.tenancies.find((t) => t.id === action.refId) : undefined))
  const bond = action.kind === 'bond' && tenancy?.bond.receivedOn && property ? bondLodgement(pack, calendarOf(pack, property), tenancy.bond.receivedOn, undefined, day) : null

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', duration: 0.42, bounce: 0 }}
      className="group relative overflow-hidden rounded-lg bg-surface shadow-card"
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', tone.bar)} />
      <div className="flex gap-3.5 p-4 pl-5 sm:gap-4">
        <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-full', tone.icon)}>
          <Icon weight="fill" className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-[15px] leading-snug font-semibold tracking-[-0.01em] text-ink text-balance">{action.title}</h3>
            <ActionMenu
              trigger={
                <button type="button" aria-label={`More options for: ${action.title}`} className="pressable -mt-1 -mr-1.5 grid size-8 shrink-0 place-items-center rounded-sm text-ink-3 hoverable:hover:bg-sunken hoverable:hover:text-ink coarse:size-10">
                  <DotsThree weight="bold" className="size-5" />
                </button>
              }
              items={[
                {
                  label: 'Snooze this',
                  reason: 'Hides it from the queue. The deadline does not move.',
                  onSelect: () => {
                    snoozeAction(action.id)
                    toast('Snoozed', { description: 'You can bring snoozed items back from the bottom of the queue.' })
                  },
                },
              ]}
            />
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2 text-pretty">{action.body}</p>

          {bond && (
            <div className="mt-3 max-w-md">
              <DayTrack total={bond.totalWorkingDays} used={bond.workingDaysUsed} tone={action.tone === 'danger' ? 'danger' : action.tone === 'warn' ? 'warn' : 'accent'} />
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
            {action.clock && (
              <span className={cn('inline-flex h-6 items-center gap-1 rounded-[5px] px-1.5 text-[11px] font-semibold', tone.chip)}>
                <ClockCountdown weight="bold" className="size-3.5" aria-hidden />
                {action.clock}
              </span>
            )}
            {property && (
              <span className="inline-flex h-6 items-center gap-1.5 rounded-[5px] bg-sunken pr-2 text-[11px] text-ink-2">
                <PropertyArt kind={property.kind} art={property.art} className="size-6 rounded-[5px]" />
                {property.address.line1}
              </span>
            )}
            {action.rule && <Why rule={action.rule} />}
            <span className="flex-1" />
            <Button intent={action.priority === 1 ? 'primary' : 'secondary'} size="sm" onClick={() => onOpen(action)} trailing={<ArrowRight weight="bold" className="size-3.5" />}>
              {action.cta}
            </Button>
          </div>
        </div>
      </div>
    </motion.li>
  )
}

/* ───────────────────────────── sleep-at-night ───────────────────────────── */

function SleepScore() {
  const reports = useComplianceReports()
  const score = portfolioScore(reports.map((r) => r.report))
  const gaps = reports.reduce((a, r) => a + r.report.failing + r.report.attention, 0)
  // A 240° dial: the score is the sweep, the ticks are the scale.
  const R = 64
  const sweep = 240
  const circumference = 2 * Math.PI * R
  const arc = (circumference * sweep) / 360
  const tone = score >= 90 ? 'var(--ok)' : score >= 75 ? 'var(--accent)' : 'var(--warn)'
  return (
    <section id="sleep" aria-labelledby="sleep-title" className="scroll-mt-20 rounded-lg bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Sleep-at-night score</p>
          <h2 id="sleep-title" className="mt-1 text-[15px] font-semibold text-ink">
            {gaps === 0 ? 'Every check passes' : `${gaps} ${gaps === 1 ? 'gap' : 'gaps'} between you and a clean record`}
          </h2>
        </div>
      </div>
      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:items-center xl:flex-col 2xl:flex-row">
        <div className="relative grid shrink-0 place-items-center" style={{ width: 160, height: 132 }} role="img" aria-label={`Compliance score ${score} out of 100`}>
          <svg width="160" height="160" viewBox="0 0 160 160" className="absolute top-0" aria-hidden>
            <g transform="rotate(150 80 80)">
              <circle cx="80" cy="80" r={R} fill="none" stroke="var(--line)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${arc} ${circumference}`} />
              <circle
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={tone}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(arc * score) / 100} ${circumference}`}
                style={{ transition: 'stroke-dasharray 900ms cubic-bezier(0.23,1,0.32,1)' }}
              />
            </g>
          </svg>
          <div className="relative mt-3 text-center">
            <Num value={score} className="display text-[44px] leading-none text-ink" />
            <p className="text-[11px] text-ink-3">out of 100</p>
          </div>
        </div>
        <ul className="grid w-full min-w-0 flex-1 gap-2">
          {reports
            .slice()
            .sort((a, b) => a.report.score - b.report.score)
            .map(({ property, report }) => (
              <li key={property.id}>
                <Link to="/loop/properties/$id" params={{ id: property.id }} className="group/row flex items-center gap-2.5 rounded-md py-0.5">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] text-ink group-hover/row:underline">{property.address.line1}</span>
                      <span className="num shrink-0 text-xs font-semibold text-ink">{report.score}</span>
                    </span>
                    <span aria-hidden className="mt-1 block h-1 overflow-hidden rounded-full bg-sunken">
                      <span className={cn('block h-full rounded-full transition-[width] duration-700 ease-out', report.score >= 90 ? 'bg-ok' : report.score >= 75 ? 'bg-accent' : 'bg-warn')} style={{ width: `${report.score}%` }} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </div>
    </section>
  )
}

/* ──────────────────────────── handled for you ───────────────────────────── */

function Handled() {
  const orgId = useStore((s) => s.session?.orgId)
  const all = useStore((s) => s.db.autopilotLog)
  const day = useToday()
  const log = useMemo(() => all.filter((e) => e.orgId === orgId), [all, orgId])
  const fortnight = useMemo(() => log.filter((e) => diffDays(dateOf(e.at), day) <= 14), [log, day])
  const hours = minutesSaved(fortnight) / 60
  return (
    <section id="handled" aria-labelledby="handled-title" className="scroll-mt-20 overflow-hidden rounded-lg bg-nav text-nav-ink shadow-card">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <p className="eyebrow flex items-center gap-1.5 !text-nav-ink-2">
            <span aria-hidden className="size-1.5 animate-pulse-dot rounded-full bg-glow" /> Autopilot is on
          </p>
          <h2 id="handled-title" className="mt-1 text-[15px] font-semibold">
            Handled without you
          </h2>
        </div>
        <div className="text-right">
          <p className="num display text-[26px] leading-none text-glow">
            <Num value={Math.round(hours * 10) / 10} decimals={1} suffix=" h" />
          </p>
          <p className="mt-1 text-[11px] text-nav-ink-2">saved this fortnight, est.</p>
        </div>
      </div>
      <ol className="mt-4 max-h-[19rem] overflow-y-auto overscroll-contain px-5 pb-2">
        {log.slice(0, 9).map((e) => (
          <li key={e.id} className="flex gap-3 border-t border-nav-line py-3 first:border-t-0">
            <CheckCircle weight="fill" className="mt-0.5 size-4 shrink-0 text-glow" aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] leading-snug text-nav-ink text-pretty">{e.text}</p>
              <p className="num mt-0.5 text-[11px] text-nav-ink-2">{fmtRelative(dateOf(e.at), day)}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-nav-line px-5 py-2.5 text-[11px] text-nav-ink-2">The bank feed in this demo is simulated. Time saved is an estimate from typical task times.</p>
    </section>
  )
}

/* ─────────────────────────────── the screen ─────────────────────────────── */

export function CommandCentre() {
  const me = useMe()
  const day = useToday()
  const navigate = useNavigate()
  const actions = useActions()
  const [open, setOpen] = useState<ActionItem | null>(null)
  const [showLater, setShowLater] = useState(false)
  const reports = useComplianceReports()
  const score = portfolioScore(reports.map((r) => r.report))
  const handledCount = useStore((s) => s.db.autopilotLog.filter((e) => e.orgId === s.session?.orgId).length)
  const orgId = useStore((s) => s.session?.orgId)
  const org = useStore((s) => s.db.orgs.find((o) => o.id === orgId))
  const properties = useStore((s) => s.db.properties)
  const tenancies = useStore((s) => s.db.tenancies)
  const ledger = useStore((s) => s.db.ledger)
  const snoozed = useStore((s) => s.db.dismissedActions.length)

  const figures = useMemo(() => {
    const mine = properties.filter((p) => p.orgId === orgId)
    const rows = mine.map((p) => ({ p, f: propertyFinance(p, activeTenancy(tenancies, p.id), ledger, day) }))
    const total = portfolioFinance(
      rows.map((r) => r.f),
      rows.map((r) => ({ value: r.p.currentValue, mortgage: r.p.mortgageBalance })),
    )
    const rents = rows.map((r) => r.f.weeklyRent).filter((r) => r > 0)
    const savings = org ? savingsVsManager(rents, org.plan, mine.length) : null
    const fund = mine.reduce((a, p) => a + p.sinkingFund.balance, 0)
    const weekIn = ledger.filter((l) => l.orgId === orgId && l.kind === 'rent' && diffDays(l.date, day) >= 0 && diffDays(l.date, day) < 7).reduce((a, l) => a + l.amount, 0)
    return { total, savings, fund, weekIn, let: rents.length, count: mine.length }
  }, [properties, tenancies, ledger, orgId, org, day])

  const urgent = actions.filter((a) => a.priority === 1).length
  const week = actions.filter((a) => a.priority === 2).length

  const openAction = (a: ActionItem) => {
    if (DECIDED_IN_SHEET.includes(a.kind)) setOpen(a)
    else {
      const d = destinationOf(a)
      void navigate({ to: d.to as LinkProps['to'], params: d.params as never, search: d.search as never })
    }
  }

  return (
    <Page wide>
      <header className="mb-6 sm:mb-8">
        <p className="eyebrow">
          {fmtDate(day, { year: 'never' })} · {greeting()}, {me.fullName.split(' ')[0]}
        </p>
        <h1 className="display mt-2 max-w-[22ch] text-[30px] text-ink sm:text-[40px]">{headline(urgent, week)}</h1>

        {/* The pulse: four figures on one hairline-ruled strip, not four cards. */}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-4 sm:grid-cols-4 sm:gap-x-0 sm:divide-x sm:divide-line">
          <div className="min-w-0 sm:pr-6">
            <dt className="eyebrow">Rent in, last 7 days</dt>
            <dd className="mt-1.5">
              <Money value={figures.weekIn} className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-2xl" />
              <p className="mt-0.5 truncate text-xs text-ink-3">
                of <span className="num">${figures.total.weeklyRent.toLocaleString('en-NZ')}</span> a week · {figures.let} of {figures.count} let
              </p>
            </dd>
          </div>
          <div className="min-w-0 sm:px-6">
            <dt className="eyebrow">Net yield</dt>
            <dd className="mt-1.5">
              <Num value={figures.total.netYieldPct} decimals={1} suffix="%" className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-2xl" />
              <p className="mt-0.5 truncate text-xs text-ink-3">
                on <span className="num">${(figures.total.value / 1e6).toFixed(2)}M</span> · LVR <span className="num">{figures.total.lvrPct.toFixed(0)}%</span>
              </p>
            </dd>
          </div>
          <div className="min-w-0 sm:px-6">
            <dt className="eyebrow">Sinking fund</dt>
            <dd className="mt-1.5">
              <Money value={figures.fund} className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-2xl" />
              <p className="mt-0.5 truncate text-xs text-ink-3">for repairs and replacements</p>
            </dd>
          </div>
          <div className="min-w-0 sm:pl-6">
            <dt className="eyebrow">Saved on fees</dt>
            <dd className="mt-1.5">
              <Money value={figures.savings?.saved ?? 0} className="text-[22px] font-semibold tracking-[-0.02em] text-ok-text sm:text-2xl" />
              <p className="mt-0.5 truncate text-xs text-ink-3">a year, vs a manager at 8% + GST</p>
            </dd>
          </div>
        </dl>
      </header>

      {/* Below the two-column width the score and the autopilot feed sit under a long queue, so say they exist. */}
      <div className="mb-5 flex gap-2 xl:hidden">
        <a href="#sleep" className="pressable flex min-h-11 flex-1 items-center gap-2 rounded-md bg-surface px-3 text-[13px] text-ink-2 shadow-card">
          <ShieldCheck weight="fill" className={cn('size-4 shrink-0', score >= 90 ? 'text-ok' : 'text-warn')} aria-hidden />
          <span className="truncate">
            Score <span className="num font-semibold text-ink">{score}</span>
          </span>
        </a>
        <a href="#handled" className="pressable flex min-h-11 flex-1 items-center gap-2 rounded-md bg-surface px-3 text-[13px] text-ink-2 shadow-card">
          <CheckCircle weight="fill" className="size-4 shrink-0 text-accent-text" aria-hidden />
          <span className="truncate">
            <span className="num font-semibold text-ink">{handledCount}</span> handled for you
          </span>
        </a>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-8 3xl:grid-cols-[minmax(0,1fr)_30rem]">
        <section aria-label="Decisions waiting for you" className="min-w-0">
          {actions.length === 0 ? (
            <div className="rounded-lg bg-surface px-6 py-14 text-center shadow-card">
              <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-ok-soft text-ok-text">
                <Sparkle weight="fill" className="size-6" />
              </span>
              <p className="text-[17px] font-semibold text-ink">You are up to date</p>
              <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-2">Every deadline is met and every request is answered. I will bring the next decision here when there is one.</p>
            </div>
          ) : (
            GROUPS.map((g) => {
              const items = actions.filter((a) => a.priority === g.priority)
              if (!items.length) return null
              // The low-priority group stays folded while there are more pressing things above it.
              const folded = g.priority === 3 && !showLater && urgent + week > 0
              if (folded) {
                return (
                  <button
                    key={g.priority}
                    type="button"
                    onClick={() => setShowLater(true)}
                    className="pressable flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong px-4 text-left text-[13px] text-ink-2 hoverable:hover:bg-surface hoverable:hover:text-ink"
                  >
                    <span>
                      <span className="font-semibold text-ink">{items.length} more</span> for when you have a moment — {items.map((a) => ({ insurance: 'insurance', rent_review: 'a rent review', compliance: 'compliance', bank: 'bank lines' })[a.kind as string] ?? a.kind).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')}
                    </span>
                    <ArrowRight className="size-4 shrink-0 rotate-90 text-ink-3" aria-hidden />
                  </button>
                )
              }
              return (
                <div key={g.priority} className="mb-7 last:mb-0">
                  <h2 className="mb-2.5 flex items-center gap-2 text-[13px] font-semibold text-ink">
                    {g.label}
                    <span className="num rounded-full bg-sunken px-1.5 text-[11px] leading-[18px] font-medium text-ink-2">{items.length}</span>
                  </h2>
                  <ul className="grid gap-2.5">
                    <AnimatePresence initial={false} mode="popLayout">
                      {items.map((a) => (
                        <ActionRow key={a.id} action={a} onOpen={openAction} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )
            })
          )}
          {snoozed > 0 && (
            <button type="button" onClick={unsnoozeAll} className="mt-4 rounded-sm text-[13px] text-ink-3 underline decoration-line-strong underline-offset-4 hoverable:hover:text-ink">
              Bring back {snoozed} snoozed {snoozed === 1 ? 'item' : 'items'}
            </button>
          )}
        </section>

        <aside className="grid min-w-0 gap-4 sm:grid-cols-2 xl:sticky xl:top-6 xl:grid-cols-1">
          <SleepScore />
          <Handled />
          <Link to="/loop/properties" className="group flex items-center gap-3 rounded-lg bg-surface p-4 shadow-card sm:col-span-2 xl:col-span-1">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
              <HouseLine weight="fill" className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-ink">
                <span className="num">${(figures.total.equity / 1e6).toFixed(2)}M</span> of equity across {figures.count} homes
              </span>
              <span className="block truncate text-xs text-ink-3">
                Cash flow <span className="num">{figures.total.cashflow >= 0 ? '+' : '−'}${Math.abs(Math.round(figures.total.cashflow)).toLocaleString('en-NZ')}</span> a year after interest
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </aside>
      </div>

      <DecisionSheet action={open} onClose={() => setOpen(null)} />
    </Page>
  )
}
