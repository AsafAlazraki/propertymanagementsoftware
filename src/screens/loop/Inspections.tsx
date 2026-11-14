/**
 * Inspections.
 *
 * What this screen does that no other does: it keeps each home's inspection
 * rhythm — how long since someone last walked through, how long the insurer
 * allows, and whether a day is booked on notice the law accepts — and it is
 * the shelf every finished report is read from. The clock beside each home is
 * that rhythm: it fills as the weeks pass and empties when a report is filed.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, ClipboardText, DotsThree, HouseLine, UserFocus } from '@phosphor-icons/react'
import type { Inspection, Property, Tenancy } from '@/domain/types'
import type { RuleKey } from '@/domain/jurisdictions/types'
import type { CheckResult } from '@/domain/rules/compliance'
import { byNewest, lastCompleted, rhythmOf, standingOf, standingRank, type Standing } from '@/domain/inspections'
import { dateOf, fmtDate, fmtRelative, fmtTime } from '@/domain/rules/calendar'
import { listOf, money, plural } from '@/domain/rules/format'
import { useOrgRows, useStore } from '@/data/store'
import { useComplianceReports, useNameOf, usePack, useToday } from '@/data/hooks'
import { FIELD_PRICES } from '@/data/mutations'
import { cancelInspection, proposeInspection, rebookInspection, withdrawProposal } from '@/data/ops-mutations'
import { Page } from '@/shell/common'
import { Badge, type Tone } from '@/ui/Badge'
import { Button, buttonClass } from '@/ui/Button'
import { Empty, Num, PageHeader, Ring } from '@/ui/display'
import { Why } from '@/ui/Law'
import { ActionMenu } from '@/ui/overlays'
import { Modal, Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { InspectionDecision } from './decisions/tenancy'
import { InspectionReport } from './inspections/Report'
import { scoreTone, TYPE_LABEL } from './inspections/shared'

interface HomeRow {
  property: Property
  tenancy: Tenancy | undefined
  check: CheckResult | undefined
  standing: Standing
  last: Inspection | undefined
  done: Inspection[]
}

const RULES: RuleKey[] = [
  'entry.inspection_notice_min',
  'entry.inspection_notice_max',
  'entry.inspection_min_interval',
  'entry.hours',
]

const DOT: Record<'ok' | 'warn' | 'danger', string> = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' }

/* ──────────────────────────────── the clock ─────────────────────────────── */

/** Weeks since the last walk-through, against the weeks the insurer allows between them. */
function Clock({ row, today }: { row: HomeRow; today: string }) {
  const { standing, last, check } = row
  if (standing.kind === 'vacant') {
    return (
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-sunken text-ink-3">
        <HouseLine className="size-6" aria-hidden />
        <span className="sr-only">Nobody lives here</span>
      </span>
    )
  }
  const rhythm = rhythmOf(last?.completedAt ? dateOf(last.completedAt) : undefined, check?.due, today)
  if (!rhythm) {
    return (
      <Ring value={0} size={64} stroke={6} label="No inspection on record yet">
        <span className="text-[15px] font-semibold text-ink-3">—</span>
      </Ring>
    )
  }
  const tone =
    standing.kind === 'to_book' && standing.overdue
      ? 'danger'
      : rhythm.weeksSince >= rhythm.weeksBetween
        ? 'warn'
        : 'accent'
  return (
    <Ring
      value={rhythm.weeksSince}
      max={rhythm.weeksBetween}
      size={64}
      stroke={6}
      tone={tone}
      label={`${plural(rhythm.weeksSince, 'week')} since the last inspection; one is expected every ${rhythm.weeksBetween} weeks`}
    >
      <span>
        <Num value={rhythm.weeksSince} className="text-[17px] leading-none font-semibold text-ink" />
        <span className="block text-[10px] leading-tight text-ink-3">of {rhythm.weeksBetween} wk</span>
      </span>
    </Ring>
  )
}

/* ───────────────────────────────── one home ─────────────────────────────── */

