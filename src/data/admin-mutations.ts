/**
 * What the platform team can do. Each function is one decision a person on the
 * team makes in the console: it changes the records, closes the task that asked
 * for it, and leaves a line in the audit log saying who did what.
 *
 * Where a decision can be refused, the function returns a `Verdict` — the
 * refusal is a sentence the screen shows where the button was pressed, never a
 * silently ignored click. In production each of these is a server action behind
 * the same name, where the same checks run again.
 */
import type { AdminTask, Feedback, ID, ISODate, KbEntry, MigrationBatch, Org, PlanTier, Property, Provider, Tenancy, User } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { approveIncident, declinePromotion, rejectIncident, setPlaybookMode, sweep } from '@/domain/healing'
import { resolvePack } from '@/domain/jurisdictions'
import { applyReview, buildRollback, buildVersion, canPublish, guardrails, inForce, latestOverriding, mergeFeed, type Guardrail, type RegwatchFeed, type ReviewVerdict } from '@/domain/regwatch'
import { today, weekday } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { PLAN } from '@/domain/finance'
import { SUBURBS } from '@/domain/seed/world'
import { viewAsOrg } from '@/app/session'
import { audit, db, logAutopilot, newId, nowIso } from './store'

const OK: Verdict = { ok: true }
const refuse = (reason: string, fix?: string): Verdict => ({ ok: false, reason, fix })

/** A note is a sentence, not a keystroke. */
function isSentence(text: string, min = 8): boolean {
  return text.trim().length >= min
}

/* ───────────────────────────────── the queue ────────────────────────────── */

function taskOf(id: ID): AdminTask | undefined {
  return db.get().adminTasks.find((t) => t.id === id)
}

/** Closes every open task that points at a record, once the decision it asked for has been made elsewhere. */
function closeTasksFor(kind: AdminTask['kind'], refId: ID, resolution: string, status: 'done' | 'dismissed' = 'done'): void {
  for (const t of db.get().adminTasks) {
    if (t.kind === kind && t.refId === refId && (t.status === 'open' || t.status === 'in_progress')) db.update('adminTasks', t.id, { status, resolution })
  }
}

export function assignTask(taskId: ID, to: string): void {
  const t = taskOf(taskId)
  if (!t) return
  db.update('adminTasks', taskId, { assignee: to, status: t.status === 'open' ? 'in_progress' : t.status })
  audit(to, 'Took a task', t.title, undefined, t.orgId)
}

export function releaseTask(taskId: ID, by: string): void {
  const t = taskOf(taskId)
  if (!t) return
  db.update('adminTasks', taskId, { assignee: undefined, status: t.status === 'in_progress' ? 'open' : t.status })
  audit(by, 'Released a task', t.title, undefined, t.orgId)
}

export function resolveTask(taskId: ID, note: string, by: string): Verdict {
  const t = taskOf(taskId)
  if (!t) return refuse('That task is no longer in the queue.')
  if (!isSentence(note)) return refuse('Say how it was resolved.', 'One sentence is enough. Whoever picks up the next task like this will read it.')
  db.update('adminTasks', taskId, { status: 'done', resolution: note.trim(), assignee: t.assignee ?? by })
  audit(by, 'Resolved a task', t.title, note.trim(), t.orgId)
  return OK
}

export function dismissTask(taskId: ID, reason: string, by: string): Verdict {
  const t = taskOf(taskId)
  if (!t) return refuse('That task is no longer in the queue.')
  if (!isSentence(reason)) return refuse('Say why this needs nobody.', 'A dismissed task with no reason looks the same as one that was missed.')
  db.update('adminTasks', taskId, { status: 'dismissed', resolution: reason.trim() })
  audit(by, 'Dismissed a task', t.title, reason.trim(), t.orgId)
  return OK
}

export function reopenTask(taskId: ID, by: string): void {
  const t = taskOf(taskId)
  if (!t) return
  db.update('adminTasks', taskId, { status: 'open', resolution: undefined })
  audit(by, 'Reopened a task', t.title, undefined, t.orgId)
}

/**
 * The concierge call a landlord asked for. What the tenant said goes onto the
 * tenancy's arrears record, where the landlord reads it, and into their feed.
 */
