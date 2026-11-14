/**
 * What a landlord can do from Inspections, Services and Settings.
 *
 * Same contract as `mutations.ts`: one function is one decision, it reads the
 * records as they are now, refuses in a sentence when it has to, and leaves a
 * line behind where someone else needs to know. In production each is a server
 * action that runs the same checks again.
 */
import type {
  Feedback,
  FieldTask,
  ID,
  Inspection,
  InspectionRoom,
  ISODate,
  LegalEntity,
  PlanTier,
  Property,
  User,
} from '@/domain/types'
import type { JurisdictionPack } from '@/domain/jurisdictions/types'
import { regionOf } from '@/domain/jurisdictions'
import { PLAN } from '@/domain/finance'
import { canDo, serviceOf, type FieldService } from '@/domain/fieldServices'
import { draftSummary, lastCompleted, overallScore, repairBrief, roomsFor, unscoredRooms } from '@/domain/inspections'
import { addDays, dateOf, fmtDate, today } from '@/domain/rules/calendar'
import { calendarFor, deemedReceived, type Verdict } from '@/domain/rules/core'
import { listOf, money, plural } from '@/domain/rules/format'
import { inspectionWindow } from '@/domain/rules/tenancy'
import { at } from '@/domain/seed'
import { deletePhoto } from './photos'
import { FIELD_PRICES, logRepair, logSmokeAlarmTest, PLATFORM_FEE_PCT, setSinkingFund } from './mutations'
import { audit, db, newId, nowIso, useStore, type Prefs } from './store'

const OK: Verdict = { ok: true }
const refuse = (reason: string, fix?: string): Verdict => ({ ok: false, reason, fix })

