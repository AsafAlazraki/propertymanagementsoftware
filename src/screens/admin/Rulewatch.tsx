/**
 * Rulewatch.
 *
 * What this screen does that no other does: it is how the product's idea of
 * the law is kept true. Everything a landlord is told — every date, every cap
 * — comes out of a rule pack, and this is the only place a pack can change.
 * A scheduled watcher reports that a source moved; a person reads the evidence
 * against a checklist the code computed, sees what the calculators would then
 * answer, and decides. The four tabs are the four questions asked here: what
 * has changed, is the watcher seeing everything, what do we believe now, and
 * what did we publish.
 */
import { useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { PACKS, PACK_ORDER, resolvePack } from '@/domain/jurisdictions'
import { watchSummary } from '@/domain/regwatch'
import { plural } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Button } from '@/ui/Button'
import { TabPanel, Tabs } from '@/ui/controls'
import { Callout } from '@/ui/display'
import { Head, Simulated } from './kit'
import { whenInline } from './format'
import { Changes } from './rules/Changes'
import { Packs } from './rules/Packs'
import { Review } from './rules/Review'
import { Sources } from './rules/Sources'
import { Versions } from './rules/Versions'
import { useRegwatchFeed } from './rules/feed'
import { type RulesSearch, type Tab } from './search'


const route = getRouteApi('/admin/rules')

export function Rulewatch() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const day = useToday()
  const changes = useStore((s) => s.db.ruleChanges)
  const sources = useStore((s) => s.db.ruleSources)
  const versions = useStore((s) => s.db.packVersions)
  const { status: feed, refresh } = useRegwatchFeed()
  const set = (patch: Partial<RulesSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  /** Opening a review is a step you can go back from, so it gets its own history entry. */
  const openChange = (id: string) => void navigate({ search: { change: id } })

  const tab: Tab = search.tab ?? 'changes'
  const nz = useMemo(() => resolvePack('NZ', versions), [versions])
  const watch = useMemo(() => watchSummary(sources, day), [sources, day])
  const waiting = changes.filter((c) => c.status === 'pending_review' || c.status === 'needs_second_review')
  const previews = PACK_ORDER.filter((c) => PACKS[c].status === 'preview').length
  const reviewing = changes.find((c) => c.id === search.change)
  const event = feed.state === 'reported' && reviewing ? feed.feed.events.find((e) => e.id === reviewing.id) : undefined
  const trouble = watch.unreachable + watch.stale + watch.neverChecked

  return (
    <Page wide>
      <Head
        title="Rulewatch"
        lede="How the product stays current with the law. A watcher reads the sources and reports what moved; a person reads the evidence, weighs it against the guardrails, and decides. No value reaches a calculator without that decision, and every decision can be rolled back."
      />

      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-card lg:grid-cols-4">
        <div className="min-w-0 bg-surface px-4 py-3">
          <dt className="eyebrow truncate">Live pack</dt>
          <dd>
            <span className="mt-1 block truncate text-[15px] leading-tight font-semibold text-ink">
              {nz.name} <span className="font-mono text-[13px] font-medium text-ink-2">{nz.version}</span>
            </span>
            <span className="block truncate text-xs text-ink-3">{plural(previews, 'preview pack')} researched, driving nothing</span>
          </dd>
        </div>
        <div className="min-w-0 bg-surface px-4 py-3">
          <dt className="eyebrow truncate">Waiting for review</dt>
          <dd>
            <span className="num mt-1 block text-[15px] leading-tight font-semibold text-ink">{waiting.length}</span>
            <span className="block truncate text-xs text-ink-3">{waiting.length ? waiting[0].title : 'Every detected change has been decided'}</span>
          </dd>
        </div>
        <div className="min-w-0 bg-surface px-4 py-3">
          <dt className="eyebrow truncate">Sources read</dt>
          <dd>
            <span className="num mt-1 block text-[15px] leading-tight font-semibold text-ink">
              {watch.healthy + watch.changed} of {watch.total}
            </span>
            <span className={`block truncate text-xs ${trouble ? 'text-warn-text' : 'text-ink-3'}`}>{trouble ? `${watch.unreachable} unreachable · ${watch.stale} stale` : 'None unreachable, none stale'}</span>
          </dd>
        </div>
        <div className="min-w-0 bg-surface px-4 py-3">
          <dt className="eyebrow truncate">Scheduled watcher</dt>
          <dd>
            <span className="mt-1 block truncate text-[15px] leading-tight font-semibold text-ink">
              {feed.state === 'reported' ? `Reported ${whenInline(feed.feed.generatedAt ?? '', day)}` : feed.state === 'silent' ? 'Has not reported yet' : feed.state === 'unavailable' ? 'Feed could not be read' : 'Reading the feed…'}
            </span>
            <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-ink-3">
              {feed.state === 'reported' ? (
                <span className="truncate">{plural(feed.feed.runs.length, 'run')} on record</span>
              ) : feed.state === 'loading' ? (
                <span className="truncate">One moment</span>
              ) : (
                <>
                  <Simulated>Demo data</Simulated>
                  <span className="truncate">until its first run</span>
                </>
              )}
            </span>
          </dd>
        </div>
      </dl>

      {search.change !== undefined ? (
        reviewing ? (
          <Review key={reviewing.id} change={reviewing} event={event} back={() => set({ change: undefined })} />
        ) : (
          <Callout tone="warn" title="That change is not on record" action={<Button size="sm" onClick={() => set({ change: undefined })}>See all changes</Button>}>
            The link points at a change that is not in this demo’s data. Resetting the demo, or a new seed, can remove one.
          </Callout>
        )
      ) : (
        <Tabs
          value={tab}
          onChange={(t) => set({ tab: t === 'changes' ? undefined : t, q: undefined, src: undefined })}
          tabs={[
            { value: 'changes', label: 'Changes', count: waiting.length },
            { value: 'sources', label: 'Sources', count: trouble },
            { value: 'packs', label: 'Rule packs' },
            { value: 'versions', label: 'Versions', count: versions.length },
          ]}
        >
          <TabPanel value="changes" className="pt-4">
            <Changes changes={changes} onOpen={openChange} />
          </TabPanel>
          <TabPanel value="sources" className="pt-4">
            <Sources feed={feed} refresh={refresh} place={search.j} state={search.src} q={search.q} onChange={set} />
          </TabPanel>
          <TabPanel value="packs" className="pt-4">
            <Packs view={search.view ?? 'rules'} code={search.j ?? 'NZ'} onChange={set} />
          </TabPanel>
          <TabPanel value="versions" className="pt-4">
            <Versions onOpenChange={openChange} />
          </TabPanel>
        </Tabs>
      )}
    </Page>
  )
}