export function logConciergeCall(taskId: ID, said: string, by: string): Verdict {
  const state = db.get()
  const t = state.adminTasks.find((x) => x.id === taskId)
  const tenancy = state.tenancies.find((x) => x.id === t?.refId)
  if (!t || !tenancy) return refuse('The tenancy this call is about can no longer be found.', 'Resolve the task with a note instead.')
  if (!isSentence(said)) return refuse('Write down what the tenant said.', 'The landlord reads this on the tenancy. “No answer; left a voicemail at 2 pm” is worth recording too.')
  const tenant = state.users.find((u) => u.id === tenancy.tenantIds[0])
  const first = by.split(' ')[0]
  db.insert('arrearsEvents', { id: newId('ae'), orgId: tenancy.orgId, tenancyId: tenancy.id, at: nowIso(), kind: 'concierge_reported', note: `${first} from the Loop team phoned ${tenant?.fullName.split(' ')[0] ?? 'the tenant'}. ${said.trim()}` })
  logAutopilot(tenancy.orgId, 'reminder', `${first} from the Loop team phoned ${tenant?.fullName ?? 'your tenant'} about the late rent and wrote up the call on the tenancy.`)
  db.update('adminTasks', taskId, { status: 'done', resolution: said.trim(), assignee: t.assignee ?? by })
  audit(by, 'Logged a concierge call', t.title, said.trim(), tenancy.orgId)
  return OK
}

/* ─────────────────────────────── people ─────────────────────────────────── */

export function decideIdentity(userId: ID, verified: boolean, by: string, note?: string): void {
  const user = db.get().users.find((u) => u.id === userId)
  if (!user) return
  db.update('users', userId, { identityVerified: verified })
  closeTasksFor('identity_review', userId, verified ? `Verified by ${by}.${note ? ` ${note.trim()}` : ''}` : `Declined by ${by}.${note ? ` ${note.trim()}` : ''}`)
  audit(by, verified ? 'Verified identity' : 'Declined an identity check', user.fullName, note?.trim() || undefined, user.orgId)
}

export function setUserStatus(userId: ID, status: 'active' | 'deactivated', by: User): Verdict {
  const user = db.get().users.find((u) => u.id === userId)
  if (!user) return refuse('That person can no longer be found.')
  if (userId === by.id && status === 'deactivated') return refuse('You cannot deactivate your own account.', 'Ask another person on the platform team to do it.')
  db.update('users', userId, { status })
  audit(by.fullName, status === 'deactivated' ? 'Deactivated a user' : 'Reactivated a user', user.fullName, user.email, user.orgId)
  return OK
}

/* ──────────────────────────── organisations ─────────────────────────────── */

export function changeOrgPlan(orgId: ID, plan: PlanTier, by: string): void {
  const org = db.get().orgs.find((o) => o.id === orgId)
  if (!org || org.plan === plan) return
  db.update('orgs', orgId, { plan })
  audit(by, 'Changed plan', org.name, `${PLAN[org.plan].name} to ${PLAN[plan].name}.`, orgId)
}

export function suspendOrg(orgId: ID, reason: string, by: string): Verdict {
  const org = db.get().orgs.find((o) => o.id === orgId)
  if (!org) return refuse('That organisation can no longer be found.')
  if (!isSentence(reason, 12)) return refuse('A suspension needs its reason, as a sentence.', 'The owner is shown these exact words in Loop while the account is suspended.')
  db.update('orgs', orgId, { status: 'suspended', suspendedReason: reason.trim() })
  audit(by, 'Suspended', org.name, reason.trim(), orgId)
  return OK
}

export function liftSuspension(orgId: ID, by: string): void {
  const org = db.get().orgs.find((o) => o.id === orgId)
  if (!org) return
  db.update('orgs', orgId, { status: 'active', suspendedReason: undefined })
  audit(by, 'Lifted suspension', org.name, org.suspendedReason ? `Was suspended: ${org.suspendedReason}` : undefined, orgId)
}

export function saveOrgNotes(orgId: ID, notes: string, by: string): void {
  const org = db.get().orgs.find((o) => o.id === orgId)
  if (!org) return
  db.update('orgs', orgId, { adminNotes: notes.trim() || undefined })
  audit(by, 'Updated team notes', org.name, undefined, orgId)
}

