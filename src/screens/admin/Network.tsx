/**
 * Field network.
 *
 * What this screen does that no other does: it is the supply side. The other
 * customer screens are about who pays the platform; this one is about who does
 * the physical work for it — whether each of them has been checked, and what
 * each job earned them and earned Loop. The roster is a wall of people rather
 * than a table because there are few of them and the question is always about
 * one; the jobs are a ledger because the question there is always the total.
 */
import { useMemo } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CheckCircle, CircleDashed, ClockCountdown, MapPinLine, MinusCircle, Star, Wallet, XCircle } from '@phosphor-icons/react'
import type { FieldTask, Provider } from '@/domain/types'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { money, plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { PLATFORM_FEE_PCT } from '@/data/mutations'
import { CHECK_LABEL, markPaidOut } from '@/data/admin-mutations'
import { Page } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Segmented } from '@/ui/controls'
import { Empty, Fact, Facts } from '@/ui/display'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { Head, Panel, Simulated, Status, Tally, type Icon, type Tone } from './kit'
import { VETTING } from './labels'
import { oneOf, text } from './format'
import { arrowNav, useLast } from './hooks'
import { Vetting } from './network/Vetting'

const SHOWS = ['all', 'vetted', 'pending', 'suspended'] as const
type Show = (typeof SHOWS)[number]

export interface NetworkSearch {
  provider?: string
  show?: Show
}

export function networkSearch(s: Record<string, unknown>): NetworkSearch {
  return { provider: text(s.provider), show: oneOf(s.show, SHOWS) }
}

const route = getRouteApi('/admin/network')

const CHECKS = Object.keys(CHECK_LABEL) as (keyof Provider['checks'])[]
const CHECK_SHORT: Record<keyof Provider['checks'], string> = { identity: 'ID', insurance: 'Insured', licence: 'Licence', policeVet: 'Police vet' }
const KIND: Record<Provider['kind'], string> = { trade: 'Trade', inspector: 'Inspector', agent: 'Agent' }

const TASK_TYPE: Record<FieldTask['type'], string> = { routine_inspection: 'Routine inspection', viewing: 'Viewing', entry_exit_report: 'Entry or exit report', tribunal_representation: 'Tribunal representation' }
const TASK_STATE: Record<FieldTask['status'], { label: string; tone: Tone; icon: Icon }> = {
  requested: { label: 'Requested', tone: 'info', icon: CircleDashed },
  accepted: { label: 'Accepted', tone: 'info', icon: CircleDashed },
  scheduled: { label: 'Scheduled', tone: 'accent', icon: ClockCountdown },
  completed: { label: 'Done, payout due', tone: 'warn', icon: Wallet },
  paid_out: { label: 'Paid out', tone: 'ok', icon: CheckCircle },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: MinusCircle },
}
const earned = (t: FieldTask) => t.status === 'completed' || t.status === 'paid_out'

function ProviderCard({ p, selected, onOpen }: { p: Provider; selected: boolean; onOpen: () => void }) {
  const lamp = VETTING[p.vetting]
  return (
    <li className="min-w-0">
      <button
        type="button"
        data-row-open
        onClick={onOpen}
        aria-current={selected || undefined}
        className={cn('pressable flex h-full w-full flex-col rounded-lg bg-surface p-3.5 text-left shadow-card transition-shadow hoverable:hover:shadow-pop', selected && 'shadow-[inset_0_0_0_2px_var(--accent)]')}
      >
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-semibold text-ink">{p.name}</span>
            <span className="block truncate text-xs text-ink-3">
              {p.trade} · {p.region}
            </span>
          </span>
          <span className="shrink-0 font-mono text-[10px] tracking-wide text-ink-3 uppercase">{KIND[p.kind]}</span>
        </span>
        <Status tone={lamp.tone} icon={lamp.icon} strong={p.vetting !== 'vetted'} className="mt-2.5 text-xs">
          {lamp.label}
        </Status>
        <span className="mt-2 mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          {CHECKS.map((c) => (
            <span key={c} className={cn('inline-flex items-center gap-1', p.checks[c] ? 'text-ink-2' : 'text-ink-3')}>
              {p.checks[c] ? <CheckCircle weight="fill" className="size-3.5 shrink-0 text-ok-text" aria-hidden /> : <XCircle className="size-3.5 shrink-0 text-ink-3" aria-hidden />}
              <span className="truncate">
                {CHECK_SHORT[c]}
                <span className="sr-only">{p.checks[c] ? ': on file' : ': missing'}</span>
              </span>
            </span>
          ))}
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2.5 text-xs text-ink-2">
          {p.jobs > 0 ? (
            <span className="num inline-flex items-center gap-1">
              <Star weight="fill" className="size-3.5 text-warn" aria-hidden />
              <span className="font-semibold text-ink">{p.rating.toFixed(1)}</span> · {plural(p.jobs, 'job')}
            </span>
          ) : (
            <span className="text-ink-3">No jobs yet</span>
          )}
          <span className="num text-ink-3">answers in {p.responseHours} h</span>
        </span>
      </button>
    </li>
  )
}

