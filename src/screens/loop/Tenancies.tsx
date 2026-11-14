/**
 * Tenancies.
 *
 * What this screen does that no other does: it holds the agreement itself —
 * who it is with, what it costs, how long it runs — and it is the only place
 * that agreement is changed or ended. Every date here is worked out from the
 * rule pack; the landlord chooses what should happen, never when it may.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, CalendarCheck, DotsThree, FileText, HouseLine, Scales, TrendUp } from '@phosphor-icons/react'
import type { Notice, Property, Tenancy } from '@/domain/types'
import { diffDays, fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { fixedTermWindow, planRentIncrease } from '@/domain/rules/tenancy'
import { useOrgRows, useStore } from '@/data/store'
import { activeTenancy, calendarOf, useNameOf, usePack, useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Tabs } from '@/ui/controls'
import { Avatar, Empty, PageHeader } from '@/ui/display'
import { ActionMenu } from '@/ui/overlays'
import { Modal, Sheet } from '@/ui/Sheet'
import { useLast } from '@/ui/hooks'
import { FixedTermDecision } from './decisions/tenancy'
import { Applicants } from './tenancies/Applicants'
import { Changes } from './tenancies/Changes'
import { EndTenancy } from './tenancies/EndTenancy'
import { NoticeDoc } from './tenancies/NoticeDoc'
import { RentReview } from './tenancies/RentReview'
import { TribunalPack } from './tenancies/TribunalPack'

export type TenanciesView = 'agreements' | 'applicants' | 'changes' | 'notices'
type Flow = { kind: 'rent' | 'end' | 'pack'; tenancyId: string }

/* ─────────────────────────────── a fixed term ───────────────────────────── */

