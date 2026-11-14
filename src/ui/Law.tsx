/**
 * The pieces that make the law visible.
 *
 * A first-time landlord becomes competent when the product shows, at the exact
 * place a decision is made, what the rule is, where it comes from and how the
 * date was worked out. These three components are that: a chip that opens the
 * rule, a list that shows the working, and a track that counts working days.
 */
import { ArrowSquareOut, SealCheck, Warning } from '@phosphor-icons/react'
import type { RuleKey } from '@/domain/jurisdictions/types'
import type { Step, Verdict } from '@/domain/rules/core'
import { fmtDate } from '@/domain/rules/calendar'
import { usePack } from '@/data/hooks'
import { Pop } from './overlays'
import { cn } from './cn'

/** A small "§" chip. Opens the rule in plain English with its citation, source and the date it was last checked. */
export function Why({ rule, label, className, tone = 'surface' }: { rule: RuleKey; label?: string; className?: string; tone?: 'surface' | 'nav' }) {
  const pack = usePack()
  const r = pack.rules[rule]
  const primary = r.verified === 'primary'
  return (
    <Pop
      trigger={
        <button
          type="button"
          className={cn(
            'pressable inline-flex h-6 max-w-full items-center gap-1 rounded-[5px] px-1.5 font-mono text-[11px] whitespace-nowrap transition-colors coarse:h-8 coarse:px-2',
            tone === 'nav' ? 'bg-nav-2 text-nav-ink-2 hoverable:hover:text-nav-ink' : 'bg-sunken text-ink-2 hoverable:hover:bg-accent-soft hoverable:hover:text-accent-text',
            className,
          )}
          aria-label={`The rule: ${r.label}. ${r.citation}`}
        >
          <span aria-hidden className="text-accent-text">
            §
          </span>
          <span className="truncate">{label ?? r.citation.replace(/^RTA 1986, /, '')}</span>
        </button>
      }
    >
      <p className="eyebrow mb-1.5">The rule</p>
      <p className="text-[15px] leading-snug font-semibold text-ink">{r.label}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{r.plain}</p>
      {r.notes && <p className="mt-2 rounded-md bg-sunken px-2.5 py-2 text-xs leading-relaxed text-ink-2">{r.notes}</p>}
      <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="group mt-3 flex items-start gap-2 rounded-md bg-accent-soft px-2.5 py-2">
        {primary ? <SealCheck weight="fill" className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden /> : <Warning weight="fill" className="mt-0.5 size-4 shrink-0 text-warn-text" aria-hidden />}
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[11px] font-medium text-ink">{r.citation}</span>
          <span className="block text-[11px] text-ink-3">
            {primary ? 'Read at source' : r.verified === 'secondary' ? 'From official guidance' : 'Not yet verified'} · {fmtDate(r.lastVerified, { weekday: false, year: 'always' })} · pack {pack.version}
          </span>
        </span>
        <ArrowSquareOut className="mt-0.5 size-3.5 shrink-0 text-ink-3" aria-hidden />
        <span className="sr-only">Opens the source in a new tab</span>
      </a>
      {r.effectiveFrom && <p className="mt-2 text-[11px] text-ink-3">In force since {fmtDate(r.effectiveFrom, { weekday: false, year: 'always' })}.</p>}
    </Pop>
  )
}

/** How a date was reached, step by step. Loop's own safety margin is marked so nobody mistakes it for law. */
export function Working({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn('relative grid gap-0', className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        return (
          <li key={`${s.label}-${i}`} className="relative flex gap-3 pb-3 last:pb-0">
            {!last && <span aria-hidden className="absolute top-4 bottom-0 left-[5px] w-px bg-line" />}
            <span aria-hidden className={cn('relative mt-[5px] size-[11px] shrink-0 rounded-full ring-[3px] ring-surface', last ? 'bg-accent' : s.policy ? 'bg-warn' : 'bg-line-strong')} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={cn('text-[13px] text-ink', last && 'font-semibold')}>
                  {s.label}
                  {s.policy && <span className="ml-1.5 rounded-[4px] bg-warn-soft px-1 py-px font-mono text-[10px] text-warn-text">not law</span>}
                </p>
                {s.date && <p className={cn('num text-[13px]', last ? 'font-semibold text-ink' : 'text-ink-2')}>{fmtDate(s.date, { year: 'always' })}</p>}
              </div>
              {s.detail && <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{s.detail}</p>}
              {s.rule && <Why rule={s.rule} className="mt-1" />}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** A refusal is a sentence with its reason, where it is refused — never a silently disabled control. */
export function Refusal({ verdict, className }: { verdict: Verdict; className?: string }) {
  if (verdict.ok) return null
  return (
    <div role="alert" className={cn('rounded-md bg-danger-soft p-3', className)}>
      <p className="flex items-start gap-2 text-[13px] font-semibold text-danger-text">
        <Warning weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
        {verdict.reason}
      </p>
      {verdict.fix && <p className="mt-1 pl-6 text-[13px] leading-relaxed text-ink">{verdict.fix}</p>}
      {verdict.rule && (
        <div className="mt-2 pl-6">
          <Why rule={verdict.rule} />
        </div>
      )}
    </div>
  )
}

/**
 * A deadline counted in working days, drawn as the days themselves: used days
 * filled, days left open. The count is real text beside it; the track is the
 * picture of it.
 */
export function DayTrack({ total, used, tone = 'accent', className }: { total: number; used: number; tone?: 'accent' | 'warn' | 'danger' | 'ok'; className?: string }) {
  const fill = { accent: 'bg-accent', warn: 'bg-warn', danger: 'bg-danger', ok: 'bg-ok' }[tone]
  const capped = Math.max(0, Math.min(total, used))
  return (
    <div aria-hidden className={cn('flex gap-[3px]', className)}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn('h-2 min-w-0 flex-1 rounded-[2px] transition-colors duration-300', i < capped ? fill : 'bg-line')} style={{ transitionDelay: `${i * 12}ms` }} />
      ))}
    </div>
  )
}