export function ProviderDetail({ p }: { p: Provider }) {
  const fieldTasks = useStore((s) => s.db.fieldTasks)
  const tickets = useStore((s) => s.db.tickets)
  const mine = useMemo(() => fieldTasks.filter((t) => t.providerId === p.id), [fieldTasks, p.id])
  const openTickets = useMemo(() => tickets.filter((t) => t.providerId === p.id && t.status !== 'closed').length, [tickets, p.id])
  const done = mine.filter(earned)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Facts>
        <Fact label="Work">{p.trade}</Fact>
        <Fact label="Covers">{p.region}</Fact>
        <Fact label="Joined">{fmtDate(dateOf(p.joinedAt), { weekday: false, year: 'always' })}</Fact>
        <Fact label="Record">{p.jobs > 0 ? `${p.rating.toFixed(1)} from ${plural(p.jobs, 'job')}` : 'No jobs yet'}</Fact>
        {p.kind === 'trade' && (
          <Fact label="Rates">
            {money(p.calloutFee)} call-out · {money(p.hourlyRate)} an hour
          </Fact>
        )}
        <Fact label="Field tasks through Loop">
          {mine.length === 0 ? 'None' : `${plural(done.length, 'job')} done, ${money(done.reduce((a, t) => a + t.price - t.platformFee, 0))} earned`}
        </Fact>
        <Fact label="Open repair jobs">{openTickets}</Fact>
      </Facts>
      <section>
        <h3 className="eyebrow mb-2">Vetting</h3>
        <Vetting provider={p} />
      </section>
    </div>
  )
}