/** The term as a line: how much has run, where today is, and when notice can be given. */
function TermBar({ t, opens, closes, today }: { t: Tenancy; opens: string; closes: string; today: string }) {
  if (!t.endDate) return null
  const span = Math.max(1, diffDays(t.startDate, t.endDate))
  const at = (d: string) => `${Math.min(100, Math.max(0, (diffDays(t.startDate, d) / span) * 100))}%`
  return (
    <div>
      <div
        className="relative h-2.5 rounded-full bg-sunken"
        role="img"
        aria-label={`Fixed term from ${fmtDate(t.startDate, { year: 'always', weekday: false })} to ${fmtDate(t.endDate, { year: 'always', weekday: false })}. Notice can be given between ${fmtDate(opens, { weekday: false })} and ${fmtDate(closes, { weekday: false })}.`}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 rounded-full bg-line-strong"
          style={{ width: at(today) }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 rounded-[3px] bg-accent/70"
          style={{ left: at(opens), width: `calc(${at(closes)} - ${at(opens)})` }}
        />
        <span
          aria-hidden
          className="absolute top-1/2 h-[18px] w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink"
          style={{ left: at(today) }}
        />
      </div>
      <div className="mt-1.5 flex justify-between gap-3 text-[11px] text-ink-3">
        <span className="num">{fmtDate(t.startDate, { year: 'always', weekday: false })}</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-[2px] bg-accent/70" />
          notice window
        </span>
        <span className="num">{fmtDate(t.endDate, { year: 'always', weekday: false })}</span>
      </div>
    </div>
  )
}

/* ──────────────────────────────── one tenancy ───────────────────────────── */

function TenancyCard({ property, t, onFlow }: { property: Property; t: Tenancy; onFlow: (f: Flow) => void }) {
  const pack = usePack()
  const day = useToday()
  const nameOf = useNameOf()
  const users = useStore((s) => s.db.users)
  const notices = useStore((s) => s.db.notices)
  const cal = calendarOf(pack, property)
  const names = t.tenantIds.map(nameOf)
  const window = t.type === 'fixed' && t.endDate ? fixedTermWindow(pack, cal, t.endDate, day) : null
  const rentPlan = planRentIncrease(pack, cal, t, { sentOn: day, method: 'email' })
  const rise = notices.find(
    (n) => n.tenancyId === t.id && n.type === 'rent_increase' && n.status === 'served' && n.effectiveOn > day,
  )
  const ending = t.status === 'notice_given' && t.noticeGiven

  return (
    <li className="flex flex-col gap-4 rounded-lg bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex shrink-0 -space-x-2">
            {t.tenantIds.slice(0, 3).map((id) => (
              <Avatar
                key={id}
                name={nameOf(id)}
                hue={users.find((u) => u.id === id)?.hue ?? 200}
                size={34}
                className="ring-2 ring-surface"
              />
            ))}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">
              {names.map((n) => n.split(' ')[0]).join(' and ')}
            </p>
            <p className="truncate text-[13px] text-ink-2">{property.address.line1}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="num text-[17px] font-semibold text-ink">{money(t.weeklyRent)}</p>
          <p className="text-xs text-ink-3">a week</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ending ? (
          <Badge tone="warn" dot>
            Ends {fmtDate(ending.endsOn, { year: 'always', weekday: false })}
          </Badge>
        ) : t.type === 'fixed' && t.endDate ? (
          <Badge tone="info">Fixed term</Badge>
        ) : (
          <Badge tone="neutral">Periodic</Badge>
        )}
        {t.bond.lodgedOn ? <Badge tone="outline">Bond lodged</Badge> : <Badge tone="warn">Bond not lodged</Badge>}
        {t.pets.length > 0 && <Badge tone="outline">{t.pets.length === 1 ? 'One pet' : `${t.pets.length} pets`}</Badge>}
      </div>

      {ending ? (
        <p className="text-[13px] leading-relaxed text-ink-2">
          Notice given by {ending.by === 'tenant' ? 'the tenant' : 'you'} on {fmtDate(ending.on, { weekday: false })}:{' '}
          {ending.ground.charAt(0).toLowerCase() + ending.ground.slice(1)}. The final inspection and bond refund come
          next.
        </p>
      ) : window && t.endDate ? (
        <div className="grid gap-2.5">
          <TermBar t={t} opens={window.opens} closes={window.closes} today={day} />
          <p className="text-[13px] leading-relaxed text-ink-2">
            {window.status === 'open'
              ? `Decide now: notice that it will not continue has to land by ${fmtDate(window.closes)}. Without it, the tenancy rolls on as periodic.`
              : window.status === 'not_open'
                ? `Nothing to decide until ${fmtDate(window.opens, { year: 'always', weekday: false })}, when the notice window opens.`
                : window.status === 'closed'
                  ? 'The notice window has closed. The tenancy becomes periodic when the term ends, on the same terms.'
                  : 'The term has ended.'}
          </p>
        </div>
      ) : (
        <p className="text-[13px] leading-relaxed text-ink-2">
          Runs until one of you gives notice. Since {fmtDate(t.startDate, { year: 'always', weekday: false })}.
        </p>
      )}

      <p className="flex items-start gap-2 rounded-md bg-sunken px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
        <TrendUp className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
        {rise ? (
          <span>
            A rent increase takes effect on{' '}
            <span className="num font-medium text-ink">
              {fmtDate(rise.effectiveOn, { year: 'always', weekday: false })}
            </span>
            . The next one cannot start for {pack.rules['rent_increase.min_interval_months'].value} months after that.
          </span>
        ) : rentPlan.blocked ? (
          <span>{rentPlan.blocked.reason}</span>
        ) : (
          <span>
            With notice given today, a new rent could start on{' '}
            <span className="num font-medium text-ink">
              {fmtDate(rentPlan.earliest, { year: 'always', weekday: false })}
            </span>
            .
          </span>
        )}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        {!rise && (
          <Button size="sm" intent="secondary" onClick={() => onFlow({ kind: 'rent', tenancyId: t.id })}>
            Review the rent
          </Button>
        )}
        {!ending && (
          <Button size="sm" intent="secondary" onClick={() => onFlow({ kind: 'end', tenancyId: t.id })}>
            {t.type === 'fixed' ? 'Renew or end' : 'End the tenancy'}
          </Button>
        )}
        <ActionMenu
          trigger={
            <Button
              size="sm"
              intent="ghost"
              aria-label={`More for ${property.address.line1}`}
              icon={<DotsThree weight="bold" className="size-5" />}
            />
          }
          items={[
            {
              label: 'Build a Tribunal record',
              icon: <Scales className="size-4" />,
              onSelect: () => onFlow({ kind: 'pack', tenancyId: t.id }),
            },
          ]}
        />
      </div>
    </li>
  )
}

