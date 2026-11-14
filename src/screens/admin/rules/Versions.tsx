/** The publish history: every pack version, newest first, with what each one changed and the one-step rollback. */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowUUpLeft, Package } from '@phosphor-icons/react'
import type { RulePackVersion } from '@/domain/types'
import type { RuleKey } from '@/domain/jurisdictions/types'
import type { Verdict } from '@/domain/rules/core'
import { PACKS, PACK_ORDER, resolvePack } from '@/domain/jurisdictions'
import { formatRuleValue, latestOverriding } from '@/domain/regwatch'
import { fmtDate } from '@/domain/rules/calendar'
import { useMe, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { rollbackVersion } from '@/data/admin-mutations'
import { Button } from '@/ui/Button'
import { Empty } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { whenExact } from '../format'
import { DiffLine, PackTag } from './shared'

function VersionCard({ v, all, current, canRollBack, onOpenChange }: { v: RulePackVersion; all: RulePackVersion[]; current: boolean; canRollBack: boolean; onOpenChange: (id: string) => void }) {
  const me = useMe()
  const changes = useStore((s) => s.db.ruleChanges)
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const before = useMemo(() => resolvePack(v.jurisdiction, all.filter((x) => x.publishedAt < v.publishedAt)), [v, all])
  const day = useToday()
  const keys = Object.keys(v.overrides)
  const heldUntil = (key: string) => (v.commences?.[key] && v.commences[key] > day ? v.commences[key] : undefined)
  const allHeld = keys.length > 0 && keys.every((k) => heldUntil(k))
  const linked = changes.filter((c) => v.changeIds.includes(c.id))
  return (
    <li className="relative pb-5 pl-7 last:pb-0">
      <span aria-hidden className="absolute top-2 bottom-0 left-[7px] w-px bg-line" />
      <span aria-hidden className={cn('absolute top-1.5 left-0 size-[15px] rounded-full ring-4 ring-bg', current ? 'bg-accent' : 'bg-line-strong')} />
      <article className="rounded-lg bg-surface p-4 shadow-card">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <PackTag code={v.jurisdiction} />
          <h3 className="font-mono text-[15px] font-semibold text-ink">{v.version}</h3>
          {current && <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent-text">{allHeld ? 'Newest version, waiting for its commencement date' : 'What the calculators run on now'}</span>}
          <span className="ml-auto text-xs text-ink-3" title={whenExact(v.publishedAt)}>
            {v.publishedBy} · {whenExact(v.publishedAt)}
          </span>
        </header>
        <p className="mt-2 max-w-[80ch] text-[13px] leading-relaxed text-ink">{v.note}</p>

        {keys.length === 0 ? (
          <p className="mt-2.5 text-xs text-ink-3">Changed no value through the console. The values of this version are the ones shipped in the pack file.</p>
        ) : (
          <div className="mt-3 grid gap-2.5">
            {keys.map((key) => {
              const known = key in before.rules
              return (
                <div key={key} className="overflow-hidden rounded-md shadow-card">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-line bg-surface-2 px-3 py-1.5 text-xs">
                    <span className="font-medium text-ink">{known ? before.rules[key as RuleKey].label : 'Unknown rule'}</span>
                    <span className="font-mono text-[11px] text-ink-3">{key}</span>
                  </p>
                  {known && <DiffLine side="before">{formatRuleValue(key, before.rules[key as RuleKey].value)}</DiffLine>}
                  <DiffLine side="after" note={heldUntil(key) ? `held until ${fmtDate(heldUntil(key)!, { weekday: false, year: 'always' })}` : undefined}>
                    {formatRuleValue(key, v.overrides[key])}
                  </DiffLine>
                </div>
              )
            })}
          </div>
        )}

        {(linked.length > 0 || keys.length > 0) && (
          <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3">
            {linked.map((c) => (
              <button key={c.id} type="button" onClick={() => onOpenChange(c.id)} className="max-w-full truncate rounded-sm text-left text-[13px] text-accent-text underline decoration-accent-line underline-offset-2">
                {c.title}
              </button>
            ))}
            {keys.length > 0 &&
              (canRollBack ? (
                <Button
                  size="sm"
                  intent="secondary"
                  className="ml-auto"
                  icon={<ArrowUUpLeft className="size-3.5" />}
                  onClick={() => {
                    const result = rollbackVersion(v.id, me.fullName)
                    if (!result.ok) return setRefusal(result)
                    toast.success(`Rolled back with ${v.jurisdiction} ${result.version}`, { description: 'The values this version replaced are live again.' })
                  }}
                >
                  Roll back
                </Button>
              ) : (
                <span className="ml-auto text-xs text-ink-3">{current ? '' : 'A newer version changed values after this one; roll that back first.'}</span>
              ))}
          </footer>
        )}
        {refusal && <Refusal verdict={refusal} className="mt-3" />}
      </article>
    </li>
  )
}

export function Versions({ onOpenChange }: { onOpenChange: (id: string) => void }) {
  const versions = useStore((s) => s.db.packVersions)
  const sorted = useMemo(() => [...versions].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [versions])
  const newest = useMemo(() => new Map(PACK_ORDER.map((code) => [code, sorted.find((v) => v.jurisdiction === code)?.id])), [sorted])
  const rollable = useMemo(() => new Map(PACK_ORDER.map((code) => [code, PACKS[code].status === 'live' ? latestOverriding(versions, code)?.id : undefined])), [versions])

  return (
    <div className="max-w-5xl">
      <p className="mb-4 max-w-[80ch] text-[13px] leading-relaxed text-ink-2">
        A published version is never edited. Each one is laid over the pack shipped in the code, oldest first, and the result is what every calculator reads. A value published ahead of its commencement date is held until that day. Rolling back publishes another version that restores the values the last one replaced, so both stay in the record.
      </p>
      {sorted.length === 0 ? (
        <div className="rounded-lg bg-surface shadow-card">
          <Empty icon={<Package />} title="Nothing has been published" body="Every calculator is reading the pack as shipped. The first approved change to be published will appear here as a version." />
        </div>
      ) : (
        <ol>
          {sorted.map((v) => (
            <VersionCard key={v.id} v={v} all={versions} current={newest.get(v.jurisdiction) === v.id} canRollBack={rollable.get(v.jurisdiction) === v.id} onOpenChange={onOpenChange} />
          ))}
        </ol>
      )}
      <div className="mt-5 rounded-lg border border-dashed border-line-strong p-4">
        <p className="eyebrow mb-1.5">Shipped in the code</p>
        <ul className="grid gap-1.5 text-[13px] sm:grid-cols-2 xl:grid-cols-3">
          {PACK_ORDER.map((code) => (
            <li key={code} className="flex min-w-0 items-center gap-2">
              <PackTag code={code} />
              <span className="font-mono text-[12px] text-ink">{PACKS[code].version}</span>
              <span className="truncate text-xs text-ink-3">{fmtDate(PACKS[code].publishedOn, { weekday: false, year: 'always' })}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs leading-relaxed text-ink-3">These are the pack files themselves: the base every published version is laid over. They change only with a new entry in the research notes and a release.</p>
      </div>
    </div>
  )
}
