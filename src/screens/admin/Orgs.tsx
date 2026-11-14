/**
 * Organisations.
 *
 * What this screen does that no other does: it is the platform's customer
 * list — every tenant of this multi-tenant system on one sortable table, with
 * the figures that say whether each is healthy (homes, rent roll, what they pay
 * us, compliance, arrears, when they were last seen). Opening one is where an
 * account is changed: its plan, a suspension, the team's notes, and the support
 * view that opens Loop through the owner's eyes.
 */
import { useMemo, useState } from 'react'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Buildings, Eye, Handshake, Prohibit, Warning } from '@phosphor-icons/react'
import type { PlanTier } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { PLAN, planMonthly } from '@/domain/finance'
import { fmtDate, dateOf } from '@/domain/rules/calendar'
import { money, plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { changeOrgPlan, liftSuspension, saveOrgNotes, suspendOrg, viewAsOwner } from '@/data/admin-mutations'
import { Page, roleLabel } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Field, Input, Select, Textarea } from '@/ui/controls'
import { Callout, Empty, Fact, Facts } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { DataTable, Filter, Flag, Gauge, Head, SearchBox, Status, Tally, Toolbar, TwoLine, nextSort, scoreTone, type Column, type Sort } from './kit'
import { IDENTITY, ORG_SOURCE, ORG_STATUS, ORG_STATUS_ORDER } from './labels'
import { PLANS, type OrgsSearch, type SortKey } from './search'
import { matches, whenExact, whenShort } from './format'
import { usePlatform, type OrgRow } from './stats'
import { useLast } from './hooks'

const NUMERIC: SortKey[] = ['properties', 'rentRoll', 'mrr', 'arrears']


const route = getRouteApi('/admin/orgs')

function sortValue(row: OrgRow, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return row.org.name.toLowerCase()
    case 'properties':
      return row.properties
    case 'rentRoll':
      return row.rentRoll
    case 'mrr':
      return row.mrr
    case 'compliance':
      return row.compliance ?? 101
    case 'arrears':
      return row.arrears
    case 'idle':
      return row.idleDays
  }
}

/* ───────────────────────────────── the sheet ────────────────────────────── */