/** Opens Loop as the organisation's owner. The visit is logged before the session changes. */
export function viewAsOwner(org: Org, admin: User, why: string): void {
  audit(admin.fullName, 'Viewed as owner', org.name, why.trim() || 'Opened from the team console.', org.id)
  viewAsOrg(org.id, org.ownerUserId, admin.id)
}

/* ───────────────────────────────── feedback ─────────────────────────────── */

function feedbackOf(id: ID): Feedback | undefined {
  return db.get().feedback.find((f) => f.id === id)
}

export function replyToFeedback(id: ID, reply: string, by: string): Verdict {
  const f = feedbackOf(id)
  if (!f) return refuse('That feedback can no longer be found.')
  if (!isSentence(reply, 12)) return refuse('Write the reply first.', 'It goes to the person who wrote in, under your name.')
  db.update('feedback', id, { adminReply: reply.trim(), status: f.status === 'new' ? 'triaged' : f.status })
  audit(by, 'Replied to feedback', `${f.area}: ${f.text.slice(0, 60)}`, reply.trim(), f.orgId)
  return OK
}

export function setFeedbackStatus(id: ID, status: Feedback['status'], by: string): void {
  const f = feedbackOf(id)
  if (!f || f.status === status) return
  db.update('feedback', id, { status })
  audit(by, 'Moved feedback', `${f.area}: ${f.text.slice(0, 60)}`, `${f.status} to ${status}.`, f.orgId)
}

export function saveFeedbackNote(id: ID, note: string, by: string): void {
  const f = feedbackOf(id)
  if (!f) return
  db.update('feedback', id, { adminNote: note.trim() || undefined })
  audit(by, 'Noted on feedback', `${f.area}: ${f.text.slice(0, 60)}`, undefined, f.orgId)
}

/** Puts a piece of feedback in the action queue. Returns the task, new or already open. */
export function feedbackToTask(id: ID, by: string): ID | null {
  const state = db.get()
  const f = state.feedback.find((x) => x.id === id)
  if (!f) return null
  const open = state.adminTasks.find((t) => t.kind === 'feedback_followup' && t.refId === id && (t.status === 'open' || t.status === 'in_progress'))
  if (open) return open.id
  const who = state.users.find((u) => u.id === f.userId)?.fullName ?? 'A user'
  const taskId = newId('at')
  db.insert('adminTasks', {
    id: taskId,
    kind: 'feedback_followup',
    title: `Follow up ${f.kind === 'bug' ? 'a bug report' : f.kind === 'complaint' ? 'a complaint' : `feedback`} on ${f.area}`,
    detail: `${who} wrote: “${f.text}”`,
    orgId: f.orgId,
    refId: id,
    priority: f.kind === 'complaint' || f.kind === 'bug' ? 'p2' : 'p3',
    status: 'open',
    createdAt: nowIso(),
  })
  if (f.status === 'new') db.update('feedback', id, { status: 'triaged' })
  audit(by, 'Queued feedback for follow-up', `${f.area}: ${f.text.slice(0, 60)}`, undefined, f.orgId)
  return taskId
}

/* ──────────────────────────────── Rulewatch ─────────────────────────────── */

/** The guardrail checklist for a change, against the pack and sources as they stand right now. */
function railsFor(changeId: ID): { rails: Guardrail[]; found: boolean } {
  const state = db.get()
  const change = state.ruleChanges.find((c) => c.id === changeId)
  if (!change) return { rails: [], found: false }
  return { found: true, rails: guardrails(change, { source: state.ruleSources.find((s) => s.id === change.sourceId), pack: resolvePack(change.jurisdiction, state.packVersions), today: today() }) }
}

export function saveChangeSummary(changeId: ID, summary: string, by: string): Verdict {
  const change = db.get().ruleChanges.find((c) => c.id === changeId)
  if (!change) return refuse('That change can no longer be found.')
  if (!isSentence(summary, 20)) return refuse('The summary cannot be empty.', 'It is what the next reviewer, and later the audit log, will read first.')
  db.update('ruleChanges', changeId, { summary: summary.trim() })
  audit(by, 'Corrected a change summary', change.title)
  return OK
}

