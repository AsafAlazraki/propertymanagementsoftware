/**
 * Feedback.
 *
 * What this screen does that no other does: it is where the team reads what
 * customers wrote, in their words, and answers them. It is an inbox, not a
 * report: a list of messages down one side and the one being read beside it,
 * with the reply box under the message it answers. The summary across the top
 * is there to say where to look first, and each part of it filters the inbox.
 */
import { useMemo, useState } from 'react'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowFatUp, ChatsCircle, CheckCircle, ListPlus, MinusCircle, PaperPlaneRight, X } from '@phosphor-icons/react'
import type { Feedback as FeedbackRow, User } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { useMe, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { feedbackToTask, replyToFeedback, saveFeedbackNote, setFeedbackStatus } from '@/data/admin-mutations'
import { Page, roleLabel } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Segments } from '@/ui/charts'
import { Field, Segmented, Textarea } from '@/ui/controls'
import { Avatar, Empty } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { useMediaQuery } from '@/ui/hooks'
import { cn } from '@/ui/cn'
import { Filter, Head, Panel, Status, TONE_TEXT, Tally, Toolbar } from './kit'
import { FEEDBACK_FLOW, FEEDBACK_KIND, FEEDBACK_STATUS, SENTIMENT } from './labels'
import { whenExact, whenShort } from './format'
import { arrowNav, useLast } from './hooks'
import { FEEDBACK_KINDS as KINDS, MOODS, type Box, type FeedbackSearch } from './search'


const route = getRouteApi('/admin/feedback')

const inBox = (f: FeedbackRow, box: Box) => (box === 'all' ? true : box === 'new' ? f.status === 'new' : box === 'open' ? f.status === 'triaged' || f.status === 'planned' : f.status === 'shipped' || f.status === 'declined')

const MOOD_COLOUR: Record<FeedbackRow['sentiment'], string> = { positive: 'var(--ok)', neutral: 'var(--line-strong)', negative: 'var(--danger)' }

/* ───────────────────────────────── one message ──────────────────────────── */