export function Network() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const me = useMe()
  const providers = useStore((s) => s.db.providers)
  const fieldTasks = useStore((s) => s.db.fieldTasks)
  const properties = useStore((s) => s.db.properties)
  const orgs = useStore((s) => s.db.orgs)
  const show: Show = search.show ?? 'all'
  const set = (patch: Partial<NetworkSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const roster = useMemo(
    () => providers.filter((p) => show === 'all' || p.vetting === show).sort((a, b) => Number(a.vetting === 'vetted') - Number(b.vetting === 'vetted') || b.jobs - a.jobs || a.name.localeCompare(b.name)),
    [providers, show],
  )
  const jobs = useMemo(() => [...fieldTasks].sort((a, b) => (b.scheduledFor ?? b.requestedAt).localeCompare(a.scheduledFor ?? a.requestedAt)), [fieldTasks])
  const totals = useMemo(() => {
    const done = fieldTasks.filter(earned)
    const paid = fieldTasks.filter((t) => t.status === 'paid_out')
    const due = fieldTasks.filter((t) => t.status === 'completed')
    const net = (list: FieldTask[]) => list.reduce((a, t) => a + t.price - t.platformFee, 0)
    return { gmv: done.reduce((a, t) => a + t.price, 0), fees: done.reduce((a, t) => a + t.platformFee, 0), paid: net(paid), due: net(due), dueCount: due.length, done: done.length, ahead: fieldTasks.filter((t) => t.status === 'requested' || t.status === 'accepted' || t.status === 'scheduled').length }
  }, [fieldTasks])
  const providerName = useMemo(() => new Map(providers.map((p) => [p.id, p.name])), [providers])
  const address = useMemo(() => new Map(properties.map((p) => [p.id, p.address.line1])), [properties])
  const orgName = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs])

  const open = providers.find((p) => p.id === search.provider)
  const shown = useLast(open)
  const count = (s: Show) => (s === 'all' ? providers.length : providers.filter((p) => p.vetting === s).length)

  return (
    <Page wide>
      <Head
        title="Field network"
        lede={
          <>
            The trades, inspectors and agents who do the physical work, and what each job earned. Loop keeps {PLATFORM_FEE_PCT}% of a field task and the provider is paid the rest. The providers are invented for the demo.
          </>
        }
      />

      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-card lg:grid-cols-4">
        {[
          { label: 'Field-task GMV', value: money(totals.gmv), sub: `${plural(totals.done, 'job')} done · ${totals.ahead} booked ahead` },
          { label: 'Platform fees', value: money(totals.fees), sub: `${PLATFORM_FEE_PCT}% of each job` },
          { label: 'Paid to providers', value: money(totals.paid), sub: null, simulated: true },
          { label: 'Payouts due', value: money(totals.due), sub: totals.dueCount ? `${plural(totals.dueCount, 'job')} done and not paid out` : 'Nothing is owed to a provider' },
        ].map((f) => (
          <div key={f.label} className="min-w-0 bg-surface px-4 py-3">
            <dt className="eyebrow truncate">{f.label}</dt>
            <dd>
              <span className="num mt-1 block text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink">{f.value}</span>
              {f.simulated ? <Simulated className="mt-1">Simulated: no money moves</Simulated> : <span className="block truncate text-xs text-ink-3">{f.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="roster-title" className="mb-6">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="roster-title" className="text-[13px] font-semibold text-ink">
            Providers
          </h2>
          <Segmented
            label="Which providers to show"
            size="sm"
            value={show}
            onChange={(v) => set({ show: v === 'all' ? undefined : v })}
            options={[
              { value: 'all', label: `All · ${count('all')}` },
              { value: 'vetted', label: `Vetted · ${count('vetted')}` },
              { value: 'pending', label: `In vetting · ${count('pending')}` },
              { value: 'suspended', label: `Suspended · ${count('suspended')}` },
            ]}
          />
        </div>
        {roster.length === 0 ? (
          <div className="rounded-lg bg-surface shadow-card">
            {providers.length === 0 ? (
              <Empty icon={<MapPinLine />} title="No providers yet" body="Trades, inspectors and agents who apply to do work through Loop appear here to be vetted before they can take a job." />
            ) : (
              <Empty icon={<MapPinLine />} title={show === 'suspended' ? 'Nobody is suspended' : 'No provider in this state'} body="The rest of the roster is under All." action={<Button onClick={() => set({ show: undefined })}>Show everyone</Button>} />
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" onKeyDown={arrowNav}>
            {roster.map((p) => (
              <ProviderCard key={p.id} p={p} selected={p.id === search.provider} onOpen={() => set({ provider: p.id })} />
            ))}
          </ul>
        )}
        <Tally shown={roster.length} total={providers.length} noun="provider" />
      </section>

      <Panel
        title="Field tasks"
        note="Inspections, viewings and reports booked through Loop. Repairs are priced by the trade and are not in these figures."
        action={<Simulated>Payouts simulated</Simulated>}
        bodyClassName=""
      >
        {jobs.length === 0 ? (
          <Empty icon={<Wallet />} title="No field tasks yet" body="When an owner delegates an inspection or a viewing, the job appears here with what it cost them, what Loop kept and what the provider is owed." />
        ) : (
          <>
            <table className="hidden w-full table-fixed text-left text-[13px] sm:table">
              <caption className="sr-only">Field tasks with price, platform fee and payout</caption>
              <thead>
                <tr className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase [&>th]:h-9 [&>th]:border-b [&>th]:border-line [&>th]:px-3 [&>th]:font-medium">
                  <th scope="col">Job</th>
                  <th scope="col" className="hidden w-44 xl:table-cell">
                    Provider
                  </th>
                  <th scope="col" className="hidden w-[6.5rem] lg:table-cell">
                    When
                  </th>
                  <th scope="col" className="w-44">
                    State
                  </th>
                  <th scope="col" className="w-20 text-right">
                    Price
                  </th>
                  <th scope="col" className="hidden w-20 text-right lg:table-cell">
                    Fee
                  </th>
                  <th scope="col" className="w-24 text-right">
                    Payout
                  </th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:border-b [&>tr>td]:border-line [&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr>td]:align-top">
                {jobs.map((t) => {
                  const state = TASK_STATE[t.status]
                  const when = t.completedAt ?? t.scheduledFor ?? t.requestedAt
                  return (
                    <tr key={t.id}>
                      <td className="overflow-hidden">
                        <span className="block truncate font-medium text-ink">{TASK_TYPE[t.type]}</span>
                        <span className="block truncate text-xs text-ink-3">
                          {address.get(t.propertyId) ?? 'A property'} ·{' '}
                          <Link to="/admin/orgs" search={{ org: t.orgId }} className="rounded-sm hoverable:hover:underline">
                            {orgName.get(t.orgId) ?? 'an organisation'}
                          </Link>
                        </span>
                      </td>
                      <td className="hidden overflow-hidden xl:table-cell">
                        <span className="block truncate text-ink-2">{t.providerId ? providerName.get(t.providerId) ?? '–' : 'Not assigned'}</span>
                      </td>
                      <td className="num hidden text-ink-2 lg:table-cell">{fmtDate(dateOf(when), { weekday: false })}</td>
                      <td className="overflow-hidden">
                        <Status tone={state.tone} icon={state.icon} strong={t.status === 'completed'}>
                          {state.label}
                        </Status>
                        {t.status === 'completed' && (
                          <Button
                            size="sm"
                            intent="secondary"
                            className="mt-1.5 flex"
                            onClick={() => {
                              markPaidOut(t.id, me.fullName)
                              toast.success('Payout recorded', { description: 'Simulated: the prototype moves no money.' })
                            }}
                          >
                            Record payout
                          </Button>
                        )}
                      </td>
                      <td className="num text-right text-ink">{money(t.price)}</td>
                      <td className="num hidden text-right text-ink-2 lg:table-cell">{money(t.platformFee)}</td>
                      <td className="num text-right font-medium text-ink">{money(t.price - t.platformFee)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="[&>*]:px-3 [&>*]:py-2.5">
                  <th scope="row" className="text-left font-semibold text-ink">
                    Done so far
                  </th>
                  <td className="hidden xl:table-cell" />
                  <td className="hidden lg:table-cell" />
                  <td className="text-xs text-ink-3">{plural(totals.done, 'job')}</td>
                  <td className="num text-right font-semibold text-ink">{money(totals.gmv)}</td>
                  <td className="num hidden text-right font-semibold text-ink lg:table-cell">{money(totals.fees)}</td>
                  <td className="num text-right font-semibold text-ink">{money(totals.gmv - totals.fees)}</td>
                </tr>
              </tfoot>
            </table>

            <ul className="divide-y divide-line sm:hidden">
              {jobs.map((t) => {
                const state = TASK_STATE[t.status]
                return (
                  <li key={t.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{TASK_TYPE[t.type]}</p>
                        <p className="truncate text-xs text-ink-3">
                          {address.get(t.propertyId) ?? 'A property'} · {t.providerId ? providerName.get(t.providerId) : 'not assigned'}
                        </p>
                      </div>
                      <p className="num shrink-0 text-right text-[13px] font-semibold text-ink">
                        {money(t.price)}
                        <span className="block text-[11px] font-normal text-ink-3">{money(t.platformFee)} fee</span>
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <Status tone={state.tone} icon={state.icon} className="text-xs">
                        {state.label}
                      </Status>
                      {t.status === 'completed' && (
                        <Button size="sm" intent="secondary" onClick={() => markPaidOut(t.id, me.fullName)}>
                          Record payout
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
              <li className="flex items-baseline justify-between gap-3 px-4 py-3 text-[13px]">
                <span className="font-semibold text-ink">Done so far</span>
                <span className="num text-ink-2">
                  {money(totals.gmv)} · {money(totals.fees)} in fees
                </span>
              </li>
            </ul>
          </>
        )}
      </Panel>

      <Sheet
        open={open !== undefined}
        onOpenChange={(o) => !o && set({ provider: undefined })}
        eyebrow={shown ? `${KIND[shown.kind]} · ${shown.region}` : undefined}
        title={shown?.name ?? ''}
        description={
          shown ? (
            <Status tone={VETTING[shown.vetting].tone} icon={VETTING[shown.vetting].icon} strong>
              {VETTING[shown.vetting].label}
            </Status>
          ) : undefined
        }
      >
        {shown && <ProviderDetail key={shown.id} p={shown} />}
      </Sheet>
    </Page>
  )
}