const VERDICT_ACTION: Record<ReviewVerdict, string> = { approve: 'Approved a law change', reject: 'Rejected a law change', no_action: 'Recorded no action on a law change' }

export function reviewChange(changeId: ID, verdict: ReviewVerdict, by: string, note?: string): Verdict {
  const change = db.get().ruleChanges.find((c) => c.id === changeId)
  const { rails, found } = railsFor(changeId)
  if (!change || !found) return refuse('That change can no longer be found.')
  const result = applyReview(change, rails, verdict, by, nowIso(), note)
  if ('refused' in result) return result.refused
  db.update('ruleChanges', changeId, { reviews: result.change.reviews, status: result.change.status })
  const waiting = result.change.status === 'needs_second_review'
  audit(by, VERDICT_ACTION[verdict], change.title, waiting ? 'First of two approvals. Waiting for a second reviewer.' : note?.trim() || undefined)
  if (!waiting) closeTasksFor('rule_change_review', changeId, `${verdict === 'approve' ? 'Approved' : verdict === 'reject' ? 'Rejected' : 'No action needed'}, decided by ${by}.`)
  return OK
}

/**
 * Publishes an approved change: a new immutable pack version whose overrides
 * carry the patch. From this call on, `resolvePack` returns the new values to
 * every calculator in every portal.
 */
export function publishChange(changeId: ID, by: string): Verdict & { version?: string } {
  const state = db.get()
  const change = state.ruleChanges.find((c) => c.id === changeId)
  const { rails } = railsFor(changeId)
  if (!change) return refuse('That change can no longer be found.')
  const ok = canPublish(change, rails)
  if (!ok.ok) return ok
  const version = buildVersion(change, state.packVersions, by, nowIso(), today())
  db.patch((d) => ({
    packVersions: [version, ...d.packVersions],
    ruleChanges: d.ruleChanges.map((c) => (c.id === changeId ? { ...c, status: 'published' as const, publishedInVersion: version.version } : c)),
  }))
  closeTasksFor('rule_change_review', changeId, `Published in ${version.version} by ${by}.`)
  audit(by, 'Published rule pack', `${change.jurisdiction} ${version.version}`, change.title)
  return { ok: true, version: version.version }
}

/** Undoes the newest published change by publishing a version that restores the previous values. */
export function rollbackVersion(versionId: ID, by: string): Verdict & { version?: string } {
  const state = db.get()
  const target = state.packVersions.find((v) => v.id === versionId)
  if (!target) return refuse('That version can no longer be found.')
  if (latestOverriding(state.packVersions, target.jurisdiction)?.id !== target.id) {
    return refuse('Only the newest published change can be rolled back in one step.', 'Roll back the versions after it first, newest first.')
  }
  const rollback = buildRollback(target, state.packVersions, by, nowIso(), today())
  if (!rollback) return refuse('That version changed no rule value, so there is nothing to restore.')
  // A change's status follows the values, not the button pressed: after the rollback it is
  // "published" only if the pack still returns what it proposed, and "approved" (reviewed, not in force) if not.
  const after = resolvePack(target.jurisdiction, [rollback, ...state.packVersions])
  db.patch((d) => ({
    packVersions: [rollback, ...d.packVersions],
    ruleChanges: d.ruleChanges.map((c) => {
      if (!target.changeIds.includes(c.id) || (c.status !== 'published' && c.status !== 'approved')) return c
      return inForce(c, after) ? { ...c, status: 'published' as const, publishedInVersion: rollback.version } : { ...c, status: 'approved' as const, publishedInVersion: undefined }
    }),
  }))
  audit(by, 'Rolled back rule pack', `${target.jurisdiction} ${target.version}`, `Restored by ${rollback.version}.`)
  return { ok: true, version: rollback.version }
}