function EmptyHome({
  property,
  applying,
  onApplicants,
}: {
  property: Property
  applying: number
  onApplicants: () => void
}) {
  const listing = property.listing
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-dashed border-line-strong p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-sunken text-ink-3">
          <HouseLine weight="fill" className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">Empty</p>
          <p className="truncate text-[13px] text-ink-2">{property.address.line1}</p>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-2">
        {listing?.status === 'live'
          ? `Listed at ${money(listing.advertisedWeeklyRent)} a week, available ${fmtDate(listing.availableFrom, { weekday: false })}. ${applying} ${applying === 1 ? 'person is' : 'people are'} in the running.`
          : 'Not listed. A tenancy starts with a listing at one fixed rent.'}
      </p>
      {applying > 0 && (
        <Button
          size="sm"
          intent="primary"
          className="mt-auto self-start"
          trailing={<ArrowRight className="size-4" />}
          onClick={onApplicants}
        >
          See who is applying
        </Button>
      )}
    </li>
  )
}

/* ─────────────────────────────────── notices ────────────────────────────── */

function Notices() {
  const pack = usePack()
  const notices = useOrgRows('notices')
  const tenancies = useOrgRows('tenancies')
  const properties = useOrgRows('properties')
  const [open, setOpen] = useState<Notice | null>(null)
  const shown = useLast(open)
  const rows = useMemo(() => [...notices].sort((a, b) => b.servedOn.localeCompare(a.servedOn)), [notices])
  const addressOf = (n: Notice) =>
    properties.find((p) => p.id === tenancies.find((t) => t.id === n.tenancyId)?.propertyId)?.address.line1 ?? ''
  const how = (n: Notice) => pack.service.find((s) => s.id === n.method)?.label.toLowerCase() ?? n.method

  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-surface shadow-card">
        <Empty
          icon={<FileText />}
          title="No notices given yet"
          body="Every notice you give through Loop is kept here word for word, with the day the law treats it as received and the rules it was built from."
        />
      </div>
    )
  }
  return (
    <>
      <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
        {rows.map((n) => (
          <li key={n.id} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => setOpen(n)}
              className="pressable grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left hoverable:hover:bg-surface-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium text-ink">{n.title}</span>
                <span className="block truncate text-xs text-ink-3">{addressOf(n)}</span>
              </span>
              <span className="hidden text-[13px] text-ink-2 md:block">
                Given {fmtDate(n.servedOn, { year: 'always', weekday: false })}
                <span className="block text-xs text-ink-3">by {how(n)}</span>
              </span>
              <span className="hidden text-[13px] text-ink-2 md:block">
                Takes effect {fmtDate(n.effectiveOn, { year: 'always', weekday: false })}
                <span className="block text-xs text-ink-3">
                  received {fmtDate(n.deemedReceivedOn, { weekday: false })}
                </span>
              </span>
              <span className="row-span-2 flex items-center gap-2 md:row-span-1">
                <Badge tone={n.status === 'withdrawn' ? 'neutral' : 'ok'} size="sm">
                  {n.status === 'withdrawn' ? 'Withdrawn' : 'Served'}
                </Badge>
              </span>
              <span className="text-xs text-ink-3 md:hidden">
                Given {fmtDate(n.servedOn, { year: 'always', weekday: false })} · effective{' '}
                {fmtDate(n.effectiveOn, { weekday: false })}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Modal
        open={open !== null}
        onOpenChange={(o) => !o && setOpen(null)}
        size="doc"
        title={shown ? addressOf(shown) : ''}
        description={
          shown
            ? `Given ${fmtDate(shown.servedOn, { year: 'always' })} by ${how(shown)} · received ${fmtDate(shown.deemedReceivedOn, { year: 'always' })}`
            : undefined
        }
      >
        {shown && (
          <NoticeDoc
            title={shown.title}
            body={shown.body}
            footer={`Built from rule pack ${shown.packVersion}.`}
            fileName={`notice-${shown.servedOn}.html`}
          />
        )}
      </Modal>
    </>
  )
}

/* ─────────────────────────────────── the hub ────────────────────────────── */

export function Tenancies({ view, review }: { view: TenanciesView; review?: string }) {
  const navigate = useNavigate()
  const properties = useOrgRows('properties')
  const tenancies = useOrgRows('tenancies')
  const applications = useOrgRows('applications')
  const variations = useOrgRows('variations')
  const [flow, setFlow] = useState<Flow | null>(review ? { kind: 'rent', tenancyId: review } : null)

  const homes = useMemo(
    () => properties.map((p) => ({ property: p, t: activeTenancy(tenancies, p.id) })),
    [properties, tenancies],
  )
  const live = homes.filter((h) => h.t).length
  const applying = applications.filter((a) => a.stage !== 'declined' && a.stage !== 'withdrawn')
  const waiting = variations.filter((v) => v.status === 'awaiting_landlord').length
  const shownFlow = useLast(flow)
  const flowTenancy = tenancies.find((t) => t.id === shownFlow?.tenancyId)
  const flowAddress = properties.find((p) => p.id === flowTenancy?.propertyId)?.address.line1
  const setView = (v: TenanciesView) =>
    void navigate({ to: '/loop/tenancies', search: v === 'agreements' ? {} : { view: v }, replace: true })
  const close = () => setFlow(null)

  return (
    <Page wide>
      <PageHeader
        eyebrow="Tenancies"
        title={
          waiting
            ? `${waiting} ${waiting === 1 ? 'request is' : 'requests are'} waiting for your answer`
            : `${live} ${live === 1 ? 'tenancy' : 'tenancies'}, nothing waiting on you`
        }
        lede="The agreement between you and the people in your homes: who is applying, what the rent is, what changes, and how it ends. You choose what should happen; the dates are worked out for you."
      />

      <Tabs
        value={view}
        onChange={setView}
        tabs={[
          { value: 'agreements', label: 'Homes' },
          { value: 'applicants', label: 'Applicants', count: applying.length },
          { value: 'changes', label: 'Changes', count: waiting },
          { value: 'notices', label: 'Notices' },
        ]}
      />

      <div className="pt-5">
        {view === 'agreements' &&
          (homes.length === 0 ? (
            <div className="rounded-lg bg-surface shadow-card">
              <Empty
                icon={<CalendarCheck />}
                title="No tenancies yet"
                body="Add a property first. Its tenancy lives here from the day the agreement is signed to the day the bond is refunded."
              />
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
              {homes.map(({ property, t }) =>
                t ? (
                  <TenancyCard key={property.id} property={property} t={t} onFlow={setFlow} />
                ) : (
                  <EmptyHome
                    key={property.id}
                    property={property}
                    applying={applying.filter((a) => a.propertyId === property.id).length}
                    onApplicants={() => setView('applicants')}
                  />
                ),
              )}
            </ul>
          ))}
        {view === 'applicants' && <Applicants />}
        {view === 'changes' && <Changes />}
        {view === 'notices' && <Notices />}
      </div>

      <Sheet
        open={flow !== null}
        onOpenChange={(o) => !o && close()}
        size={shownFlow?.kind === 'pack' ? 'xl' : 'lg'}
        eyebrow={flowAddress}
        title={
          shownFlow?.kind === 'rent'
            ? 'Review the rent'
            : shownFlow?.kind === 'pack'
              ? 'Tribunal record'
              : flowTenancy?.type === 'fixed'
                ? 'When the fixed term ends'
                : 'End the tenancy'
        }
        description={
          shownFlow?.kind === 'end' && flowTenancy?.type !== 'fixed'
            ? 'Choose the reason first. It sets the notice and what has to be true.'
            : undefined
        }
      >
        {shownFlow?.kind === 'rent' && (
          <RentReview key={shownFlow.tenancyId} tenancyId={shownFlow.tenancyId} done={close} />
        )}
        {shownFlow?.kind === 'end' &&
          (flowTenancy?.type === 'fixed' ? (
            <FixedTermDecision
              tenancyId={shownFlow.tenancyId}
              actionId={`fixed_term:${shownFlow.tenancyId}`}
              done={close}
            />
          ) : (
            <EndTenancy key={shownFlow.tenancyId} tenancyId={shownFlow.tenancyId} done={close} />
          ))}
        {shownFlow?.kind === 'pack' && <TribunalPack tenancyId={shownFlow.tenancyId} />}
      </Sheet>
    </Page>
  )
}
