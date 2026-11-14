/**
 * The watched sources: every page, feed and file the watcher reads, and
 * whether each one could be read. "Could not check" is kept apart from "no
 * change" all the way down this list, because a source nobody can reach looks
 * exactly like a law that did not change.
 */
import { useMemo } from 'react'
import { ArrowsClockwise, Binoculars, Info, Warning } from '@phosphor-icons/react'
import type { JurisdictionCode, RuleSource } from '@/domain/types'
import { STALE_AFTER_DAYS, sourceState, watchSummary, type SourceState } from '@/domain/regwatch'
import { fmtDate, dateOf } from '@/domain/rules/calendar'
import { useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { Button } from '@/ui/Button'
import { Empty } from '@/ui/display'
import { DataTable, Filter, Out, SearchBox, Simulated, Status, Tally, Toolbar, TwoLine, type Column } from '../kit'
import { SOURCE_STATE } from '../labels'
import { initialCap, matches, whenExact, whenInline, whenShort } from '../format'
import type { FeedStatus } from './feed'
import { SHORT } from './shared'

import { type SourceFilter } from '../search'

type Row = RuleSource & { state: SourceState; daysSince: number | null }

const host = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

const placeOf = (j: RuleSource['jurisdiction']) => (j === 'AU' ? 'AU' : SHORT[j])
const SIGNAL: Record<RuleSource['signal'], string> = { legislation: 'Legislation', bills: 'Bills', regulator: 'Regulator', tax: 'Tax', privacy: 'Privacy', tribunal: 'Tribunal', holidays: 'Holidays', data: 'Data' }

function FeedNote({ feed, refresh }: { feed: FeedStatus; refresh: () => void }) {
  const day = useToday()
  if (feed.state === 'loading') {
    return <p className="mb-4 rounded-md bg-sunken px-3.5 py-2.5 text-[13px] text-ink-2">Reading the scheduled watcher’s feed…</p>
  }
  if (feed.state === 'reported') {
    const runs = feed.feed.runs.slice(-5).reverse()
    return (
      <div className="mb-4 rounded-md bg-ok-soft p-3.5">
        <p className="text-[13px] font-semibold text-ok-text">The scheduled watcher last reported {whenInline(feed.feed.generatedAt ?? '', day)}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink">
          Health and “last read” below come from its runs.
          {feed.added > 0 && ` This visit brought in ${feed.added} newly detected ${feed.added === 1 ? 'change' : 'changes'} for review.`}
          {feed.skipped > 0 && ` ${feed.skipped} ${feed.skipped === 1 ? 'event was' : 'events were'} not turned into a change: a bot-challenge page or an unregistered source is a failed fetch, never a change.`}
        </p>
        {runs.length > 0 && (
          <table className="mt-2.5 w-full max-w-md text-left text-xs">
            <caption className="sr-only">The watcher’s most recent runs</caption>
            <thead>
              <tr className="text-ink-3 [&>th]:pb-1 [&>th]:font-medium">
                <th scope="col">Run</th>
                <th scope="col" className="text-right">
                  Read
                </th>
                <th scope="col" className="text-right">
                  Changed
                </th>
                <th scope="col" className="text-right">
                  Failed
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.at} className="num border-t border-ok/20 text-ink [&>td]:py-1">
                  <td title={whenExact(r.at)}>{whenShort(r.at, day)}</td>
                  <td className="text-right">{r.checked}</td>
                  <td className="text-right">{r.changed}</td>
                  <td className="text-right">{r.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }
  return (
    <div className="mb-4 flex gap-3 rounded-md bg-info-soft p-3.5">
      {feed.state === 'silent' ? <Info weight="fill" className="mt-0.5 size-[18px] shrink-0 text-info-text" aria-hidden /> : <Warning weight="fill" className="mt-0.5 size-[18px] shrink-0 text-warn-text" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{feed.state === 'silent' ? 'The scheduled watcher has not reported yet' : 'The watcher’s feed could not be read'}</p>
        <p className="mt-0.5 max-w-[80ch] text-[13px] leading-relaxed text-ink">
          {feed.state === 'silent'
            ? 'The job that reads these sources runs on a timer outside the app and writes its findings to a feed file. That file is in place and still empty, so no source below has been read by it.'
            : feed.reason}{' '}
          Until it reports, the health and “last read” times shown here are demo data: the registry’s own reachability check, re-dated so the demo reads as today. The first real run replaces them.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Simulated>Health below is demo data</Simulated>
          <Button size="sm" intent="ghost" icon={<ArrowsClockwise className="size-3.5" />} onClick={refresh}>
            Read the feed again
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Sources({
  feed,
  refresh,
  place,
  state,
  q,
  onChange,
}: {
  feed: FeedStatus
  refresh: () => void
  place?: JurisdictionCode
  state?: SourceFilter
  q?: string
  onChange: (patch: { j?: JurisdictionCode; src?: SourceFilter; q?: string }) => void
}) {
  const day = useToday()
  const sources = useStore((s) => s.db.ruleSources)
  const all: Row[] = useMemo(() => sources.map((s) => ({ ...s, ...sourceState(s, day) })), [sources, day])
  const summary = useMemo(() => watchSummary(sources, day), [sources, day])
  const places = useMemo(() => [...new Set(sources.map((s) => s.jurisdiction))], [sources])

  const rows = useMemo(
    () =>
      all
        .filter((s) => place === undefined || s.jurisdiction === place)
        .filter((s) => (state === undefined ? true : state === 'attention' ? s.state === 'unreachable' || s.state === 'stale' || s.state === 'never_checked' : state === 'ok' ? s.state === 'ok' || s.state === 'changed' : s.state === state))
        .filter((s) => matches([s.name, s.url, SIGNAL[s.signal]], q ?? ''))
        .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)),
    [all, place, state, q],
  )
  const filtered = place !== undefined || state !== undefined || Boolean(q)

  const columns: Column<Row>[] = [
    {
      id: 'source',
      header: 'Source',
      cell: (s) => (
        <span className="block min-w-0">
          <Out href={s.url} className="font-medium !text-ink !decoration-line-strong">
            {s.name}
          </Out>
          <span className="block truncate font-mono text-[11px] text-ink-3">{host(s.url)}</span>
        </span>
      ),
    },
    { id: 'place', header: 'Where', width: 'w-16', cell: (s) => <span className="font-mono text-[11px] text-ink-2">{placeOf(s.jurisdiction)}</span> },
    { id: 'signal', header: 'Signal', width: 'w-28', from: 'lg', cell: (s) => <span className="block truncate text-ink-2">{SIGNAL[s.signal]}</span> },
    { id: 'type', header: 'Read as', width: 'w-20', from: 'xl', cell: (s) => <span className="font-mono text-[11px] text-ink-3 uppercase">{s.type}</span> },
    { id: 'priority', header: 'Priority', width: 'w-20', from: 'xl', cell: (s) => <span className={s.priority === 1 ? 'font-semibold text-ink' : 'text-ink-2'}>P{s.priority}</span> },
    { id: 'frequency', header: 'Checked', width: 'w-24', from: 'xl', cell: (s) => <span className="text-ink-2">{initialCap(s.frequency)}</span> },
    {
      id: 'read',
      header: 'Last read',
      width: 'w-32',
      from: 'md',
      cell: (s) => (
        <span className="block truncate text-ink-2" title={s.lastCheckedAt ? whenExact(s.lastCheckedAt) : undefined}>
          {s.lastCheckedAt ? whenShort(s.lastCheckedAt, day) : 'Never'}
        </span>
      ),
    },
    {
      id: 'health',
      header: 'Health',
      width: 'w-36',
      cell: (s) => (
        <Status tone={SOURCE_STATE[s.state].tone} icon={SOURCE_STATE[s.state].icon} strong={s.state !== 'ok'}>
          {SOURCE_STATE[s.state].label}
        </Status>
      ),
    },
  ]

  return (
    <div>
      <FeedNote feed={feed} refresh={refresh} />

      <Toolbar>
        <SearchBox value={q ?? ''} onChange={(v) => onChange({ q: v || undefined })} label="Search sources" placeholder="Name, address or signal" />
        <Filter label="Where" value={place ?? 'all'} onChange={(v) => onChange({ j: v === 'all' ? undefined : (v as JurisdictionCode) })} options={[{ value: 'all', label: `Everywhere · ${sources.length}` }, ...places.filter((p) => p !== 'AU').map((p) => ({ value: p, label: `${placeOf(p)} · ${sources.filter((s) => s.jurisdiction === p).length}` }))]} />
        <Filter
          label="Health"
          value={state ?? 'all'}
          onChange={(v) => onChange({ src: v === 'all' ? undefined : v })}
          options={[
            { value: 'all', label: 'Any' },
            { value: 'attention', label: `Needs attention · ${summary.unreachable + summary.stale + summary.neverChecked}` },
            { value: 'unreachable', label: `Unreachable · ${summary.unreachable}` },
            { value: 'stale', label: `Stale · ${summary.stale}` },
            { value: 'ok', label: `Read · ${summary.healthy + summary.changed}` },
          ]}
        />
      </Toolbar>

      <DataTable
        caption="Watched sources"
        rows={rows}
        columns={columns}
        rowKey={(s) => s.id}
        card={(s) => (
          <>
            <span className="flex items-start justify-between gap-3">
              <TwoLine title={s.name} sub={host(s.url)} mono />
              <span className="shrink-0 font-mono text-[11px] text-ink-2">{placeOf(s.jurisdiction)}</span>
            </span>
            <span className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
              <Status tone={SOURCE_STATE[s.state].tone} icon={SOURCE_STATE[s.state].icon} strong={s.state !== 'ok'}>
                {SOURCE_STATE[s.state].label}
              </Status>
              <span className="text-ink-3">
                {SIGNAL[s.signal]} · P{s.priority} · {s.lastCheckedAt ? whenInline(s.lastCheckedAt, day) : 'never read'}
              </span>
            </span>
            <span className="mt-2 block text-xs">
              <Out href={s.url}>Open the source</Out>
            </span>
          </>
        )}
        empty={
          filtered ? (
            <Empty icon={<Binoculars />} title="No source matches" body="Nothing in the registry fits this place, this health and this search together." action={<Button onClick={() => onChange({ j: undefined, src: undefined, q: undefined })}>Clear filters</Button>} />
          ) : (
            <Empty icon={<Binoculars />} title="No sources are being watched" body="The registry lists every page, feed and file the watcher reads for changes to tenancy law. It is empty, so nothing would be detected." />
          )
        }
      />
      <Tally shown={rows.length} total={sources.length} noun="source" />
      <p className="mt-2 max-w-[90ch] text-xs leading-relaxed text-ink-3">
        A source is stale when it has not been read for more than {STALE_AFTER_DAYS[1]} days at priority 1, {STALE_AFTER_DAYS[2]} at priority 2 or {STALE_AFTER_DAYS[3]} at priority 3. Unreachable means the fetch failed or returned a bot-challenge page; those are never treated as “no change”.
        {summary.lastCheckedAt && <> Most recent read on record: {fmtDate(dateOf(summary.lastCheckedAt), { year: 'always' })}.</>}
      </p>
    </div>
  )
}