/** Brings the scheduled watcher's feed into the store. Safe to call on every load: it only writes what is new. */
export function ingestFeed(feed: RegwatchFeed): { added: number; sourcesUpdated: number; skipped: number } {
  const state = db.get()
  const merged = mergeFeed(state, feed)
  if (merged.added.length === 0 && merged.sourcesUpdated === 0) return { added: 0, sourcesUpdated: 0, skipped: merged.skipped.length }
  db.patch(() => ({ ruleSources: merged.ruleSources, ruleChanges: merged.ruleChanges }))
  for (const change of merged.added) {
    db.insert('adminTasks', {
      id: newId('at'),
      kind: 'rule_change_review',
      title: `Review a detected law change: ${change.title}`,
      detail: change.patches.length ? `The watcher proposes ${change.patches.length === 1 ? 'a change to one rule' : `changes to ${change.patches.length} rules`}. Read the quote before the summary.` : 'The watcher saw the source change and proposed nothing. A person has to read it.',
      refId: change.id,
      priority: change.impact === 'high' ? 'p1' : 'p2',
      status: 'open',
      createdAt: nowIso(),
    })
    audit('Rulewatch', 'Detected change', change.title, `Queued for review as ${change.id}.`)
  }
  return { added: merged.added.length, sourcesUpdated: merged.sourcesUpdated, skipped: merged.skipped.length }
}

/* ─────────────────────────────── self-healing ───────────────────────────── */

const SEVERITY_PRIORITY = { high: 'p1', medium: 'p2', low: 'p3' } as const

/** Runs every check now. Safe fixes are applied; the rest land in the queue for a person. */
export function runSweep(by: string): { found: number; healed: number; awaiting: number } {
  const state = db.get()
  const result = sweep(state, today())
  if (result.found > 0) {
    const before = new Set(state.incidents.map((i) => i.id))
    db.patch(() => result.patch)
    for (const incident of result.patch.incidents ?? []) {
      if (before.has(incident.id) || incident.status !== 'awaiting_approval') continue
      db.insert('adminTasks', { id: newId('at'), kind: 'healing_approval', title: `Approve a fix: ${incident.title}`, detail: incident.signal, orgId: incident.orgId, refId: incident.id, priority: SEVERITY_PRIORITY[incident.severity], status: 'open', createdAt: nowIso() })
    }
  }
  audit(by, 'Ran a self-healing sweep', result.found === 0 ? 'Nothing new found' : `${result.found} new ${result.found === 1 ? 'fault' : 'faults'}`, result.found === 0 ? undefined : `${result.healed} fixed automatically, ${result.awaiting} waiting for approval.`)
  return { found: result.found, healed: result.healed, awaiting: result.awaiting }
}

export function approveFix(incidentId: ID, by: string): void {
  const state = db.get()
  const incident = state.incidents.find((i) => i.id === incidentId)
  const patch = approveIncident(state, incidentId, by, today())
  if (!incident || Object.keys(patch).length === 0) return
  db.patch(() => patch)
  closeTasksFor('healing_approval', incidentId, `Approved and applied by ${by}.`)
  audit(by, 'Approved fix', state.playbooks.find((p) => p.id === incident.playbookId)?.name ?? incident.title, incident.signal, incident.orgId)
}

export function rejectFix(incidentId: ID, reason: string, by: string): Verdict {
  const state = db.get()
  const incident = state.incidents.find((i) => i.id === incidentId)
  if (!incident) return refuse('That incident can no longer be found.')
  if (!isSentence(reason)) return refuse('Say why the fix is wrong.', 'A rejection resets the playbook’s run of clean approvals, so the reason matters to whoever tunes it.')
  db.patch(() => rejectIncident(state, incidentId, by, reason.trim()))
  closeTasksFor('healing_approval', incidentId, `Rejected by ${by}: ${reason.trim()}`, 'dismissed')
  audit(by, 'Rejected fix', state.playbooks.find((p) => p.id === incident.playbookId)?.name ?? incident.title, reason.trim(), incident.orgId)
  return OK
}

/** The human decision the learning loop asks for: let this playbook run without approval. */
export function promotePlaybook(playbookId: ID, by: string): void {
  const state = db.get()
  const playbook = state.playbooks.find((p) => p.id === playbookId)
  if (!playbook) return
  db.patch(() => setPlaybookMode(state, playbookId, 'auto'))
  audit(by, 'Made a playbook automatic', playbook.name, `After ${playbook.approvals} approvals and ${playbook.rejections} rejections.`)
}