export function OrgDetail({ row }: { row: OrgRow }) {
  const { org, owner } = row
  const me = useMe()
  const navigate = useNavigate()
  const allEntities = useStore((s) => s.db.entities)
  const allUsers = useStore((s) => s.db.users)
  const entities = useMemo(() => allEntities.filter((e) => e.orgId === org.id), [allEntities, org.id])
  const team = useMemo(() => allUsers.filter((u) => u.orgId === org.id), [allUsers, org.id])
  const [plan, setPlan] = useState<PlanTier>(org.plan)
  const [reason, setReason] = useState('')
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const [notes, setNotes] = useState(org.adminNotes ?? '')
  const [why, setWhy] = useState('')
  const status = ORG_STATUS[org.status]
  const newPrice = planMonthly(plan, row.properties)
  const billed = org.status === 'active' || org.status === 'past_due'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {org.status === 'suspended' && (
        <Callout tone="danger" icon={<Prohibit weight="fill" />} title="Suspended: the owner is told so in Loop">
          {org.suspendedReason ? <>A banner across the top of their Loop shows this reason: “{org.suspendedReason}”</> : 'A banner across the top of their Loop says so. No reason was recorded.'} In this prototype that is all a suspension does: it is a mark on the account, and the owner can still change records.
        </Callout>
      )}
      {org.status === 'past_due' && (
        <Callout tone="warn" icon={<Warning weight="fill" />} title="Past due">
          A payment has failed. The account still works; if it is not put right it will be suspended.
        </Callout>
      )}

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-card sm:grid-cols-4">
        {[
          { label: 'Homes', value: String(row.properties), sub: `${row.let} let` },
          { label: 'Rent roll', value: money(row.rentRoll), sub: 'a week' },
          { label: 'Pays us', value: money(row.mrr), sub: billed ? 'a month' : `a month while ${status.label.toLowerCase()}` },
          { label: 'Compliance', value: row.compliance === null ? '–' : String(row.compliance), sub: row.compliance === null ? 'no homes yet' : 'of 100' },
        ].map((f) => (
          <div key={f.label} className="min-w-0 bg-surface px-3 py-2.5">
            <dt className="eyebrow truncate">{f.label}</dt>
            <dd>
              <span className="num block text-[17px] font-semibold tracking-[-0.01em] text-ink">{f.value}</span>
              <span className="block truncate text-[11px] text-ink-3">{f.sub}</span>
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="org-support">
        <h3 id="org-support" className="eyebrow mb-2">
          Support view
        </h3>
        <div className="rounded-lg bg-accent-soft p-3.5">
          <p className="text-[13px] leading-relaxed text-ink">
            Opens Loop exactly as {owner?.fullName ?? 'the owner'} sees it, with a bar across the top saying so. The visit is written to the audit log before the screen changes.
          </p>
          <Field label="What is the visit for?" optional className="mt-3" hint="Goes on the audit line. A ticket number or one phrase is enough.">
            {(p) => <Input {...p} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: owner cannot find an unmatched payment" />}
          </Field>
          <Button
            intent="primary"
            className="mt-3"
            icon={<Eye weight="fill" className="size-4" />}
            onClick={() => {
              viewAsOwner(org, me, why)
              void navigate({ to: '/loop' })
            }}
          >
            View as owner
          </Button>
        </div>
      </section>

      <section aria-labelledby="org-people">
        <h3 id="org-people" className="eyebrow mb-1">
          Owner and entities
        </h3>
        <Facts>
          <Fact label="Owner">
            {owner ? (
              <>
                {owner.fullName} <span className="font-normal text-ink-3">· {owner.email}</span>
              </>
            ) : (
              'No owner on record'
            )}
          </Fact>
          {owner?.phone && (
            <Fact label="Phone">
              <a href={`tel:${owner.phone.replace(/\s/g, '')}`} className="num rounded-sm underline decoration-line-strong underline-offset-2">
                {owner.phone}
              </a>
            </Fact>
          )}
          {owner && (
            <Fact label="Identity">
              <Status tone={IDENTITY[owner.identityVerified ? 'yes' : 'no'].tone} icon={IDENTITY[owner.identityVerified ? 'yes' : 'no'].icon} strong>
                {IDENTITY[owner.identityVerified ? 'yes' : 'no'].label}
              </Status>
            </Fact>
          )}
          {team.length > 1 && <Fact label="Also has access">{team.filter((u) => u.id !== owner?.id).map((u) => `${u.fullName} (${roleLabel(u.role).toLowerCase()})`).join(', ')}</Fact>}
          {entities.map((e) => (
            <Fact key={e.id} label={{ individual: 'Individual', partnership: 'Partnership', family_trust: 'Family trust', ltc_company: 'Look-through company' }[e.type]}>
              {e.name} <span className="font-mono text-[11px] font-normal text-ink-3">IRD {e.taxIdMasked}</span>
              {e.dualApprovalThreshold !== undefined && <span className="block text-xs font-normal text-ink-3">Second approver above {money(e.dualApprovalThreshold)}</span>}
            </Fact>
          ))}
          <Fact label="Joined">
            {fmtDate(dateOf(org.createdAt), { weekday: false, year: 'always' })} <span className="font-normal text-ink-3">· {ORG_SOURCE[org.source].toLowerCase()}</span>
          </Fact>
          <Fact label="Last active">
            <span title={whenExact(org.lastActiveAt)}>{row.idleDays === 0 ? 'Today' : `${plural(row.idleDays, 'day')} ago`}</span>
          </Fact>
        </Facts>
      </section>

      <section aria-labelledby="org-homes">
        <h3 id="org-homes" className="eyebrow mb-2">
          Properties
        </h3>
        {row.homes.length === 0 ? (
          <p className="rounded-lg bg-sunken px-3.5 py-3 text-[13px] text-ink-2">
            {org.kind === 'partner_agency' ? 'A partner agency holds no homes of its own until a rent roll is imported for it from Migration.' : 'This organisation has not added a property yet.'}
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-lg shadow-card">
            {row.homes.map((h) => (
              <li key={h.property.id} className="grid grid-cols-[minmax(0,1fr)_5.5rem] items-center gap-3 px-3.5 py-2.5 sm:grid-cols-[minmax(0,1fr)_6.5rem_5.5rem]">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-ink">{h.property.address.line1}</span>
                  <span className="block truncate text-xs text-ink-3">
                    {h.property.address.suburb} · {plural(h.property.beds, 'bed')}
                    {h.daysLate > 0 && (
                      <span className="text-warn-text">
                        {' '}
                        · {money(h.owed)} owing, {plural(h.daysLate, 'day')} late
                      </span>
                    )}
                  </span>
                </span>
                <span className="num hidden text-right text-[13px] text-ink-2 sm:block">{h.tenancy ? `${money(h.tenancy.weeklyRent)} / wk` : h.property.listing?.status === 'live' ? 'Listed' : 'Vacant'}</span>
                <Gauge value={h.score} tone={scoreTone(h.score)} label={`Compliance ${h.score} out of 100`} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="org-plan">
        <h3 id="org-plan" className="eyebrow mb-2">
          Plan
        </h3>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Plan" className="min-w-48 flex-1">
            {(p) => (
              <Select {...p} value={plan} onChange={(e) => setPlan(e.target.value as PlanTier)}>
                {PLANS.map((k) => (
                  <option key={k} value={k}>
                    {PLAN[k].name} · {money(planMonthly(k, row.properties))} a month for {plural(row.properties, 'home')}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button
            intent="secondary"
            disabled={plan === org.plan}
            onClick={() => {
              changeOrgPlan(org.id, plan, me.fullName)
              toast.success(`${org.name} moved to ${PLAN[plan].name}`, { description: billed ? `They are now billed ${money(newPrice)} a month.` : `Billing stays at nothing while the account is ${status.label.toLowerCase()}.` })
            }}
          >
            Change plan
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-ink-3">{PLAN[plan].blurb}</p>
      </section>

      <section aria-labelledby="org-suspend">
        <h3 id="org-suspend" className="eyebrow mb-2">
          {org.status === 'suspended' ? 'Lift the suspension' : 'Suspend'}
        </h3>
        {org.status === 'suspended' ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[46ch] text-[13px] text-ink-2">Puts the account back to active and takes the suspension banner off the owner’s Loop.</p>
            <Button
              intent="secondary"
              onClick={() => {
                liftSuspension(org.id, me.fullName)
                toast.success('Suspension lifted', { description: `${org.name} is active again.` })
              }}
            >
              Lift suspension
            </Button>
          </div>
        ) : org.status === 'churned' ? (
          <p className="text-[13px] text-ink-2">This organisation has left, so there is no account to suspend. Its records are kept for the statutory retention period.</p>
        ) : (
          <div className="grid gap-3">
            <Field label="Reason" hint="The owner is shown these exact words in a banner across Loop. Write it as you would say it to them. In this prototype a suspension is a mark: it does not stop them changing records.">
              {(p) => (
                <Textarea
                  {...p}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setRefusal(null)
                  }}
                  placeholder="For example: Your card was declined three times and we could not reach you by email."
                  className="min-h-16"
                />
              )}
            </Field>
            {refusal && <Refusal verdict={refusal} />}
            <div>
              <Button
                intent="dangerSoft"
                icon={<Prohibit weight="bold" className="size-4" />}
                onClick={() => {
                  const v = suspendOrg(org.id, reason, me.fullName)
                  if (!v.ok) return setRefusal(v)
                  setReason('')
                  toast('Suspended', { description: `${org.name} is marked suspended. Its owner sees the reason in Loop until it is lifted.` })
                }}
              >
                Suspend {org.name}
              </Button>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="org-notes">
        <h3 id="org-notes" className="eyebrow mb-2">
          Team notes
        </h3>
        <Field label="Notes" hint="Only the platform team sees these.">
          {(p) => <Textarea {...p} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the next person to open this account should know." className="min-h-20" />}
        </Field>
        <Button
          intent="secondary"
          size="sm"
          className="mt-2"
          disabled={notes.trim() === (org.adminNotes ?? '')}
          onClick={() => {
            saveOrgNotes(org.id, notes, me.fullName)
            toast.success('Notes saved')
          }}
        >
          Save notes
        </Button>
      </section>
    </div>
  )
}

/* ───────────────────────────────── the screen ───────────────────────────── */

export function Orgs() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { orgs, day } = usePlatform()
  const sort: Sort = { key: search.sort ?? 'name', dir: search.dir ?? 'asc' }
  const set = (patch: Partial<OrgsSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const rows = useMemo(() => {
    const key = (search.sort ?? 'name') as SortKey
    const dir = (search.dir ?? 'asc') === 'asc' ? 1 : -1
    return orgs
      .filter((r) => (search.status === undefined ? true : search.status === 'attention' ? r.org.status === 'past_due' || r.org.status === 'suspended' : r.org.status === search.status))
      .filter((r) => search.plan === undefined || r.org.plan === search.plan)
      .filter((r) => matches([r.org.name, r.owner?.fullName, r.owner?.email, r.org.region], search.q ?? ''))
      .sort((a, b) => {
        const x = sortValue(a, key)
        const y = sortValue(b, key)
        return (typeof x === 'string' ? x.localeCompare(String(y)) : x - Number(y)) * dir || a.org.name.localeCompare(b.org.name)
      })
  }, [orgs, search.status, search.plan, search.q, search.sort, search.dir])

  const open = orgs.find((r) => r.org.id === search.org)
  const shown = useLast(open)
  const filtered = search.status !== undefined || search.plan !== undefined || Boolean(search.q)

  const columns: Column<OrgRow>[] = [
    {
      id: 'name',
      header: 'Organisation',
      sort: 'name',
      primary: true,
      cell: (r) => (
        <TwoLine
          title={
            <>
              {r.org.name}
              {r.org.kind === 'partner_agency' && <span className="ml-1.5 font-mono text-[10px] font-normal tracking-wide text-ink-3 uppercase">Partner agency</span>}
            </>
          }
          sub={`${r.owner?.fullName ?? 'No owner'} · ${r.org.region}`}
        />
      ),
    },
    { id: 'plan', header: 'Plan', width: 'w-36', from: 'md', cell: (r) => <span className="block truncate text-ink-2">{PLAN[r.org.plan].name}</span> },
    {
      id: 'status',
      header: 'Status',
      width: 'w-28',
      cell: (r) => (
        <Status tone={ORG_STATUS[r.org.status].tone} icon={ORG_STATUS[r.org.status].icon} strong={r.org.status !== 'active'}>
          {ORG_STATUS[r.org.status].label}
        </Status>
      ),
    },
    { id: 'homes', header: 'Homes', width: 'w-[4.5rem]', align: 'right', sort: 'properties', cell: (r) => <span className="text-ink">{r.properties}</span> },
    { id: 'rent', header: 'Rent / wk', width: 'w-[6.5rem]', align: 'right', from: 'xl', sort: 'rentRoll', cell: (r) => <span className="text-ink-2">{r.rentRoll ? money(r.rentRoll) : '–'}</span> },
    { id: 'mrr', header: 'MRR', width: 'w-20', align: 'right', sort: 'mrr', cell: (r) => <span className={cn(r.mrr ? 'font-medium text-ink' : 'text-ink-3')}>{money(r.mrr)}</span> },
    { id: 'compliance', header: 'Compliance', width: 'w-[7.5rem]', from: 'lg', sort: 'compliance', cell: (r) => (r.compliance === null ? <span className="block text-right text-ink-3">–</span> : <Gauge value={r.compliance} tone={scoreTone(r.compliance)} label={`Compliance ${r.compliance} out of 100`} />) },
    { id: 'arrears', header: 'In arrears', width: 'w-28', align: 'right', from: 'xl', sort: 'arrears', cell: (r) => (r.arrears ? <span className="font-medium text-warn-text">{r.arrears} · {money(r.owed)}</span> : <span className="text-ink-3">0</span>) },
    { id: 'idle', header: 'Last active', width: 'w-32', from: '2xl', sort: 'idle', cell: (r) => <span className={cn('block truncate', r.idleDays > 14 ? 'text-warn-text' : 'text-ink-2')} title={whenExact(r.org.lastActiveAt)}>{whenShort(r.org.lastActiveAt, day)}</span> },
    { id: 'source', header: 'Came from', width: 'w-40', from: '2xl', cell: (r) => <span className="block truncate text-ink-3">{ORG_SOURCE[r.org.source]}</span> },
  ]

  return (
    <Page wide>
      <Head title="Organisations" lede="Every customer of the platform. Figures are worked out from each organisation’s own records, so a number here always matches what its owner sees in Loop." />

      <Toolbar>
        <SearchBox value={search.q ?? ''} onChange={(q) => set({ q: q || undefined })} label="Search organisations" placeholder="Name, owner or email" />
        <Filter
          label="Status"
          value={search.status ?? 'all'}
          onChange={(v) => set({ status: v === 'all' ? undefined : v })}
          options={[{ value: 'all', label: 'Any' }, { value: 'attention', label: 'Past due or suspended' }, ...ORG_STATUS_ORDER.map((s) => ({ value: s, label: ORG_STATUS[s].label }))]}
        />
        <Filter label="Plan" value={search.plan ?? 'all'} onChange={(v) => set({ plan: v === 'all' ? undefined : v })} options={[{ value: 'all', label: 'Any' }, ...PLANS.map((p) => ({ value: p, label: PLAN[p].name }))]} />
        {filtered && (
          <Button size="sm" intent="ghost" onClick={() => set({ q: undefined, status: undefined, plan: undefined })}>
            Clear filters
          </Button>
        )}
      </Toolbar>

      <DataTable
        caption="Organisations"
        rows={rows}
        columns={columns}
        rowKey={(r) => r.org.id}
        selected={search.org}
        onOpen={(r) => set({ org: r.org.id })}
        openLabel={(r) => `Open ${r.org.name}`}
        sort={sort}
        onSort={(key) => {
          const next = nextSort(sort, key, NUMERIC.includes(key as SortKey))
          set({ sort: next.key as SortKey, dir: next.dir })
        }}
        card={(r) => (
          <>
            <span className="flex items-start justify-between gap-3">
              <TwoLine title={r.org.name} sub={`${PLAN[r.org.plan].name} · ${plural(r.properties, 'home')}`} />
              {r.org.status === 'active' ? (
                <Status tone="ok" icon={ORG_STATUS.active.icon} className="text-xs">
                  Active
                </Status>
              ) : (
                <Flag tone={ORG_STATUS[r.org.status].tone} icon={ORG_STATUS[r.org.status].icon}>
                  {ORG_STATUS[r.org.status].label}
                </Flag>
              )}
            </span>
            <span className="mt-2.5 grid grid-cols-3 gap-2 border-t border-line pt-2.5 text-xs">
              <span>
                <span className="block text-ink-3">Rent / wk</span>
                <span className="num font-medium text-ink">{r.rentRoll ? money(r.rentRoll) : '–'}</span>
              </span>
              <span>
                <span className="block text-ink-3">MRR</span>
                <span className="num font-medium text-ink">{money(r.mrr)}</span>
              </span>
              <span>
                <span className="block text-ink-3">Compliance</span>
                <span className="num font-medium text-ink">{r.compliance ?? '–'}</span>
                {r.arrears > 0 && <span className="text-warn-text"> · {r.arrears} late</span>}
              </span>
            </span>
          </>
        )}
        empty={
          filtered ? (
            <Empty icon={<Buildings />} title="No organisation matches" body="Nothing fits this search and these filters together." action={<Button onClick={() => set({ q: undefined, status: undefined, plan: undefined })}>Clear filters</Button>} />
          ) : (
            <Empty icon={<Handshake />} title="No organisations yet" body="This is where every customer of the platform appears, with what they hold and what they pay. The first ones arrive through a rent-roll import in Migration." />
          )
        }
      />
      <Tally shown={rows.length} total={orgs.length} noun="organisation" />

      <Sheet
        open={open !== undefined}
        onOpenChange={(o) => !o && set({ org: undefined })}
        size="lg"
        eyebrow={shown ? `${shown.org.kind === 'partner_agency' ? 'Partner agency' : 'Landlord'} · ${shown.org.region}` : undefined}
        title={shown?.org.name ?? ''}
        description={
          shown ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Status tone={ORG_STATUS[shown.org.status].tone} icon={ORG_STATUS[shown.org.status].icon} strong>
                {ORG_STATUS[shown.org.status].label}
              </Status>
              <span>{PLAN[shown.org.plan].name}</span>
            </span>
          ) : undefined
        }
      >
        {shown && <OrgDetail key={shown.org.id} row={shown} />}
      </Sheet>
    </Page>
  )
}
