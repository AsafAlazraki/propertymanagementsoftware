/**
 * Assistant.
 *
 * What this screen does that no other does: it is where the assistant's
 * ignorance is turned into knowledge by a person. A question it could not
 * answer, or answered badly, waits here; someone on the team writes the answer
 * with its source; and the test bench on the right asks the real assistant the
 * question again, so the reviewer watches their own words come back before any
 * customer does.
 */
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ArrowRight,
  ChatCircleDots,
  CheckCircle,
  GraduationCap,
  Play,
  Robot,
  SealCheck,
  ThumbsDown,
  Trash,
  UserCircle,
  Warning,
  XCircle,
} from '@phosphor-icons/react'
import type { CopilotTurn, KbEntry, Portal } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { ask, type Answer } from '@/domain/copilot'
import { resolvePack } from '@/domain/jurisdictions'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { PERSONAS } from '@/app/session'
import { db, useMe, useStore } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { checkTeaching, dismissTurn, forgetAnswer, teachAnswer, type Teaching } from '@/data/admin-mutations'
import { Page, roleLabel } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Choice, Choices, Field, Input, Segmented, Textarea } from '@/ui/controls'
import { Empty } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { Flag, Head, Out, Panel, Status } from './kit'
import { initialCap, share, whenInline } from './format'
import { useLast } from './hooks'


const route = getRouteApi('/admin/assistant')

const STOP = new Set([
  'what',
  'when',
  'where',
  'which',
  'does',
  'have',
  'need',
  'with',
  'from',
  'that',
  'this',
  'they',
  'them',
  'their',
  'there',
  'about',
  'will',
  'would',
  'could',
  'should',
  'happens',
  'happen',
  'much',
  'many',
  'long',
  'your',
  'mine',
  'into',
  'than',
  'then',
  'been',
  'being',
  'charge',
  'landlord',
  'tenant',
])

/** A first guess at keywords: the distinctive words of the question. The reviewer edits them. */
function suggestKeywords(question: string): string {
  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
  return [...new Set(words)].slice(0, 4).join(', ')
}

const intentLabel = (intent: string | undefined, kb: KbEntry[]) => {
  if (!intent) return 'Nothing matched'
  if (intent.startsWith('kb:'))
    return `Taught: ${kb.find((k) => `kb:${k.id}` === intent)?.question ?? 'a removed answer'}`
  return initialCap(intent.replace(/_/g, ' '))
}

/* ───────────────────────────────── teaching ─────────────────────────────── */

