/**
 * Overview.
 *
 * What this screen does that no other does: it answers "is the business
 * healthy, and is the engine under it healthy?" without opening anything. The
 * top strip is the only part that asks for action — everything a person on the
 * team has to decide, wherever it lives — and each cell goes straight to the
 * place it is decided. Below it the business is a ledger of figures, and the
 * engine is three subsystems reporting their own state.
 */
import { useMemo, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle, CreditCard, FirstAid, ListChecks, Robot, Scales, Warning } from '@phosphor-icons/react'
import { PACKS } from '@/domain/jurisdictions'
import { PLAN } from '@/domain/finance'
import { watchSummary } from '@/domain/regwatch'
import { addDays, dateOf, fmtDate } from '@/domain/rules/calendar'
import { money, plural } from '@/domain/rules/format'
import type { OrgSource, PlanTier } from '@/domain/types'
import { useMe, useStore } from '@/data/store'
import { PLATFORM_FEE_PCT } from '@/data/mutations'
import { Page } from '@/shell/common'
import { Columns, Segments } from '@/ui/charts'
import { Money, Num } from '@/ui/display'
import { cn } from '@/ui/cn'
import { Gauge, Panel, Simulated, Status, TONE_SOFT, scoreTone, type Icon, type Tone } from './kit'
import { ORG_SOURCE, ORG_STATUS, ORG_STATUS_ORDER } from './labels'
import { share, whenInline } from './format'
import { usePlatform, weekStart } from './stats'
import { useRegwatchFeed } from './rules/feed'

const needClass = 'group flex h-full min-w-0 items-start gap-3 bg-surface p-3.5 transition-colors duration-100 hoverable:hover:bg-surface-2'

/** One cell of the strip: how many, of what, and the first of them by name. */
function Need({ icon: Glyph, tone, count, label, detail }: { icon: Icon; tone: Tone; count: number; label: string; detail: string }) {
  const clear = count === 0
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn('grid size-6 shrink-0 place-items-center rounded-sm', clear ? 'bg-sunken text-ink-3' : TONE_SOFT[tone])}>
            {clear ? <CheckCircle weight="fill" className="size-3.5" aria-hidden /> : <Glyph weight="fill" className="size-3.5" aria-hidden />}
          </span>
          <Num value={count} className={cn('text-[20px] leading-none font-semibold tracking-[-0.02em]', clear ? 'text-ink-3' : 'text-ink')} />
        </span>
        <span className="mt-2 block text-[13px] leading-snug font-medium text-ink">{label}</span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-ink-3">{detail}</span>
      </span>
      <ArrowRight className="mt-1 size-3.5 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
    </>
  )
}

function Figure({ label, children, sub }: { label: string; children: ReactNode; sub: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3.5">
      <dt className="eyebrow truncate">{label}</dt>
      <dd className="mt-1.5 min-w-0">
        <span className="block text-[22px] leading-none font-semibold tracking-[-0.02em] text-ink">{children}</span>
        <span className="mt-1.5 block truncate text-xs text-ink-3">{sub}</span>
      </dd>
    </div>
  )
}

/** A subsystem reporting on itself: its name, its state as an icon and a word, and the figures behind the word. */
function Subsystem({ icon: Glyph, name, state, lines, children }: { icon: Icon; name: string; state: { tone: Tone; icon: Icon; label: string }; lines: ReactNode[]; children?: ReactNode }) {
  return (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sunken text-ink-2">
        <Glyph className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
          <span className="text-[13px] font-semibold text-ink">{name}</span>
          <Status tone={state.tone} icon={state.icon} className="text-xs">
            {state.label}
          </Status>
        </span>
        {lines.map((line, i) => (
          <span key={i} className="mt-0.5 block text-xs leading-relaxed text-ink-2">
            {line}
          </span>
        ))}
        {children}
      </span>
      <ArrowRight className="mt-1 size-3.5 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
    </>
  )
}

const SOURCE_ORDER: OrgSource[] = ['founding_migration', 'organic', 'referral', 'investor_association']
const PLAN_ORDER: PlanTier[] = ['ledger_free', 'autopilot_pro', 'portfolio_trust']