function Home({
  row,
  today,
  onBook,
  onRebook,
  onCancel,
  onRead,
}: {
  row: HomeRow
  today: string
  onBook: (propertyId: string) => void
  onRebook: (inspection: Inspection) => void
  onCancel: (inspection: Inspection) => void
  onRead: (inspectionId: string) => void
}) {
  const nameOf = useNameOf()
  const providers = useStore((s) => s.db.providers)
  const { property, tenancy, check, standing, last, done } = row
  const tenants = tenancy ? listOf(tenancy.tenantIds.map((id) => nameOf(id).split(' ')[0])) : ''
  const weeks = property.insurance.inspectionIntervalWeeks
  // The interval is what the landlord recorded from their own policy, so it is said as theirs.
  const cadence = weeks
    ? `Your policy${property.insurance.insurer ? ` with ${property.insurance.insurer}` : ''} asks for one every ${weeks} weeks.`
    : ''
  const lastOn = last?.completedAt ? dateOf(last.completedAt) : undefined

  let badge: { tone: Tone; label: string; pulse?: boolean }
  let story: ReactNode
  let law: RuleKey | undefined
  let action: ReactNode

  switch (standing.kind) {
    case 'underway': {
      const i = standing.inspection
      const scored = i.rooms.filter((r) => r.score !== undefined).length
      badge = { tone: 'accent', label: 'Under way', pulse: true }
      story = `${scored} of ${plural(i.rooms.length, 'room')} scored. Everything so far is saved on the device it was entered on.`
      action = (
        <Link to="/loop/inspections/$id" params={{ id: i.id }} className={buttonClass({ intent: 'primary' })}>
          Carry on
          <ArrowRight weight="bold" className="size-4" aria-hidden />
        </Link>
      )
      break
    }
    case 'booked': {
      const i = standing.inspection
      const provider = providers.find((p) => p.id === i.providerId)
      const when = i.scheduledFor ? `${fmtDate(standing.on)} at ${fmtTime(i.scheduledFor)}` : fmtDate(standing.on)
      const served = i.noticeServedAt
        ? ` Notice went to ${tenants || 'the tenants'} on ${fmtDate(dateOf(i.noticeServedAt))}.`
        : ''
      const delegated = i.mode === 'delegated'
      law = 'entry.inspection_notice_min'
      if (standing.late) {
        badge = { tone: 'warn', label: 'Day passed' }
        story = delegated
          ? `${provider?.name ?? 'An inspector'} was booked for ${when}. Nobody is really sent in this prototype, so no report will arrive. Book a new day to carry on.`
          : `It was booked for ${when} and no walk-through was recorded. The notice named that day, so a new day needs a new notice.`
        action = (
          <Button intent="primary" onClick={() => onRebook(i)}>
            Book a new day
          </Button>
        )
      } else {
        badge = { tone: 'info', label: standing.on === today ? 'Today' : `Booked · ${fmtRelative(standing.on, today)}` }
        story = delegated
          ? `${provider?.name ?? 'A local inspector'} is booked for ${when}.${served} Their report lands here.`
          : `Booked for ${when}. You are doing this one yourself.${served}`
        action = delegated ? (
          <Button intent="secondary" onClick={() => onCancel(i)}>
            Cancel the booking
          </Button>
        ) : (
          <>
            <Link
              to="/loop/inspections/$id"
              params={{ id: i.id }}
              className={buttonClass({ intent: standing.on === today ? 'primary' : 'secondary' })}
            >
              Open the studio
            </Link>
            <ActionMenu
              trigger={
                <Button intent="ghost" size="icon" aria-label={`More for the inspection at ${property.address.line1}`}>
                  <DotsThree weight="bold" className="size-5" aria-hidden />
                </Button>
              }
              items={[{ label: 'Cancel this inspection', tone: 'danger', onSelect: () => onCancel(i) }]}
            />
          </>
        )
      }
      break
    }
    case 'to_book': {
      badge = standing.overdue
        ? { tone: 'danger', label: 'Overdue' }
        : lastOn
          ? { tone: 'warn', label: 'Due' }
          : { tone: 'warn', label: 'None on record' }
      story = [check?.finding ?? 'A routine inspection is waiting for a day.', standing.overdue ? '' : cadence]
        .filter(Boolean)
        .join(' ')
      law = 'entry.inspection_min_interval'
      action = (
        <Button intent="primary" onClick={() => onBook(property.id)}>
          Book it
        </Button>
      )
      break
    }
    case 'current': {
      badge = { tone: 'ok', label: 'Up to date' }
      story = [
        lastOn ? `Last walked through ${fmtRelative(lastOn, today)}.` : '',
        standing.due ? `The next is due around ${fmtDate(standing.due)}.` : '',
        cadence,
      ]
        .filter(Boolean)
        .join(' ')
      action = (
        <Button intent="secondary" onClick={() => onBook(property.id)}>
          Book one early
        </Button>
      )
      break
    }
    case 'vacant': {
      badge = { tone: 'neutral', label: 'Empty' }
      story =
        'Nobody lives here, so there is no routine inspection to plan. An entry report is made when the next tenants move in.'
      action = (
        <Link to="/loop/services" className={buttonClass({ intent: 'secondary' })}>
          Entry and exit reports
        </Link>
      )
      break
    }
  }

  return (
    <li className="rounded-lg bg-surface shadow-card">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-3.5 p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <Clock row={row} today={today} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">
              {property.address.line1}
            </h2>
            <Badge tone={badge.tone} dot pulse={badge.pulse}>
              {badge.label}
            </Badge>
          </div>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-ink-2">{story}</p>
          {law && <Why rule={law} className="mt-2" />}
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-2 lg:col-span-1 lg:justify-end">{action}</div>
      </div>

      <div className="border-t border-line px-4 py-3 sm:px-5">
        {done.length === 0 ? (
          <p className="text-xs leading-relaxed text-ink-3">
            No reports yet. The first one is filed here when a walk-through is finished.
          </p>
        ) : (
          <ul aria-label={`Reports for ${property.address.line1}`} className="flex flex-wrap gap-2">
            {done.map((i) => (
              <li key={i.id} className="max-w-full">
                <button
                  type="button"
                  onClick={() => onRead(i.id)}
                  className="pressable flex min-h-9 max-w-full items-center gap-2 rounded-full bg-sunken py-1 pr-3 pl-2.5 text-xs text-ink-2 transition-colors hoverable:hover:bg-accent-soft hoverable:hover:text-accent-text coarse:min-h-11"
                >
                  <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[scoreTone(i.overallScore)])} />
                  <span className="truncate">
                    {TYPE_LABEL[i.type]} ·{' '}
                    {i.completedAt ? fmtDate(dateOf(i.completedAt), { weekday: false, year: 'always' }) : ''}
                  </span>
                  {i.overallScore !== undefined && (
                    <span className="num shrink-0 font-semibold text-ink">{i.overallScore.toFixed(1)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/* ──────────────────────────────── the screen ────────────────────────────── */

export function Inspections({ book, report }: { book?: string; report?: string }) {
  const day = useToday()
  const pack = usePack()
  const navigate = useNavigate()
  const homes = useComplianceReports()
  const inspections = useOrgRows('inspections')
  const providers = useStore((s) => s.db.providers)
  const [cancelling, setCancelling] = useState<Inspection | null>(null)
  // A proposal opened from here is only a draft: it does not count as due, and if the sheet closes with no day booked it is dropped.
  const [drafted, setDrafted] = useState<string | null>(null)

  const rows = useMemo<HomeRow[]>(
    () =>
      homes
        .map(({ property, tenancy, report: compliance }) => {
          const mine = inspections.filter(
            (i) => i.propertyId === property.id && !(i.id === drafted && i.status === 'proposed'),
          )
          const check = compliance.checks.find((c) => c.def.key === 'inspection_current')
          return {
            property,
            tenancy,
            check,
            standing: standingOf(tenancy, mine, check, day),
            last: lastCompleted(mine, property.id),
            done: mine.filter((i) => i.status === 'completed').sort(byNewest),
          }
        })
        .sort((a, b) => standingRank(a.standing) - standingRank(b.standing)),
    [homes, inspections, day, drafted],
  )

  const go = (search: { book?: string; report?: string }) =>
    void navigate({ to: '/loop/inspections', search, replace: true })
  const addressOf = (propertyId: string | undefined) =>
    rows.find((r) => r.property.id === propertyId)?.property.address.line1

  const startBooking = (propertyId: string) => {
    const waiting = inspections.find((i) => i.propertyId === propertyId && i.status === 'proposed')
    const id = waiting?.id ?? proposeInspection(propertyId)
    if (!id) return
    setDrafted(waiting ? null : id)
    go({ book: id })
  }
  const rebook = (old: Inspection) => {
    const id = rebookInspection(old.id)
    if (!id) return
    setDrafted(id)
    go({ book: id })
  }
  const closeBooking = () => {
    if (book && drafted === book) withdrawProposal(book)
    setDrafted(null)
    go({})
  }

  const booking = inspections.find((i) => i.id === book && i.status === 'proposed')
  const reading = inspections.find((i) => i.id === report && i.status === 'completed')
  const cancelProvider = providers.find((p) => p.id === cancelling?.providerId)

  const underway = rows.find((r) => r.standing.kind === 'underway')
  const toBook = rows.filter(
    (r) => r.standing.kind === 'to_book' || (r.standing.kind === 'booked' && r.standing.late),
  ).length
  const next = rows
    .map((r) => r.standing)
    .filter((s): s is Extract<Standing, { kind: 'booked' }> => s.kind === 'booked' && !s.late)
    .sort((a, b) => a.on.localeCompare(b.on))[0]
  const title = underway
    ? `A walk-through is under way at ${underway.property.address.line1}`
    : toBook
      ? `${plural(toBook, 'inspection')} to book`
      : next
        ? `Next walk-through ${fmtRelative(next.on, day)}`
        : rows.length
          ? 'Every home is up to date'
          : 'No homes to inspect yet'

  return (
    <Page>
      <PageHeader
        eyebrow="Inspections"
        title={title}
        lede="Each home keeps its own rhythm: how long since someone last walked through, and how long your insurer allows. When you book, Loop offers only the days the law permits and serves the notice for you."
      />

      {rows.length === 0 ? (
        <div className="rounded-lg bg-surface shadow-card">
          <Empty
            icon={<ClipboardText />}
            title="No homes to inspect yet"
            body="Inspections follow a home: once a property is here, its last walk-through, its next due date and every report are kept on this screen."
            action={
              <Link to="/loop/properties" className={buttonClass({ intent: 'primary' })}>
                Go to properties
              </Link>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
            {rows.map((row) => (
              <Home
                key={row.property.id}
                row={row}
                today={day}
                onBook={startBooking}
                onRebook={rebook}
                onCancel={setCancelling}
                onRead={(id) => go({ report: id })}
              />
            ))}
          </ul>

          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)]">
            <aside aria-labelledby="inspection-rules" className="rounded-lg bg-nav p-5 text-nav-ink">
              <p className="font-mono text-[11px] tracking-[0.08em] text-nav-ink-2 uppercase">{pack.act.name}</p>
              <h2 id="inspection-rules" className="mt-1 text-[15px] font-semibold tracking-[-0.01em]">
                What the law asks of an inspection
              </h2>
              <ul className="mt-3 grid gap-3.5">
                {RULES.map((key) => (
                  <li key={key}>
                    <p className="text-[13px] leading-relaxed text-nav-ink-2">{pack.rules[key].plain}</p>
                    <Why rule={key} tone="nav" className="mt-1.5" />
                  </li>
                ))}
              </ul>
            </aside>

            <aside aria-labelledby="inspection-who" className="rounded-lg bg-surface p-5 shadow-card">
              <h2 id="inspection-who" className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                Yourself, or someone local
              </h2>
              <ul className="mt-3 grid gap-3 text-[13px] leading-relaxed text-ink-2">
                <li className="flex gap-3">
                  <ClipboardText className="mt-0.5 size-[18px] shrink-0 text-accent-text" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">Do it yourself, free.</span> The studio takes you room by
                    room on your phone and keeps working with no signal.
                  </span>
                </li>
                <li className="flex gap-3">
                  <UserFocus className="mt-0.5 size-[18px] shrink-0 text-accent-text" aria-hidden />
                  <span>
                    <span className="font-medium text-ink">
                      Hand it over for {money(FIELD_PRICES.routine_inspection)}.
                    </span>{' '}
                    A vetted local inspector goes instead. You choose when you book.
                  </span>
                </li>
              </ul>
              <Link
                to="/loop/services"
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[13px] font-medium text-accent-text underline-offset-4 hoverable:hover:underline"
              >
                See who would go
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </aside>
          </div>
        </div>
      )}

      <Sheet
        open={Boolean(booking)}
        onOpenChange={(o) => !o && closeBooking()}
        eyebrow={booking ? `Routine inspection · ${addressOf(booking.propertyId) ?? ''}` : undefined}
        title="Choose the day, and who goes"
        description="The notice is served to the tenants the moment you book."
      >
        {booking && <InspectionDecision inspectionId={booking.id} done={closeBooking} />}
      </Sheet>

      <Sheet
        open={Boolean(reading)}
        onOpenChange={(o) => !o && go({})}
        size="lg"
        eyebrow={reading ? `${TYPE_LABEL[reading.type]} · ${addressOf(reading.propertyId) ?? ''}` : undefined}
        title={
          reading?.completedAt ? `Report from ${fmtDate(dateOf(reading.completedAt), { year: 'always' })}` : 'Report'
        }
      >
        {reading && <InspectionReport inspection={reading} />}
      </Sheet>

      <Modal
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        size="sm"
        title={
          cancelling?.scheduledFor
            ? `Cancel the inspection on ${fmtDate(dateOf(cancelling.scheduledFor))}?`
            : 'Cancel this inspection?'
        }
        description={`The notice to the tenants is withdrawn${cancelProvider ? `, and ${cancelProvider.name} is stood down` : ''}. You can book another day whenever you like.`}
        footer={
          <>
            <Button intent="ghost" onClick={() => setCancelling(null)}>
              Keep it
            </Button>
            <Button
              intent="danger"
              onClick={() => {
                if (!cancelling) return
                const verdict = cancelInspection(cancelling.id)
                if (verdict.ok) toast('Inspection cancelled', { description: 'The notice has been withdrawn.' })
                else toast.error(verdict.reason ?? 'That could not be cancelled', { description: verdict.fix })
                setCancelling(null)
              }}
            >
              Cancel the inspection
            </Button>
          </>
        }
      />
    </Page>
  )
}
