/**
 * The body of a task's sheet. What you can do depends on what the task is:
 * a concierge call is logged here and lands on the landlord's tenancy record;
 * an identity or a provider is decided here; a law change, a proposed fix and
 * an assistant gap are decided on their own screens, so the sheet shows enough
 * to recognise the item and takes you straight to it.
 */
import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, ChatCircleText, CheckCircle, Phone, SealCheck, XCircle } from '@phosphor-icons/react'
import type { AdminTask } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { arrearsState } from '@/domain/rules/tenancy'
import { fmtDate } from '@/domain/rules/calendar'
import { money, plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { calendarOf, usePack, useToday } from '@/data/hooks'
import { assignTask, decideIdentity, dismissTask, logConciergeCall, releaseTask, reopenTask, resolveTask } from '@/data/admin-mutations'
import { roleLabel } from '@/shell/common'
import { Button, buttonClass } from '@/ui/Button'
import { Field, Input, Textarea } from '@/ui/controls'
import { Callout, Fact, Facts } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { Status } from '../kit'
import { CHANGE_STATUS, IDENTITY, IMPACT, INCIDENT_STATUS, ORG_STATUS, TASK_STATUS, VETTING } from '../labels'
import { whenExact } from '../format'
import { Vetting } from '../network/Vetting'

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="eyebrow mb-2">{title}</h3>
      {children}
    </section>
  )
}

const go = cn(buttonClass({ intent: 'primary' }), 'w-full sm:w-auto')

/* ───────────────────────────── kind: concierge call ─────────────────────── */

function ConciergeCall({ task, done }: { task: AdminTask; done: () => void }) {
  const me = useMe()
  const pack = usePack()
  const day = useToday()
  const tenancy = useStore((s) => s.db.tenancies.find((t) => t.id === task.refId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === tenancy?.propertyId))
  const tenant = useStore((s) => s.db.users.find((u) => u.id === tenancy?.tenantIds[0]))
  const owner = useStore((s) => s.db.users.find((u) => u.id === s.db.orgs.find((o) => o.id === task.orgId)?.ownerUserId))
  const [said, setSaid] = useState('')
  const [expects, setExpects] = useState('')
  const [refusal, setRefusal] = useState<Verdict | null>(null)

  if (!tenancy || !property || !tenant) {
    return <Callout tone="warn">The tenancy this call was requested for is no longer on record. Close the task with a note saying what you found.</Callout>
  }
  const a = arrearsState(pack, calendarOf(pack, property), tenancy, day)
  const first = tenant.fullName.split(' ')[0]

  return (
    <Block title="The call">
      <Facts className="mb-4">
        <Fact label="Tenant">{tenant.fullName}</Fact>
        <Fact label="Home">
          {property.address.line1}, {property.address.suburb}
        </Fact>
        <Fact label="Owing today">{a.daysLate > 0 ? <span className="num text-danger-text">{money(a.owed)} · {plural(a.daysLate, 'day')} late</span> : <span className="text-ok-text">Nothing: the rent has arrived since</span>}</Fact>
        <Fact label="Asked for by">{owner?.fullName ?? 'The owner'}</Fact>
      </Facts>
      {tenant.phone && (
        <a href={`tel:${tenant.phone.replace(/\s/g, '')}`} className={buttonClass({ intent: 'secondary', block: true })}>
          <Phone weight="fill" className="size-4" aria-hidden />
          Call {first} · <span className="num">{tenant.phone}</span>
        </a>
      )}
      <div className="mt-3 rounded-lg bg-sunken p-3.5">
        <p className="eyebrow mb-1.5 flex items-center gap-1.5">
          <ChatCircleText className="size-3.5" aria-hidden /> A way to open
        </p>
        <p className="text-[13px] leading-relaxed text-ink">
          “Hi {first}, it’s {me.fullName.split(' ')[0]} from Loop, calling for {owner?.fullName.split(' ')[0] ?? 'your landlord'}. This week’s rent hasn’t shown up yet. Is everything all right? If it is a bank delay or your pay day has moved, that is fine. I would just like to tell them when to expect it.”
        </p>
      </div>
      <div className="mt-4 grid gap-3">
        <Field label={`What did ${first} say?`} hint="The landlord reads this on the tenancy’s arrears record and in their autopilot feed.">
          {(p) => (
            <Textarea
              {...p}
              value={said}
              onChange={(e) => {
                setSaid(e.target.value)
                setRefusal(null)
              }}
              placeholder="For example: pay day moved to Thursday; has set up the transfer for then."
            />
          )}
        </Field>
        <Field label="When do they expect to pay?" optional>
          {(p) => <Input {...p} value={expects} onChange={(e) => setExpects(e.target.value)} placeholder="For example: Thursday" />}
        </Field>
        {refusal && <Refusal verdict={refusal} />}
        <Button
          intent="primary"
          icon={<CheckCircle weight="fill" className="size-4" />}
          onClick={() => {
            const note = `${said.trim()}${expects.trim() ? ` Expects to pay: ${expects.trim()}.` : ''}`
            const v = logConciergeCall(task.id, said.trim() ? note : '', me.fullName)
            if (!v.ok) return setRefusal(v)
            toast.success('Call logged', { description: `${owner?.fullName.split(' ')[0] ?? 'The landlord'} can read it on the tenancy now.` })
            done()
          }}
        >
          Log the call and tell the landlord
        </Button>
      </div>
    </Block>
  )
}

