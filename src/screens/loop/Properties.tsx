/**
 * Properties.
 *
 * What this screen does that no other does: it shows the portfolio as places.
 * Everywhere else a property is a line on a list of things to do or a row in a
 * ledger. Here each one is a home with a picture, the people in it, and the
 * one thing — if any — that it needs from its owner.
 */
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Bed, Car, CheckCircle, Plus, Shower, ShieldCheck, ShieldWarning } from '@phosphor-icons/react'
import type { Property, Tenancy } from '@/domain/types'
import { propertyFinance } from '@/domain/finance'
import { fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { activeTenancy, useActions, useComplianceReports, useNameOf, useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Avatar, PageHeader } from '@/ui/display'
import { PropertyArt } from '@/ui/PropertyArt'
import { cn } from '@/ui/cn'
import { Button } from '@/ui/Button'
import { AddHome } from './AddHome'

const TONE_DOT = { danger: 'bg-danger', warn: 'bg-warn', info: 'bg-info', accent: 'bg-accent' } as const

function statusOf(p: Property, t: Tenancy | undefined): { label: string; className: string } {
  if (t?.status === 'notice_given') return { label: 'Notice given', className: 'bg-warn-soft text-warn-text' }
  if (t) return { label: 'Let', className: 'bg-surface/95 text-ink' }
  if (p.listing?.status === 'live') return { label: 'Listed', className: 'bg-accent text-accent-ink' }
  return { label: 'Vacant', className: 'bg-danger-soft text-danger-text' }
}

export function Properties() {
  const day = useToday()
  const orgId = useStore((s) => s.session?.orgId)
  const all = useStore((s) => s.db.properties)
  const tenancies = useStore((s) => s.db.tenancies)
  const ledger = useStore((s) => s.db.ledger)
  const users = useStore((s) => s.db.users)
  const applications = useStore((s) => s.db.applications)
  const nameOf = useNameOf()
  const [adding, setAdding] = useState(false)
  const actions = useActions()
  const reports = useComplianceReports()

  const rows = useMemo(
    () =>
      all
        .filter((p) => p.orgId === orgId)
        .map((p) => {
          const t = activeTenancy(tenancies, p.id)
          return { p, t, f: propertyFinance(p, t, ledger, day) }
        }),
    [all, tenancies, ledger, orgId, day],
  )
  const value = rows.reduce((a, r) => a + r.p.currentValue, 0)
  const equity = rows.reduce((a, r) => a + r.f.equity, 0)
  const letCount = rows.filter((r) => r.t).length
  const listed = rows.filter((r) => !r.t && r.p.listing?.status === 'live').length
  const countWord =
    ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][rows.length] ?? String(rows.length)

  return (
    <Page wide>
      <PageHeader
        eyebrow="Properties"
        title={`${countWord} ${rows.length === 1 ? 'home' : 'homes'}`}
        lede={
          <>
            Worth <span className="num font-medium text-ink">${(value / 1e6).toFixed(2)}M</span>, with{' '}
            <span className="num font-medium text-ink">${(equity / 1e6).toFixed(2)}M</span> of it yours. {letCount}{' '}
            {letCount === 1 ? 'is' : 'are'} let
            {listed ? `; ${listed} ${listed === 1 ? 'is' : 'are'} listed and looking for a tenant` : ''}.
          </>
        }
        actions={
          <Button intent="primary" icon={<Plus weight="bold" className="size-4" />} onClick={() => setAdding(true)}>
            Add a home
          </Button>
        }
      />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
        {rows.map(({ p, t, f }, i) => {
          const status = statusOf(p, t)
          const next = actions.find((a) => a.propertyId === p.id)
          const score = reports.find((r) => r.property.id === p.id)?.report.score ?? 100
          const applicants = applications.filter(
            (a) => a.propertyId === p.id && ['interest', 'viewing_booked', 'preferred'].includes(a.stage),
          ).length
          const tenants = t
            ? t.tenantIds.map((id) => users.find((u) => u.id === id)).filter((u) => u !== undefined)
            : []
          return (
            <li key={p.id} className="animate-rise" style={{ animationDelay: `${i * 45}ms` }}>
              <Link
                to="/loop/properties/$id"
                params={{ id: p.id }}
                className="group flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-card transition-shadow duration-200 hoverable:hover:shadow-pop"
              >
                <div className="relative">
                  <PropertyArt
                    kind={p.kind}
                    art={p.art}
                    className="aspect-[16/9] transition-transform duration-500 ease-out hoverable:group-hover:scale-[1.03]"
                  />
                  <span
                    className={cn(
                      'absolute top-3 left-3 rounded-[5px] px-2 py-1 text-[11px] font-semibold shadow-card',
                      status.className,
                    )}
                  >
                    {status.label}
                  </span>
                  <span
                    className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-[5px] bg-surface/95 px-1.5 py-1 text-[11px] font-semibold text-ink shadow-card"
                    title="Compliance score"
                  >
                    {score >= 90 ? (
                      <ShieldCheck weight="fill" className="size-3.5 text-ok" aria-hidden />
                    ) : (
                      <ShieldWarning weight="fill" className="size-3.5 text-warn" aria-hidden />
                    )}
                    <span className="num">{score}</span>
                    <span className="sr-only">compliance score</span>
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">
                        {p.address.line1}
                      </h2>
                      <p className="truncate text-[13px] text-ink-3">
                        {p.address.suburb}, {p.address.city}
                      </p>
                    </div>
                    <p className="flex shrink-0 items-center gap-2.5 pt-0.5 text-xs text-ink-3">
                      <span className="inline-flex items-center gap-1">
                        <Bed className="size-3.5" aria-hidden />
                        <span className="num">{p.beds}</span>
                        <span className="sr-only">bedrooms</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Shower className="size-3.5" aria-hidden />
                        <span className="num">{p.baths}</span>
                        <span className="sr-only">bathrooms</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Car className="size-3.5" aria-hidden />
                        <span className="num">{p.parking}</span>
                        <span className="sr-only">car parks</span>
                      </span>
                    </p>
                  </div>

                  <div className="mt-3.5 flex items-center gap-2.5">
                    {t ? (
                      <>
                        <span className="flex -space-x-1.5">
                          {tenants.map((u) => (
                            <Avatar
                              key={u.id}
                              name={u.fullName}
                              hue={u.hue}
                              size={26}
                              className="ring-2 ring-surface"
                            />
                          ))}
                        </span>
                        <p className="min-w-0 truncate text-[13px] text-ink-2">
                          {t.tenantIds.map((id) => nameOf(id).split(' ')[0]).join(' & ')}
                          <span className="text-ink-3">
                            {' '}
                            ·{' '}
                            {t.type === 'fixed' && t.endDate
                              ? `fixed to ${fmtDate(t.endDate, { weekday: false, year: 'always' })}`
                              : `since ${fmtDate(t.startDate, { weekday: false, year: 'always' })}`}
                          </span>
                        </p>
                      </>
                    ) : p.listing?.status === 'live' ? (
                      <p className="text-[13px] text-ink-2">
                        Listed at a fixed{' '}
                        <span className="num font-medium text-ink">{money(p.listing.advertisedWeeklyRent)}</span> ·{' '}
                        {applicants} {applicants === 1 ? 'applicant' : 'applicants'} ·{' '}
                        <span className="num">{p.listing.views}</span> views
                      </p>
                    ) : (
                      <p className="text-[13px] text-ink-2">No tenant and not listed.</p>
                    )}
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3.5">
                    <div className="min-w-0">
                      <dt className="eyebrow truncate">Rent</dt>
                      <dd className="num mt-0.5 text-[15px] font-semibold text-ink">
                        {f.weeklyRent ? money(f.weeklyRent) : '—'}
                        {f.weeklyRent > 0 && <span className="text-xs font-normal text-ink-3"> /wk</span>}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="eyebrow truncate">Net yield</dt>
                      <dd className="num mt-0.5 text-[15px] font-semibold text-ink">
                        {f.weeklyRent ? `${f.netYieldPct.toFixed(1)}%` : '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="eyebrow truncate">Fund</dt>
                      <dd className="num mt-0.5 text-[15px] font-semibold text-ink">{money(p.sinkingFund.balance)}</dd>
                    </div>
                  </dl>

                  <p className="mt-auto flex items-center gap-2 pt-4 text-[13px]">
                    {next ? (
                      <>
                        <span aria-hidden className={cn('size-2 shrink-0 rounded-full', TONE_DOT[next.tone])} />
                        <span className="min-w-0 flex-1 truncate text-ink">{next.title}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle weight="fill" className="size-4 shrink-0 text-ok" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-ink-2">Nothing needs you here</span>
                      </>
                    )}
                    <ArrowRight
                      className="size-4 shrink-0 text-ink-3 transition-transform duration-200 hoverable:group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
      <AddHome key={adding ? 'open' : 'closed'} open={adding} onClose={() => setAdding(false)} />
    </Page>
  )
}
