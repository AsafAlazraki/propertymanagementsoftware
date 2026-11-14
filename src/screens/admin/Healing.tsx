/**
 * Self-healing.
 *
 * What this screen does that no other does: it shows the platform finding its
 * own faults and what it did about each one. An incident reads left to right
 * as an argument — what the check saw, what that means, what it wants to do —
 * because the person approving it is being asked to agree with the reasoning,
 * not just press a button. Beside the incidents are the playbooks that raise
 * them, with the tally of human decisions that is the whole of the "learning".
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, ArrowsClockwise, CheckCircle, FirstAid, HandPalm, Lightning, MagnifyingGlass, Sparkle, XCircle } from '@phosphor-icons/react'
import type { Incident, Playbook } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { PROMOTE_AFTER_APPROVALS, approvalRate } from '@/domain/healing'
import { plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { approveFix, demotePlaybook, keepPlaybookManual, promotePlaybook, rejectFix, runSweep } from '@/data/admin-mutations'
import { Page } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Field, Segmented, Textarea } from '@/ui/controls'
import { Empty } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { Flag, Head, Panel, Status, Tally } from './kit'
import { INCIDENT_STATUS, PLAYBOOK_MODE, SEVERITY } from './labels'
import { oneOf, text, whenExact, whenInline } from './format'

const SHOWS = ['awaiting', 'automatic', 'decided', 'all'] as const
type Show = (typeof SHOWS)[number]

export interface HealingSearch {
  incident?: string
  show?: Show
}

export function healingSearch(s: Record<string, unknown>): HealingSearch {
  return { incident: text(s.incident), show: oneOf(s.show, SHOWS) }
}

const route = getRouteApi('/admin/healing')

const matchesShow = (i: Incident, show: Show) => (show === 'all' ? true : show === 'awaiting' ? i.status === 'awaiting_approval' : show === 'automatic' ? i.status === 'auto_healed' : i.status === 'approved' || i.status === 'rejected')

/* ───────────────────────────────── an incident ──────────────────────────── */

function Step({ n, label, children, last }: { n: number; label: string; children: string; last?: boolean }) {
  return (
    <li className="relative min-w-0 md:pr-5">
      <p className="eyebrow flex items-center gap-1.5">
        <span className="num grid size-4 place-items-center rounded-full bg-sunken text-[10px] text-ink-2">{n}</span>
        {label}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink">{children}</p>
      {!last && <ArrowRight aria-hidden className="absolute top-0.5 right-1 hidden size-3.5 text-ink-3 md:block" />}
    </li>
  )
}