/* ───────────────────────────── kind: identity review ────────────────────── */

function IdentityReview({ task, done }: { task: AdminTask; done: () => void }) {
  const me = useMe()
  const user = useStore((s) => s.db.users.find((u) => u.id === task.refId))
  const [note, setNote] = useState('')
  if (!user) return <Callout tone="warn">This person is no longer on record. Close the task with a note.</Callout>
  const lamp = IDENTITY[user.identityVerified ? 'yes' : 'no']
  const open = task.status === 'open' || task.status === 'in_progress'
  return (
    <Block title="The person">
      <Facts className="mb-4">
        <Fact label="Name">{user.fullName}</Fact>
        <Fact label="Email">{user.email}</Fact>
        <Fact label="Role">{roleLabel(user.role)}</Fact>
        <Fact label="Identity now">
          <Status tone={lamp.tone} icon={lamp.icon} strong>
            {lamp.label}
          </Status>
        </Fact>
      </Facts>
      {open && (
        <div className="grid gap-3">
          <Callout tone="neutral">The prototype holds no identity documents: nothing was uploaded, so there is nothing to show here. In production this is where the document and the selfie sit side by side.</Callout>
          <Field label="What did you check?" optional>
            {(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: licence name has an accent the form dropped; photo matches" />}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="primary"
              icon={<SealCheck weight="fill" className="size-4" />}
              onClick={() => {
                decideIdentity(user.id, true, me.fullName, note)
                toast.success(`${user.fullName} is verified`)
                done()
              }}
            >
              Approve identity
            </Button>
            <Button
              intent="dangerSoft"
              icon={<XCircle weight="fill" className="size-4" />}
              onClick={() => {
                decideIdentity(user.id, false, me.fullName, note)
                toast(`${user.fullName} was not verified`, { description: 'They will be asked to try again with a clearer document.' })
                done()
              }}
            >
              Decline
            </Button>
          </div>
        </div>
      )}
    </Block>
  )
}

/* ───────────────────────────── kind: provider vetting ───────────────────── */

function ProviderVetting({ task, done }: { task: AdminTask; done: () => void }) {
  const provider = useStore((s) => s.db.providers.find((p) => p.id === task.refId))
  if (!provider) return <Callout tone="warn">This provider is no longer on record. Close the task with a note.</Callout>
  const lamp = VETTING[provider.vetting]
  return (
    <Block title="The provider">
      <Facts className="mb-4">
        <Fact label="Name">{provider.name}</Fact>
        <Fact label="Work">
          {provider.trade} · {provider.region}
        </Fact>
        <Fact label="Vetting">
          <Status tone={lamp.tone} icon={lamp.icon} strong>
            {lamp.label}
          </Status>
        </Fact>
      </Facts>
      <Vetting provider={provider} onApproved={done} />
    </Block>
  )
}

/* ───────────────────── kinds decided on another screen ──────────────────── */

function LawChange({ task }: { task: AdminTask }) {
  const change = useStore((s) => s.db.ruleChanges.find((c) => c.id === task.refId))
  if (!change) return <Callout tone="warn">The change this task points at is no longer on record.</Callout>
  return (
    <Block title="The change">
      <div className="rounded-lg p-3.5 shadow-card">
        <p className="text-[13px] font-semibold text-ink">{change.title}</p>
        <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-ink-2">{change.summary}</p>
        <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <Status tone={CHANGE_STATUS[change.status].tone} icon={CHANGE_STATUS[change.status].icon} strong>
            {CHANGE_STATUS[change.status].label}
          </Status>
          <Status tone={IMPACT[change.impact].tone} icon={IMPACT[change.impact].icon}>
            {IMPACT[change.impact].label}
          </Status>
        </p>
      </div>
      <Link to="/admin/rules" search={{ change: change.id }} className={cn(go, 'mt-3')}>
        Open the review <ArrowRight weight="bold" className="size-3.5" aria-hidden />
      </Link>
      <p className="mt-2 text-xs text-ink-3">Deciding the change there closes this task.</p>
    </Block>
  )
}

function ProposedFix({ task }: { task: AdminTask }) {
  const incident = useStore((s) => s.db.incidents.find((i) => i.id === task.refId))
  if (!incident) return <Callout tone="warn">The incident this task points at is no longer on record.</Callout>
  return (
    <Block title="The proposed fix">
      <div className="rounded-lg p-3.5 shadow-card">
        <p className="text-[13px] font-semibold text-ink">{incident.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{incident.proposedFix}</p>
        <p className="mt-2.5 text-xs">
          <Status tone={INCIDENT_STATUS[incident.status].tone} icon={INCIDENT_STATUS[incident.status].icon} strong>
            {INCIDENT_STATUS[incident.status].label}
          </Status>
        </p>
      </div>
      <Link to="/admin/healing" search={{ incident: incident.id }} className={cn(go, 'mt-3')}>
        Open it in Self-healing <ArrowRight weight="bold" className="size-3.5" aria-hidden />
      </Link>
      <p className="mt-2 text-xs text-ink-3">Approving or rejecting the fix there closes this task.</p>
    </Block>
  )
}

function AssistantGap({ task }: { task: AdminTask }) {
  const turn = useStore((s) => s.db.copilotTurns.find((t) => t.id === task.refId))
  if (!turn) return <Callout tone="warn">The question this task points at is no longer on record.</Callout>
  return (
    <Block title="The question">
      <blockquote className="rounded-lg bg-sunken px-3.5 py-3 text-[14px] leading-relaxed text-ink">“{turn.question}”</blockquote>
      <p className="mt-2 text-xs text-ink-3">
        Asked in {turn.portal === 'pool' ? 'Pool' : 'Loop'}. {turn.answered ? 'It was answered, and the answer was marked unhelpful.' : 'Nothing verified matched, so the assistant said it did not know.'}
      </p>
      <Link to="/admin/assistant" search={{ turn: turn.id }} className={cn(go, 'mt-3')}>
        Teach an answer <ArrowRight weight="bold" className="size-3.5" aria-hidden />
      </Link>
    </Block>
  )
}

function FeedbackRef({ task }: { task: AdminTask }) {
  const feedback = useStore((s) => s.db.feedback.find((f) => f.id === task.refId))
  const tenancy = useStore((s) => s.db.tenancies.find((t) => t.id === task.refId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === tenancy?.propertyId))
  if (feedback) {
    return (
      <Block title="The feedback">
        <blockquote className="rounded-lg bg-sunken px-3.5 py-3 text-[13px] leading-relaxed text-ink">“{feedback.text}”</blockquote>
        <Link to="/admin/feedback" search={{ id: feedback.id }} className={cn(buttonClass({ intent: 'secondary' }), 'mt-3')}>
          Open it in Feedback <ArrowRight weight="bold" className="size-3.5" aria-hidden />
        </Link>
      </Block>
    )
  }
  if (tenancy && property) {
    return (
      <Block title="The tenancy">
        <Facts>
          <Fact label="Home">
            {property.address.line1}, {property.address.suburb}
          </Fact>
          <Fact label="Bond">{money(tenancy.bond.amount)}</Fact>
          <Fact label="Marked lodged">{tenancy.bond.lodgedOn ? fmtDate(tenancy.bond.lodgedOn, { year: 'always' }) : 'Not lodged'}</Fact>
          <Fact label="Reference">{tenancy.bond.bondRef ?? <span className="text-warn-text">None on file</span>}</Fact>
        </Facts>
      </Block>
    )
  }
  return null
}

function Billing({ task }: { task: AdminTask }) {
  const org = useStore((s) => s.db.orgs.find((o) => o.id === task.orgId))
  const owner = useStore((s) => s.db.users.find((u) => u.id === org?.ownerUserId))
  if (!org) return null
  return (
    <Block title="The account">
      <Facts>
        <Fact label="Status">
          <Status tone={ORG_STATUS[org.status].tone} icon={ORG_STATUS[org.status].icon} strong>
            {ORG_STATUS[org.status].label}
          </Status>
        </Fact>
        {org.suspendedReason && <Fact label="Reason on file">{org.suspendedReason}</Fact>}
        {owner && (
          <Fact label="Owner">
            {owner.fullName}
            {owner.phone && (
              <a href={`tel:${owner.phone.replace(/\s/g, '')}`} className="num ml-2 rounded-sm font-normal underline decoration-line-strong underline-offset-2">
                {owner.phone}
              </a>
            )}
          </Fact>
        )}
      </Facts>
      <Link to="/admin/orgs" search={{ org: org.id }} className={cn(buttonClass({ intent: 'secondary' }), 'mt-3')}>
        Open the account <ArrowRight weight="bold" className="size-3.5" aria-hidden />
      </Link>
      <p className="mt-2 text-xs text-ink-3">A suspension is lifted from the account, not from here.</p>
    </Block>
  )
}

/* ───────────────────────────────── the body ─────────────────────────────── */

export function TaskDetail({ task, done }: { task: AdminTask; done: () => void }) {
  const me = useMe()
  const org = useStore((s) => s.db.orgs.find((o) => o.id === task.orgId))
  const [note, setNote] = useState('')
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const open = task.status === 'open' || task.status === 'in_progress'
  const mine = task.assignee === me.fullName

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <p className="text-[14px] leading-relaxed text-ink">{task.detail}</p>
        <Facts className="mt-3">
          {org && task.kind !== 'billing_issue' && (
            <Fact label="Organisation">
              <Link to="/admin/orgs" search={{ org: org.id }} className="rounded-sm underline decoration-line-strong underline-offset-2">
                {org.name}
              </Link>
            </Fact>
          )}
          <Fact label="Raised">{whenExact(task.createdAt)}</Fact>
          {task.dueAt && <Fact label="Due">{whenExact(task.dueAt)}</Fact>}
          <Fact label="With">
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {task.assignee ?? <span className="font-normal text-ink-3">Nobody yet</span>}
              {open &&
                (mine ? (
                  <Button size="sm" intent="ghost" onClick={() => releaseTask(task.id, me.fullName)}>
                    Release
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    intent="soft"
                    onClick={() => {
                      assignTask(task.id, me.fullName)
                      toast('It is yours', { description: 'The task is marked in progress under your name.' })
                    }}
                  >
                    {task.assignee ? 'Take it over' : 'Assign to me'}
                  </Button>
                ))}
            </span>
          </Fact>
        </Facts>
      </div>

      {task.kind === 'concierge_call' && open && <ConciergeCall task={task} done={done} />}
      {task.kind === 'identity_review' && <IdentityReview task={task} done={done} />}
      {task.kind === 'provider_vetting' && <ProviderVetting task={task} done={done} />}
      {task.kind === 'rule_change_review' && <LawChange task={task} />}
      {task.kind === 'healing_approval' && <ProposedFix task={task} />}
      {task.kind === 'copilot_gap' && <AssistantGap task={task} />}
      {task.kind === 'feedback_followup' && <FeedbackRef task={task} />}
      {task.kind === 'billing_issue' && <Billing task={task} />}

      {open ? (
        <Block title={task.kind === 'billing_issue' || task.kind === 'feedback_followup' || task.kind === 'maintenance_dispute' ? 'Close it' : 'Or close it by hand'}>
          <Field label="What happened?" hint="Saved on the task and in the audit log.">
            {(p) => (
              <Textarea
                {...p}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value)
                  setRefusal(null)
                }}
                placeholder="For example: rang the mobile on file; new card added and the charge went through."
                className="min-h-16"
              />
            )}
          </Field>
          {refusal && <Refusal verdict={refusal} className="mt-3" />}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              intent="secondary"
              onClick={() => {
                const v = resolveTask(task.id, note, me.fullName)
                if (!v.ok) return setRefusal(v)
                toast.success('Task resolved')
                done()
              }}
            >
              Resolve with this note
            </Button>
            <Button
              intent="ghost"
              onClick={() => {
                const v = dismissTask(task.id, note, me.fullName)
                if (!v.ok) return setRefusal(v)
                toast('Task dismissed')
                done()
              }}
            >
              Dismiss: needs nobody
            </Button>
          </div>
        </Block>
      ) : (
        <Block title="How it ended">
          <div className="rounded-lg bg-sunken p-3.5">
            <Status tone={TASK_STATUS[task.status].tone} icon={TASK_STATUS[task.status].icon} strong>
              {TASK_STATUS[task.status].label}
            </Status>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{task.resolution ?? 'No note was left.'}</p>
          </div>
          <Button
            intent="ghost"
            size="sm"
            className="mt-2 -ml-2"
            onClick={() => {
              reopenTask(task.id, me.fullName)
              toast('Reopened')
            }}
          >
            Reopen
          </Button>
        </Block>
      )}
    </div>
  )
}
