/**
 * The action queue.
 *
 * What this screen does that no other does: it is the team's to-do list.
 * Every other console screen is organised by what a thing *is*; this one is
 * organised by what has to happen *next and by when*, across all of them. It is
 * a worklist rather than a table: grouped by urgency, read top to bottom, each
 * row saying what it is, whose it is and how late it is getting.
 */
import { useMemo } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { ClockCountdown, ListChecks, Sparkle } from '@phosphor-icons/react'
import type { AdminTask, AdminTaskKind } from '@/domain/types'
import { dateOf, diffDays } from '@/domain/rules/calendar'
import { useMe, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Segmented } from '@/ui/controls'
import { Avatar, Empty } from '@/ui/display'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { Filter, Flag, Head, Status, TONE_SOFT, Tally, Toolbar } from './kit'
import { PRIORITY, TASK_KIND, TASK_KINDS, TASK_STATUS } from './labels'
import { clock, oneOf, text, whenInline, whenShort } from './format'
import { arrowNav, useLast } from './hooks'
import { TaskDetail } from './queue/TaskDetail'

const VIEWS = ['active', 'done', 'all'] as const
type View = (typeof VIEWS)[number]
const PRIORITIES = ['p1', 'p2', 'p3'] as const

export interface QueueSearch {
  task?: string
  kind?: AdminTaskKind
  priority?: AdminTask['priority']
  /** `active` is open or in progress: the default, because that is the work. */
  view?: View
  mine?: boolean
}

export function queueSearch(s: Record<string, unknown>): QueueSearch {
  return { task: text(s.task), kind: oneOf(s.kind, TASK_KINDS), priority: oneOf(s.priority, PRIORITIES), view: oneOf(s.view, VIEWS), mine: s.mine === true || s.mine === 'true' ? true : undefined }
}

const route = getRouteApi('/admin/queue')

const isActive = (t: AdminTask) => t.status === 'open' || t.status === 'in_progress'

/** How a deadline reads from today: the word, and whether it has passed. */
function dueText(dueAt: string, day: string): { text: string; late: boolean; soon: boolean } {
  const n = diffDays(day, dateOf(dueAt))
  const late = new Date(dueAt).getTime() < Date.now()
  if (n === 0) return { text: late ? `Was due ${clock(dueAt)}` : `Due ${clock(dueAt)}`, late, soon: true }
  if (n < 0) return { text: `${-n} ${n === -1 ? 'day' : 'days'} overdue`, late: true, soon: true }
  return { text: n === 1 ? 'Due tomorrow' : `Due in ${n} days`, late: false, soon: n <= 2 }
}

function Row({ task, orgName, hue, selected, onOpen }: { task: AdminTask; orgName?: string; hue?: number; selected: boolean; onOpen: () => void }) {
  const day = useToday()
  const kind = TASK_KIND[task.kind]
  const Kind = kind.icon
  const p = PRIORITY[task.priority]
  const active = isActive(task)
  const due = task.dueAt && active ? dueText(task.dueAt, day) : null
  const status = TASK_STATUS[task.status]
  return (
    <li>
      <button
        type="button"
        data-row-open
        onClick={onOpen}
        aria-current={selected || undefined}
        className={cn(
          'grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-3.5 py-3 text-left outline-offset-[-2px] transition-colors duration-100 hoverable:hover:bg-surface-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center',
          selected && 'bg-accent-soft/60 shadow-[inset_2px_0_0_var(--accent)] hoverable:hover:bg-accent-soft/60',
        )}
      >
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-md', active ? TONE_SOFT[p.tone] : 'bg-sunken text-ink-3')}>
          <Kind weight="fill" className="size-4" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className={cn('line-clamp-2 block text-[13px] leading-snug font-medium', active ? 'text-ink' : 'text-ink-2')}>{task.title}</span>
          <span className="mt-0.5 block truncate text-xs text-ink-3">
            <span className="text-ink-2">{kind.label}</span>
            {orgName && <> · {orgName}</>}
            <span className="hidden xl:inline"> · {active ? task.detail : task.resolution ?? task.detail}</span>
          </span>
        </span>
        <span className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs lg:col-start-3 lg:flex-nowrap lg:justify-end">
          {due ? (
            due.late ? (
              <Flag tone="danger" icon={ClockCountdown}>
                {due.text}
              </Flag>
            ) : (
              <span className={cn('num whitespace-nowrap', due.soon ? 'font-medium text-warn-text' : 'text-ink-3')}>{due.text}</span>
            )
          ) : (
            <span className="num whitespace-nowrap text-ink-3">{active ? `Raised ${whenInline(task.createdAt, day)}` : whenShort(task.createdAt, day)}</span>
          )}
          <span className="inline-flex min-w-0 items-center gap-1.5 lg:w-32">
            {task.assignee ? (
              <>
                <Avatar name={task.assignee} hue={hue ?? 285} size={18} />
                <span className="truncate text-ink-2">{task.assignee}</span>
              </>
            ) : (
              <span className="text-ink-3">Unassigned</span>
            )}
          </span>
          <Status tone={status.tone} icon={status.icon} className="lg:w-24">
            {status.label}
          </Status>
        </span>
      </button>
    </li>
  )
}