function IncidentCard({ incident, playbook, orgName, focused }: { incident: Incident; playbook?: Playbook; orgName?: string; focused: boolean }) {
  const me = useMe()
  const day = useToday()
  const ref = useRef<HTMLElement>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const waiting = incident.status === 'awaiting_approval'
  const status = INCIDENT_STATUS[incident.status]
  const severity = SEVERITY[incident.severity]

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [focused])

  return (
    <article ref={ref} aria-labelledby={`inc-${incident.id}`} className={cn('scroll-mt-20 rounded-lg bg-surface shadow-card', focused && 'outline-2 outline-offset-2 outline-accent')}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 px-4 pt-3.5">
        <div className="min-w-0">
          <h3 id={`inc-${incident.id}`} className="text-[14px] leading-snug font-semibold text-ink">
            {incident.title}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
            <Flag tone={severity.tone} icon={severity.icon}>
              {severity.label} severity
            </Flag>
            {incident.orgId && orgName && (
              <Link to="/admin/orgs" search={{ org: incident.orgId }} className="rounded-sm underline decoration-line-strong underline-offset-2">
                {orgName}
              </Link>
            )}
            <span title={whenExact(incident.detectedAt)}>Seen {whenInline(incident.detectedAt, day)}</span>
          </p>
        </div>
        <Status tone={status.tone} icon={status.icon} strong className="text-xs">
          {status.label}
        </Status>
      </header>

      {waiting ? (
        <>
          <ol className="grid gap-4 px-4 pt-3.5 md:grid-cols-3 md:gap-0">
            <Step n={1} label="What the check saw">
              {incident.signal}
            </Step>
            <Step n={2} label="What that means">
              {incident.diagnosis}
            </Step>
            <Step n={3} label="The fix it proposes" last>
              {incident.proposedFix}
            </Step>
          </ol>
          <footer className="mt-3.5 border-t border-line px-4 py-3">
            {rejecting ? (
              <div className="grid gap-3">
                <Field label="Why is this fix wrong?" hint="A rejection resets this playbook’s run of clean approvals.">
                  {(p) => (
                    <Textarea
                      {...p}
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value)
                        setRefusal(null)
                      }}
                      placeholder="For example: the owner pays two rents in one transfer on purpose."
                      className="min-h-16"
                    />
                  )}
                </Field>
                {refusal && <Refusal verdict={refusal} />}
                <div className="flex flex-wrap gap-2">
                  <Button
                    intent="dangerSoft"
                    size="sm"
                    onClick={() => {
                      const v = rejectFix(incident.id, reason, me.fullName)
                      if (!v.ok) return setRefusal(v)
                      toast('Fix rejected', { description: 'Nothing was changed. The playbook’s count starts again.' })
                    }}
                  >
                    Reject the fix
                  </Button>
                  <Button intent="ghost" size="sm" onClick={() => setRejecting(false)}>
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  intent="primary"
                  size="sm"
                  icon={<CheckCircle weight="fill" className="size-4" />}
                  onClick={() => {
                    approveFix(incident.id, me.fullName)
                    toast.success('Approved and applied', { description: incident.proposedFix })
                  }}
                >
                  Approve and apply
                </Button>
                <Button intent="ghost" size="sm" icon={<XCircle className="size-4" />} onClick={() => setRejecting(true)}>
                  Reject
                </Button>
                {playbook && <span className="ml-auto text-xs text-ink-3">Raised by “{playbook.name}”, which asks first</span>}
              </div>
            )}
          </footer>
        </>
      ) : (
        <div className="px-4 pt-2 pb-3.5">
          <p className="text-[13px] leading-relaxed text-ink-2">{incident.signal}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
            <span className="text-ink-3">{incident.status === 'rejected' ? 'Rejected: ' : 'Done: '}</span>
            {incident.outcomeNote ?? incident.proposedFix}
          </p>
          {incident.resolvedAt && (
            <p className="mt-1 text-xs text-ink-3" title={whenExact(incident.resolvedAt)}>
              {incident.resolvedBy === 'Playbook' ? `By the “${playbook?.name ?? 'playbook'}” playbook, with nobody asked` : `Decided by ${incident.resolvedBy ?? 'the team'}`} · {whenInline(incident.resolvedAt, day)}
            </p>
          )}
        </div>
      )}
    </article>
  )
}

/* ───────────────────────────────── a playbook ───────────────────────────── */

