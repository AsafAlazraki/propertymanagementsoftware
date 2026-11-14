import { useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, ArrowUp, ArrowSquareOut, MagnifyingGlass, SealCheck, ThumbsDown, ThumbsUp, UserCircle, Warning } from '@phosphor-icons/react'
import type { Portal } from '@/domain/types'
import { ask, suggestedQuestions, type Answer, type AskContext } from '@/domain/copilot'
import { resolvePack } from '@/domain/jurisdictions'
import { fmtDate, today } from '@/domain/rules/calendar'
import { db, newId, nowIso, useStore } from '@/data/store'
import { Sheet } from '@/ui/Sheet'
import { Button, buttonClass } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { useHotkey } from '@/ui/hooks'

interface Turn {
  id: string
  question: string
  answer: Answer | null
  rating?: 'up' | 'down'
}

/** The sidebar's search-shaped button. Looks like a field so people know they can type a question. */
export function AskButton({ onOpen, label, className }: { onOpen: () => void; label: string; className?: string }) {
  useHotkey('mod+k', (e) => {
    e.preventDefault()
    onOpen()
  })
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('pressable flex h-9 w-full items-center gap-2 rounded-md bg-nav-2 px-2.5 text-left text-[13px] text-nav-ink-2 transition-colors hoverable:hover:text-nav-ink', className)}
    >
      <MagnifyingGlass className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      <kbd className="rounded-[4px] border border-nav-line px-1 font-mono text-[10px] text-nav-ink-2">⌘K</kbd>
    </button>
  )
}

function Verified({ c }: { c: Answer['citations'][number] }) {
  const ok = c.verified === 'primary'
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-2.5 rounded-md bg-sunken px-3 py-2.5 transition-colors hoverable:hover:bg-accent-soft"
    >
      {ok ? <SealCheck weight="fill" className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden /> : <Warning weight="fill" className="mt-0.5 size-4 shrink-0 text-warn-text" aria-hidden />}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">{c.label}</span>
        <span className="block font-mono text-[11px] text-ink-3">
          {c.citation} · {ok ? 'read at source' : c.verified === 'secondary' ? 'from official guidance' : 'not yet verified'} {fmtDate(c.lastVerified, { weekday: false, year: 'always' })}
        </span>
      </span>
      <ArrowSquareOut className="mt-0.5 size-3.5 shrink-0 text-ink-3 group-hover:text-accent-text" aria-hidden />
      <span className="sr-only">(opens the source in a new tab)</span>
    </a>
  )
}

