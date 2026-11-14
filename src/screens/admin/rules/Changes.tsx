/** The list of detected changes, read like a list of pull requests: what is open, what is approved and waiting, what was decided. */
import { CheckCircle, Scales } from '@phosphor-icons/react'
import type { RuleChange } from '@/domain/types'
import { approversOf, needsTwoReviewers } from '@/domain/regwatch'
import { plural } from '@/domain/rules/format'
import { useToday } from '@/data/hooks'
import { Empty } from '@/ui/display'
import { cn } from '@/ui/cn'
import { Status, TONE_SOFT } from '../kit'
import { CHANGE_STATUS, CONFIDENCE, IMPACT } from '../labels'
import { whenInline } from '../format'
import { arrowNav } from '../hooks'
import { OriginTag, PackTag } from './shared'

const GROUPS: { id: string; title: string; note: string; holds: RuleChange['status'][] }[] = [
  { id: 'open', title: 'Waiting for a decision', note: 'Nothing here has changed a rule yet.', holds: ['pending_review', 'needs_second_review'] },
  { id: 'approved', title: 'Approved, not in force', note: 'Reviewed and signed. Publishing is a separate step.', holds: ['approved'] },
  { id: 'decided', title: 'Decided', note: 'Published, rejected, or needing no action.', holds: ['published', 'rejected', 'no_action'] },
]

function ChangeRow({ change, onOpen }: { change: RuleChange; onOpen: () => void }) {
  const day = useToday()
  const status = CHANGE_STATUS[change.status]
  const Glyph = status.icon
  const impact = IMPACT[change.impact]
  const approvers = approversOf(change)
  const open = change.status === 'pending_review' || change.status === 'needs_second_review'
  return (
    <li>
      <button type="button" data-row-open onClick={onOpen} className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 px-4 py-3 text-left outline-offset-[-2px] transition-colors duration-100 hoverable:hover:bg-surface-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-md', open ? TONE_SOFT[status.tone] : 'bg-sunken text-ink-3')}>
          <Glyph weight="fill" className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <PackTag code={change.jurisdiction} />
            <span className={cn('min-w-0 text-[13px] leading-snug font-medium', open ? 'text-ink' : 'text-ink-2')}>{change.title}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
            <OriginTag change={change} />
            <Status tone={impact.tone} icon={impact.icon}>
              {impact.label}
            </Status>
            <span>{change.patches.length ? plural(change.patches.length, 'rule') : 'No rule value changes'}</span>
            <span className="hidden sm:inline">{CONFIDENCE[change.confidence]}</span>
          </span>
        </span>
        <span className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs lg:col-start-3 lg:flex-col lg:items-end lg:gap-y-0.5">
          <Status tone={status.tone} icon={status.icon} strong={open}>
            {status.label}
            {change.publishedInVersion ? ` in ${change.publishedInVersion}` : ''}
          </Status>
          <span className="num text-ink-3">
            {open && needsTwoReviewers(change) ? `${approvers.length} of 2 approvals · ` : ''}
            detected {whenInline(change.detectedAt, day)}
          </span>
        </span>
      </button>
    </li>
  )
}

export function Changes({ changes, onOpen }: { changes: RuleChange[]; onOpen: (id: string) => void }) {
  if (changes.length === 0) {
    return (
      <div className="rounded-lg bg-surface shadow-card">
        <Empty icon={<Scales />} title="No change has been detected" body="When the watcher sees a watched source change, the change appears here with its evidence, to be reviewed by a person before any rule moves." />
      </div>
    )
  }
  const sorted = [...changes].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
  const waiting = sorted.filter((c) => GROUPS[0].holds.includes(c.status)).length
  return (
    <div className="grid gap-4" onKeyDown={arrowNav}>
      {waiting === 0 && (
        <p className="flex items-center gap-2 rounded-md bg-ok-soft px-3 py-2 text-[13px] text-ink">
          <CheckCircle weight="fill" className="size-4 shrink-0 text-ok-text" aria-hidden />
          Nothing is waiting for review. Every detected change has been decided.
        </p>
      )}
      {GROUPS.map((group) => {
        const rows = sorted.filter((c) => group.holds.includes(c.status))
        if (rows.length === 0) return null
        return (
          <section key={group.id} aria-labelledby={`changes-${group.id}`} className="overflow-clip rounded-lg bg-surface shadow-card">
            <header className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line bg-surface-2 px-4 py-2">
              <h2 id={`changes-${group.id}`} className="text-[13px] font-semibold text-ink">
                {group.title} <span className="num ml-1 font-normal text-ink-3">{rows.length}</span>
              </h2>
              <p className="text-xs text-ink-3">{group.note}</p>
            </header>
            <ul className="divide-y divide-line">
              {rows.map((c) => (
                <ChangeRow key={c.id} change={c} onOpen={() => onOpen(c.id)} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
