/**
 * One property.
 *
 * What this screen does that no other does: it answers "what is true about
 * this home right now?" — who lives there and on what terms, what it needs,
 * whether it would stand up to scrutiny, what it earns, and where its keys and
 * papers are. The tab is in the URL, so a link from the action queue lands on
 * the exact part that needs attention.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate, type LinkProps } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Bed, CalendarBlank, Car, CheckCircle, EnvelopeSimple, PawPrint, Phone, Ruler, Shower } from '@phosphor-icons/react'
import type { ActionItem } from '@/domain/actions'
import { propertyFinance } from '@/domain/finance'
import { addDays, addMonths, addWeeks, dateOf, diffDays, fmtDate, fmtRelative } from '@/domain/rules/calendar'
import { bondLodgement, fixedTermWindow } from '@/domain/rules/tenancy'
import { money } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { activeTenancy, calendarOf, useActions, useComplianceReports, usePack, useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Badge } from '@/ui/Badge'
import { Button, buttonClass } from '@/ui/Button'
import { Tabs } from '@/ui/controls'
import { Avatar, Empty, Fact, Facts } from '@/ui/display'
import { PropertyArt } from '@/ui/PropertyArt'
import { cn } from '@/ui/cn'
import { DECIDED_IN_SHEET, DecisionSheet, destinationOf } from '../decisions'
import { Compliance } from './Compliance'
import { PropertyMoney } from './Money'
import { Records } from './Records'

export type PropertyTab = 'overview' | 'compliance' | 'money' | 'records'

const TITLE = { freehold: 'Freehold', unit_title: 'Unit title', cross_lease: 'Cross-lease' } as const
const TONE_DOT = { danger: 'bg-danger', warn: 'bg-warn', info: 'bg-info', accent: 'bg-accent' } as const

export function PropertyScreen({ id, tab }: { id: string; tab: PropertyTab }) {
  const pack = usePack()
  const day = useToday()
  const navigate = useNavigate()
  const orgId = useStore((s) => s.session?.orgId)
  const property = useStore((s) => s.db.properties.find((p) => p.id === id && p.orgId === orgId))
  const tenancies = useStore((s) => s.db.tenancies)
  const ledger = useStore((s) => s.db.ledger)
  const users = useStore((s) => s.db.users)
  const inspections = useStore((s) => s.db.inspections)
  const entity = useStore((s) => s.db.entities.find((e) => e.id === property?.entityId))
  const actions = useActions()
  const reports = useComplianceReports()
  const [open, setOpen] = useState<ActionItem | null>(null)

  const tenancy = property ? activeTenancy(tenancies, property.id) : undefined
  const finance = useMemo(() => (property ? propertyFinance(property, tenancy, ledger, day) : null), [property, tenancy, ledger, day])
  const report = reports.find((r) => r.property.id === id)?.report
  const mine = actions.filter((a) => a.propertyId === id)

  // The dates that matter for this home, soonest first.
  const dates = useMemo(() => {
    if (!property) return []
    const out: { date: string; label: string; detail?: string }[] = []
    const cal = calendarOf(pack, property)
    if (tenancy) {
      out.push({ date: addDays(tenancy.rentPaidTo, 1), label: `Rent of ${money(tenancy.weeklyRent)} due` })
      if (tenancy.bond.receivedOn && !tenancy.bond.lodgedOn) out.push({ date: bondLodgement(pack, cal, tenancy.bond.receivedOn, undefined, day).deadline, label: 'Bond must be lodged', detail: '23 working days from receipt' })
      if (tenancy.type === 'fixed' && tenancy.endDate) {
        const w = fixedTermWindow(pack, cal, tenancy.endDate, day)
        if (w) out.push({ date: w.closes, label: 'Last day for notice about the fixed term', detail: `The term ends ${fmtDate(tenancy.endDate, { year: 'always' })}` })
        out.push({ date: tenancy.endDate, label: 'Fixed term ends' })
      }
      if (tenancy.type === 'periodic') out.push({ date: addMonths(tenancy.lastRentIncrease ?? tenancy.startDate, pack.rules['rent_increase.min_interval_months'].value), label: 'Rent can next be reviewed', detail: 'Twelve months after it was last set' })
      const last = inspections.filter((i) => i.propertyId === property.id && i.status === 'completed').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
      if (last?.completedAt) out.push({ date: addWeeks(dateOf(last.completedAt), property.insurance.inspectionIntervalWeeks ?? 13), label: 'Next inspection due', detail: `${property.insurance.insurer ?? 'Your insurer'} expects one every ${property.insurance.inspectionIntervalWeeks ?? 13} weeks` })
    }
    if (property.insurance.renewsOn) out.push({ date: property.insurance.renewsOn, label: 'Landlord insurance renews', detail: property.insurance.insurer })
    if (property.listing?.status === 'live') out.push({ date: property.listing.availableFrom, label: 'Available to a new tenant' })
    return out.filter((d) => diffDays(day, d.date) >= -30).sort((a, b) => a.date.localeCompare(b.date))
  }, [property, tenancy, inspections, pack, day])

  if (!property || !finance || !report) {
    return (
      <Page>
        <Empty
          className="py-24"
          title="That property is not in this portfolio"
          body="It may have been removed, or the link may belong to a different organisation."
          action={
            <Link to="/loop/properties" className={buttonClass({ intent: 'primary' })}>
              See your properties
            </Link>
          }
        />
      </Page>
    )
  }

  const tenants = tenancy ? tenancy.tenantIds.map((uid) => users.find((u) => u.id === uid)).filter((u) => u !== undefined) : []
  const setTab = (t: PropertyTab) => void navigate({ to: '/loop/properties/$id', params: { id }, search: { tab: t }, replace: true })
  const openAction = (a: ActionItem) => {
    if (DECIDED_IN_SHEET.includes(a.kind)) setOpen(a)
    else if (a.kind === 'compliance' || a.kind === 'insurance') setTab('compliance')
    else {
      const d = destinationOf(a)
      void navigate({ to: d.to as LinkProps['to'], params: d.params as never })
    }
  }

  return (
    <Page wide>
      <Link to="/loop/properties" className="mb-4 inline-flex items-center gap-1.5 rounded-sm text-[13px] text-ink-3 hoverable:hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All properties
      </Link>

      <header className="mb-6 grid gap-5 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:items-end lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <PropertyArt kind={property.kind} art={property.art} label="Illustration" className="aspect-[16/9] rounded-xl shadow-card md:aspect-[16/10]" />
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge tone={tenancy ? 'ok' : property.listing?.status === 'live' ? 'accent' : 'danger'} dot>
              {tenancy ? (tenancy.status === 'notice_given' ? 'Notice given' : 'Let') : property.listing?.status === 'live' ? 'Listed on Pool' : 'Vacant'}
            </Badge>
            <Badge tone="outline">{TITLE[property.titleType]}</Badge>
            {entity && <Badge tone="outline">{entity.name}</Badge>}
          </div>
          <h1 className="display text-[28px] text-ink sm:text-[36px]">{property.address.line1}</h1>
          <p className="mt-1 text-[15px] text-ink-2">
            {property.address.suburb}, {property.address.city} {property.address.postcode}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <Bed className="size-4 text-ink-3" aria-hidden />
              <span className="num">{property.beds}</span> bed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shower className="size-4 text-ink-3" aria-hidden />
              <span className="num">{property.baths}</span> bath
            </span>
            {property.parking > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Car className="size-4 text-ink-3" aria-hidden />
                <span className="num">{property.parking}</span> park
              </span>
            )}
            {property.floorArea > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Ruler className="size-4 text-ink-3" aria-hidden />
                <span className="num">{property.floorArea}</span> m²
              </span>
            )}
            {property.yearBuilt > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank className="size-4 text-ink-3" aria-hidden />
                Built <span className="num">{property.yearBuilt}</span>
              </span>
            )}
          </p>
        </div>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview', count: mine.length },
          { value: 'compliance', label: 'Compliance', count: report.failing + report.attention },
          { value: 'money', label: 'Money' },
          { value: 'records', label: 'Keys and documents' },
        ]}
      />

      <div className="pt-6">
        {tab === 'overview' && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="grid min-w-0 gap-6">
              <section aria-labelledby="needs-title">
                <h2 id="needs-title" className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">
                  {mine.length === 0 ? 'Nothing here needs you' : mine.length === 1 ? 'One thing needs you' : `${mine.length} things need you`}
                </h2>
                {mine.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-card">
                    <CheckCircle weight="fill" className="size-6 shrink-0 text-ok" aria-hidden />
                    <p className="text-[13px] leading-relaxed text-ink-2">Rent, deadlines and requests for this home are all in hand. The next date that matters is on the right.</p>
                  </div>
                ) : (
                  <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
                    {mine.map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0">
                        <span aria-hidden className={cn('size-2 shrink-0 rounded-full', TONE_DOT[a.tone])} />
                        <div className="min-w-0 flex-1 basis-52">
                          <p className="text-[14px] font-medium text-ink">{a.title}</p>
                          {a.clock && <p className="num text-xs text-ink-3">{a.clock}</p>}
                        </div>
                        <Button size="sm" intent={a.priority === 1 ? 'primary' : 'secondary'} onClick={() => openAction(a)} trailing={<ArrowRight weight="bold" className="size-3.5" />}>
                          {a.cta}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="tenancy-title">
                <h2 id="tenancy-title" className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">
                  {tenancy ? 'Who lives here' : 'No tenancy'}
                </h2>
                {tenancy ? (
                  <div className="rounded-lg bg-surface p-5 shadow-card">
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {tenants.map((u) => (
                        <li key={u.id} className="flex items-center gap-3">
                          <Avatar name={u.fullName} hue={u.hue} size={40} />
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-medium text-ink">{u.fullName}</p>
                            <p className="flex flex-wrap gap-x-3 text-xs text-ink-3">
                              <a href={`tel:${u.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 hover:text-accent-text">
                                <Phone className="size-3" aria-hidden />
                                <span className="num">{u.phone}</span>
                              </a>
                              <a href={`mailto:${u.email}`} className="inline-flex min-w-0 items-center gap-1 hover:text-accent-text">
                                <EnvelopeSimple className="size-3 shrink-0" aria-hidden />
                                <span className="truncate">{u.email}</span>
                              </a>
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Facts className="mt-4 border-t border-line pt-2">
                      <Fact label="Rent">
                        <span className="num">{money(tenancy.weeklyRent)}</span> a week, paid to {fmtDate(tenancy.rentPaidTo)}
                      </Fact>
                      <Fact label="Tenancy">{tenancy.type === 'fixed' && tenancy.endDate ? `Fixed term to ${fmtDate(tenancy.endDate, { year: 'always' })}` : `Periodic since ${fmtDate(tenancy.startDate, { weekday: false, year: 'always' })}`}</Fact>
                      <Fact label="Bond">
                        <span className="num">{money(tenancy.bond.amount)}</span> · {tenancy.bond.lodgedOn ? <span className="font-mono text-xs">{tenancy.bond.bondRef}</span> : <span className="text-danger-text">not lodged yet</span>}
                      </Fact>
                      <Fact label="Pets">
                        {tenancy.pets.length ? (
                          <span className="inline-flex items-center gap-1.5">
                            <PawPrint className="size-3.5 text-ink-3" aria-hidden />
                            {tenancy.pets.map((p) => `${p.name}, ${p.kind.toLowerCase()}`).join('; ')}
                          </span>
                        ) : (
                          'None'
                        )}
                      </Fact>
                    </Facts>
                  </div>
                ) : property.listing?.status === 'live' ? (
                  <div className="rounded-lg bg-surface p-5 shadow-card">
                    <p className="text-[15px] font-semibold text-ink">{property.listing.headline}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{property.listing.description}</p>
                    <Facts className="mt-3 border-t border-line pt-2">
                      <Fact label="Advertised rent">
                        <span className="num">{money(property.listing.advertisedWeeklyRent)}</span> a week, fixed
                      </Fact>
                      <Fact label="Available">{fmtDate(property.listing.availableFrom)}</Fact>
                      <Fact label="Showing on">{[property.listing.syndication.pool && 'Pool', property.listing.syndication.trademe && 'Trade Me', property.listing.syndication.realestate && 'realestate.co.nz'].filter(Boolean).join(', ')} (syndication is simulated)</Fact>
                    </Facts>
                  </div>
                ) : (
                  <p className="rounded-lg bg-surface p-5 text-[13px] text-ink-2 shadow-card">This home has no tenant and is not listed. Listing it on Pool takes one fixed rent and a few minutes.</p>
                )}
              </section>
            </div>

            <aside className="rounded-lg bg-surface p-5 shadow-card xl:sticky xl:top-6">
              <p className="eyebrow">Dates that matter</p>
              {dates.length === 0 ? (
                <p className="mt-2 text-[13px] text-ink-2">No dates on the horizon for this home.</p>
              ) : (
                <ol className="mt-3">
                  {dates.map((d, i) => {
                    const days = diffDays(day, d.date)
                    return (
                      <li key={`${d.label}-${d.date}`} className="relative flex gap-3.5 pb-4 last:pb-0">
                        {i < dates.length - 1 && <span aria-hidden className="absolute top-9 bottom-0 left-[19px] w-px bg-line" />}
                        <span className={cn('grid size-10 shrink-0 place-items-center rounded-md text-center leading-none', days < 0 ? 'bg-danger-soft text-danger-text' : days <= 14 ? 'bg-warn-soft text-warn-text' : 'bg-sunken text-ink-2')}>
                          <span className="num block text-[15px] font-semibold">{Number(d.date.slice(8))}</span>
                          <span className="block text-[9px] font-medium uppercase">{fmtDate(d.date, { weekday: false, year: 'never' }).split(' ')[1]}</span>
                        </span>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-[13px] font-medium text-ink">{d.label}</p>
                          <p className="text-xs text-ink-3">
                            {fmtRelative(d.date, day)}
                            {d.detail ? ` · ${d.detail}` : ''}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </aside>
          </div>
        )}
        {tab === 'compliance' && <Compliance property={property} tenancy={tenancy} report={report} onLodgeBond={() => setOpen(actions.find((a) => a.kind === 'bond' && a.propertyId === id) ?? null)} />}
        {tab === 'money' && <PropertyMoney property={property} tenancy={tenancy} finance={finance} />}
        {tab === 'records' && <Records property={property} />}
      </div>

      <DecisionSheet action={open} onClose={() => setOpen(null)} />
    </Page>
  )
}