export function Overview() {
  const me = useMe()
  const { orgs, day } = usePlatform()
  const tasks = useStore((s) => s.db.adminTasks)
  const changes = useStore((s) => s.db.ruleChanges)
  const sources = useStore((s) => s.db.ruleSources)
  const versions = useStore((s) => s.db.packVersions)
  const incidents = useStore((s) => s.db.incidents)
  const playbooks = useStore((s) => s.db.playbooks)
  const turns = useStore((s) => s.db.copilotTurns)
  const kb = useStore((s) => s.db.kb)
  const fieldTasks = useStore((s) => s.db.fieldTasks)
  const migrations = useStore((s) => s.db.migrations)
  const { status: feed } = useRegwatchFeed()

  const needs = useMemo(() => {
    const billing = orgs.filter((o) => o.org.status === 'past_due' || o.org.status === 'suspended')
    const p1 = tasks.filter((t) => t.priority === 'p1' && (t.status === 'open' || t.status === 'in_progress'))
    const law = changes.filter((c) => c.status === 'pending_review' || c.status === 'needs_second_review')
    const fixes = incidents.filter((i) => i.status === 'awaiting_approval')
    const gaps = turns.filter((t) => t.review === 'queued')
    return { billing, p1, law, fixes, gaps, total: billing.length + p1.length + law.length + fixes.length + gaps.length }
  }, [orgs, tasks, changes, incidents, turns])

  const business = useMemo(() => {
    const current = orgs.filter((o) => o.org.status !== 'churned')
    const managed = current.flatMap((o) => o.homes)
    const done = fieldTasks.filter((t) => t.status === 'completed' || t.status === 'paid_out')
    const sent = migrations.reduce((a, m) => a + m.invitesSent, 0)
    const accepted = migrations.reduce((a, m) => a + m.invitesAccepted, 0)
    const late = managed.filter((h) => h.daysLate > 0)
    return {
      byStatus: ORG_STATUS_ORDER.map((status) => ({ status, count: orgs.filter((o) => o.org.status === status).length })),
      properties: managed.length,
      let: managed.filter((h) => h.tenancy).length,
      rentRoll: current.reduce((a, o) => a + o.rentRoll, 0),
      mrr: orgs.reduce((a, o) => a + o.mrr, 0),
      paying: orgs.filter((o) => o.mrr > 0).length,
      gmv: done.reduce((a, t) => a + t.price, 0),
      fees: done.reduce((a, t) => a + t.platformFee, 0),
      jobs: done.length,
      booked: fieldTasks.filter((t) => t.status === 'requested' || t.status === 'accepted' || t.status === 'scheduled').length,
      sent,
      accepted,
      late: late.length,
      owed: late.reduce((a, h) => a + h.owed, 0),
      atThreshold: late.filter((h) => h.atThreshold).length,
      compliance: managed.length ? Math.round(managed.reduce((a, h) => a + h.score, 0) / managed.length) : null,
      failing: managed.filter((h) => h.failing > 0).length,
    }
  }, [orgs, fieldTasks, migrations])

  const signups = useMemo(() => {
    if (orgs.length === 0) return []
    const starts = orgs.map((o) => ({ week: weekStart(dateOf(o.org.createdAt)), source: o.org.source }))
    const first = starts.reduce((a, s) => (s.week < a ? s.week : a), starts[0].week)
    const rows: ({ label: string } & Record<OrgSource, number>)[] = []
    for (let w = first; w <= weekStart(day); w = addDays(w, 7)) {
      const inWeek = starts.filter((s) => s.week === w)
      rows.push({ label: fmtDate(w, { weekday: false, year: 'never' }), founding_migration: 0, organic: 0, referral: 0, investor_association: 0, ...Object.fromEntries(SOURCE_ORDER.map((src) => [src, inWeek.filter((s) => s.source === src).length])) })
    }
    return rows
  }, [orgs, day])

  const plans = useMemo(
    () =>
      PLAN_ORDER.map((plan) => {
        const on = orgs.filter((o) => o.org.plan === plan)
        return { plan, orgs: on.length, paying: on.filter((o) => o.mrr > 0).length, mrr: on.reduce((a, o) => a + o.mrr, 0) }
      }),
    [orgs],
  )

  const ranked = useMemo(() => orgs.filter((o) => o.compliance !== null && o.org.status !== 'churned').sort((a, b) => (a.compliance ?? 0) - (b.compliance ?? 0)), [orgs])

  const watch = useMemo(() => watchSummary(sources, day), [sources, day])
  const read = watch.healthy + watch.changed
  const nzVersion = useMemo(() => versions.filter((v) => v.jurisdiction === 'NZ').sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0]?.version ?? PACKS.NZ.version, [versions])

  const healing = useMemo(() => {
    const lastRun = playbooks.reduce<string | undefined>((a, p) => (p.lastRunAt && (!a || p.lastRunAt > a) ? p.lastRunAt : a), undefined)
    const lastSeen = incidents.reduce<string | undefined>((a, i) => (!a || i.detectedAt > a ? i.detectedAt : a), lastRun)
    return { auto: incidents.filter((i) => i.status === 'auto_healed').length, awaiting: needs.fixes.length, automatic: playbooks.filter((p) => p.mode === 'auto').length, suggested: playbooks.filter((p) => p.promotionSuggested).length, last: lastSeen }
  }, [incidents, playbooks, needs.fixes.length])

  const assistant = useMemo(() => {
    const rated = turns.filter((t) => t.rating)
    return { total: turns.length, answered: turns.filter((t) => t.answered).length, rated: rated.length, up: rated.filter((t) => t.rating === 'up').length }
  }, [turns])

  const first = me.fullName.split(' ')[0]

  return (
    <Page wide>
      <header className="mb-4 sm:mb-5">
        <p className="eyebrow">
          {fmtDate(day, { year: 'always' })} · Signed in as {first}
        </p>
        <h1 className="mt-1.5 text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[26px]">
          {needs.total === 0 ? 'Nothing is waiting on a person.' : `${needs.total === 1 ? 'One thing is' : `${needs.total} things are`} waiting on a person.`}
        </h1>
      </header>

      <section aria-label="Needs a person" className="mb-5">
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-px overflow-hidden rounded-lg bg-line shadow-card sm:grid-cols-2 xl:grid-cols-5">
          <li className="min-w-0">
            <Link to="/admin/orgs" search={{ status: 'attention' }} className={needClass}>
              <Need icon={CreditCard} tone="danger" count={needs.billing.length} label={needs.billing.length === 1 ? 'Billing problem' : 'Billing problems'} detail={needs.billing.length ? needs.billing.map((o) => `${o.org.name} is ${ORG_STATUS[o.org.status].label.toLowerCase()}`).join('; ') : 'Nobody is past due or suspended.'} />
            </Link>
          </li>
          <li className="min-w-0">
            <Link to="/admin/queue" search={{ priority: 'p1' }} className={needClass}>
              <Need icon={ListChecks} tone="danger" count={needs.p1.length} label={needs.p1.length === 1 ? 'P1 task' : 'P1 tasks'} detail={needs.p1[0]?.title ?? 'No task is marked for today.'} />
            </Link>
          </li>
          <li className="min-w-0">
            <Link to="/admin/rules" className={needClass}>
              <Need icon={Scales} tone="warn" count={needs.law.length} label={needs.law.length === 1 ? 'Law change to review' : 'Law changes to review'} detail={needs.law[0]?.title ?? 'No detected change is waiting.'} />
            </Link>
          </li>
          <li className="min-w-0">
            <Link to="/admin/healing" className={needClass}>
              <Need icon={FirstAid} tone="warn" count={needs.fixes.length} label={needs.fixes.length === 1 ? 'Fix to approve' : 'Fixes to approve'} detail={needs.fixes[0]?.title ?? 'Every proposed fix has been decided.'} />
            </Link>
          </li>
          <li className="min-w-0 sm:col-span-2 xl:col-span-1">
            <Link to="/admin/assistant" className={needClass}>
              <Need icon={Robot} tone="info" count={needs.gaps.length} label={needs.gaps.length === 1 ? 'Assistant gap' : 'Assistant gaps'} detail={needs.gaps[0] ? `“${needs.gaps[0].question}”` : 'No question is waiting for an answer.'} />
            </Link>
          </li>
        </ul>
      </section>

      <section aria-labelledby="business-title" className="mb-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="business-title" className="text-[13px] font-semibold text-ink">
            The business
          </h2>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" aria-label="Organisations by status">
            {business.byStatus.map(({ status, count }) => (
              <li key={status}>
                <Link to="/admin/orgs" search={{ status }} className="group inline-flex items-center gap-1.5 rounded-sm">
                  <Status tone={ORG_STATUS[status].tone} icon={ORG_STATUS[status].icon} className="text-xs">
                    <span className="num font-semibold text-ink">{count}</span> <span className="group-hover:underline">{ORG_STATUS[status].label.toLowerCase()}</span>
                  </Status>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-card lg:grid-cols-4">
          <Figure label="Homes managed" sub={`${business.let} let · ${business.properties - business.let} vacant · ${plural(orgs.filter((o) => o.org.status !== 'churned').length, 'organisation')}`}>
            <Num value={business.properties} />
          </Figure>
          <Figure label="Weekly rent roll" sub="Paid straight to owners. Loop holds none of it.">
            <Money value={business.rentRoll} />
          </Figure>
          <Figure label="Monthly revenue" sub={`${plural(business.paying, 'paying organisation')} · ${money(business.mrr * 12)} a year`}>
            <Money value={business.mrr} />
          </Figure>
          <Figure label="Field-task GMV" sub={`${money(business.fees)} in platform fees at ${PLATFORM_FEE_PCT}% · ${plural(business.jobs, 'job')} done, ${business.booked} booked`}>
            <Money value={business.gmv} />
          </Figure>
          <Figure label="Invites accepted" sub={business.sent ? `${business.accepted} of ${business.sent} founding invites, in ${plural(migrations.length, 'batch', 'batches')}` : 'No founding invites have been sent yet.'}>
            {business.sent ? <Num value={Math.round((business.accepted / business.sent) * 100)} suffix="%" /> : '–'}
          </Figure>
          <Figure label="In arrears" sub={business.late ? `${money(business.owed)} owing · ${business.atThreshold} at the Tribunal threshold` : 'Every tenancy is paid up.'}>
            <span className={cn(business.late > 0 && 'text-warn-text')}>
              <Num value={business.late} />
            </span>
            <span className="ml-1.5 text-[13px] font-normal tracking-normal text-ink-3">of {business.let} tenancies</span>
          </Figure>
          <Figure label="Compliance" sub={business.failing ? `Mean of all homes · ${business.failing} with a failing check` : 'Mean of all homes · none has a failing check'}>
            {business.compliance === null ? '–' : <Num value={business.compliance} />}
            <span className="ml-1.5 text-[13px] font-normal tracking-normal text-ink-3">of 100</span>
          </Figure>
          <Figure label="Organisations" sub={`${business.byStatus.find((s) => s.status === 'trialing')?.count ?? 0} on trial · ${business.byStatus.find((s) => s.status === 'churned')?.count ?? 0} left`}>
            <Num value={orgs.length} />
          </Figure>
        </dl>
      </section>

      <div className="mb-5 grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel bodyClassName="p-4 pb-3">
          <Columns
            title="Sign-ups by week"
            subtitle="Counted from each organisation’s created date, by how it arrived."
            data={signups}
            series={SOURCE_ORDER.map((key) => ({ key, label: ORG_SOURCE[key] }))}
            stacked
            height={210}
            format={(n) => String(n)}
          />
        </Panel>

        <Panel title="Monthly revenue by plan" note="Trials, suspended and departed organisations bill nothing.">
          <Segments label="Monthly recurring revenue by plan" parts={plans.map((p) => ({ label: PLAN[p.plan].name, value: p.mrr }))} format={(n) => money(n)} />
          <table className="mt-4 w-full text-left text-[13px]">
            <caption className="sr-only">Plans, with organisations and revenue</caption>
            <thead>
              <tr className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase">
                <th scope="col" className="pb-1.5 font-medium">
                  Plan
                </th>
                <th scope="col" className="pb-1.5 text-right font-medium">
                  Orgs
                </th>
                <th scope="col" className="pb-1.5 text-right font-medium">
                  Paying
                </th>
                <th scope="col" className="pb-1.5 text-right font-medium">
                  MRR
                </th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.plan} className="border-t border-line">
                  <th scope="row" className="py-1.5 font-normal text-ink">
                    <Link to="/admin/orgs" search={{ plan: p.plan }} className="rounded-sm hoverable:hover:underline">
                      {PLAN[p.plan].name}
                    </Link>
                    <span className="ml-1.5 text-xs text-ink-3">
                      {money(PLAN[p.plan].price)}
                      {PLAN[p.plan].extraProperty ? ` + ${money(PLAN[p.plan].extraProperty)} a home past ${PLAN[p.plan].includes}` : ''}
                    </span>
                  </th>
                  <td className="num py-1.5 text-right text-ink-2">{p.orgs}</td>
                  <td className="num py-1.5 text-right text-ink-2">{p.paying}</td>
                  <td className="num py-1.5 text-right font-medium text-ink">{money(p.mrr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Compliance by organisation" note="Mean of each home’s score, lowest first. The organisations at the top are the ones a Tribunal claim would hurt.">
          {ranked.length === 0 ? (
            <p className="text-[13px] text-ink-2">No organisation has a property yet, so there is nothing to score.</p>
          ) : (
            <ol className="grid gap-x-8 gap-y-0.5 md:grid-cols-2">
              {ranked.map((o) => (
                <li key={o.org.id} className="min-w-0">
                  <Link to="/admin/orgs" search={{ org: o.org.id }} className="group grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,38%)] items-center gap-3 rounded-sm py-1.5">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-ink group-hover:underline">{o.org.name}</span>
                      <span className="block truncate text-[11px] text-ink-3">
                        {plural(o.properties, 'home')}
                        {o.arrears > 0 && <span className="text-warn-text"> · {o.arrears} in arrears</span>}
                      </span>
                    </span>
                    <Gauge value={o.compliance ?? 0} tone={scoreTone(o.compliance ?? 0)} label={`Compliance ${o.compliance} out of 100`} />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="The engine" note="Each part reports its own state." bodyClassName="divide-y divide-line">
          <Link to="/admin/rules" search={{ tab: 'sources' }} className="group flex items-start gap-3 px-4 py-3.5 transition-colors hoverable:hover:bg-surface-2">
            <Subsystem
              icon={Scales}
              name="Rulewatch"
              state={watch.unreachable + watch.stale > 0 ? { tone: 'warn', icon: Warning, label: `${watch.unreachable + watch.stale} ${watch.unreachable + watch.stale === 1 ? 'source needs' : 'sources need'} attention` } : { tone: 'ok', icon: CheckCircle, label: 'Every source read' }}
              lines={[
                <>
                  <span className="num">{read}</span> of <span className="num">{watch.total}</span> sources read
                  {watch.unreachable > 0 && (
                    <>
                      {' '}
                      · <span className="num">{watch.unreachable}</span> unreachable
                    </>
                  )}
                  {watch.stale > 0 && (
                    <>
                      {' '}
                      · <span className="num">{watch.stale}</span> stale
                    </>
                  )}
                </>,
                <>
                  New Zealand pack <span className="font-mono text-[11px]">{nzVersion}</span> is live{watch.lastCheckedAt ? ` · last read ${whenInline(watch.lastCheckedAt, day)}` : ''}
                </>,
              ]}
            >
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                {feed.state === 'reported' ? (
                  <>Scheduled watcher last reported {whenInline(feed.feed.generatedAt ?? '', day)}.</>
                ) : feed.state === 'silent' ? (
                  <>
                    <Simulated>Demo data</Simulated> The scheduled watcher has not reported yet.
                  </>
                ) : feed.state === 'unavailable' ? (
                  <>
                    <Simulated>Demo data</Simulated> The watcher feed could not be read.
                  </>
                ) : (
                  <>Reading the watcher feed…</>
                )}
              </span>
            </Subsystem>
          </Link>
          <Link to="/admin/healing" className="group flex items-start gap-3 px-4 py-3.5 transition-colors hoverable:hover:bg-surface-2">
            <Subsystem
              icon={FirstAid}
              name="Self-healing"
              state={healing.awaiting > 0 ? { tone: 'warn', icon: Warning, label: `${healing.awaiting} waiting for approval` } : { tone: 'ok', icon: CheckCircle, label: 'Nothing waiting' }}
              lines={[
                <>
                  <span className="num">{healing.auto}</span> fixed automatically · <span className="num">{healing.automatic}</span> of <span className="num">{playbooks.length}</span> playbooks run without approval
                </>,
                <>
                  {healing.last ? `Last fault seen ${whenInline(healing.last, day)}` : 'No sweep has run yet'}
                  {healing.suggested > 0 && ` · ${plural(healing.suggested, 'promotion')} suggested`}
                </>,
              ]}
            />
          </Link>
          <Link to="/admin/assistant" className="group flex items-start gap-3 px-4 py-3.5 transition-colors hoverable:hover:bg-surface-2">
            <Subsystem
              icon={Robot}
              name="Assistant"
              state={needs.gaps.length > 0 ? { tone: 'info', icon: Warning, label: `${needs.gaps.length} to review` } : { tone: 'ok', icon: CheckCircle, label: 'No gaps waiting' }}
              lines={[
                <>
                  Answered <span className="num">{assistant.answered}</span> of <span className="num">{assistant.total}</span> questions (<span className="num">{share(assistant.answered, assistant.total)}</span>) from the rule pack or a taught answer
                </>,
                <>
                  <span className="num">{assistant.up}</span> of <span className="num">{assistant.rated}</span> rated answers marked helpful · <span className="num">{kb.length}</span> taught by the team
                </>,
              ]}
            />
          </Link>
        </Panel>
      </div>
    </Page>
  )
}
