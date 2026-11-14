/**
 * Audit log.
 *
 * What this screen does that no other does: it answers "who did that, and
 * when?" for anything on the platform, after the fact. It is a log, so it is
 * read as one — a day at a time, newest first, each line a time, an actor and
 * what they did — and it can be narrowed to one person, one organisation or
 * one word, then taken away as a file.
 */
import { useMemo } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import Papa from 'papaparse'
import { DownloadSimple, Gear, Scroll } from '@phosphor-icons/react'
import type { AuditEntry } from '@/domain/types'
import { dateOf, diffDays, fmtDate } from '@/domain/rules/calendar'
import { useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Segmented } from '@/ui/controls'
import { Avatar, Empty } from '@/ui/display'
import { Filter, Head, SearchBox, Tally, Toolbar } from './kit'
import { clock, matches, oneOf, text, whenExact } from './format'
import { saveFile } from './hooks'

const SPANS = ['today', 'week', 'month', 'all'] as const
type Span = (typeof SPANS)[number]
const SPAN_DAYS: Record<Span, number> = { today: 0, week: 6, month: 29, all: Number.POSITIVE_INFINITY }
const BY = ['people', 'engine'] as const

export interface AuditSearch {
  q?: string
  actor?: string
  org?: string
  span?: Span
  /** `people` is the team; `engine` is everything that acts on its own. */
  by?: (typeof BY)[number]
}

export function auditSearch(s: Record<string, unknown>): AuditSearch {
  return { q: text(s.q), actor: text(s.actor), org: text(s.org), span: oneOf(s.span, SPANS), by: oneOf(s.by, BY) }
}

const route = getRouteApi('/admin/audit')

function Line({ e, hue, orgName }: { e: AuditEntry; hue?: number; orgName?: string }) {
  const person = hue !== undefined
  return (
    <li className="grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-3 px-4 py-2.5 md:grid-cols-[3.75rem_9rem_minmax(0,1fr)] md:items-baseline xl:grid-cols-[3.75rem_10.5rem_minmax(0,1fr)_minmax(0,12rem)]">
      <time dateTime={e.at} title={whenExact(e.at)} className="num font-mono text-[11px] leading-5 text-ink-3">
        {clock(e.at)}
      </time>
      <p className="flex min-w-0 items-center gap-1.5 text-[13px] md:self-start">
        {person ? (
          <Avatar name={e.actor} hue={hue} size={18} />
        ) : (
          <span className="grid size-[18px] shrink-0 place-items-center rounded-full bg-sunken text-ink-3">
            <Gear weight="fill" className="size-3" aria-hidden />
          </span>
        )}
        <span className="truncate font-medium text-ink">{e.actor}</span>
        {!person && <span className="sr-only">(automatic)</span>}
      </p>
      <div className="col-start-2 min-w-0 md:col-start-3">
        <p className="text-[13px] leading-snug text-ink">
          {e.action} <span className="text-ink-2">· {e.target}</span>
        </p>
        {e.detail && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{e.detail}</p>}
      </div>
      <p className="col-start-2 mt-0.5 min-w-0 truncate text-xs md:col-start-3 xl:col-start-4 xl:mt-0 xl:text-right">
        {e.orgId && orgName ? (
          <Link to="/admin/orgs" search={{ org: e.orgId }} className="rounded-sm text-ink-2 underline decoration-line-strong underline-offset-2 hoverable:hover:text-ink">
            {orgName}
          </Link>
        ) : (
          <span className="hidden text-ink-3 xl:inline">Platform</span>
        )}
      </p>
    </li>
  )
}

