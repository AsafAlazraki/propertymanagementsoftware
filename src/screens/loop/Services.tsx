/**
 * Services.
 *
 * What this screen does that no other does: it is the one place a landlord
 * hires a person instead of using the software. A short price list of the
 * errands that need someone at the door, who would turn up and what the Loop
 * team checked about them, and what each visit came back with.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ArrowRight,
  CalendarBlank,
  CheckCircle,
  Circle,
  ClipboardText,
  DoorOpen,
  Info,
  ListChecks,
  Scales,
  Star,
  UsersThree,
  type Icon,
} from '@phosphor-icons/react'
import type { FieldTask, Provider } from '@/domain/types'
import {
  fieldSpend,
  phaseOf,
  providersFor,
  serviceOf,
  SERVICES,
  shortName,
  type FieldService,
} from '@/domain/fieldServices'
import { dateOf, fmtDate, fmtTime } from '@/domain/rules/calendar'
import { money, plural } from '@/domain/rules/format'
import { useOrgRows, useStore } from '@/data/store'
import { CHECK_LABEL } from '@/data/admin-mutations'
import { FIELD_PRICES, PLATFORM_FEE_PCT } from '@/data/mutations'
import { cancelFieldTask, hueFor } from '@/data/ops-mutations'
import { Page } from '@/shell/common'
import { Badge, type Tone } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Segments } from '@/ui/charts'
import { Avatar, Callout, Empty, Money, PageHeader } from '@/ui/display'
import { Modal } from '@/ui/Sheet'
import { BookInspectionSheet } from './services/BookInspection'
import { BookTaskSheet } from './services/BookTask'

const ICON: Record<FieldService, Icon> = {
  routine_inspection: ClipboardText,
  viewing: DoorOpen,
  entry_exit_report: ListChecks,
  tribunal_representation: Scales,
}

const WAITING: Record<'requested' | 'accepted' | 'scheduled', { label: (who: string) => string; tone: Tone }> = {
  requested: { label: (who) => `Waiting for ${who} to accept`, tone: 'neutral' },
  accepted: { label: (who) => `Accepted by ${who}`, tone: 'info' },
  scheduled: { label: (who) => `Confirmed with ${who}`, tone: 'info' },
}

const BOOK_LABEL: Record<FieldService, string> = {
  routine_inspection: 'Book an inspection',
  viewing: 'Book a viewing',
  entry_exit_report: 'Book a report',
  tribunal_representation: 'Book representation',
}

const CHECKS = Object.keys(CHECK_LABEL) as (keyof Provider['checks'])[]

function orList(names: string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}

/* ─────────────────────────────── the price list ─────────────────────────── */

