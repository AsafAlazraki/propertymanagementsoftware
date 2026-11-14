/**
 * What the console's actions do to the records. Each test presses one of the
 * buttons the way a screen does — through src/data/admin-mutations.ts — and
 * reads the store afterwards: the record changed, the task that asked for it
 * closed, and the audit log gained its line.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest'

type Store = typeof import('@/data/store')
type Actions = typeof import('@/data/admin-mutations')
let store: Store
let act: Actions

const state = () => store.db.get()
const task = (id: string) => state().adminTasks.find((t) => t.id === id)
const lastAudit = () => state().audit[0]

beforeAll(async () => {
  const items = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => void items.set(k, v),
    removeItem: (k: string) => void items.delete(k),
    clear: () => items.clear(),
    key: () => null,
    length: 0,
  })
  store = await import('@/data/store')
  act = await import('@/data/admin-mutations')
})

describe('the action queue', () => {
  it('puts a concierge call on the landlord’s tenancy record', async () => {
    const { requestConciergeCall } = await import('@/data/mutations')
    requestConciergeCall('t_kowhai')
    const call = state().adminTasks.find((t) => t.kind === 'concierge_call')!
    expect(act.logConciergeCall(call.id, '  ', 'Riley Chen').ok).toBe(false)
    expect(act.logConciergeCall(call.id, 'Pay day moved to Thursday. Expects to pay: Thursday.', 'Riley Chen').ok).toBe(true)

    const event = state().arrearsEvents.find((e) => e.kind === 'concierge_reported')!
    expect(event.tenancyId).toBe('t_kowhai')
    expect(event.orgId).toBe('org_whitaker')
    expect(event.note).toContain('Riley from the Loop team phoned Wiremu')
    expect(event.note).toContain('Pay day moved to Thursday')
    expect(task(call.id)?.status).toBe('done')
    expect(state().autopilotLog[0].text).toContain('phoned Wiremu Ngata')
    expect(lastAudit()).toMatchObject({ actor: 'Riley Chen', action: 'Logged a concierge call', orgId: 'org_whitaker' })
  })

  it('assigns, resolves only with a note, and reopens', () => {
    act.assignTask('at_fb', 'Riley Chen')
    expect(task('at_fb')).toMatchObject({ assignee: 'Riley Chen', status: 'in_progress' })
    expect(act.resolveTask('at_fb', '', 'Riley Chen').ok).toBe(false)
    expect(act.resolveTask('at_fb', 'Replied; counting the bank’s posting date.', 'Riley Chen').ok).toBe(true)
    expect(task('at_fb')).toMatchObject({ status: 'done', resolution: 'Replied; counting the bank’s posting date.' })
    act.reopenTask('at_fb', 'Riley Chen')
    expect(task('at_fb')?.status).toBe('open')
  })

  it('verifies an identity and closes the review that asked for it', () => {
    act.decideIdentity('u_chloe', true, 'Mere Parata', 'Licence has an accent the form dropped.')
    expect(state().users.find((u) => u.id === 'u_chloe')?.identityVerified).toBe(true)
    expect(task('at_chloe')).toMatchObject({ status: 'done' })
    expect(lastAudit()).toMatchObject({ actor: 'Mere Parata', action: 'Verified identity', target: 'Chloe Martin' })
  })

  it('will not approve a provider with a required check missing', () => {
    const refused = act.approveProvider('pr_oliver', 'Mere Parata')
    expect(refused.ok).toBe(false)
    expect(refused.fix).toContain('police vetting')
    act.setProviderCheck('pr_oliver', 'policeVet', true, 'Mere Parata')
    expect(act.approveProvider('pr_oliver', 'Mere Parata').ok).toBe(true)
    expect(state().providers.find((p) => p.id === 'pr_oliver')?.vetting).toBe('vetted')
    expect(task('at_oliver')?.status).toBe('done')
    expect(act.suspendProvider('pr_oliver', '', 'Mere Parata').ok).toBe(false)
  })
})

describe('organisations and people', () => {
  it('suspends only with a reason the owner can be shown, and lifts it', () => {
    expect(act.suspendOrg('org_patel', 'unpaid', 'Riley Chen').ok).toBe(false)
    expect(state().orgs.find((o) => o.id === 'org_patel')?.status).toBe('active')
    expect(act.suspendOrg('org_patel', 'Your card was declined three times and we could not reach you.', 'Riley Chen').ok).toBe(true)
    expect(state().orgs.find((o) => o.id === 'org_patel')).toMatchObject({ status: 'suspended', suspendedReason: 'Your card was declined three times and we could not reach you.' })
    act.liftSuspension('org_patel', 'Riley Chen')
    expect(state().orgs.find((o) => o.id === 'org_patel')).toMatchObject({ status: 'active', suspendedReason: undefined })
    expect(lastAudit().action).toBe('Lifted suspension')
  })

  it('logs a support view before the session changes hands', () => {
    const org = state().orgs.find((o) => o.id === 'org_chenli')!
    const admin = state().users.find((u) => u.id === 'u_riley')!
    act.viewAsOwner(org, admin, 'Unmatched payment')
    expect(lastAudit()).toMatchObject({ actor: 'Riley Chen', action: 'Viewed as owner', target: org.name, detail: 'Unmatched payment', orgId: org.id })
    expect(store.useStore.getState().session).toMatchObject({ userId: org.ownerUserId, orgId: org.id, portal: 'loop', impersonatedBy: 'u_riley' })
  })

  it('will not let someone deactivate their own account', () => {
    const admin = state().users.find((u) => u.id === 'u_riley')!
    expect(act.setUserStatus('u_riley', 'deactivated', admin).ok).toBe(false)
    expect(act.setUserStatus('u_tom', 'deactivated', admin).ok).toBe(true)
    expect(state().users.find((u) => u.id === 'u_tom')?.status).toBe('deactivated')
  })
})

describe('feedback', () => {
  it('replies, and queues a follow-up once', () => {
    expect(act.replyToFeedback('fb_1', '', 'Riley Chen').ok).toBe(false)
    expect(act.replyToFeedback('fb_1', 'Thank you. It is the countdown we are proudest of.', 'Riley Chen').ok).toBe(true)
    expect(state().feedback.find((f) => f.id === 'fb_1')).toMatchObject({ status: 'triaged', adminReply: 'Thank you. It is the countdown we are proudest of.' })
    const first = act.feedbackToTask('fb_11', 'Riley Chen')
    expect(first).not.toBeNull()
    expect(act.feedbackToTask('fb_11', 'Riley Chen')).toBe(first)
    expect(task(first!)).toMatchObject({ kind: 'feedback_followup', refId: 'fb_11', status: 'open' })
  })
})

describe('self-healing', () => {
  it('applies an approved fix, counts the decision, and finds nothing new afterwards', () => {
    const waiting = state().incidents.filter((i) => i.status === 'awaiting_approval')
    const listing = waiting.find((i) => i.playbookId === 'pb_stale_listing')!
    const before = state().playbooks.find((p) => p.id === 'pb_stale_listing')!
    act.approveFix(listing.id, 'Riley Chen')
    expect(state().properties.find((p) => p.id === listing.refs[0].id)?.listing?.status).toBe('paused')
    expect(state().playbooks.find((p) => p.id === 'pb_stale_listing')).toMatchObject({ approvals: before.approvals + 1, runs: before.runs + 1 })
    expect(state().incidents.find((i) => i.id === listing.id)).toMatchObject({ status: 'approved', resolvedBy: 'Riley Chen' })

    const match = waiting.find((i) => i.playbookId === 'pb_fuzzy_match')!
    expect(act.rejectFix(match.id, '', 'Riley Chen').ok).toBe(false)
    expect(act.rejectFix(match.id, 'The payer is not the tenant.', 'Riley Chen').ok).toBe(true)
    expect(state().incidents.find((i) => i.id === match.id)?.status).toBe('rejected')

    expect(act.runSweep('Riley Chen')).toEqual({ found: 0, healed: 0, awaiting: 0 })
  })

  it('promotes a playbook only when a person says so, and can put it back', () => {
    expect(state().playbooks.find((p) => p.id === 'pb_bond_ref')).toMatchObject({ mode: 'approval', promotionSuggested: true })
    act.promotePlaybook('pb_bond_ref', 'Riley Chen')
    expect(state().playbooks.find((p) => p.id === 'pb_bond_ref')).toMatchObject({ mode: 'auto', promotionSuggested: false })
    act.demotePlaybook('pb_bond_ref', 'Riley Chen')
    expect(state().playbooks.find((p) => p.id === 'pb_bond_ref')?.mode).toBe('approval')
  })
})

describe('the assistant', () => {
  it('gives a taught answer back, and closes the gap it came from', async () => {
    const { ask } = await import('@/domain/copilot')
    const { resolvePack } = await import('@/domain/jurisdictions')
    const asking = () => ask('Can I charge for a lost garage remote?', { db: state(), pack: resolvePack('NZ', state().packVersions), portal: 'loop', userId: 'u_hana', orgId: 'org_whitaker', today: state().seededOn })
    expect(asking()).toBeNull()

    const teaching = { turnId: 'ct_9', question: 'Can I charge for a lost garage remote?', keywords: ['garage remote'], answer: 'Yes, the actual cost of replacing it. A tenant who loses a key or remote pays what the replacement costs, and nothing on top.', citation: '', sourceUrl: '', portal: 'both' as const }
    expect(act.teachAnswer({ ...teaching, keywords: ['a'] }, 'Mere Parata').ok).toBe(false)
    expect(act.teachAnswer({ ...teaching, citation: 'A citation with no link' }, 'Mere Parata').ok).toBe(false)
    expect(act.teachAnswer(teaching, 'Mere Parata').ok).toBe(true)

    expect(asking()).toMatchObject({ taughtBy: 'Mere Parata', headline: 'Yes, the actual cost of replacing it.' })
    expect(state().copilotTurns.find((t) => t.id === 'ct_9')?.review).toBe('taught')
    expect(task('at_gap1')?.status).toBe('done')
  })
})

describe('migration', () => {
  it('checks the sample rent roll with the rules engine and imports only what passed', async () => {
    const { SAMPLE_CSV, addressKey, checkRentRoll } = await import('./migration/validate')
    const { resolvePack } = await import('@/domain/jurisdictions')
    const pack = resolvePack('NZ', state().packVersions)
    const onPlatform = new Set(state().properties.map((p) => addressKey(p.address.line1, p.address.suburb)))
    const checked = checkRentRoll(SAMPLE_CSV, pack, state().seededOn, onPlatform)

    expect(checked.missingColumns).toEqual([])
    expect(checked.rows).toHaveLength(8)
    const blocked = checked.rows.filter((r) => !r.value)
    expect(blocked.map((r) => r.problems.find((p) => p.blocks)?.field)).toEqual(['weekly_rent', 'bond', 'tenant_email'])
    expect(blocked[0].problems[0].problem).toContain('A range is not an amount')
    expect(blocked[1].problems[0].problem).toContain(`more than ${pack.rules['bond.max_weeks'].value} weeks of rent`)
    expect(checked.ready).toHaveLength(5)
    expect(checked.rows.filter((r) => r.value && r.problems.length > 0)).toHaveLength(1)

    const homes = state().properties.length
    const issues = blocked.flatMap((r) => r.problems.filter((p) => p.blocks).map((p) => ({ row: r.row, field: p.field, problem: p.problem })))
    const { batchId, createdRecords } = act.importBatch('Sample', checked.ready, checked.rows.length, issues, 'Riley Chen')
    expect(createdRecords).toBe(true)
    expect(state().properties).toHaveLength(homes + 5)
    const imported = state().properties.filter((p) => p.orgId === act.MIGRATION_ORG)
    expect(imported).toHaveLength(5)
    expect(state().tenancies.filter((t) => t.orgId === act.MIGRATION_ORG && t.status === 'active')).toHaveLength(5)
    expect(state().migrations.find((m) => m.id === batchId)).toMatchObject({ rows: 8, imported: 5, invitesSent: 0, status: 'imported' })

    // The same file a second time finds every home already on the platform.
    const again = checkRentRoll(SAMPLE_CSV, pack, state().seededOn, new Set(state().properties.map((p) => addressKey(p.address.line1, p.address.suburb))))
    expect(again.ready).toHaveLength(0)

    act.sendFoundingInvites(batchId, 'Riley Chen')
    expect(state().migrations.find((m) => m.id === batchId)).toMatchObject({ invitesSent: 5, status: 'invited' })
    expect(lastAudit().action).toBe('Sent founding invites (simulated)')
  })

  it('refuses a file with a column missing, and reads day-first dates', async () => {
    const { checkRentRoll, readDate } = await import('./migration/validate')
    const { resolvePack } = await import('@/domain/jurisdictions')
    const checked = checkRentRoll('address,suburb\n1 Test Street,Stoke', resolvePack('NZ'), '2026-11-14', new Set())
    expect(checked.rows).toHaveLength(0)
    expect(checked.missingColumns).toContain('weekly_rent')
    expect(readDate('14/03/2025')).toBe('2025-03-14')
    expect(readDate('2025-02-30')).toBeNull()
    expect(readDate('next week')).toBeNull()
  })
})