export function Audit() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const day = useToday()
  const entries = useStore((s) => s.db.audit)
  const users = useStore((s) => s.db.users)
  const orgs = useStore((s) => s.db.orgs)
  const span: Span = search.span ?? 'all'
  const set = (patch: Partial<AuditSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const hueOf = useMemo(() => new Map(users.map((u) => [u.fullName, u.hue])), [users])
  const orgName = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs])
  const actors = useMemo(() => [...new Set(entries.map((e) => e.actor))].sort((a, b) => Number(hueOf.has(b)) - Number(hueOf.has(a)) || a.localeCompare(b)), [entries, hueOf])
  const orgsSeen = useMemo(() => [...new Set(entries.flatMap((e) => (e.orgId ? [e.orgId] : [])))].map((id) => ({ id, name: orgName.get(id) ?? id })).sort((a, b) => a.name.localeCompare(b.name)), [entries, orgName])

  const rows = useMemo(
    () =>
      entries
        .filter((e) => diffDays(dateOf(e.at), day) <= SPAN_DAYS[span])
        .filter((e) => search.actor === undefined || e.actor === search.actor)
        .filter((e) => search.org === undefined || e.orgId === search.org)
        .filter((e) => search.by === undefined || hueOf.has(e.actor) === (search.by === 'people'))
        .filter((e) => matches([e.actor, e.action, e.target, e.detail, e.orgId ? orgName.get(e.orgId) : undefined], search.q ?? ''))
        .sort((a, b) => b.at.localeCompare(a.at)),
    [entries, day, span, search.actor, search.org, search.by, search.q, hueOf, orgName],
  )

  const days = useMemo(() => {
    const groups: { date: string; entries: AuditEntry[] }[] = []
    for (const e of rows) {
      const date = dateOf(e.at)
      const last = groups[groups.length - 1]
      if (last?.date === date) last.entries.push(e)
      else groups.push({ date, entries: [e] })
    }
    return groups
  }, [rows])

  const filtered = search.actor !== undefined || search.org !== undefined || search.by !== undefined || Boolean(search.q) || span !== 'all'
  const clear = () => set({ q: undefined, actor: undefined, org: undefined, by: undefined, span: undefined })
  const exportCsv = () =>
    saveFile(
      `audit-log-${day}.csv`,
      'text/csv;charset=utf-8',
      Papa.unparse(rows.map((e) => ({ at: e.at, actor: e.actor, action: e.action, target: e.target, detail: e.detail ?? '', organisation: e.orgId ? orgName.get(e.orgId) ?? e.orgId : '' }))),
    )

  return (
    <Page wide>
      <Head
        title="Audit log"
        lede="Every action the team takes in this console, and every change the engine makes on its own, leaves a line here. Lines are only ever added; the console has no way to edit or remove one."
        actions={
          <Button intent="secondary" icon={<DownloadSimple className="size-4" />} disabled={rows.length === 0} onClick={exportCsv}>
            Export these {rows.length === 1 ? 'line' : 'lines'}
          </Button>
        }
      />

      <Toolbar>
        <SearchBox value={search.q ?? ''} onChange={(q) => set({ q: q || undefined })} label="Search the log" placeholder="Action, target or detail" />
        <Filter label="Who" value={search.actor ?? 'all'} onChange={(v) => set({ actor: v === 'all' ? undefined : v })} options={[{ value: 'all', label: 'Anyone' }, ...actors.map((a) => ({ value: a, label: hueOf.has(a) ? a : `${a} (automatic)` }))]} />
        <Filter label="Organisation" value={search.org ?? 'all'} onChange={(v) => set({ org: v === 'all' ? undefined : v })} options={[{ value: 'all', label: 'Any' }, ...orgsSeen.map((o) => ({ value: o.id, label: o.name }))]} />
        <Segmented
          label="How far back"
          size="sm"
          value={span}
          onChange={(v) => set({ span: v === 'all' ? undefined : v })}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: '7 days' },
            { value: 'month', label: '30 days' },
            { value: 'all', label: 'All' },
          ]}
        />
        <Segmented
          label="Done by"
          size="sm"
          value={search.by ?? 'anyone'}
          onChange={(v) => set({ by: v === 'anyone' ? undefined : v })}
          options={[
            { value: 'anyone', label: 'Everything' },
            { value: 'people', label: 'People' },
            { value: 'engine', label: 'Automatic' },
          ]}
        />
      </Toolbar>

      {rows.length === 0 ? (
        <div className="rounded-lg bg-surface shadow-card">
          {entries.length === 0 ? (
            <Empty icon={<Scroll />} title="Nothing has been logged yet" body="The log fills as the team works: approving a fix, publishing a rule, opening an account as its owner. Each action writes its own line." />
          ) : (
            <Empty icon={<Scroll />} title="No line matches" body="Nothing in the log fits this search, these filters and this period together." action={filtered ? <Button onClick={clear}>Clear filters</Button> : undefined} />
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {days.map((group) => (
            <section key={group.date} aria-labelledby={`day-${group.date}`} className="overflow-clip rounded-lg bg-surface shadow-card">
              <h2 id={`day-${group.date}`} className="sticky top-13 z-10 flex h-9 items-center justify-between gap-3 border-b border-line bg-surface-2 px-4 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-3 uppercase md:top-0">
                <span className="text-ink">{group.date === day ? `Today · ${fmtDate(group.date, { year: 'always' })}` : fmtDate(group.date, { year: 'always' })}</span>
                <span className="num">
                  {group.entries.length} {group.entries.length === 1 ? 'line' : 'lines'}
                </span>
              </h2>
              <ol className="divide-y divide-line">
                {group.entries.map((e) => (
                  <Line key={e.id} e={e} hue={hueOf.get(e.actor)} orgName={e.orgId ? orgName.get(e.orgId) : undefined} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
      <Tally shown={rows.length} total={entries.length} noun="line" />
    </Page>
  )
}
