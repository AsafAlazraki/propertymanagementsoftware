/** Pieces the Rulewatch tabs share: how a jurisdiction, an origin and a before/after value are shown. */
import type { ReactNode } from 'react'
import { Eye, Flask, Minus, Plus } from '@phosphor-icons/react'
import type { JurisdictionCode, RuleChange } from '@/domain/types'
import { PACKS } from '@/domain/jurisdictions'
import { cn } from '@/ui/cn'
import { Simulated } from '../kit'

export const SHORT: Record<JurisdictionCode, string> = { NZ: 'NZ', 'AU-NSW': 'NSW', 'AU-VIC': 'VIC', 'AU-QLD': 'QLD', 'AU-WA': 'WA', 'AU-SA': 'SA' }

/**
 * The seeded practice drill: a rehearsal of the review path, not a change to
 * the law. It says so in its own title and quote; this finds it so every place
 * it appears can carry the label as well.
 */
export function isPracticeDrill(change: Pick<RuleChange, 'origin' | 'title'>): boolean {
  return change.origin === 'demo' && /^practice\b/i.test(change.title)
}

/** A jurisdiction's short name, with "preview" spelled out whenever the pack is one. */
export function PackTag({ code, className }: { code: JurisdictionCode; className?: string }) {
  const preview = PACKS[code].status === 'preview'
  return (
    <span className={cn('inline-flex h-5 shrink-0 items-center gap-1 rounded-sm px-1.5 font-mono text-[10.5px] font-medium tracking-wide whitespace-nowrap uppercase', preview ? 'border border-dashed border-line-strong text-ink-2' : 'bg-ink text-bg', className)}>
      {SHORT[code]}
      {preview && (
        <>
          <Eye className="size-3" aria-hidden />
          Preview
        </>
      )}
    </span>
  )
}

/** Where a change came from. A practice drill is never shown without saying it is one. */
export function OriginTag({ change }: { change: Pick<RuleChange, 'origin' | 'title'> }) {
  if (isPracticeDrill(change)) {
    return (
      <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-sm bg-warn-soft px-1.5 text-[11px] font-semibold whitespace-nowrap text-warn-text">
        <Flask weight="fill" className="size-3" aria-hidden />
        Practice drill, not real law
      </span>
    )
  }
  return change.origin === 'demo' ? <Simulated>Demo record</Simulated> : <span className="inline-flex h-5 items-center rounded-sm bg-info-soft px-1.5 text-[11px] font-medium whitespace-nowrap text-info-text">From the watcher</span>
}

/** One side of a diff: a removed value or an added one, marked by a sign as well as a colour. */
export function DiffLine({ side, children, note }: { side: 'before' | 'after'; children: ReactNode; note?: ReactNode }) {
  const before = side === 'before'
  return (
    <div className={cn('grid grid-cols-[1.75rem_minmax(0,1fr)] items-baseline font-mono text-[13px]', before ? 'bg-danger-soft/70' : 'bg-ok-soft/70')}>
      <span className={cn('grid h-full place-items-center self-stretch', before ? 'text-danger-text' : 'text-ok-text')}>
        {before ? <Minus weight="bold" className="size-3" aria-hidden /> : <Plus weight="bold" className="size-3" aria-hidden />}
        <span className="sr-only">{before ? 'Before:' : 'After:'}</span>
      </span>
      <span className="min-w-0 py-1.5 pr-3 text-ink">
        <span className={cn(before && 'line-through decoration-danger-text/50')}>{children}</span>
        {note && <span className="ml-2 font-sans text-xs text-ink-3">{note}</span>}
      </span>
    </div>
  )
}