function PriceList({ providers, onBook }: { providers: Provider[]; onBook: (type: FieldService) => void }) {
  return (
    <ul className="divide-y divide-line rounded-lg bg-surface shadow-card">
      {SERVICES.map((s) => {
        const ServiceIcon = ICON[s.type]
        const people = providersFor(s.type, providers)
        return (
          <li
            key={s.type}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 p-4 sm:gap-x-4 sm:p-5"
          >
            <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-text">
              <ServiceIcon weight="fill" className="size-5" aria-hidden />
            </span>
            <h3 className="min-w-0 text-[15px] font-semibold tracking-[-0.01em] text-ink">{s.name}</h3>
            <p className="text-right">
              <Money value={FIELD_PRICES[s.type]} className="text-[20px] font-semibold tracking-[-0.02em] text-ink" />
              <span className="block text-[11px] text-ink-3">fixed price</span>
            </p>
            <p className="col-span-3 max-w-[60ch] text-[13px] leading-relaxed text-ink-2 sm:col-span-2 sm:col-start-2">
              {s.what} {s.result}
            </p>
            <div className="col-span-3 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-3 sm:col-span-2 sm:col-start-2">
              {people.length > 0 ? (
                <>
                  <Button intent="secondary" className="w-full sm:w-auto" onClick={() => onBook(s.type)}>
                    {BOOK_LABEL[s.type]}
                  </Button>
                  <p className="flex min-w-0 items-center gap-2 text-xs text-ink-2">
                    <span className="flex shrink-0 -space-x-1.5">
                      {people.map((p) => (
                        <Avatar
                          key={p.id}
                          name={p.name}
                          hue={hueFor(p.name)}
                          size={22}
                          className="ring-2 ring-surface"
                        />
                      ))}
                    </span>
                    <span className="min-w-0">Done by {orList(people.map((p) => p.name))}</span>
                  </p>
                </>
              ) : (
                <p role="status" className="rounded-md bg-sunken px-3 py-2 text-[13px] leading-relaxed text-ink-2">
                  Nobody vetted for this is in the network right now, so it cannot be booked. The Loop team adds people
                  once their checks are finished.
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/* ──────────────────────────────── bookings ──────────────────────────────── */

function DayBlock({ instant }: { instant: string | undefined }) {
  if (!instant) {
    return (
      <span className="grid size-12 shrink-0 place-items-center rounded-md bg-sunken text-ink-3">
        <CalendarBlank className="size-5" aria-hidden />
      </span>
    )
  }
  const [weekday, dayOfMonth, month] = fmtDate(dateOf(instant), { year: 'never' }).split(' ')
  return (
    <span
      aria-hidden
      className="grid size-12 shrink-0 place-items-center rounded-md bg-sunken text-center leading-none"
    >
      <span>
        <span className="block text-[10px] text-ink-3 uppercase">{weekday}</span>
        <span className="num block text-[17px] font-semibold text-ink">{dayOfMonth}</span>
        <span className="block text-[10px] text-ink-3">{month}</span>
      </span>
    </span>
  )
}

function Ahead({
  tasks,
  addressOf,
  providerOf,
  onCancel,
}: {
  tasks: FieldTask[]
  addressOf: (id: string) => string
  providerOf: (id?: string) => Provider | undefined
  onCancel: (task: FieldTask) => void
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg bg-surface shadow-card">
        <Empty
          icon={<CalendarBlank />}
          title="Nothing is booked"
          body="A job you book waits here until its day, with who is going and when. Choose one from the price list above."
        />
      </div>
    )
  }
  return (
    <ul className="divide-y divide-line rounded-lg bg-surface shadow-card">
      {tasks.map((t) => {
        const provider = providerOf(t.providerId)
        const first = provider ? shortName(provider) : 'someone'
        const state = WAITING[t.status as keyof typeof WAITING] ?? WAITING.requested
        return (
          <li
            key={t.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 gap-y-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5"
          >
            <DayBlock instant={t.scheduledFor} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-ink">
                {serviceOf(t.type).name} · {addressOf(t.propertyId)}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">
                {t.scheduledFor
                  ? `${fmtDate(dateOf(t.scheduledFor))} at ${fmtTime(t.scheduledFor)}`
                  : 'No time set yet'}
                {provider ? ` · ${provider.name}` : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <Badge tone={state.tone} size="sm" dot>
                  {state.label(first)}
                </Badge>
                {t.inspectionId && (
                  <Link
                    to="/loop/inspections"
                    className="rounded-sm text-xs font-medium text-accent-text underline-offset-4 hoverable:hover:underline"
                  >
                    Its notice is in Inspections
                  </Link>
                )}
              </div>
            </div>
            <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
              <span className="num text-[15px] font-semibold text-ink">{money(t.price)}</span>
              <Button intent="ghost" size="sm" onClick={() => onCancel(t)}>
                Cancel
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Past({
  tasks,
  addressOf,
  providerOf,
}: {
  tasks: FieldTask[]
  addressOf: (id: string) => string
  providerOf: (id?: string) => Provider | undefined
}) {
  const inspections = useOrgRows('inspections')
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg bg-surface shadow-card">
        <Empty
          icon={<CheckCircle />}
          title="No finished jobs yet"
          body="Each finished job keeps what it found here: the report, or what the host saw. Book one and it ends up on this list."
        />
      </div>
    )
  }
  return (
    <ul className="divide-y divide-line rounded-lg bg-surface shadow-card">
      {tasks.map((t) => {
        const provider = providerOf(t.providerId)
        const report = inspections.find((i) => i.id === t.inspectionId && i.status === 'completed')
        const cancelled = t.status === 'cancelled'
        const when = t.completedAt ?? t.scheduledFor
        const found = t.note ?? report?.summary
        return (
          <li key={t.id} className="p-4 sm:px-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="min-w-0 text-[14px] font-semibold text-ink">
                {serviceOf(t.type).name} · {addressOf(t.propertyId)}
              </p>
              {cancelled ? (
                <Badge tone="neutral" size="sm">
                  Cancelled · nothing charged
                </Badge>
              ) : (
                <span className="num text-[14px] font-semibold text-ink">{money(t.price)}</span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {when ? fmtDate(dateOf(when), { year: 'always' }) : 'No date'}
              {provider ? ` · ${provider.name}` : ''}
            </p>
            {!cancelled && (
              <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 rounded-md bg-sunken p-3">
                <p className="min-w-0 flex-1 basis-56 text-[13px] leading-relaxed text-ink">
                  {found ?? 'No note was left with this job.'}
                  {report?.overallScore !== undefined && (
                    <span className="text-ink-2">
                      {' '}
                      Scored <span className="num font-semibold text-ink">{report.overallScore.toFixed(1)}</span> out of
                      5.
                    </span>
                  )}
                </p>
                {report && (
                  <Link
                    to="/loop/inspections"
                    search={{ report: report.id }}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm text-[13px] font-medium text-accent-text underline-offset-4 hoverable:hover:underline coarse:min-h-11"
                  >
                    Read the report
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ───────────────────────────── who would turn up ────────────────────────── */

const VETTING: Record<Provider['vetting'], { label: string; tone: Tone }> = {
  vetted: { label: 'Vetted', tone: 'ok' },
  pending: { label: 'Being vetted', tone: 'warn' },
  suspended: { label: 'Suspended', tone: 'danger' },
}

function Person({ p }: { p: Provider }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <Avatar name={p.name} hue={hueFor(p.name)} size={38} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate text-[14px] font-semibold text-ink">{p.name}</span>
            <Badge tone={VETTING[p.vetting].tone} size="sm">
              {VETTING[p.vetting].label}
            </Badge>
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-2">
            {p.trade} · {p.region}
          </p>
          <p className="mt-1 text-xs text-ink-2">
            {p.jobs > 0 ? (
              <>
                <Star weight="fill" className="mb-0.5 inline size-3 text-warn" aria-hidden />{' '}
                <span className="num font-semibold text-ink">{p.rating.toFixed(1)}</span> from{' '}
                <span className="num">{p.jobs}</span> jobs · usually answers within{' '}
                <span className="num">{p.responseHours}</span> hours
              </>
            ) : (
              'No jobs through Loop yet'
            )}
          </p>
        </div>
      </div>
      <ul
        className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1 pl-[3.125rem] min-[420px]:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"
        aria-label={`What the Loop team checked about ${p.name}`}
      >
        {CHECKS.map((c) => (
          <li key={c} className="flex items-center gap-1.5 text-xs">
            {p.checks[c] ? (
              <CheckCircle weight="fill" className="size-3.5 shrink-0 text-ok" aria-hidden />
            ) : (
              <Circle className="size-3.5 shrink-0 text-ink-3" aria-hidden />
            )}
            <span className={p.checks[c] ? 'text-ink-2' : 'text-ink-3'}>
              {CHECK_LABEL[c]}
              {p.checks[c] ? '' : ' — not yet'}
            </span>
          </li>
        ))}
      </ul>
      {p.vetting !== 'vetted' && (
        <p className="mt-2 pl-[3.125rem] text-xs leading-relaxed text-ink-2">
          {p.vetting === 'pending'
            ? 'Cannot be booked until the Loop team has finished these checks.'
            : 'Cannot be booked while suspended.'}
        </p>
      )}
    </li>
  )
}

/* ──────────────────────────────── the screen ────────────────────────────── */

export function Services({ book }: { book?: FieldService }) {
  const navigate = useNavigate()
  const tasks = useOrgRows('fieldTasks')
  const properties = useOrgRows('properties')
  const allProviders = useStore((s) => s.db.providers)
  const [cancelling, setCancelling] = useState<FieldTask | null>(null)

  const people = useMemo(
    () =>
      allProviders
        .filter((p) => p.kind !== 'trade')
        .sort((a, b) => Number(b.vetting === 'vetted') - Number(a.vetting === 'vetted') || b.jobs - a.jobs),
    [allProviders],
  )
  const spend = useMemo(() => fieldSpend(tasks), [tasks])
  const ahead = useMemo(
    () =>
      tasks
        .filter((t) => phaseOf(t.status) === 'ahead')
        .sort((a, b) => (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? '')),
    [tasks],
  )
  const past = useMemo(
    () =>
      tasks
        .filter((t) => phaseOf(t.status) !== 'ahead')
        .sort((a, b) =>
          (b.completedAt ?? b.scheduledFor ?? b.requestedAt).localeCompare(
            a.completedAt ?? a.scheduledFor ?? a.requestedAt,
          ),
        ),
    [tasks],
  )

  const addressOf = (id: string) => properties.find((p) => p.id === id)?.address.line1 ?? 'A home'
  const providerOf = (id?: string) => allProviders.find((p) => p.id === id)
  const open = (type?: FieldService) =>
    void navigate({ to: '/loop/services', search: type ? { book: type } : {}, replace: true })
  const cancelWho = providerOf(cancelling?.providerId)

  return (
    <Page>
      <PageHeader
        eyebrow="Services"
        title="Someone local, for the days you cannot be there"
        lede="Most of running a rental happens on a screen. A few things need a person at the door. These are those things, at fixed prices, done by people the Loop team has vetted."
      />

      <Callout tone="neutral" icon={<Info weight="fill" />} className="mb-6">
        This is a demo marketplace. The people are invented, nobody is really sent, and no card is charged. A job you
        book stays here as booked.
      </Callout>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
          <section aria-labelledby="svc-prices">
            <h2 id="svc-prices" className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              What you can book
            </h2>
            <PriceList providers={allProviders} onBook={open} />
          </section>

          <section aria-labelledby="svc-ahead">
            <h2 id="svc-ahead" className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Coming up
            </h2>
            <Ahead tasks={ahead} addressOf={addressOf} providerOf={providerOf} onCancel={setCancelling} />
          </section>

          <section aria-labelledby="svc-past">
            <h2 id="svc-past" className="mb-3 text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Done, and what came back
            </h2>
            <Past tasks={past} addressOf={addressOf} providerOf={providerOf} />
          </section>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)]">
          <section aria-labelledby="svc-spend" className="rounded-lg bg-surface p-5 shadow-card">
            <h2 id="svc-spend" className="eyebrow">
              Spent on field services
            </h2>
            <p className="mt-1.5">
              <Money value={spend.spent} className="display text-[34px] text-ink" />
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              {spend.doneCount === 0
                ? 'No job has been done yet.'
                : `Across ${plural(spend.doneCount, 'finished job')}.`}
              {spend.aheadCount > 0 ? ` Another ${money(spend.booked)} is booked ahead.` : ''}
            </p>
            {spend.byService.length > 0 && (
              <Segments
                className="mt-4"
                label="Spend by kind of job"
                format={(n) => money(n)}
                parts={spend.byService.map((s) => ({ label: s.name, value: s.amount }))}
              />
            )}
            <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-3">
              Every price is fixed, whoever does the job. {100 - PLATFORM_FEE_PCT}% goes to them and Loop keeps{' '}
              {PLATFORM_FEE_PCT}%. Payments are simulated in this prototype.
            </p>
          </section>

          <section aria-labelledby="svc-people" className="rounded-lg bg-surface p-5 shadow-card">
            <h2 id="svc-people" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
              Who would turn up
            </h2>
            <p className="mt-1 mb-4 text-[13px] leading-relaxed text-ink-2">
              Each person is checked by the Loop team before they can take a job. This is what is on file.
            </p>
            {people.length === 0 ? (
              <Empty
                className="px-0 py-4"
                icon={<UsersThree />}
                title="Nobody is in the network yet"
                body="Inspectors, viewing hosts and Tribunal representatives appear here once the Loop team has vetted them. Until then nothing can be booked."
              />
            ) : (
              <ul className="divide-y divide-line">
                {people.map((p) => (
                  <Person key={p.id} p={p} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <BookInspectionSheet open={book === 'routine_inspection'} onClose={() => open()} />
      <BookTaskSheet type={book && book !== 'routine_inspection' ? book : null} onClose={() => open()} />

      <Modal
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        size="sm"
        title={cancelling ? `Cancel the ${serviceOf(cancelling.type).name.toLowerCase()}?` : 'Cancel this job?'}
        description={
          cancelling
            ? `${cancelWho?.name ?? 'The person booked'} is stood down${cancelling.scheduledFor ? ` for ${fmtDate(dateOf(cancelling.scheduledFor))}` : ''}${cancelling.inspectionId ? ', and the inspection notice to the tenants is withdrawn' : ''}. Nothing has been charged.`
            : undefined
        }
        footer={
          <>
            <Button intent="ghost" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button
              intent="danger"
              onClick={() => {
                if (!cancelling) return
                const verdict = cancelFieldTask(cancelling.id)
                if (verdict.ok) toast('Job cancelled', { description: 'It stays on the list below as cancelled.' })
                else toast.error(verdict.reason ?? 'That could not be cancelled')
                setCancelling(null)
              }}
            >
              Cancel the job
            </Button>
          </>
        }
      />
    </Page>
  )
}