export function keepPlaybookManual(playbookId: ID, by: string): void {
  const state = db.get()
  const playbook = state.playbooks.find((p) => p.id === playbookId)
  if (!playbook) return
  db.patch(() => declinePromotion(state, playbookId))
  audit(by, 'Kept a playbook on approval', playbook.name, 'Declined the suggestion to make it automatic; the count starts again.')
}

export function demotePlaybook(playbookId: ID, by: string): void {
  const state = db.get()
  const playbook = state.playbooks.find((p) => p.id === playbookId)
  if (!playbook) return
  db.patch(() => setPlaybookMode(state, playbookId, 'approval'))
  audit(by, 'Put a playbook back on approval', playbook.name)
}

/* ───────────────────────────────── assistant ────────────────────────────── */

export interface Teaching {
  /** The turn this answer is for, when it came from the review queue. */
  turnId?: ID
  question: string
  keywords: string[]
  answer: string
  citation: string
  sourceUrl: string
  portal: KbEntry['portal']
}

/** Checks a taught answer before it is saved. The assistant repeats this to customers, so it has to stand up. */
export function checkTeaching(t: Teaching): Verdict {
  const keywords = t.keywords.map((k) => k.trim()).filter(Boolean)
  if (!isSentence(t.question, 6)) return refuse('Give the question this answers.')
  if (keywords.length === 0) return refuse('Add at least one keyword.', 'The assistant gives this answer when a question contains one of them.')
  const short = keywords.find((k) => k.length < 3)
  if (short) return refuse(`“${short}” is too short to be a keyword.`, 'A keyword of one or two letters would match almost any question.')
  if (!isSentence(t.answer, 30)) return refuse('Write the answer in full sentences.', 'Lead with the answer itself; the first sentence is shown as the headline.')
  const citation = t.citation.trim()
  const url = t.sourceUrl.trim()
  if (Boolean(citation) !== Boolean(url)) return refuse('A citation and its link go together.', 'The assistant only shows a source it can both name and open.')
  if (url && !/^https:\/\/[^\s]+\.[^\s]+$/.test(url)) return refuse('The source link has to be a full https address.')
  return OK
}

export function teachAnswer(t: Teaching, by: string): Verdict {
  const ok = checkTeaching(t)
  if (!ok.ok) return ok
  db.insert('kb', {
    id: newId('kb'),
    keywords: t.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean),
    question: t.question.trim(),
    answer: t.answer.trim(),
    citation: t.citation.trim() || undefined,
    sourceUrl: t.sourceUrl.trim() || undefined,
    portal: t.portal,
    taughtBy: by,
    taughtAt: nowIso(),
    fromTurnId: t.turnId,
  })
  if (t.turnId) {
    db.update('copilotTurns', t.turnId, { review: 'taught' })
    closeTasksFor('copilot_gap', t.turnId, `Taught by ${by}.`)
  }
  audit(by, 'Taught the assistant', `“${t.question.trim()}”`, t.turnId ? 'From a question it could not answer well.' : 'Added from the console.')
  return OK
}

export function dismissTurn(turnId: ID, by: string): void {
  const turn = db.get().copilotTurns.find((t) => t.id === turnId)
  if (!turn) return
  db.update('copilotTurns', turnId, { review: 'dismissed' })
  closeTasksFor('copilot_gap', turnId, `Dismissed by ${by}: no answer to teach.`, 'dismissed')
  audit(by, 'Dismissed an assistant gap', `“${turn.question}”`)
}

export function forgetAnswer(kbId: ID, by: string): void {
  const entry = db.get().kb.find((k) => k.id === kbId)
  if (!entry) return
  db.remove('kb', kbId)
  audit(by, 'Removed a taught answer', `“${entry.question}”`)
}

/* ────────────────────────────── field network ───────────────────────────── */

/** The vetting checks every provider must pass. Loop & Pool's own bar, not a legal one. */
export const REQUIRED_CHECKS: (keyof Provider['checks'])[] = ['identity', 'insurance', 'policeVet']
export const CHECK_LABEL: Record<keyof Provider['checks'], string> = { identity: 'Identity', insurance: 'Public liability insurance', licence: 'Trade licence', policeVet: 'Police vetting' }