function PlaybookRow({ p }: { p: Playbook }) {
  const me = useMe()
  const day = useToday()
  const mode = PLAYBOOK_MODE[p.mode]
  const rate = approvalRate(p)
  const decided = p.approvals + p.rejections
  return (
    <li className="px-4 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <h3 className="min-w-0 text-[13px] font-semibold text-ink">{p.name}</h3>
        <Status tone={mode.tone} icon={p.mode === 'auto' ? Lightning : HandPalm} strong className="text-xs">
          {mode.label}
        </Status>
      </div>
      <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-xs leading-relaxed">
        <dt className="text-ink-3">Watches</dt>
        <dd className="text-ink-2">{p.watches}</dd>
        <dt className="text-ink-3">Fix</dt>
        <dd className="text-ink-2">{p.fix}</dd>
      </dl>

      <dl className="mt-2.5 grid grid-cols-4 gap-2 text-xs">
        {[
          { label: 'Runs', value: p.runs },
          { label: 'Approved', value: p.approvals },
          { label: 'Rejected', value: p.rejections },
        ].map((f) => (
          <div key={f.label}>
            <dt className="text-ink-3">{f.label}</dt>
            <dd className="num text-[13px] font-semibold text-ink">{f.value}</dd>
          </div>
        ))}
        <div>
          <dt className="text-ink-3">Approval rate</dt>
          <dd className="num text-[13px] font-semibold text-ink">{rate === null ? '–' : `${Math.round(rate * 100)}%`}</dd>
        </div>
      </dl>
      {rate !== null && (
        <div role="img" aria-label={`${p.approvals} of ${decided} decisions were approvals`} className="mt-1.5 flex h-1 gap-0.5 overflow-hidden rounded-full">
          <span className="h-full rounded-full bg-ok" style={{ width: `${rate * 100}%` }} />
          {p.rejections > 0 && <span className="h-full flex-1 rounded-full bg-danger" />}
        </div>
      )}
      <p className="mt-1.5 text-[11px] text-ink-3">
        {rate === null ? (p.mode === 'auto' ? 'Runs without asking, so there are no decisions to count.' : 'No decision has been made on it yet.') : `${plural(decided, 'decision')} by people so far.`}
        {p.lastRunAt && <span title={whenExact(p.lastRunAt)}> Last ran {whenInline(p.lastRunAt, day)}.</span>}
      </p>

      {p.promotionSuggested && p.mode === 'approval' && (
        <div className="mt-3 rounded-md bg-accent-soft p-3">
          <p className="flex items-start gap-2 text-[13px] font-semibold text-accent-text">
            <Sparkle weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
            Approved {p.approvals} times with no rejection. Make this automatic?
          </p>
          <p className="mt-1 pl-6 text-xs leading-relaxed text-ink">It would then apply this fix without asking, and record each one here. You can put it back on approval at any time.</p>
          <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
            <Button
              intent="primary"
              size="sm"
              onClick={() => {
                promotePlaybook(p.id, me.fullName)
                toast.success(`“${p.name}” now runs automatically`, { description: 'Your decision is in the audit log.' })
              }}
            >
              Make it automatic
            </Button>
            <Button
              intent="secondary"
              size="sm"
              onClick={() => {
                keepPlaybookManual(p.id, me.fullName)
                toast('Kept on approval', { description: `It will ask again after ${PROMOTE_AFTER_APPROVALS} more clean approvals.` })
              }}
            >
              Keep asking
            </Button>
          </div>
        </div>
      )}
      {p.mode === 'auto' && (
        <Button
          intent="ghost"
          size="sm"
          className="mt-2 -ml-2.5"
          icon={<HandPalm className="size-3.5" />}
          onClick={() => {
            demotePlaybook(p.id, me.fullName)
            toast(`“${p.name}” will ask first from now on`)
          }}
        >
          Ask a person first
        </Button>
      )}
    </li>
  )
}

/* ───────────────────────────────── the screen ───────────────────────────── */

