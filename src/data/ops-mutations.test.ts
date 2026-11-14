/**
 * The decisions behind Inspections, Services and Settings, run against the
 * real store. The store expects a browser, so the two browser stores it
 * touches at import are stood in for before anything is loaded.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '@/domain/db'
import { DEMO } from '@/domain/seed'
import { resolvePack } from '@/domain/jurisdictions'
import { addDays, dateOf, today } from '@/domain/rules/calendar'

type Ops = typeof import('./ops-mutations')
type Store = typeof import('./store')
type Core = typeof import('./mutations')

let ops: Ops
let store: Store
let core: Core
const pack = resolvePack('NZ')
const state = (): Db => store.db.get()
const HANA = { id: DEMO.landlord, fullName: 'Hana Whitaker' }

beforeAll(async () => {
  const kept = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => kept.get(k) ?? null,
    setItem: (k: string, v: string) => void kept.set(k, v),
    removeItem: (k: string) => void kept.delete(k),
  })
  // idb-keyval opens its database on import; nothing here reads a photo back.
  vi.stubGlobal('indexedDB', { open: () => ({}) })
  store = await import('./store')
  core = await import('./mutations')
  ops = await import('./ops-mutations')
})

beforeEach(() => {
  store.useStore.getState().resetDemo()
})

describe('booking and cancelling an inspection', () => {
  it('opens one proposal per home and drops it again if nothing was booked', () => {
    const first = ops.proposeInspection('p_kowhai')!
    expect(ops.proposeInspection('p_kowhai')).toBe(first)
    const row = state().inspections.find((i) => i.id === first)!
    expect(row).toMatchObject({ status: 'proposed', type: 'routine', tenancyId: 't_kowhai', orgId: DEMO.org })
    expect(row.rooms.map((r) => r.name)).toContain('Bedroom 4')
    ops.withdrawProposal(first)
    expect(state().inspections.some((i) => i.id === first)).toBe(false)
  })

  it('never drops an inspection that has been booked', () => {
    core.scheduleInspection('in_totara_next', addDays(today(), 5), 11, 'diy', pack)
    ops.withdrawProposal('in_totara_next')
    expect(state().inspections.find((i) => i.id === 'in_totara_next')?.status).toBe('notice_served')
  })

  it('cancelling withdraws the notice and stands the inspector down', () => {
    const on = addDays(today(), 5)
    core.scheduleInspection('in_totara_next', on, 11, 'delegated', pack)
    const task = state().fieldTasks.find((t) => t.inspectionId === 'in_totara_next')!
    expect(task.status).toBe('accepted')

    expect(ops.cancelInspection('in_totara_next').ok).toBe(true)
    expect(state().inspections.find((i) => i.id === 'in_totara_next')?.status).toBe('cancelled')
    expect(state().fieldTasks.find((t) => t.id === task.id)?.status).toBe('cancelled')
    expect(state().notices.find((n) => n.type === 'entry_inspection' && n.effectiveOn === on)?.status).toBe('withdrawn')
  })

  it('cancelling the inspector’s job cancels the inspection it was for', () => {
    core.scheduleInspection('in_totara_next', addDays(today(), 5), 11, 'delegated', pack)
    const task = state().fieldTasks.find((t) => t.inspectionId === 'in_totara_next')!
    expect(ops.cancelFieldTask(task.id).ok).toBe(true)
    expect(state().inspections.find((i) => i.id === 'in_totara_next')?.status).toBe('cancelled')
    expect(ops.cancelFieldTask(task.id).ok).toBe(false)
  })

  it('rebooking closes the old booking and opens a fresh proposal', () => {
    core.scheduleInspection('in_totara_next', addDays(today(), 5), 11, 'diy', pack)
    const fresh = ops.rebookInspection('in_totara_next')!
    expect(fresh).not.toBe('in_totara_next')
    expect(state().inspections.find((i) => i.id === 'in_totara_next')?.status).toBe('cancelled')
    expect(state().inspections.find((i) => i.id === fresh)?.status).toBe('proposed')
  })
})

describe('walking through a home', () => {
  const start = () => {
    core.scheduleInspection('in_totara_next', addDays(today(), 5), 11, 'diy', pack)
    ops.demoStartNow('in_totara_next', pack)
    return state().inspections.find((i) => i.id === 'in_totara_next')!
  }

  it('records nothing against an inspection that has not been booked', () => {
    ops.saveRoom('in_totara_next', 0, { score: 4 })
    expect(state().inspections.find((i) => i.id === 'in_totara_next')?.rooms[0].score).toBeUndefined()
  })

  it('the demo shortcut makes today the named day, with a notice that has run', () => {
    const i = start()
    expect(i.status).toBe('in_progress')
    expect(dateOf(i.scheduledFor!)).toBe(today())
    expect(dateOf(i.noticeServedAt!) <= addDays(today(), -2)).toBe(true)
    const notice = state().notices.find((n) => n.tenancyId === 't_totara' && n.type === 'entry_inspection')!
    expect(notice.effectiveOn).toBe(today())
    expect(notice.servedOn).toBe(dateOf(i.noticeServedAt!))
  })

  it('saves each room as it is entered and refuses to finish with a room unscored', () => {
    const i = start()
    ops.saveRoom(i.id, 0, { score: 5, note: '  ' })
    ops.saveRoom(i.id, 1, { score: 2, flags: ['damage'], note: 'Scorch mark on the carpet by the heater.' })
    ops.addRoomPhoto(i.id, 1, 'ph_1')
    const rooms = state().inspections.find((x) => x.id === i.id)!.rooms
    expect(rooms[0]).toMatchObject({ score: 5, note: undefined })
    expect(rooms[1]).toMatchObject({ score: 2, flags: ['damage'], photoIds: ['ph_1'] })

    const refused = ops.completeInspection(i.id, '', false)
    expect(refused.ok).toBe(false)
    expect(refused.reason).toContain('no score yet')
    expect(state().inspections.find((x) => x.id === i.id)?.status).toBe('in_progress')
  })

  it('finishing writes the overall score and a summary, files the report and logs the alarm test', () => {
    const i = start()
    const docsBefore = state().docs.length
    i.rooms.forEach((_, n) => ops.saveRoom(i.id, n, { score: n === 0 ? 3 : 4 }))
    expect(ops.completeInspection(i.id, '', true).ok).toBe(true)

    const done = state().inspections.find((x) => x.id === i.id)!
    expect(done.status).toBe('completed')
    expect(done.overallScore).toBe(3.9)
    expect(done.summary).toContain('9 rooms checked')
    expect(dateOf(done.completedAt!)).toBe(today())
    expect(state().docs).toHaveLength(docsBefore + 1)
    expect(state().docs[0]).toMatchObject({ kind: 'inspection_report', propertyId: 'p_totara' })
    expect(state().properties.find((p) => p.id === 'p_totara')?.smokeAlarms.lastChecked).toBe(today())
    // A finished report is closed to further edits.
    ops.saveRoom(i.id, 0, { score: 1 })
    expect(state().inspections.find((x) => x.id === i.id)?.rooms[0].score).toBe(3)
  })

  it('raises a repair for a flagged room through the ordinary sorter', () => {
    const i = start()
    i.rooms.forEach((_, n) => ops.saveRoom(i.id, n, { score: 4 }))
    ops.saveRoom(i.id, 3, { score: 2, flags: ['damp'], note: 'Black mould along the window sill.' })
    ops.completeInspection(i.id, '', false)
    const id = ops.raiseRepairFromRoom(i.id, 3, DEMO.landlord)!
    const ticket = state().tickets.find((t) => t.id === id)!
    expect(ticket).toMatchObject({
      propertyId: 'p_totara',
      room: 'Bathroom',
      title: 'Bathroom: damp or mould',
      reportedBy: DEMO.landlord,
    })
    expect(ticket.description).toContain('Black mould')
    // Sent, quoted, or left with the landlord when the network has no such trade: the sorter's call, not ours.
    expect(['approved', 'quote_requested', 'submitted']).toContain(ticket.status)
    expect(ticket.events[0].text).toBe('You logged this yourself.')
  })
})

describe('booking someone local', () => {
  const tomorrow = () => addDays(today(), 1)
  const viewing = () => ({
    type: 'viewing' as const,
    propertyId: 'p_totara',
    providerId: 'pr_manaia',
    date: tomorrow(),
    hour: 17,
    tenantsAgreed: true,
  })

  it('books a viewing at the fixed price, with the platform’s share worked out', () => {
    const result = ops.bookFieldTask(DEMO.org, viewing())
    expect(result.ok).toBe(true)
    const task = state().fieldTasks.find((t) => t.id === result.id)!
    expect(task).toMatchObject({
      type: 'viewing',
      price: core.FIELD_PRICES.viewing,
      status: 'requested',
      providerId: 'pr_manaia',
      orgId: DEMO.org,
    })
    expect(task.platformFee).toBe(Math.round((core.FIELD_PRICES.viewing * core.PLATFORM_FEE_PCT) / 100))
    expect(dateOf(task.scheduledFor!)).toBe(tomorrow())
  })

  it('will not book a viewing of a lived-in home until the tenants have agreed', () => {
    const before = state().fieldTasks.length
    expect(ops.bookFieldTask(DEMO.org, { ...viewing(), tenantsAgreed: false })).toMatchObject({
      ok: false,
      field: 'consent',
    })
    expect(state().fieldTasks).toHaveLength(before)
    // The empty, listed home has nobody to ask.
    expect(ops.bookFieldTask(DEMO.org, { ...viewing(), propertyId: 'p_harbour', tenantsAgreed: false }).ok).toBe(true)
  })

  it('refuses a day that has gone, a person who is not vetted, and a person who does not do the job', () => {
    expect(ops.checkFieldBooking({ ...viewing(), date: today() })).toMatchObject({ ok: false, field: 'date' })
    expect(ops.checkFieldBooking({ ...viewing(), type: 'entry_exit_report', providerId: 'pr_oliver' })).toMatchObject({
      ok: false,
      field: 'provider',
    })
    expect(ops.checkFieldBooking({ ...viewing(), providerId: 'pr_kate' })).toMatchObject({
      ok: false,
      field: 'provider',
    })
    expect(ops.checkFieldBooking({ ...viewing(), type: 'tribunal_representation', providerId: 'pr_penguin' }).ok).toBe(
      true,
    )
  })

  it('sends a routine inspection to Inspections, where its notice is worked out', () => {
    expect(ops.checkFieldBooking({ ...viewing(), type: 'routine_inspection' }).ok).toBe(false)
  })
})

describe('settings', () => {
  it('will not put five homes on a plan that covers one', () => {
    expect(ops.choosePlan(DEMO.org, 'ledger_free', HANA.fullName).ok).toBe(false)
    expect(state().orgs.find((o) => o.id === DEMO.org)?.plan).toBe('portfolio_trust')
    expect(ops.choosePlan(DEMO.org, 'autopilot_pro', HANA.fullName).ok).toBe(true)
    expect(state().orgs.find((o) => o.id === DEMO.org)?.plan).toBe('autopilot_pro')
  })

  it('never lets autopilot spend more than one trustee could approve alone', () => {
    expect(ops.setAutopilotLimit('p_totara', 1000, HANA.fullName).ok).toBe(true)
    const refused = ops.setAutopilotLimit('p_totara', 1050, HANA.fullName)
    expect(refused.ok).toBe(false)
    expect(refused.reason).toContain('Whitaker Family Trust')
    expect(state().properties.find((p) => p.id === 'p_totara')?.sinkingFund.autoApproveLimit).toBe(1000)
    // The home Hana owns in her own name has no second approver, so no ceiling.
    expect(ops.setAutopilotLimit('p_ngaio', 5000, HANA.fullName).ok).toBe(true)
    expect(ops.setAutopilotLimit('p_ngaio', -50, HANA.fullName).ok).toBe(false)
  })

  it('will not set a second approval below what autopilot may already spend', () => {
    const refused = ops.setDualApproval('ent_trust', 300, HANA.fullName)
    expect(refused.ok).toBe(false)
    const dearest = state()
      .properties.filter((p) => p.entityId === 'ent_trust')
      .sort((a, b) => b.sinkingFund.autoApproveLimit - a.sinkingFund.autoApproveLimit)[0]
    expect(dearest.sinkingFund.autoApproveLimit).toBe(400)
    expect(refused.reason).toContain(dearest.address.line1)
    expect(ops.setDualApproval('ent_trust', 400, HANA.fullName).ok).toBe(true)
    expect(state().entities.find((e) => e.id === 'ent_trust')?.dualApprovalThreshold).toBe(400)
    expect(ops.setDualApproval('ent_trust', undefined, HANA.fullName).ok).toBe(true)
    expect(state().entities.find((e) => e.id === 'ent_trust')?.dualApprovalThreshold).toBeUndefined()
  })

  it('has one accountant seat, and keeps the owner’s access', () => {
    expect(
      ops.invitePerson(DEMO.org, { fullName: 'Sam Ito', email: 'sam@example.com', role: 'advisor' }, HANA.fullName),
    ).toMatchObject({ ok: false, field: 'role' })
    expect(
      ops.invitePerson(DEMO.org, { fullName: 'Sam Ito', email: 'not an email', role: 'co_owner' }, HANA.fullName),
    ).toMatchObject({ ok: false, field: 'email' })
    expect(
      ops.invitePerson(DEMO.org, { fullName: 'Sam Ito', email: 'Sam@Example.com', role: 'co_owner' }, HANA.fullName).ok,
    ).toBe(true)
    const sam = state().users.find((u) => u.email === 'sam@example.com')!
    expect(sam).toMatchObject({ status: 'invited', role: 'co_owner', orgId: DEMO.org })

    expect(ops.setAccess(DEMO.landlord, 'deactivated', { id: 'u_tom', fullName: 'Tom Whitaker' }).ok).toBe(false)
    expect(ops.setAccess('u_tom', 'deactivated', { id: 'u_tom', fullName: 'Tom Whitaker' }).ok).toBe(false)
    expect(ops.setAccess('u_priya', 'deactivated', HANA).ok).toBe(true)
    // With the seat free it can be given to someone else, and then not handed back to the first.
    expect(
      ops.invitePerson(DEMO.org, { fullName: 'Ana Reid', email: 'ana@example.com', role: 'advisor' }, HANA.fullName).ok,
    ).toBe(true)
    expect(ops.setAccess('u_priya', 'active', HANA).ok).toBe(false)

    ops.withdrawInvitation(sam.id, HANA.fullName)
    expect(state().users.some((u) => u.id === sam.id)).toBe(false)
  })

  it('sends feedback to the team’s inbox, and asks for a sentence', () => {
    expect(ops.sendLoopFeedback({ id: DEMO.landlord, orgId: DEMO.org }, 'idea', 'Services', 'ok').ok).toBe(false)
    expect(
      ops.sendLoopFeedback(
        { id: DEMO.landlord, orgId: DEMO.org },
        'bug',
        'Inspections',
        'The room list jumps when I add a photo.',
      ).ok,
    ).toBe(true)
    expect(state().feedback[0]).toMatchObject({
      portal: 'loop',
      kind: 'bug',
      area: 'Inspections',
      sentiment: 'negative',
      status: 'new',
      orgId: DEMO.org,
    })
  })

  it('resetting puts the demo back as it started', () => {
    ops.choosePlan(DEMO.org, 'autopilot_pro', HANA.fullName)
    ops.setAutopilotLimit('p_totara', 100, HANA.fullName)
    ops.resetDemoData()
    expect(state().orgs.find((o) => o.id === DEMO.org)?.plan).toBe('portfolio_trust')
    expect(state().properties.find((p) => p.id === 'p_totara')?.sinkingFund.autoApproveLimit).toBe(350)
  })
})