export function setProviderCheck(providerId: ID, check: keyof Provider['checks'], value: boolean, by: string): void {
  const p = db.get().providers.find((x) => x.id === providerId)
  if (!p || p.checks[check] === value) return
  db.update('providers', providerId, { checks: { ...p.checks, [check]: value } })
  audit(by, value ? 'Recorded a vetting check' : 'Withdrew a vetting check', p.name, CHECK_LABEL[check])
}

export function approveProvider(providerId: ID, by: string): Verdict {
  const p = db.get().providers.find((x) => x.id === providerId)
  if (!p) return refuse('That provider can no longer be found.')
  const missing = REQUIRED_CHECKS.filter((c) => !p.checks[c])
  if (missing.length) return refuse(`${p.name} cannot take jobs yet.`, `Still outstanding: ${missing.map((c) => CHECK_LABEL[c].toLowerCase()).join(', ')}.`)
  db.update('providers', providerId, { vetting: 'vetted' })
  closeTasksFor('provider_vetting', providerId, `Vetted and approved by ${by}.`)
  audit(by, 'Approved a provider', p.name, p.checks.licence ? undefined : 'No trade licence on file; approved for unlicensed work only.')
  return OK
}

export function suspendProvider(providerId: ID, reason: string, by: string): Verdict {
  const p = db.get().providers.find((x) => x.id === providerId)
  if (!p) return refuse('That provider can no longer be found.')
  if (!isSentence(reason)) return refuse('A suspension needs its reason.', 'It is what the provider is told, and what the next person on the team reads.')
  db.update('providers', providerId, { vetting: 'suspended' })
  audit(by, 'Suspended a provider', p.name, reason.trim())
  return OK
}

/** Marks a completed job as paid. No money moves in the prototype: payouts are simulated. */
export function markPaidOut(fieldTaskId: ID, by: string): void {
  const state = db.get()
  const task = state.fieldTasks.find((t) => t.id === fieldTaskId)
  if (!task || task.status !== 'completed') return
  db.update('fieldTasks', fieldTaskId, { status: 'paid_out' })
  audit(by, 'Recorded a payout (simulated)', state.providers.find((p) => p.id === task.providerId)?.name ?? 'Provider', `${money(task.price - task.platformFee)} of a ${money(task.price)} job.`, task.orgId)
}

/* ───────────────────────────────── migration ────────────────────────────── */

/** One validated row of a rent roll, ready to become a property and its tenancy. */
export interface ImportRow {
  address: string
  suburb: string
  city: string
  postcode: string
  kind: Property['kind']
  beds: number
  weeklyRent: number
  bond: number
  bondRef?: string
  startDate: ISODate
  tenantName: string
  tenantEmail: string
  landlordName: string
  landlordEmail: string
}

/** The partner agency whose rent roll the founding migration brings across. */
export const MIGRATION_ORG = 'org_penguin'

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

function placeOf(row: ImportRow, i: number): { lat: number; lng: number } {
  const all = Object.values(SUBURBS)
  const s = all.find((x) => plain(x.name) === plain(row.suburb)) ?? all.find((x) => plain(x.city) === plain(row.city)) ?? SUBURBS.central
  // A rent roll has no coordinates. The pin is the suburb's centre, nudged so pins do not stack.
  return { lat: s.lat + ((i % 5) - 2) * 0.0016, lng: s.lng + ((i % 3) - 1) * 0.0021 }
}

/**
 * Imports a validated rent roll: a batch record, and under the partner agency
 * a property and an active tenancy for each row. Only what the rent roll says
 * is recorded as known — every healthy-homes standard, the insurance and the
 * signed agreement start as "not on file", which is the truth.
 */