const hourLabel = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'pm' : 'am'}`

/** A stable colour for someone who has no avatar hue on record. */
export function hueFor(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

/* ─────────────────────────────── inspections ────────────────────────────── */

function inspectionOf(id: ID): Inspection | undefined {
  return db.get().inspections.find((i) => i.id === id)
}

/**
 * Opens a routine inspection for a home so a day can be booked. It is only a
 * proposal: nothing is served until `scheduleInspection` runs. Returns the id,
 * reusing a proposal that is already waiting.
 */
export function proposeInspection(propertyId: ID): ID | undefined {
  const state = db.get()
  const property = state.properties.find((p) => p.id === propertyId)
  if (!property) return undefined
  const waiting = state.inspections.find((i) => i.propertyId === propertyId && i.status === 'proposed')
  if (waiting) return waiting.id
  const tenancy = state.tenancies.find(
    (t) => t.propertyId === propertyId && (t.status === 'active' || t.status === 'notice_given'),
  )
  const id = newId('in')
  db.insert('inspections', {
    id,
    orgId: property.orgId,
    propertyId,
    tenancyId: tenancy?.id,
    type: 'routine',
    status: 'proposed',
    mode: 'diy',
    rooms: roomsFor(property.beds),
  })
  return id
}

/** Drops a proposal nobody booked. Anything already booked is left alone. */
export function withdrawProposal(inspectionId: ID): void {
  if (inspectionOf(inspectionId)?.status === 'proposed') db.remove('inspections', inspectionId)
}

function cancelBooking(i: Inspection): void {
  const state = db.get()
  db.update('inspections', i.id, { status: 'cancelled' })
  const on = i.scheduledFor ? dateOf(i.scheduledFor) : undefined
  for (const n of state.notices) {
    if (n.tenancyId === i.tenancyId && n.type === 'entry_inspection' && n.status === 'served' && n.effectiveOn === on) {
      db.update('notices', n.id, { status: 'withdrawn' })
    }
  }
  for (const t of state.fieldTasks) {
    if (t.inspectionId === i.id && (t.status === 'requested' || t.status === 'accepted' || t.status === 'scheduled')) {
      db.update('fieldTasks', t.id, { status: 'cancelled' })
    }
  }
}

/** Calls off a booked inspection: the notice is withdrawn and any inspector booked for it is stood down. */
export function cancelInspection(inspectionId: ID): Verdict {
  const i = inspectionOf(inspectionId)
  if (!i) return refuse('That inspection can no longer be found.')
  if (i.status === 'proposed') {
    db.remove('inspections', inspectionId)
    return OK
  }
  if (i.status === 'in_progress')
    return refuse(
      'This walk-through has already started.',
      'Finish it in the studio so the scores you have recorded are kept.',
    )
  if (i.status !== 'notice_served') return refuse('This inspection is already closed.')
  cancelBooking(i)
  return OK
}

/** The named day went by. Closes that booking and opens a fresh proposal, so a new notice can be served. */
export function rebookInspection(inspectionId: ID): ID | undefined {
  const i = inspectionOf(inspectionId)
  if (!i) return undefined
  if (i.status === 'notice_served') cancelBooking(i)
  return proposeInspection(i.propertyId)
}

function patchRoom(inspectionId: ID, index: number, change: (room: InspectionRoom) => InspectionRoom): void {
  const i = inspectionOf(inspectionId)
  if (!i || (i.status !== 'notice_served' && i.status !== 'in_progress') || !i.rooms[index]) return
  db.update('inspections', inspectionId, {
    // The first thing recorded is the moment the walk-through began.
    status: 'in_progress',
    rooms: i.rooms.map((r, n) => (n === index ? change(r) : r)),
  })
}

/** Records a score, a note or flags for one room, the moment they are entered. */
export function saveRoom(
  inspectionId: ID,
  index: number,
  patch: Partial<Pick<InspectionRoom, 'score' | 'note' | 'flags'>>,
): void {
  patchRoom(inspectionId, index, (room) => {
    const next = { ...room, ...patch }
    if ('note' in patch) next.note = patch.note?.trim() ? patch.note : undefined
    return next
  })
}

export function addRoomPhoto(inspectionId: ID, index: number, photoId: ID): void {
  patchRoom(inspectionId, index, (room) => ({ ...room, photoIds: [...room.photoIds, photoId] }))
}

/** Takes a photo off the room and off the device. */
export function removeRoomPhoto(inspectionId: ID, index: number, photoId: ID): void {
  patchRoom(inspectionId, index, (room) => ({ ...room, photoIds: room.photoIds.filter((p) => p !== photoId) }))
  void deletePhoto(photoId)
}

const REPORT_NAME: Record<Inspection['type'], string> = {
  routine: 'Routine inspection report.pdf',
  entry: 'Entry condition report.pdf',
  exit: 'Exit condition report.pdf',
}

/**
 * Finishes a walk-through: the overall score is the mean of the rooms, the
 * report is filed with the home's records, and — only if every alarm was
 * tested and sounded — today goes down as the last smoke alarm test.
 */
export function completeInspection(inspectionId: ID, summary: string, alarmsTested: boolean): Verdict {
  const i = inspectionOf(inspectionId)
  if (!i) return refuse('That inspection can no longer be found.')
  if (i.status !== 'in_progress' && i.status !== 'notice_served') return refuse('This inspection is not open.')
  const missing = unscoredRooms(i.rooms)
  if (missing.length) {
    return refuse(
      `${plural(missing.length, 'room')} ${missing.length === 1 ? 'has' : 'have'} no score yet: ${listOf(missing)}.`,
      'A report needs a score for every room.',
    )
  }
  const photos = i.rooms.reduce((a, r) => a + r.photoIds.length, 0)
  db.update('inspections', inspectionId, {
    status: 'completed',
    completedAt: nowIso(),
    overallScore: overallScore(i.rooms),
    summary: summary.trim() || draftSummary(i.rooms),
  })
  db.insert('docs', {
    id: newId('doc'),
    orgId: i.orgId,
    propertyId: i.propertyId,
    tenancyId: i.tenancyId,
    name: REPORT_NAME[i.type],
    kind: 'inspection_report',
    addedAt: nowIso(),
    sizeKb: 60 + photos * 140,
    source: 'generated',
  })
  if (alarmsTested) logSmokeAlarmTest(i.propertyId)
  return OK
}

/**
 * Demo only. A demo cannot wait two days for a notice to run, so this moves a
 * booked inspection and its notice back in time until today is the named day
 * and the notice has run, then starts the walk-through. The screen that offers
 * it says so; nothing here runs in the real product.
 */
export function demoStartNow(inspectionId: ID, pack: JurisdictionPack): void {
  const state = db.get()
  const i = state.inspections.find((x) => x.id === inspectionId)
  if (!i || i.status !== 'notice_served' || i.mode !== 'diy') return
  const property = state.properties.find((p) => p.id === i.propertyId)
  const cal = calendarFor(pack, property ? regionOf(property.address.city) : undefined)
  const day = today()
  const last = lastCompleted(state.inspections, i.propertyId, { routineOnly: true })
  const lastOn = last?.completedAt ? dateOf(last.completedAt) : undefined

  // The latest day a notice could have been emailed for today to be a lawful day.
  let served = addDays(day, -2)
  for (let back = 2; back <= 14; back++) {
    served = addDays(day, -back)
    if (inspectionWindow(pack, cal, { sentOn: served, method: 'email', hour: 9 }, lastOn).earliest <= day) break
  }
  const hours = pack.rules['entry.hours'].value
  const now = new Date().getHours()
  const hour = hours ? Math.min(Math.max(now, hours.from), hours.to - 1) : now
  const was = i.scheduledFor ? dateOf(i.scheduledFor) : undefined

  db.update('inspections', inspectionId, {
    status: 'in_progress',
    noticeServedAt: at(served, 9),
    scheduledFor: at(day, hour),
  })
  const notice = state.notices.find(
    (n) =>
      n.tenancyId === i.tenancyId && n.type === 'entry_inspection' && n.status === 'served' && n.effectiveOn === was,
  )
  if (notice) {
    db.update('notices', notice.id, {
      createdAt: at(served, 9),
      servedOn: served,
      deemedReceivedOn: deemedReceived(pack, cal, served, 'email', 9).received,
      effectiveOn: day,
      title: `Routine inspection on ${fmtDate(day)}`,
      body: `A routine inspection of ${property?.address.line1 ?? 'the property'} will take place on ${fmtDate(day, { year: 'always' })} at ${hourLabel(hour)}.`,
    })
  }
}

/**
 * Opens a repair for a room the inspection flagged. It goes through the same
 * sorter as any fault a landlord logs, so urgency and dispatch follow the same
 * rules; the room and its photos travel with it.
 */
export function raiseRepairFromRoom(inspectionId: ID, index: number, reporterId: ID): ID | undefined {
  const i = inspectionOf(inspectionId)
  const room = i?.rooms[index]
  if (!i || !room) return undefined
  const brief = repairBrief(room, i)
  const id = logRepair({ orgId: i.orgId, propertyId: i.propertyId, reporterId, ...brief })
  if (id) db.update('tickets', id, { room: room.name, photoIds: room.photoIds })
  return id
}

/* ──────────────────────────────── services ──────────────────────────────── */

export interface FieldBooking {
  type: FieldService
  propertyId: ID
  providerId: ID
  date: ISODate
  hour: number
  /** For a viewing of a home someone lives in: the landlord confirms the tenants agreed to the time. */
  tenantsAgreed: boolean
}

export type BookingField = 'property' | 'consent' | 'date' | 'provider'

/** Whether a job can be booked as described, and if not, which answer is the problem. */
export function checkFieldBooking(
  b: Partial<FieldBooking> & Pick<FieldBooking, 'type'>,
): Verdict & { field?: BookingField } {
  const state = db.get()
  const service = serviceOf(b.type)
  if (b.type === 'routine_inspection') {
    return {
      ...refuse(
        'A routine inspection is booked with its notice.',
        'Book it from Inspections, where the lawful days are worked out.',
      ),
      field: 'property',
    }
  }
  const property = state.properties.find((p) => p.id === b.propertyId)
  if (!property) return { ...refuse('Choose the home this is for.'), field: 'property' }

  const lived = state.tenancies.some(
    (t) => t.propertyId === property.id && (t.status === 'active' || t.status === 'notice_given'),
  )
  if (b.type === 'viewing' && lived && !b.tenantsAgreed) {
    return {
      ...refuse(
        'The tenants have not agreed to this viewing yet.',
        'Ask them first. Once they have said yes to the time, tick the box and book it.',
      ),
      field: 'consent',
    }
  }
  if (!b.date) return { ...refuse('Choose a day.'), field: 'date' }
  if (b.date <= today()) {
    return {
      ...refuse(
        'Pick a day from tomorrow on.',
        'That leaves time for the job to be accepted. This is how Loop works, not a legal rule.',
      ),
      field: 'date',
    }
  }
  const provider = state.providers.find((p) => p.id === b.providerId)
  if (!provider) return { ...refuse(`Choose who does the ${service.name.toLowerCase()}.`), field: 'provider' }
  if (!canDo(provider, b.type))
    return { ...refuse(`${provider.name} does not take this kind of job.`), field: 'provider' }
  if (provider.vetting !== 'vetted') {
    return {
      ...refuse(
        `${provider.name} cannot take jobs yet.`,
        'Only people the Loop team has finished vetting can be booked.',
      ),
      field: 'provider',
    }
  }
  return OK
}

/** Books a job with a vetted local person. Nothing is charged: payments are simulated in the prototype. */
export function bookFieldTask(orgId: ID, b: FieldBooking): Verdict & { id?: ID } {
  const verdict = checkFieldBooking(b)
  if (!verdict.ok) return verdict
  const price = FIELD_PRICES[b.type]
  const id = newId('ft')
  db.insert('fieldTasks', {
    id,
    orgId,
    propertyId: b.propertyId,
    type: b.type,
    price,
    platformFee: Math.round((price * PLATFORM_FEE_PCT) / 100),
    status: 'requested',
    providerId: b.providerId,
    requestedAt: nowIso(),
    scheduledFor: at(b.date, b.hour),
  })
  return { ok: true, id }
}

/** Calls off a job that has not happened yet. A delegated inspection is called off with it. */
export function cancelFieldTask(taskId: ID): Verdict {
  const state = db.get()
  const task: FieldTask | undefined = state.fieldTasks.find((t) => t.id === taskId)
  if (!task) return refuse('That booking can no longer be found.')
  if (task.status !== 'requested' && task.status !== 'accepted' && task.status !== 'scheduled') {
    return refuse('This job is already finished or cancelled.')
  }
  const inspection = state.inspections.find((i) => i.id === task.inspectionId)
  if (inspection?.status === 'notice_served') cancelBooking(inspection)
  db.update('fieldTasks', taskId, { status: 'cancelled' })
  return OK
}

/* ──────────────────────────────── settings ──────────────────────────────── */

/** Whether a plan fits a portfolio of this many homes. Loop's own terms, not law. */
export function checkPlan(plan: PlanTier, homes: number): Verdict {
  const p = PLAN[plan]
  if (p.extraProperty === 0 && homes > p.includes) {
    return refuse(`${p.name} covers ${plural(p.includes, 'home')}. You have ${homes}.`)
  }
  return OK
}

export function choosePlan(orgId: ID, plan: PlanTier, by: string): Verdict {
  const state = db.get()
  const org = state.orgs.find((o) => o.id === orgId)
  if (!org) return refuse('This organisation can no longer be found.')
  const verdict = checkPlan(plan, state.properties.filter((p) => p.orgId === orgId).length)
  if (!verdict.ok) return verdict
  if (org.plan === plan) return OK
  db.update('orgs', orgId, { plan })
  audit(by, 'Changed plan', org.name, `${PLAN[org.plan].name} to ${PLAN[plan].name}. Billing is simulated.`, orgId)
  return OK
}

/**
 * Whether Loop may spend this much at a home without asking. It may never
 * spend alone what one owner cannot approve alone.
 */
export function checkAutopilotLimit(amount: number, entity: LegalEntity | undefined): Verdict {
  if (!Number.isFinite(amount) || amount < 0) return refuse('The limit has to be zero or more.')
  const threshold = entity?.dualApprovalThreshold
  if (entity && threshold !== undefined && amount > threshold) {
    return refuse(
      `${entity.name} needs a second approval for anything above ${money(threshold)}.`,
      `Loop cannot spend on its own what one owner cannot approve alone. Keep this limit at ${money(threshold)} or less, or raise that threshold first.`,
    )
  }
  return OK
}

export function setAutopilotLimit(propertyId: ID, amount: number, by: string): Verdict {
  const state = db.get()
  const property = state.properties.find((p) => p.id === propertyId)
  if (!property) return refuse('That home can no longer be found.')
  const verdict = checkAutopilotLimit(
    amount,
    state.entities.find((e) => e.id === property.entityId),
  )
  if (!verdict.ok) return verdict
  if (amount === property.sinkingFund.autoApproveLimit) return OK
  setSinkingFund(propertyId, { autoApproveLimit: amount })
  audit(
    by,
    'Changed an autopilot limit',
    property.address.line1,
    `${money(property.sinkingFund.autoApproveLimit)} to ${money(amount)}.`,
    property.orgId,
  )
  return OK
}

/** Whether an entity's second-approval threshold makes sense beside the limits autopilot already has. */
export function checkDualApproval(
  amount: number | undefined,
  homes: Pick<Property, 'address' | 'sinkingFund'>[],
): Verdict {
  if (amount === undefined) return OK
  if (!Number.isFinite(amount) || amount <= 0)
    return refuse('Enter the amount above which a second approval is needed.')
  const top = [...homes].sort((a, b) => b.sinkingFund.autoApproveLimit - a.sinkingFund.autoApproveLimit)[0]
  if (top && top.sinkingFund.autoApproveLimit > amount) {
    const limit = money(top.sinkingFund.autoApproveLimit)
    return refuse(
      `Loop may already spend up to ${limit} at ${top.address.line1} without asking.`,
      `A second approval below that would never be asked for. Lower that home’s limit first, or choose ${limit} or more.`,
    )
  }
  return OK
}

/** Sets, or with `undefined` switches off, the spend above which a second owner must approve. */
export function setDualApproval(entityId: ID, amount: number | undefined, by: string): Verdict {
  const state = db.get()
  const entity = state.entities.find((e) => e.id === entityId)
  if (!entity) return refuse('That owner can no longer be found.')
  const verdict = checkDualApproval(
    amount,
    state.properties.filter((p) => p.entityId === entityId),
  )
  if (!verdict.ok) return verdict
  db.update('entities', entityId, { dualApprovalThreshold: amount })
  audit(
    by,
    'Changed a second-approval threshold',
    entity.name,
    amount === undefined ? 'Switched off.' : `Now ${money(amount)}.`,
    entity.orgId,
  )
  return OK
}

export interface Invitation {
  fullName: string
  email: string
  role: 'co_owner' | 'advisor'
}

/** Whether someone can be given access. The accountant seat is one seat. */
export function checkInvitation(orgId: ID, inv: Invitation): Verdict & { field?: 'name' | 'email' | 'role' } {
  const people = db.get().users.filter((u) => u.orgId === orgId)
  if (inv.fullName.trim().length < 2) return { ...refuse('Enter their name.'), field: 'name' }
  const email = inv.email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ...refuse('Enter an email address, like name@example.com.'), field: 'email' }
  const same = people.find((u) => u.email.toLowerCase() === email && u.status !== 'deactivated')
  if (same) return { ...refuse(`${same.fullName} already has access with that address.`), field: 'email' }
  const seat = people.find((u) => u.role === 'advisor' && u.status !== 'deactivated')
  if (inv.role === 'advisor' && seat) {
    return {
      ...refuse(
        `The accountant seat is taken by ${seat.fullName}.`,
        'A plan includes one accountant seat. Remove their access first to give it to someone else.',
      ),
      field: 'role',
    }
  }
  return OK
}

/** Records an invitation. No email is sent in the prototype; the screen says so. */
export function invitePerson(orgId: ID, inv: Invitation, by: string): Verdict {
  const verdict = checkInvitation(orgId, inv)
  if (!verdict.ok) return verdict
  const now = nowIso()
  const fullName = inv.fullName.trim()
  db.insert('users', {
    id: newId('u'),
    orgId,
    role: inv.role,
    fullName,
    email: inv.email.trim().toLowerCase(),
    phone: '',
    identityVerified: false,
    defaultPortal: 'loop',
    onboardingStep: 0,
    createdAt: now,
    lastActiveAt: now,
    status: 'invited',
    hue: hueFor(fullName),
  })
  audit(by, 'Invited someone', fullName, inv.role === 'advisor' ? 'Accountant seat, read-only.' : 'Co-owner.', orgId)
  return OK
}

/** Removes or restores someone's access. The owner's access cannot be removed, and nobody removes their own. */
export function setAccess(userId: ID, access: 'active' | 'deactivated', by: Pick<User, 'id' | 'fullName'>): Verdict {
  const state = db.get()
  const user = state.users.find((u) => u.id === userId)
  if (!user?.orgId) return refuse('That person can no longer be found.')
  const org = state.orgs.find((o) => o.id === user.orgId)
  if (access === 'deactivated') {
    if (org?.ownerUserId === userId)
      return refuse(`${user.fullName} owns this organisation.`, 'An organisation always has an owner.')
    if (by.id === userId) return refuse('You cannot remove your own access.', 'Ask the owner to do it.')
  }
  if (access === 'active' && user.role === 'advisor') {
    const seat = state.users.find(
      (u) => u.orgId === user.orgId && u.role === 'advisor' && u.status !== 'deactivated' && u.id !== userId,
    )
    if (seat) return refuse(`The accountant seat is taken by ${seat.fullName}.`, 'Remove their access first.')
  }
  db.update('users', userId, { status: access })
  audit(by.fullName, access === 'active' ? 'Restored access' : 'Removed access', user.fullName, undefined, user.orgId)
  return OK
}

export function withdrawInvitation(userId: ID, by: string): void {
  const user = db.get().users.find((u) => u.id === userId)
  if (!user || user.status !== 'invited') return
  db.remove('users', userId)
  audit(by, 'Withdrew an invitation', user.fullName, undefined, user.orgId)
}

/** A message to the Loop team. It lands in the team console's feedback inbox. */
export function sendLoopFeedback(
  from: Pick<User, 'id' | 'orgId'>,
  kind: Feedback['kind'],
  area: string,
  text: string,
): Verdict {
  if (text.trim().length < 8) return refuse('Write a sentence, so the team knows what you mean.')
  const sentiment: Feedback['sentiment'] =
    kind === 'praise' ? 'positive' : kind === 'bug' || kind === 'complaint' ? 'negative' : 'neutral'
  db.insert('feedback', {
    id: newId('fb'),
    orgId: from.orgId,
    userId: from.id,
    portal: 'loop',
    screen: 'Settings',
    kind,
    text: text.trim(),
    sentiment,
    area,
    status: 'new',
    votes: 0,
    createdAt: nowIso(),
  })
  return OK
}

export function setTheme(theme: Prefs['theme']): void {
  useStore.getState().setPrefs({ theme })
}

export function noteExport(orgId: ID, by: string, rows: number): void {
  audit(by, 'Downloaded the organisation’s data', 'Everything', `${rows} rows as one JSON file.`, orgId)
}

/**
 * Puts every record back to how the demo started, dated from today, and
 * removes the photos this device was holding for the records that are going.
 */
export function resetDemoData(): void {
  const state = db.get()
  const photoIds = [
    ...state.inspections.flatMap((i) => i.rooms.flatMap((r) => r.photoIds)),
    ...state.tickets.flatMap((t) => t.photoIds),
  ]
  for (const id of photoIds) void deletePhoto(id)
  useStore.getState().resetDemo()
}