export function TeachForm({
  turn,
  done,
  onTaught,
}: {
  turn?: CopilotTurn
  done: () => void
  onTaught: (question: string, portal: Portal) => void
}) {
  const me = useMe()
  const pack = usePack()
  const [question, setQuestion] = useState(turn?.question ?? '')
  const [keywords, setKeywords] = useState(turn ? suggestKeywords(turn.question) : '')
  const [answer, setAnswer] = useState('')
  const [citation, setCitation] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [portal, setPortal] = useState<KbEntry['portal']>(turn ? (turn.portal === 'pool' ? 'pool' : 'loop') : 'both')
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const teaching: Teaching = {
    turnId: turn?.id,
    question,
    keywords: keywords.split(','),
    answer,
    citation,
    sourceUrl,
    portal,
  }
  const sentences = answer.trim().split('. ')
  const ready = checkTeaching(teaching)
  /** Typing in any field clears the last refusal: it described the form as it was. */
  const bind = (setter: (value: string) => void) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value)
    setRefusal(null)
  }

  return (
    <form
      className="grid grid-cols-[minmax(0,1fr)] gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        const v = teachAnswer(teaching, me.fullName)
        if (!v.ok) return setRefusal(v)
        toast.success('The assistant knows this now', { description: 'Asking it again on the test bench.' })
        onTaught(question.trim(), portal === 'pool' ? 'pool' : 'loop')
        done()
      }}
    >
      {turn && (
        <p className="rounded-md bg-sunken px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">
          {turn.answered
            ? 'The assistant answered this from the rule pack and the answer was marked unhelpful. A taught answer on the same keywords replaces it.'
            : 'The assistant found nothing verified for this, said so, and sent it here.'}
        </p>
      )}
      <Field label="The question">
        {(p) => (
          <Input {...p} value={question} onChange={bind(setQuestion)} placeholder="For example: can I ban smoking?" />
        )}
      </Field>
      <Field
        label="Keywords"
        hint="Separated by commas. The assistant gives this answer when a question contains any one of them, so choose words that only this topic uses."
      >
        {(p) => (
          <Input
            {...p}
            value={keywords}
            onChange={bind(setKeywords)}
            placeholder="For example: garage remote, remote control, fob"
            autoComplete="off"
          />
        )}
      </Field>
      <Field
        label="The answer"
        hint="Lead with the answer. The first sentence is shown as the headline; the rest follows as the explanation."
      >
        {(p) => (
          <Textarea
            {...p}
            value={answer}
            onChange={bind(setAnswer)}
            placeholder="Write it as you would say it to a first-time landlord, and only what the source supports."
            className="min-h-32"
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Citation" optional hint="The provision, as the source names it.">
          {(p) => (
            <Input
              {...p}
              value={citation}
              onChange={bind(setCitation)}
              placeholder={`For example: ${pack.rules['bond.max_weeks'].citation}`}
            />
          )}
        </Field>
        <Field label="Source link" optional hint="The page a customer can open to read it.">
          {(p) => (
            <Input
              {...p}
              type="url"
              inputMode="url"
              value={sourceUrl}
              onChange={bind(setSourceUrl)}
              placeholder="https://"
              autoComplete="off"
            />
          )}
        </Field>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-medium text-ink">Who should get this answer?</p>
        <Segmented
          label="Which portal this answer is for"
          value={portal}
          onChange={setPortal}
          options={[
            { value: 'both', label: 'Owners and renters' },
            { value: 'loop', label: 'Owners only' },
            { value: 'pool', label: 'Renters only' },
          ]}
        />
      </div>

      {answer.trim().length > 0 && (
        <div className="rounded-lg bg-sunken p-3.5">
          <p className="eyebrow mb-1.5">How it will read</p>
          <p className="text-[14px] leading-snug font-semibold text-ink">{sentences[0].replace(/\.$/, '')}.</p>
          {sentences.length > 1 && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{sentences.slice(1).join('. ')}</p>
          )}
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-3">
            <UserCircle className="size-4" aria-hidden /> Answered by {me.fullName} on the Loop &amp; Pool team.
          </p>
        </div>
      )}

      {refusal ? (
        <Refusal verdict={refusal} />
      ) : !ready.ok && answer.trim().length > 0 ? (
        <p className="text-xs text-ink-3">Not ready to save yet. {ready.reason}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" intent="primary" icon={<GraduationCap weight="fill" className="size-4" />}>
          Teach this answer
        </Button>
        <Button intent="ghost" onClick={done}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

/* ───────────────────────────────── test bench ───────────────────────────── */

interface Trial {
  question: string
  portal: Portal
  answer: Answer | null
}

function runTrial(question: string, portal: Portal, day: string): Trial {
  const state = db.get()
  const persona = portal === 'pool' ? PERSONAS.tenant : PERSONAS.landlord
  return {
    question,
    portal,
    answer: ask(question, {
      db: state,
      pack: resolvePack('NZ', state.packVersions),
      portal,
      userId: persona.userId,
      orgId: persona.orgId,
      today: day,
    }),
  }
}

function Bench({ trial, onRun }: { trial: Trial | null; onRun: (question: string, portal: Portal) => void }) {
  const [asked, setAsked] = useState('')
  const [portal, setPortal] = useState<Portal>('loop')
  const landlord = useStore((s) => s.db.users.find((u) => u.id === PERSONAS.landlord.userId)?.fullName)
  const renter = useStore((s) => s.db.users.find((u) => u.id === PERSONAS.tenant.userId)?.fullName)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (asked.trim()) onRun(asked.trim(), portal)
    else document.getElementById('bench-q')?.focus()
  }
  const a = trial?.answer
  return (
    <section
      aria-labelledby="bench-title"
      className="min-w-0 overflow-hidden rounded-lg bg-nav text-nav-ink shadow-card"
    >
      <div className="px-4 pt-3.5">
        <h2 id="bench-title" className="text-[13px] font-semibold">
          Try it
        </h2>
        <p className="mt-0.5 text-xs text-nav-ink-2">
          Asks the real assistant, as a customer would. Nothing you ask here is logged as a customer question.
        </p>
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <label htmlFor="bench-q" className="sr-only">
            A question to try
          </label>
          <div className="flex gap-2">
            <input
              id="bench-q"
              value={asked}
              onChange={(e) => setAsked(e.target.value)}
              placeholder="Ask what a customer would ask"
              autoComplete="off"
              required
              className="h-9 min-w-0 flex-1 rounded-md bg-nav-2 px-3 text-[13px] text-nav-ink outline-none placeholder:text-nav-ink-2 focus:shadow-[inset_0_0_0_2px_var(--glow)] coarse:h-11"
            />
            <Button
              type="submit"
              intent="primary"
              size="sm"
              className="h-9 coarse:h-11"
              icon={<Play weight="fill" className="size-3.5" />}
            >
              Ask
            </Button>
          </div>
          <Choices label="Ask as" value={portal} onChange={setPortal} className="flex gap-1.5 text-xs">
            {(['loop', 'pool'] as const).map((p) => (
              <Choice
                key={p}
                value={p}
                className={cn(
                  'inline-flex h-7 cursor-pointer items-center rounded-md px-2.5 font-medium transition-colors coarse:h-10',
                  portal === p ? 'bg-nav-ink text-nav' : 'bg-nav-2 text-nav-ink-2 hoverable:hover:text-nav-ink',
                )}
              >
                {p === 'loop'
                  ? `As a landlord${landlord ? ` (${landlord.split(' ')[0]})` : ''}`
                  : `As a renter${renter ? ` (${renter.split(' ')[0]})` : ''}`}
              </Choice>
            ))}
          </Choices>
        </form>
      </div>

      <div className="mt-3.5 border-t border-nav-line p-4" aria-live="polite">
        {!trial ? (
          <p className="text-[13px] leading-relaxed text-nav-ink-2">
            Ask a question to see exactly what a customer would be told, and where the answer came from.
          </p>
        ) : (
          <div className="rounded-md bg-surface p-3.5 text-ink">
            <p className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
              <span className="min-w-0 truncate">“{trial.question}”</span>
              <span className="shrink-0">as a {trial.portal === 'pool' ? 'renter' : 'landlord'}</span>
            </p>
            {!a ? (
              <>
                <Flag tone="warn" icon={Warning}>
                  No verified answer
                </Flag>
                <p className="mt-2 text-[13px] leading-relaxed text-ink">
                  It would say it does not know, rather than guess, and send the question to this screen.
                </p>
              </>
            ) : (
              <>
                {a.taughtBy ? (
                  <Flag tone="accent" icon={GraduationCap}>
                    Taught by {a.taughtBy}
                  </Flag>
                ) : (
                  <Flag tone="ok" icon={SealCheck}>
                    From the rule pack · {initialCap(a.intent.replace(/_/g, ' '))}
                  </Flag>
                )}
                <p className="mt-2 text-[14px] leading-snug font-semibold text-ink">{a.headline}</p>
                {a.body.map((para) => (
                  <p key={para.slice(0, 40)} className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                    {para}
                  </p>
                ))}
                {a.figures.length > 0 && (
                  <dl className="mt-2.5 divide-y divide-line rounded-md bg-sunken px-3">
                    {a.figures.map((f) => (
                      <div key={f.label} className="flex items-baseline justify-between gap-3 py-1.5 text-xs">
                        <dt className="min-w-0 truncate text-ink-2">{f.label}</dt>
                        <dd className="num shrink-0 font-semibold text-ink">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {a.citations.length > 0 ? (
                  <ul className="mt-2.5 grid gap-1 text-xs">
                    {a.citations.map((c) => (
                      <li key={c.label + c.citation} className="min-w-0">
                        <Out href={c.url}>{c.citation}</Out>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2.5 text-xs text-ink-3">No source is attached to this answer.</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ───────────────────────────────── the screen ───────────────────────────── */

export function Assistant() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const me = useMe()
  const day = useToday()
  const turns = useStore((s) => s.db.copilotTurns)
  const kb = useStore((s) => s.db.kb)
  const users = useStore((s) => s.db.users)
  const [trial, setTrial] = useState<Trial | null>(null)
  const [opened, setOpened] = useState(0)
  const close = () => void navigate({ search: {}, replace: true })
  /** Each opening gets a fresh form, even for the same question. */
  const teach = (turn: string) => {
    setOpened((n) => n + 1)
    void navigate({ search: { turn }, replace: true })
  }

  const userOf = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const queue = useMemo(
    () => turns.filter((t) => t.review === 'queued').sort((a, b) => b.at.localeCompare(a.at)),
    [turns],
  )
  const stats = useMemo(() => {
    const rated = turns.filter((t) => t.rating)
    return {
      total: turns.length,
      answered: turns.filter((t) => t.answered).length,
      rated: rated.length,
      up: rated.filter((t) => t.rating === 'up').length,
    }
  }, [turns])
  const intents = useMemo(() => {
    const by = new Map<string, { asked: number; up: number; down: number }>()
    for (const t of turns) {
      const key = t.answered ? (t.intent ?? 'unknown') : ''
      const row = by.get(key) ?? { asked: 0, up: 0, down: 0 }
      by.set(key, {
        asked: row.asked + 1,
        up: row.up + (t.rating === 'up' ? 1 : 0),
        down: row.down + (t.rating === 'down' ? 1 : 0),
      })
    }
    return [...by.entries()]
      .map(([intent, v]) => ({ intent: intent || undefined, ...v }))
      .sort((a, b) => b.asked - a.asked || (a.intent ?? '').localeCompare(b.intent ?? ''))
  }, [turns])
  const most = intents[0]?.asked ?? 0

  // The form stays as it was while the sheet slides away.
  const shownId = useLast(search.turn)
  const turn = turns.find((t) => t.id === shownId)
  const run = (question: string, portal: Portal) => setTrial(runTrial(question, portal, day))

  return (
    <Page wide>
      <Head
        title="Assistant"
        lede="Ask Loop and Ask Pool answer from the verified rule pack, or from an answer a person here has taught them, and show the source either way. They never compose a rule. What they cannot answer comes here to be answered by someone who can."
        actions={
          <Button intent="secondary" icon={<GraduationCap className="size-4" />} onClick={() => teach('new')}>
            Teach something new
          </Button>
        }
      />

      <dl className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line shadow-card lg:grid-cols-4">
        {[
          {
            label: 'Answered',
            value: share(stats.answered, stats.total),
            sub: `${stats.answered} of ${stats.total} questions`,
          },
          {
            label: 'Marked helpful',
            value: share(stats.up, stats.rated),
            sub: stats.rated ? `${stats.up} of ${stats.rated} rated answers` : 'No answer has been rated yet',
          },
          {
            label: 'Waiting for review',
            value: String(queue.length),
            sub: `${queue.filter((t) => !t.answered).length} unanswered · ${queue.filter((t) => t.rating === 'down').length} marked unhelpful`,
          },
          {
            label: 'Taught by the team',
            value: String(kb.length),
            sub: `${turns.filter((t) => t.review === 'taught').length} from customers’ questions`,
          },
        ].map((f) => (
          <div key={f.label} className="min-w-0 bg-surface px-4 py-3">
            <dt className="eyebrow truncate">{f.label}</dt>
            <dd>
              <span className="num mt-1 block text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                {f.value}
              </span>
              <span className="block truncate text-xs text-ink-3">{f.sub}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid min-w-0 gap-5">
          <section aria-labelledby="gaps-title">
            <h2 id="gaps-title" className="mb-2.5 text-[13px] font-semibold text-ink">
              Waiting for an answer
            </h2>
            {queue.length === 0 ? (
              <div className="rounded-lg bg-surface shadow-card">
                <Empty
                  icon={<CheckCircle weight="fill" />}
                  title="No question is waiting"
                  body="When the assistant cannot answer a customer, or an answer is marked unhelpful, the question arrives here for a person to answer."
                />
              </div>
            ) : (
              <ul className="grid gap-2.5">
                {queue.map((t) => {
                  const who = userOf.get(t.userId)
                  return (
                    <li key={t.id} className="rounded-lg bg-surface p-4 shadow-card">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {t.answered ? (
                          <Flag tone="danger" icon={ThumbsDown}>
                            Answer marked unhelpful
                          </Flag>
                        ) : (
                          <Flag tone="warn" icon={ChatCircleDots}>
                            Could not answer
                          </Flag>
                        )}
                        <span className="text-xs text-ink-3">
                          {who ? `${who.fullName}, ${roleLabel(who.role).toLowerCase()}` : 'A customer'} ·{' '}
                          {t.portal === 'pool' ? 'Pool' : 'Loop'} · {whenInline(t.at, day)}
                        </span>
                      </div>
                      <p className="mt-2 text-[15px] leading-snug font-medium text-ink">“{t.question}”</p>
                      {t.answered && (
                        <p className="mt-1 text-xs text-ink-3">
                          It answered under “{intentLabel(t.intent, kb)}”. Try it on the test bench to read what it
                          said.
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          intent="primary"
                          size="sm"
                          icon={<GraduationCap weight="fill" className="size-4" />}
                          onClick={() => teach(t.id)}
                        >
                          Teach an answer
                        </Button>
                        <Button
                          intent="secondary"
                          size="sm"
                          icon={<Play className="size-3.5" />}
                          onClick={() => run(t.question, t.portal === 'pool' ? 'pool' : 'loop')}
                        >
                          Try it
                        </Button>
                        <Button
                          intent="ghost"
                          size="sm"
                          icon={<XCircle className="size-4" />}
                          onClick={() => {
                            dismissTurn(t.id, me.fullName)
                            toast('Dismissed', {
                              description: 'The question stays in the history; nothing was taught.',
                            })
                          }}
                        >
                          Nothing to teach
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <Panel title="What people ask" note="Every question, grouped by what the assistant recognised it as.">
            {intents.length === 0 ? (
              <p className="text-[13px] text-ink-2">Nobody has asked the assistant anything yet.</p>
            ) : (
              <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                {intents.map((i) => (
                  <li
                    key={i.intent ?? 'none'}
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_3.5rem_auto] items-center gap-2.5 py-1 text-[13px]"
                  >
                    <span className={cn('truncate', i.intent ? 'text-ink' : 'text-warn-text')}>
                      {intentLabel(i.intent, kb)}
                    </span>
                    <span aria-hidden className="h-1 overflow-hidden rounded-full bg-sunken">
                      <span
                        className={cn('block h-full rounded-full', i.intent ? 'bg-accent' : 'bg-warn')}
                        style={{ width: `${(i.asked / most) * 100}%` }}
                      />
                    </span>
                    <span className="num w-16 text-right text-xs text-ink-3">
                      <span className="font-semibold text-ink">{i.asked}</span>
                      {i.down > 0 && <span className="text-danger-text"> · {i.down} down</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid min-w-0 gap-5 xl:sticky xl:top-6">
          <Bench trial={trial} onRun={run} />

          <Panel title="Taught answers" note="What the team has added to what the rule pack knows.">
            {kb.length === 0 ? (
              <Empty
                icon={<Robot />}
                title="Nothing taught yet"
                body="Answers the team writes appear here, each with its keywords and its source."
                action={<Button onClick={() => teach('new')}>Teach the first one</Button>}
                className="py-6"
              />
            ) : (
              <ul className="-my-1 divide-y divide-line">
                {kb.map((k) => (
                  <li key={k.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-[13px] font-medium text-ink">{k.question}</p>
                      <div className="-mt-1 flex shrink-0 items-center">
                        <Button
                          size="iconSm"
                          intent="ghost"
                          aria-label={`Try “${k.question}”`}
                          onClick={() => run(k.question, k.portal === 'pool' ? 'pool' : 'loop')}
                        >
                          <Play className="size-3.5" />
                        </Button>
                        <Button
                          size="iconSm"
                          intent="ghost"
                          aria-label={`Remove the taught answer to “${k.question}”`}
                          onClick={() => {
                            forgetAnswer(k.id, me.fullName)
                            toast('Removed', { description: 'The assistant no longer gives this answer.' })
                          }}
                        >
                          <Trash className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-2">{k.answer}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-ink-3">
                      {k.keywords.map((w) => (
                        <span key={w} className="rounded-sm bg-sunken px-1.5 py-0.5 font-mono text-ink-2">
                          {w}
                        </span>
                      ))}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-3">
                      <span>
                        {k.taughtBy} · {fmtDate(dateOf(k.taughtAt), { weekday: false })} ·{' '}
                        {k.portal === 'both' ? 'owners and renters' : k.portal === 'pool' ? 'renters' : 'owners'}
                      </span>
                      {k.citation && k.sourceUrl ? (
                        <Out href={k.sourceUrl}>{k.citation}</Out>
                      ) : (
                        <Status tone="warn" icon={Warning} className="text-[11px]">
                          No source attached
                        </Status>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <Sheet
        open={search.turn !== undefined}
        onOpenChange={(o) => !o && close()}
        size="lg"
        eyebrow="Teach the assistant"
        title={turn ? `“${turn.question}”` : 'A new answer'}
        description="Your answer is given to customers under your name, with its source. Write only what the source supports."
        footer={
          <span className="mr-auto flex items-center gap-1.5 text-xs text-ink-3">
            <ArrowRight className="size-3.5" aria-hidden /> After saving, the test bench asks the question again so you
            can read the result.
          </span>
        }
      >
        <TeachForm key={`${shownId}:${opened}`} turn={turn} done={close} onTaught={run} />
      </Sheet>
    </Page>
  )
}