export function importBatch(name: string, rows: ImportRow[], totalRows: number, issues: MigrationBatch['issues'], by: string): { batchId: ID; createdRecords: boolean } {
  const state = db.get()
  const org = state.orgs.find((o) => o.id === MIGRATION_ORG)
  const entity = state.entities.find((e) => e.orgId === MIGRATION_ORG)
  const batchId = newId('mig')
  const day = today()
  const batch: MigrationBatch = { id: batchId, name: name.trim() || `Rent roll imported ${day}`, createdAt: nowIso(), rows: totalRows, imported: rows.length, invitesSent: 0, invitesAccepted: 0, status: 'imported', issues }
  const createdRecords = Boolean(org && entity) && rows.length > 0

  if (createdRecords && org && entity) {
    const users: User[] = []
    const properties: Property[] = []
    const tenancies: Tenancy[] = []
    const unknown = { status: 'unknown' as const, detail: 'Not assessed. The rent roll did not say.' }
    rows.forEach((row, i) => {
      const propertyId = newId('p')
      const tenantId = newId('u')
      users.push({ id: tenantId, role: 'tenant', fullName: row.tenantName, email: row.tenantEmail, phone: '', identityVerified: false, defaultPortal: 'pool', onboardingStep: 0, createdAt: nowIso(), lastActiveAt: nowIso(), status: 'invited', hue: (i * 47 + 20) % 360 })
      properties.push({
        id: propertyId,
        orgId: org.id,
        entityId: entity.id,
        jurisdiction: org.jurisdiction,
        address: { line1: row.address, suburb: row.suburb, city: row.city, postcode: row.postcode },
        geo: placeOf(row, i),
        titleType: row.kind === 'unit' || row.kind === 'apartment' ? 'unit_title' : 'freehold',
        kind: row.kind,
        beds: row.beds,
        baths: 1,
        parking: 0,
        floorArea: 0,
        yearBuilt: 0,
        purchasePrice: 0,
        purchaseYear: 0,
        currentValue: 0,
        mortgageBalance: 0,
        mortgageRatePct: 0,
        art: { style: i % 6, hue: (i * 61 + 140) % 360 },
        onboardingMode: 'existing_tenancy_import',
        healthyHomes: { heating: unknown, insulation: unknown, ventilation: unknown, moisture: unknown, draught: unknown },
        smokeAlarms: { type: 'unknown' },
        meth: { status: 'untested' },
        insurance: { statementInAgreement: false },
        sinkingFund: { ratePct: 0, balance: 0, autoApproveLimit: 0 },
        assets: [],
        keys: [],
        annualCosts: { rates: 0, insurance: 0, bodyCorp: 0 },
      })
      tenancies.push({
        id: newId('t'),
        orgId: org.id,
        propertyId,
        tenantIds: [tenantId],
        status: 'active',
        type: 'periodic',
        startDate: row.startDate,
        weeklyRent: row.weeklyRent,
        cadence: 'weekly',
        rentDueWeekday: weekday(row.startDate),
        // Taken as paid to the day of import until the bank feed says otherwise.
        rentPaidTo: day,
        // With a reference the bond is known to be lodged; the tenancy start stands in for the date until Bond Hub confirms it.
        bond: { amount: row.bond, petBond: 0, receivedOn: row.startDate, lodgedOn: row.bondRef ? row.startDate : undefined, bondRef: row.bondRef },
        pets: [],
        origin: 'imported',
      })
    })
    db.patch((d) => ({ users: [...users, ...d.users], properties: [...properties, ...d.properties], tenancies: [...tenancies, ...d.tenancies], migrations: [batch, ...d.migrations] }))
  } else {
    db.insert('migrations', batch)
  }
  audit(by, 'Imported a rent roll', batch.name, `${rows.length} of ${totalRows} rows imported${issues.length ? `; ${issues.length} ${issues.length === 1 ? 'problem' : 'problems'} left out` : ''}.`, createdRecords ? MIGRATION_ORG : undefined)
  return { batchId, createdRecords }
}

/** Marks a batch's founding invites as sent. No email leaves the prototype: this is simulated. */
export function sendFoundingInvites(batchId: ID, by: string): void {
  const batch = db.get().migrations.find((m) => m.id === batchId)
  if (!batch || batch.imported === 0) return
  db.update('migrations', batchId, { invitesSent: batch.imported, status: 'invited' })
  audit(by, 'Sent founding invites (simulated)', batch.name, `${batch.imported} ${batch.imported === 1 ? 'invite' : 'invites'}.`)
}