export function Queue() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const me = useMe()
  const tasks = useStore((s) => s.db.adminTasks)
  const orgs = useStore((s) => s.db.orgs)
  const users = useStore((s) => s.db.users)
  const view: View = search.view ?? 'active'
  const set = (patch: Partial<QueueSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const orgName = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs])
  const hueOf = useMemo(() => new Map(users.map((u) => [u.fullName, u.hue])), [users])

  const rows = useMemo(
    () =>
      tasks
        .filter((t) => (view === 'active' ? isActive(t) : view === 'done' ? !isActive(t) : true))
        .filter((t) => search.kind === undefined || t.kind === search.kind)
        .filter((t) => search.priority === undefined || t.priority === search.priority)
        .filter((t) => !search.mine || t.assignee === me.fullName)
        // Within a priority: what is due soonest first, then what has waited longest.
        .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999') || a.createdAt.localeCompare(b.createdAt)),
    [tasks, view, search.kind, search.priority, search.mine, me.fullName],
  )

  const counts = useMemo(() => ({ active: tasks.filter(isActive).length, done: tasks.filter((t) => !isActive(t)).length, mine: tasks.filter((t) => isActive(t) && t.assignee === me.fullName).length }), [tasks, me.fullName])
  const open = tasks.find((t) => t.id === search.task)
  const shown = useLast(open)
  const filtered = search.kind !== undefined || search.priority !== undefined || Boolean(search.mine)
  const close = () => set({ task: undefined })

  return (
    <Page wide>
      <Head
        title="Action queue"
        lede="Everything that is waiting on a person on the team, from every part of the platform. Customers and the engine both put work here; nothing leaves without a note saying how it ended."
        actions={
          <Segmented
            label="Which tasks to show"
            size="sm"
            value={view}
            onChange={(v) => set({ view: v === 'active' ? undefined : v })}
            options={[
              { value: 'active', label: `To do · ${counts.active}` },
              { value: 'done', label: `Closed · ${counts.done}` },
              { value: 'all', label: 'All' },
            ]}
          />
        }
      />

      <Toolbar>
        <Filter label="Kind" value={search.kind ?? 'all'} onChange={(v) => set({ kind: v === 'all' ? undefined : v })} options={[{ value: 'all', label: 'Any' }, ...TASK_KINDS.map((k) => ({ value: k, label: TASK_KIND[k].label }))]} />
        <Filter label="Priority" value={search.priority ?? 'all'} onChange={(v) => set({ priority: v === 'all' ? undefined : v })} options={[{ value: 'all', label: 'Any' }, ...PRIORITIES.map((p) => ({ value: p, label: `${PRIORITY[p].label} · ${PRIORITY[p].word}` }))]} />
        <Button size="sm" intent={search.mine ? 'soft' : 'secondary'} aria-pressed={Boolean(search.mine)} onClick={() => set({ mine: search.mine ? undefined : true })}>
          Mine · {counts.mine}
        </Button>
        {filtered && (
          <Button size="sm" intent="ghost" onClick={() => set({ kind: undefined, priority: undefined, mine: undefined })}>
            Clear filters
          </Button>
        )}
      </Toolbar>

      {rows.length === 0 ? (
        <div className="rounded-lg bg-surface shadow-card">
          {filtered ? (
            <Empty icon={<ListChecks />} title="No task matches these filters" body="Loosen a filter to see the rest of the queue." action={<Button onClick={() => set({ kind: undefined, priority: undefined, mine: undefined })}>Clear filters</Button>} />
          ) : view === 'active' ? (
            <Empty icon={<Sparkle weight="fill" />} title="The queue is empty" body="Nothing is waiting on a person. Work arrives here when a landlord asks for a concierge call, a check needs a human eye, or the engine wants a decision." />
          ) : (
            <Empty icon={<ListChecks />} title="Nothing has been closed yet" body="Resolved and dismissed tasks collect here, each with the note that says how it ended." />
          )}
        </div>
      ) : (
        <div className="grid gap-4" onKeyDown={arrowNav}>
          {PRIORITIES.map((priority) => {
            const group = rows.filter((t) => t.priority === priority)
            if (group.length === 0) return null
            const p = PRIORITY[priority]
            const Glyph = p.icon
            return (
              <section key={priority} aria-labelledby={`queue-${priority}`} className="overflow-clip rounded-lg bg-surface shadow-card">
                <h2 id={`queue-${priority}`} className="sticky top-13 z-10 flex h-9 items-center gap-2 border-b border-line bg-surface-2 px-3.5 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-3 uppercase md:top-0">
                  <Glyph weight="bold" className={cn('size-3.5', priority === 'p1' ? 'text-danger-text' : priority === 'p2' ? 'text-warn-text' : 'text-ink-3')} aria-hidden />
                  <span className="text-ink">{p.label}</span>
                  <span>{p.word}</span>
                  <span className="num ml-auto">{group.length}</span>
                </h2>
                <ul className="divide-y divide-line">
                  {group.map((t) => (
                    <Row key={t.id} task={t} orgName={t.orgId ? orgName.get(t.orgId) : undefined} hue={t.assignee ? hueOf.get(t.assignee) : undefined} selected={t.id === search.task} onOpen={() => set({ task: t.id })} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
      <Tally shown={rows.length} total={tasks.length} noun="task" />

      <Sheet
        open={open !== undefined}
        onOpenChange={(o) => !o && close()}
        eyebrow={shown ? `${TASK_KIND[shown.kind].label} · ${PRIORITY[shown.priority].label}, ${PRIORITY[shown.priority].word.toLowerCase()}` : undefined}
        title={shown?.title ?? ''}
        description={
          shown ? (
            <Status tone={TASK_STATUS[shown.status].tone} icon={TASK_STATUS[shown.status].icon} strong>
              {TASK_STATUS[shown.status].label}
            </Status>
          ) : undefined
        }
      >
        {shown && <TaskDetail key={shown.id} task={shown} done={close} />}
      </Sheet>
    </Page>
  )
}