function AnswerCard({ turn, onRate, onClose }: { turn: Turn; onRate: (r: 'up' | 'down') => void; onClose: () => void }) {
  const a = turn.answer
  if (!a) {
    return (
      <div className="rounded-lg bg-warn-soft p-4">
        <p className="text-[15px] font-semibold text-ink">I do not have a verified answer to that.</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
          Rather than guess at something with legal consequences, I have sent your question to the Loop &amp; Pool team. A person will answer it, and once they have, I will know it too.
        </p>
      </div>
    )
  }
  return (
    <div className="animate-rise">
      <p className="text-[17px] leading-snug font-semibold tracking-[-0.01em] text-ink text-balance">{a.headline}</p>
      {a.body.map((p) => (
        <p key={p.slice(0, 32)} className="mt-2.5 text-[14px] leading-relaxed text-ink-2">
          {p}
        </p>
      ))}

      {a.figures.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg bg-accent-soft">
          <p className="eyebrow px-3.5 pt-3 !text-accent-text">For your {a.figures.length === 1 ? 'property' : 'properties'}</p>
          <dl className="divide-y divide-accent-line/50 px-3.5 pb-1">
            {a.figures.map((f) => (
              <div key={f.label} className="py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="min-w-0 truncate text-[13px] text-ink-2">{f.label}</dt>
                  <dd className="num shrink-0 text-[14px] font-semibold text-ink">{f.value}</dd>
                </div>
                {f.note && <p className="mt-0.5 text-xs text-ink-3">{f.note}</p>}
              </div>
            ))}
          </dl>
        </div>
      )}

      {a.taughtBy && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-3">
          <UserCircle className="size-4" aria-hidden /> Answered by {a.taughtBy} on the Loop &amp; Pool team.
        </p>
      )}

      {a.citations.length > 0 && (
        <div className="mt-4 grid gap-1.5">
          <p className="eyebrow">Where this comes from</p>
          {a.citations.map((c) => (
            <Verified key={c.label + c.citation} c={c} />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {a.next && (
          <Link to={a.next.to as LinkProps['to']} onClick={onClose} className={buttonClass({ intent: 'primary', size: 'sm' })}>
            {a.next.label}
            <ArrowRight weight="bold" className="size-3.5" />
          </Link>
        )}
        <span className="flex-1" />
        <span className="text-xs text-ink-3">Helpful?</span>
        <Button size="iconSm" intent={turn.rating === 'up' ? 'soft' : 'ghost'} aria-label="Yes, helpful" aria-pressed={turn.rating === 'up'} onClick={() => onRate('up')}>
          <ThumbsUp weight={turn.rating === 'up' ? 'fill' : 'regular'} className="size-4" />
        </Button>
        <Button size="iconSm" intent={turn.rating === 'down' ? 'dangerSoft' : 'ghost'} aria-label="No, not helpful" aria-pressed={turn.rating === 'down'} onClick={() => onRate('down')}>
          <ThumbsDown weight={turn.rating === 'down' ? 'fill' : 'regular'} className="size-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * Ask Loop / Ask Pool. Answers come from the rule pack and the asker's own
 * records, each with its source. A question nothing verified can answer is
 * said to be unanswered and goes to a person — that queue is the admin
 * console's "Assistant" screen.
 */
export function Assistant({ open, onOpenChange, portal }: { open: boolean; onOpenChange: (open: boolean) => void; portal: Portal }) {
  const data = useStore((s) => s.db)
  const session = useStore((s) => s.session)
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const name = portal === 'pool' ? 'Pool' : 'Loop'

  const ctx: AskContext | null = useMemo(
    () => (session ? { db: data, pack: resolvePack('NZ', data.packVersions), portal, userId: session.userId, orgId: session.orgId, today: today() } : null),
    [data, session, portal],
  )
  const suggestions = useMemo(() => (ctx ? suggestedQuestions(ctx) : []), [ctx])

  const submit = (question: string) => {
    const q = question.trim()
    if (!q || !ctx || !session) return
    const answer = ask(q, ctx)
    const id = newId('ct')
    setTurns((t) => [...t, { id, question: q, answer }])
    setText('')
    db.insert('copilotTurns', { id, userId: session.userId, orgId: session.orgId, portal, at: nowIso(), question: q, answered: answer !== null, intent: answer?.intent, review: answer ? 'none' : 'queued' })
    if (!answer) {
      db.insert('adminTasks', { id: newId('at'), kind: 'copilot_gap', title: `The assistant could not answer: “${q.slice(0, 80)}”`, detail: `Asked in ${name}. No verified rule or taught answer matched.`, refId: id, orgId: session.orgId, priority: 'p3', status: 'open', createdAt: nowIso() })
    }
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
  }

  const rate = (turnId: string, rating: 'up' | 'down') => {
    setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, rating } : x)))
    db.update('copilotTurns', turnId, { rating, review: rating === 'down' ? 'queued' : 'none' })
    if (rating === 'down') toast('Thanks — a person will look at that answer', { description: 'It has gone to the team’s review queue.' })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(text)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      eyebrow={`Ask ${name}`}
      title="Plain answers, with the law they rest on"
      description="General information, not legal advice. Every answer links to its source and the date it was last checked."
      footer={
        <form onSubmit={onSubmit} className="flex w-full items-center gap-2">
          <label htmlFor="ask-input" className="sr-only">
            Your question
          </label>
          <input
            id="ask-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={portal === 'pool' ? 'For example: can my landlord say no to a cat?' : 'For example: when can I next increase the rent?'}
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-md bg-sunken px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:shadow-[inset_0_0_0_2px_var(--focus)]"
          />
          <Button type="submit" intent="primary" size="icon" aria-label="Ask" disabled={!text.trim()}>
            <ArrowUp weight="bold" className="size-[18px]" />
          </Button>
        </form>
      }
    >
      {turns.length === 0 ? (
        <div>
          <p className="eyebrow mb-2.5">Things people ask</p>
          <ul className="grid gap-1.5">
            {suggestions.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => submit(s)} className="pressable flex min-h-11 w-full items-center justify-between gap-3 rounded-md bg-sunken px-3.5 py-2.5 text-left text-[14px] text-ink hoverable:hover:bg-accent-soft">
                  {s}
                  <ArrowRight className="size-4 shrink-0 text-ink-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-ink-3">
            In this prototype the assistant answers from the verified rule pack and your own records — it does not generate text, so it cannot invent a rule. A question it cannot answer goes to a person on the team.
          </p>
        </div>
      ) : (
        <div className="grid gap-7" aria-live="polite">
          {turns.map((t) => (
            <section key={t.id}>
              <p className="mb-3 ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm bg-ink px-3.5 py-2 text-[14px] text-bg">{t.question}</p>
              <AnswerCard turn={t} onRate={(r) => rate(t.id, r)} onClose={() => onOpenChange(false)} />
            </section>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </Sheet>
  )
}