export function Healing() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const me = useMe()
  const incidents = useStore((s) => s.db.incidents)
  const playbooks = useStore((s) => s.db.playbooks)
  const orgs = useStore((s) => s.db.orgs)
  const [sweeping, setSweeping] = useState(false)
  const [lastSweep, setLastSweep] = useState<{ found: number; healed: number; awaiting: number } | null>(null)
  const awaiting = incidents.filter((i) => i.status === 'awaiting_approval').length
  const show: Show = search.show ?? (awaiting > 0 ? 'awaiting' : 'all')
  const set = (patch: Partial<HealingSearch>) => void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })

  const orgName = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs])
  const playbookOf = useMemo(() => new Map(playbooks.map((p) => [p.id, p])), [playbooks])
  const rows = useMemo(
    () =>
      incidents
        // A deep link always shows its incident, whatever the filter says.
        .filter((i) => matchesShow(i, show) || i.id === search.incident)
        .sort((a, b) => Number(b.status === 'awaiting_approval') - Number(a.status === 'awaiting_approval') || b.detectedAt.localeCompare(a.detectedAt)),
    [incidents, show, search.incident],
  )
  const ordered = useMemo(() => [...playbooks].sort((a, b) => Number(b.promotionSuggested) - Number(a.promotionSuggested) || Number(a.mode === 'auto') - Number(b.mode === 'auto') || a.name.localeCompare(b.name)), [playbooks])
  const count = (s: Show) => incidents.filter((i) => matchesShow(i, s)).length

  const sweep = () => {
    setSweeping(true)
    // The sweep is instant on demo data; the pause is only long enough to see that it ran.
    window.setTimeout(() => {
      const result = runSweep(me.fullName)
      setLastSweep(result)
      setSweeping(false)
      if (result.found === 0) toast('Sweep finished: nothing new', { description: 'Every check ran. No fault that is not already listed.' })
      else toast.success(`Sweep finished: ${plural(result.found, 'new fault')}`, { description: `${result.healed} fixed automatically, ${result.awaiting} waiting for you.` })
    }, 350)
  }

  return (
    <Page wide>
      <Head
        title="Self-healing"
        lede={
          <>
            The engine checks every record for faults it knows how to mend. Its learning is a tally, and it is all on this page: each approval and rejection is counted on the playbook that proposed the fix, and after {PROMOTE_AFTER_APPROVALS} approvals with no rejection it suggests running that fix without asking. A person accepts or declines the suggestion; nothing promotes itself.
          </>
        }
        actions={
          <Button intent="primary" loading={sweeping} icon={<MagnifyingGlass weight="bold" className="size-4" />} onClick={sweep}>
            Run a sweep now
          </Button>
        }
      />

      {lastSweep && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-md bg-sunken px-3 py-2 text-[13px] text-ink-2">
          <ArrowsClockwise className="size-4 shrink-0 text-ink-3" aria-hidden />
          {lastSweep.found === 0 ? 'The sweep you just ran found nothing that was not already listed.' : `The sweep you just ran found ${plural(lastSweep.found, 'new fault')}: ${lastSweep.healed} fixed automatically, ${lastSweep.awaiting} waiting for approval.`}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="incidents-title" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="incidents-title" className="text-[13px] font-semibold text-ink">
              Incidents
            </h2>
            <Segmented
              label="Which incidents to show"
              size="sm"
              value={show}
              onChange={(v) => set({ show: v, incident: undefined })}
              options={[
                { value: 'awaiting', label: `Awaiting · ${count('awaiting')}` },
                { value: 'automatic', label: `Automatic · ${count('automatic')}` },
                { value: 'decided', label: `Decided · ${count('decided')}` },
                { value: 'all', label: 'All' },
              ]}
            />
          </div>
          {rows.length === 0 ? (
            <div className="rounded-lg bg-surface shadow-card">
              {incidents.length === 0 ? (
                <Empty icon={<FirstAid />} title="No faults found yet" body="When a sweep finds something wrong in the records, it appears here with what it saw and what it did or wants to do." action={<Button onClick={sweep}>Run a sweep now</Button>} />
              ) : show === 'awaiting' ? (
                <Empty icon={<CheckCircle weight="fill" />} title="Nothing is waiting for approval" body="Every fix the engine proposed has been decided. Run a sweep to check the records again." action={<Button onClick={() => set({ show: 'all' })}>Show every incident</Button>} />
              ) : (
                <Empty icon={<FirstAid />} title="No incident of this kind" body="Nothing in the history fits this filter." action={<Button onClick={() => set({ show: 'all' })}>Show every incident</Button>} />
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map((i) => (
                <IncidentCard key={i.id} incident={i} playbook={playbookOf.get(i.playbookId)} orgName={i.orgId ? orgName.get(i.orgId) : undefined} focused={i.id === search.incident} />
              ))}
            </div>
          )}
          <Tally shown={rows.length} total={incidents.length} noun="incident" />
        </section>

        <Panel title="Playbooks" note={`${playbooks.filter((p) => p.mode === 'auto').length} run automatically; ${playbooks.filter((p) => p.mode === 'approval').length} ask a person first.`} bodyClassName="" className="xl:sticky xl:top-6">
          {ordered.length === 0 ? (
            <Empty icon={<FirstAid />} title="No playbooks" body="A playbook pairs one kind of fault with the fix for it. None is installed." />
          ) : (
            <ul className="divide-y divide-line xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto xl:overscroll-contain">
              {ordered.map((p) => (
                <PlaybookRow key={p.id} p={p} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  )
}