function Message({ f, author, orgName, selected, onOpen }: { f: FeedbackRow; author?: User; orgName?: string; selected: boolean; onOpen: () => void }) {
  const day = useToday()
  const mood = SENTIMENT[f.sentiment]
  const Mood = mood.icon
  const Kind = FEEDBACK_KIND[f.kind].icon
  const status = FEEDBACK_STATUS[f.status]
  const unread = f.status === 'new'
  return (
    <li>
      <button
        type="button"
        data-row-open
        onClick={onOpen}
        aria-current={selected || undefined}
        className={cn('relative block w-full px-3.5 py-3 text-left outline-offset-[-2px] transition-colors duration-100 hoverable:hover:bg-surface-2', selected && 'bg-accent-soft/60 shadow-[inset_2px_0_0_var(--accent)] hoverable:hover:bg-accent-soft/60')}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5">
            {unread && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-accent" />}
            <span className={cn('truncate text-[13px] text-ink', unread ? 'font-semibold' : 'font-medium')}>{author?.fullName ?? 'Someone'}</span>
            <span className="truncate text-xs text-ink-3">{orgName ?? (author ? roleLabel(author.role) : '')}</span>
          </span>
          <span className="num shrink-0 text-[11px] text-ink-3">{whenShort(f.createdAt, day)}</span>
        </span>
        <span className={cn('mt-1 line-clamp-2 block text-[13px] leading-snug', unread ? 'text-ink' : 'text-ink-2')}>{f.text}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
          <span className="inline-flex items-center gap-1">
            <Mood weight="fill" className={cn('size-3.5', TONE_TEXT[mood.tone])} aria-hidden />
            <span className="sr-only">{mood.label}.</span>
            <Kind className="size-3.5" aria-hidden />
            {FEEDBACK_KIND[f.kind].label}
          </span>
          <span className="truncate">{f.area}</span>
          <span className="num inline-flex items-center gap-0.5" title={`${f.votes} ${f.votes === 1 ? 'person agrees' : 'people agree'}`}>
            <ArrowFatUp className="size-3" aria-hidden />
            {f.votes}
            <span className="sr-only"> votes</span>
          </span>
          <Status tone={status.tone} icon={status.icon} className="ml-auto">
            {status.label}
          </Status>
        </span>
      </button>
    </li>
  )
}

/* ─────────────────────────────── the reading pane ───────────────────────── */

export function Reading({ f, author, orgName }: { f: FeedbackRow; author?: User; orgName?: string }) {
  const me = useMe()
  const navigate = useNavigate()
  const tasks = useStore((s) => s.db.adminTasks)
  const queued = tasks.find((t) => t.kind === 'feedback_followup' && t.refId === f.id && (t.status === 'open' || t.status === 'in_progress'))
  const [reply, setReply] = useState(f.adminReply ?? '')
  const [note, setNote] = useState(f.adminNote ?? '')
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const mood = SENTIMENT[f.sentiment]
  const Kind = FEEDBACK_KIND[f.kind].icon
  const at = FEEDBACK_FLOW.indexOf(f.status)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex items-center gap-3">
        <Avatar name={author?.fullName ?? '?'} hue={author?.hue ?? 0} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">{author?.fullName ?? 'Someone'}</p>
          <p className="truncate text-xs text-ink-3">
            {author ? roleLabel(author.role) : ''}
            {f.orgId && orgName && (
              <>
                {' · '}
                <Link to="/admin/orgs" search={{ org: f.orgId }} className="rounded-sm underline decoration-line-strong underline-offset-2">
                  {orgName}
                </Link>
              </>
            )}
          </p>
        </div>
        <p className="num shrink-0 text-right text-[11px] text-ink-3">
          {whenExact(f.createdAt)}
          <span className="block">
            from {f.portal === 'pool' ? 'Pool' : 'Loop'} · {f.screen}
          </span>
        </p>
      </div>

      <blockquote className="border-l-2 border-accent-line pl-4 text-[15px] leading-relaxed text-ink">{f.text}</blockquote>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">
        <li className="inline-flex items-center gap-1.5">
          <Kind className="size-3.5 text-ink-3" aria-hidden /> {FEEDBACK_KIND[f.kind].label}
        </li>
        <li>
          <Status tone={mood.tone} icon={mood.icon}>
            {mood.label}
          </Status>
        </li>
        <li>About {f.area}</li>
        <li className="num inline-flex items-center gap-1">
          <ArrowFatUp className="size-3.5 text-ink-3" aria-hidden /> {f.votes} {f.votes === 1 ? 'vote' : 'votes'}
        </li>
      </ul>

      <section aria-label="Where this stands">
        <ol className="grid grid-cols-4 gap-1">
          {FEEDBACK_FLOW.map((step, i) => {
            const lamp = FEEDBACK_STATUS[step]
            const reached = f.status !== 'declined' && i <= at
            const current = f.status === step
            return (
              <li key={step} className="min-w-0">
                <button
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  onClick={() => setFeedbackStatus(f.id, step, me.fullName)}
                  className="group block w-full rounded-sm text-left"
                >
                  <span aria-hidden className={cn('block h-1 rounded-full transition-colors', reached ? 'bg-accent' : 'bg-line group-hover:bg-line-strong')} />
                  <span className={cn('mt-1.5 flex items-center gap-1 text-xs', current ? 'font-semibold text-ink' : reached ? 'text-ink-2' : 'text-ink-3')}>
                    {current && <CheckCircle weight="fill" className="size-3.5 shrink-0 text-accent-text" aria-hidden />}
                    <span className="truncate">{lamp.label}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-ink-3">{f.status === 'declined' ? 'Declined: the team decided not to act on this.' : 'Press a step to move it. Each move is written to the audit log.'}</p>
          {f.status !== 'declined' && (
            <Button size="sm" intent="ghost" icon={<MinusCircle className="size-3.5" />} onClick={() => setFeedbackStatus(f.id, 'declined', me.fullName)}>
              Decline
            </Button>
          )}
        </div>
      </section>

      <section>
        <Field label={f.adminReply ? 'Your reply' : `Reply to ${author?.fullName.split(' ')[0] ?? 'them'}`} hint="Saved as the team’s reply on this feedback. The prototype sends no email.">
          {(p) => (
            <Textarea
              {...p}
              value={reply}
              onChange={(e) => {
                setReply(e.target.value)
                setRefusal(null)
              }}
              placeholder="Answer the question they asked, in plain words."
            />
          )}
        </Field>
        {refusal && <Refusal verdict={refusal} className="mt-3" />}
        <Button
          intent="primary"
          size="sm"
          className="mt-2.5"
          icon={<PaperPlaneRight weight="fill" className="size-3.5" />}
          disabled={reply.trim() === (f.adminReply ?? '') && reply.trim() !== ''}
          onClick={() => {
            const v = replyToFeedback(f.id, reply, me.fullName)
            if (!v.ok) return setRefusal(v)
            toast.success(f.adminReply ? 'Reply updated' : 'Reply saved', { description: f.status === 'new' ? 'Moved to triaged.' : undefined })
          }}
        >
          {f.adminReply ? 'Update the reply' : 'Save the reply'}
        </Button>
      </section>

      <section>
        <Field label="Internal note" optional hint="Only the team sees this.">
          {(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you found, or what would fix it." className="min-h-16" />}
        </Field>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button
            intent="secondary"
            size="sm"
            disabled={note.trim() === (f.adminNote ?? '')}
            onClick={() => {
              saveFeedbackNote(f.id, note, me.fullName)
              toast.success('Note saved')
            }}
          >
            Save note
          </Button>
          {queued ? (
            <Link to="/admin/queue" search={{ task: queued.id }} className="rounded-sm text-[13px] text-accent-text underline decoration-accent-line underline-offset-2">
              In the action queue: open the task
            </Link>
          ) : (
            <Button
              intent="ghost"
              size="sm"
              icon={<ListPlus className="size-4" />}
              onClick={() => {
                const id = feedbackToTask(f.id, me.fullName)
                if (!id) return
                toast.success('Added to the action queue', { action: { label: 'Open it', onClick: () => void navigate({ to: '/admin/queue', search: { task: id } }) } })
              }}
            >
              Turn into a task
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}

/* ───────────────────────────────── the screen ───────────────────────────── */

export function Feedback() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const all = useStore((s) => s.db.feedback)
  const users = useStore((s) => s.db.users)
  const orgs = useStore((s) => s.db.orgs)
  const beside = useMediaQuery('(min-width: 1280px)')
  const box: Box = search.box ?? 'all'
  const set = (patch: Partial<FeedbackSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const userOf = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const orgName = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs])

  const summary = useMemo(() => {
    const moods = MOODS.map((m) => ({ mood: m, count: all.filter((f) => f.sentiment === m).length }))
    const byArea = new Map<string, { count: number; negative: number; votes: number }>()
    for (const f of all) {
      const a = byArea.get(f.area) ?? { count: 0, negative: 0, votes: 0 }
      byArea.set(f.area, { count: a.count + 1, negative: a.negative + (f.sentiment === 'negative' ? 1 : 0), votes: a.votes + f.votes })
    }
    const areas = [...byArea.entries()].map(([area, v]) => ({ area, ...v })).sort((a, b) => b.count - a.count || b.votes - a.votes)
    return { moods, areas, most: areas[0]?.count ?? 0 }
  }, [all])

  const rows = useMemo(
    () =>
      all
        .filter((f) => inBox(f, box))
        .filter((f) => search.kind === undefined || f.kind === search.kind)
        .filter((f) => search.mood === undefined || f.sentiment === search.mood)
        .filter((f) => search.area === undefined || f.area === search.area)
        .sort((a, b) => (search.order === 'votes' ? b.votes - a.votes : 0) || b.createdAt.localeCompare(a.createdAt)),
    [all, box, search.kind, search.mood, search.area, search.order],
  )

  const open = all.find((f) => f.id === search.id)
  const shown = useLast(open)
  const filtered = search.kind !== undefined || search.mood !== undefined || search.area !== undefined
  const count = (b: Box) => all.filter((f) => inBox(f, b)).length
  const reading = (f: FeedbackRow) => <Reading key={f.id} f={f} author={userOf.get(f.userId)} orgName={f.orgId ? orgName.get(f.orgId) : undefined} />

  return (
    <Page wide>
      <Head title="Feedback" lede="What owners and renters write from inside the product. The messages here were seeded with the rest of the demo world; the replies, notes and decisions you make on them are real records, and each is in the audit log." />

      {all.length > 0 && (
        <Panel className="mb-4" bodyClassName="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-5 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="min-w-0">
            <h2 className="mb-2.5 text-[13px] font-semibold text-ink">How people feel</h2>
            <Segments label="Feedback by sentiment" parts={summary.moods.map((m) => ({ label: SENTIMENT[m.mood].label, value: m.count, color: MOOD_COLOUR[m.mood] }))} format={(n) => String(n)} />
            <p className="mt-2.5 text-xs text-ink-3">Sentiment is a label on each message, set when it was sent. It is a guide to where to read first, not a score.</p>
          </div>
          <div className="min-w-0">
            <h2 className="mb-2 text-[13px] font-semibold text-ink">Where it lands</h2>
            <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {summary.areas.slice(0, 6).map((a) => (
                <li key={a.area} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={search.area === a.area}
                    onClick={() => set({ area: search.area === a.area ? undefined : a.area })}
                    className={cn('grid w-full grid-cols-[minmax(0,1fr)_4rem_auto] items-center gap-2.5 rounded-sm px-1.5 py-1 text-left text-[13px] hoverable:hover:bg-sunken', search.area === a.area && 'bg-accent-soft')}
                  >
                    <span className="truncate text-ink">{a.area}</span>
                    <span aria-hidden className="h-1 overflow-hidden rounded-full bg-sunken">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(a.count / summary.most) * 100}%` }} />
                    </span>
                    <span className="num w-20 text-right text-xs text-ink-3">
                      <span className="font-semibold text-ink">{a.count}</span>
                      {a.negative > 0 && <span className="text-danger-text"> · {a.negative} unhappy</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}

      <Toolbar>
        <Segmented
          label="Which messages to show"
          size="sm"
          value={box}
          onChange={(v) => set({ box: v === 'all' ? undefined : v })}
          options={[
            { value: 'all', label: `All · ${all.length}` },
            { value: 'new', label: `New · ${count('new')}` },
            { value: 'open', label: `In hand · ${count('open')}` },
            { value: 'closed', label: `Closed · ${count('closed')}` },
          ]}
        />
        <Filter label="Kind" value={search.kind ?? 'all'} onChange={(v) => set({ kind: v === 'all' ? undefined : v })} options={[{ value: 'all', label: 'Any' }, ...KINDS.map((k) => ({ value: k, label: FEEDBACK_KIND[k].label }))]} />
        <Filter label="Mood" value={search.mood ?? 'all'} onChange={(v) => set({ mood: v === 'all' ? undefined : v })} options={[{ value: 'all', label: 'Any' }, ...MOODS.map((m) => ({ value: m, label: SENTIMENT[m].label }))]} />
        <Filter
          label="Order"
          value={search.order ?? 'newest'}
          onChange={(v) => set({ order: v === 'newest' ? undefined : v })}
          options={[
            { value: 'newest', label: 'Newest first' },
            { value: 'votes', label: 'Most votes first' },
          ]}
        />
        {search.area && (
          <Button size="sm" intent="soft" trailing={<X weight="bold" className="size-3" />} onClick={() => set({ area: undefined })} aria-label={`Showing ${search.area} only. Show every area.`}>
            {search.area}
          </Button>
        )}
      </Toolbar>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(22rem,2fr)_minmax(0,3fr)]">
        <div className="min-w-0">
          {rows.length === 0 ? (
            <div className="rounded-lg bg-surface shadow-card">
              {all.length === 0 ? (
                <Empty icon={<ChatsCircle />} title="No feedback yet" body="When an owner or renter sends a note from inside Loop or Pool, it arrives here to be read and answered." />
              ) : (
                <Empty
                  icon={<ChatsCircle />}
                  title={box === 'new' && !filtered ? 'Every message has been read' : 'No message matches'}
                  body={box === 'new' && !filtered ? 'Nothing new is waiting. The rest of the inbox is under All.' : 'Nothing fits this box and these filters together.'}
                  action={<Button onClick={() => set({ box: undefined, kind: undefined, mood: undefined, area: undefined })}>Show everything</Button>}
                />
              )}
            </div>
          ) : (
            <ul className="divide-y divide-line overflow-clip rounded-lg bg-surface shadow-card" onKeyDown={arrowNav}>
              {rows.map((f) => (
                <Message key={f.id} f={f} author={userOf.get(f.userId)} orgName={f.orgId ? orgName.get(f.orgId) : undefined} selected={f.id === search.id} onOpen={() => set({ id: f.id })} />
              ))}
            </ul>
          )}
          <Tally shown={rows.length} total={all.length} noun="message" />
        </div>

        {beside && (
          <div className="sticky top-6 min-w-0 rounded-lg bg-surface shadow-card">
            {open ? (
              <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain p-5">{reading(open)}</div>
            ) : (
              <Empty icon={<ChatsCircle />} title="Pick a message to read it" body="The message opens here with its reply box, so the list stays in view while you work through it. The arrow keys move down the list." className="py-16" />
            )}
          </div>
        )}
      </div>

      {!beside && (
        <Sheet open={open !== undefined} onOpenChange={(o) => !o && set({ id: undefined })} size="lg" eyebrow={shown ? `${FEEDBACK_KIND[shown.kind].label} · ${shown.area}` : undefined} title={shown ? `From ${userOf.get(shown.userId)?.fullName ?? 'someone'}` : ''}>
          {shown && reading(shown)}
        </Sheet>
      )}
    </Page>
  )
}
