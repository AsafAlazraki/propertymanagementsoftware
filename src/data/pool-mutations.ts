/**
 * What a renter can do. Each function is one thing a person in Pool decides:
 * it changes the records, leaves a line in the history of the thing it touched
 * and — where the landlord or the platform team needs to know — tells them.
 *
 * Screens call these; they never write to the store directly. In production
 * each becomes a server action behind the same name, where the rule checks run
 * again (a client is never trusted with the law).
 */
import type { Application, Feedback, ID, ISODate, ISODateTime, RenterProfile, Ticket } from '@/domain/types'
import type { JurisdictionPack } from '@/domain/jurisdictions/types'
import type { Verdict } from '@/domain/rules/core'
import { durationText, OK } from '@/domain/rules/core'
import { addDays, addMonths, fmtDate, today } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { checkTenantInvoice, petRespondBy } from '@/domain/rules/tenancy'
import { checkRentOffer } from '@/domain/rules/text'
import { dispatchMode, providerFor, type CostRange } from '@/domain/triage'
import { db, logAutopilot, newId, nowIso } from './store'

type ProfileRow = RenterProfile & { id: ID }

function user(userId: ID) {
  return db.get().users.find((u) => u.id === userId)
}

function first(userId: ID): string {
  return user(userId)?.fullName.split(' ')[0] ?? 'The tenant'
}

/** A renter's profile row, made on first use so every renter can save a home or build a Passport. */
function profileOf(userId: ID): ProfileRow {
  const existing = db.get().renterProfiles.find((p) => p.userId === userId)
  if (existing) return existing
  const row: ProfileRow = {
    id: `rp_${userId.replace(/^u_/, '')}`,
    userId,
    headline: '',
    bio: '',
    // Never asked for in Pool, and never part of the Passport.
    employment: '',
    householdSize: 1,
    hasPets: false,
    references: [],
    history: [],
    savedPropertyIds: [],
    visibleToLandlords: true,
  }
  db.insert('renterProfiles', row)
  return row
}

/* ───────────────────────────────── profile ──────────────────────────────── */

/** Saves or un-saves a home. Returns whether it is saved now. */
export function toggleSaved(userId: ID, propertyId: ID): boolean {
  const p = profileOf(userId)
  const saved = p.savedPropertyIds.includes(propertyId)
  db.update('renterProfiles', p.id, { savedPropertyIds: saved ? p.savedPropertyIds.filter((id) => id !== propertyId) : [propertyId, ...p.savedPropertyIds] })
  return !saved
}

export function setPassportVisible(userId: ID, visible: boolean): void {
  db.update('renterProfiles', profileOf(userId).id, { visibleToLandlords: visible })
}

export type ProfileEdit = Pick<RenterProfile, 'headline' | 'bio' | 'householdSize' | 'hasPets' | 'petDetail' | 'moveInFrom' | 'budgetWeekly'>

export function updateProfile(userId: ID, edit: Partial<ProfileEdit>): void {
  db.update('renterProfiles', profileOf(userId).id, edit)
}

/** Links a tenancy with a landlord who is not on Loop. Recorded as the renter's own statement, never as verified. */
export function linkExternalTenancy(userId: ID, t: { address: string; weeklyRent: number; landlordName: string; since: ISODate; invite: boolean }): void {
  db.update('renterProfiles', profileOf(userId).id, {
    externalTenancy: { address: t.address.trim(), weeklyRent: t.weeklyRent, landlordName: t.landlordName.trim(), since: t.since, invitedLandlord: t.invite },
  })
}

export function unlinkExternalTenancy(userId: ID): void {
  db.update('renterProfiles', profileOf(userId).id, { externalTenancy: undefined })
}

/* ───────────────────────────────── passport ─────────────────────────────── */

/**
 * Adds a past tenancy the renter tells us about. It is stored as
 * `self_reported` and does not count towards the Passport until a landlord
 * confirms it, so the percentages are left at zero rather than taken on trust.
 */
export function addPastTenancy(userId: ID, t: { address: string; from: ISODate; to?: ISODate }): void {
  const p = profileOf(userId)
  db.update('renterProfiles', p.id, {
    history: [...p.history, { address: t.address.trim(), from: t.from, to: t.to, onTimePct: 0, careScore: 0, verifiedBy: 'self_reported' }],
  })
}

/** Removes a tenancy the renter added themselves. Verified history cannot be removed this way. */
export function removePastTenancy(userId: ID, address: string, from: ISODate): void {
  const p = profileOf(userId)
  db.update('renterProfiles', p.id, { history: p.history.filter((h) => !(h.verifiedBy === 'self_reported' && h.address === address && h.from === from)) })
}

function feedbackRow(userId: ID, row: Pick<Feedback, 'screen' | 'kind' | 'text' | 'sentiment' | 'area'>): Feedback {
  return { id: newId('fb'), userId, portal: 'pool', status: 'new', votes: 0, createdAt: nowIso(), ...row }
}

/** A renter says a fact on their Passport is wrong. It goes to a person on the platform team. */
export function flagPassportFact(userId: ID, fact: string, why: string): void {
  db.insert('feedback', feedbackRow(userId, { screen: '/pool/passport', kind: 'complaint', area: 'Rent Passport', sentiment: 'negative', text: `Flagged as wrong: “${fact}”. ${why.trim()}` }))
}

export function sendFeedback(userId: ID, kind: Feedback['kind'], text: string, screen: string): void {
  const sentiment: Feedback['sentiment'] = kind === 'praise' ? 'positive' : kind === 'bug' || kind === 'complaint' ? 'negative' : 'neutral'
  db.insert('feedback', feedbackRow(userId, { screen, kind, area: 'Pool', sentiment, text: text.trim() }))
}

/* ─────────────────────────── viewings and applications ──────────────────── */

function openApplication(userId: ID, propertyId: ID): Application | undefined {
  return db.get().applications.find((a) => a.applicantId === userId && a.propertyId === propertyId && a.stage !== 'withdrawn' && a.stage !== 'declined')
}

/**
 * Books a viewing. Only a name and contact details go to the landlord at this
 * stage, so nothing else is recorded: `occupants` stays 0 and there is no
 * message until the renter chooses to apply.
 */
export function bookViewing(userId: ID, propertyId: ID, viewingAt: ISODateTime): void {
  const property = db.get().properties.find((p) => p.id === propertyId)
  if (!property?.listing) return
  const existing = openApplication(userId, propertyId)
  if (existing) {
    db.update('applications', existing.id, { viewingAt, stage: existing.stage === 'interest' ? 'viewing_booked' : existing.stage })
    return
  }
  db.insert('applications', {
    id: newId('ap'),
    orgId: property.orgId,
    propertyId,
    applicantId: userId,
    stage: 'viewing_booked',
    submittedAt: nowIso(),
    offeredWeeklyRent: property.listing.advertisedWeeklyRent,
    moveIn: property.listing.availableFrom,
    occupants: 0,
    message: '',
    viewingAt,
  })
}

export function cancelViewing(applicationId: ID): void {
  const a = db.get().applications.find((x) => x.id === applicationId)
  if (!a) return
  // A viewing with no application behind it leaves nothing worth keeping.
  if (a.occupants === 0) db.remove('applications', applicationId)
  else db.update('applications', applicationId, { viewingAt: undefined, stage: a.stage === 'viewing_booked' ? 'interest' : a.stage })
}

/**
 * Applies for a home at its advertised rent. There is no rent argument: the
 * figure is read from the listing and checked against the rent-bidding rule, so
 * an application above the advertised rent cannot be made from Pool.
 */
export function applyForHome(userId: ID, propertyId: ID, detail: { moveIn: ISODate; occupants: number; message: string }, pack: JurisdictionPack): Verdict {
  const state = db.get()
  const property = state.properties.find((p) => p.id === propertyId)
  if (!property?.listing || property.listing.status !== 'live') return { ok: false, reason: 'This home is no longer listed.' }
  const advertised = property.listing.advertisedWeeklyRent
  const verdict = checkRentOffer(pack, advertised, advertised)
  if (!verdict.ok) return verdict

  const existing = openApplication(userId, propertyId)
  const fields = { offeredWeeklyRent: advertised, moveIn: detail.moveIn, occupants: Math.max(1, Math.round(detail.occupants)), message: detail.message.trim(), submittedAt: nowIso() }
  if (existing) db.update('applications', existing.id, fields)
  else db.insert('applications', { id: newId('ap'), orgId: property.orgId, propertyId, applicantId: userId, stage: 'interest', ...fields })
  logAutopilot(property.orgId, 'listing', `${user(userId)?.fullName ?? 'A renter'} applied for ${property.address.line1} at the advertised ${money(advertised)} a week.`)
  return OK
}

/** The renter pulls out. Their details leave the landlord's view straight away rather than waiting out the retention period. */
export function withdrawApplication(applicationId: ID): void {
  const a = db.get().applications.find((x) => x.id === applicationId)
  if (!a) return
  db.update('applications', applicationId, { stage: 'withdrawn', decidedAt: nowIso(), purgeOn: today(), purged: true, message: '', viewingAt: undefined })
}

/* ───────────────────────────────── repairs ──────────────────────────────── */

export interface ProblemReport {
  reporterId: ID
  tenancyId: ID
  title: string
  description: string
  category: string
  room?: string
  photoIds: ID[]
  triage: Ticket['triage']
  /** The usual cost of this kind of job, when the research gives one. */
  likelyCost: CostRange | null
}

/**
 * Files a repair. Anything urgent, or a routine job whose usual cost is inside
 * the limit the landlord set for the home, goes straight to a tradesperson;
 * anything else waits for a quote the landlord approves. If the network has no
 * vetted tradesperson for the job, nobody is pretended: the repair waits with
 * the landlord to arrange one. Returns the ticket id.
 */
export function reportProblem(r: ProblemReport): ID | undefined {
  const state = db.get()
  const tenancy = state.tenancies.find((t) => t.id === r.tenancyId)
  const property = state.properties.find((p) => p.id === tenancy?.propertyId)
  if (!tenancy || !property) return undefined

  const limit = property.sinkingFund.autoApproveLimit
  const mode = dispatchMode(r.triage.urgency, r.likelyCost, limit)
  const provider = providerFor(state.providers, r.triage.suggestedTrade)
  const trade = r.triage.suggestedTrade.toLowerCase()
  const tier = r.triage.urgency === 'emergency' ? 'an emergency' : r.triage.urgency
  const at = nowIso()
  const id = newId('tk')

  const sorted = !provider
    ? `Sorted as ${tier}. There is no vetted ${trade} in the network yet, so the owner has been asked to arrange one.`
    : mode === 'quote_first'
      ? `Sorted as routine. ${r.likelyCost ? `Likely over the ${money(limit)} limit` : 'The cost is not known yet'}, so a quote was requested from ${provider.name} instead of sending someone straight away.`
      : r.triage.urgency === 'routine'
        ? `Sorted as routine, within the ${money(limit)} limit: sent to ${provider.name} without waiting for approval.`
        : `Sorted as ${tier}: sent to ${provider.name} without waiting for approval.`

  db.insert('tickets', {
    id,
    orgId: tenancy.orgId,
    propertyId: property.id,
    tenancyId: tenancy.id,
    reportedBy: r.reporterId,
    createdAt: at,
    title: r.title,
    description: r.description.trim(),
    category: r.category,
    room: r.room,
    photoIds: r.photoIds,
    triage: r.triage,
    status: !provider ? 'submitted' : mode === 'auto_dispatch' ? 'approved' : 'quote_requested',
    mode,
    providerId: provider?.id,
    events: [
      { at, by: 'tenant', text: `${first(r.reporterId)} reported it from Pool${r.triage.selfHelpTried ? ', after trying the self-help steps' : ''}.` },
      { at, by: 'system', text: r.triage.possibleTenantFault ? `${sorted} Flagged to check the cause.` : sorted },
    ],
  })

  const where = `“${r.title}” at ${property.address.line1}`
  logAutopilot(
    tenancy.orgId,
    provider && mode === 'quote_first' ? 'quote' : 'dispatch',
    !provider
      ? `${where} was sorted as ${tier} and needs a ${trade}. None in your network is vetted yet, so this one is waiting for you to arrange.`
      : mode === 'auto_dispatch'
        ? `Sent ${where} to ${provider.name}. ${r.triage.urgency === 'routine' ? `It is routine and within your ${money(limit)} limit` : `It was sorted as ${tier}`}, so I did not wait for you.`
        : `Asked ${provider.name} to quote for ${where}. Nothing is booked until you approve it.`,
  )
  return id
}

/**
 * The renter agrees the damage was theirs. The invoice is checked against the
 * careless-damage cap one more time, the capped amount goes on the ledger as a
 * tenant invoice, and the job closes. Returns what was billed.
 */
export function acceptFault(ticketId: ID, userId: ID, pack: JurisdictionPack): number | undefined {
  const state = db.get()
  const tk = state.tickets.find((t) => t.id === ticketId)
  const tenancy = state.tenancies.find((t) => t.id === tk?.tenancyId)
  const property = state.properties.find((p) => p.id === tk?.propertyId)
  if (!tk?.invoice || !tenancy || !property) return undefined

  const { billable } = checkTenantInvoice(pack, tk.invoice.amount, 'careless', tenancy.weeklyRent, { insured: Boolean(property.insurance.insurer), excess: property.insurance.excess })
  const at = nowIso()
  const rest = tk.invoice.amount - billable
  db.update('tickets', ticketId, {
    status: 'closed',
    paidFrom: 'tenant',
    tenantResponse: { verdict: 'accepted', at },
    events: [
      ...tk.events,
      { at, by: 'tenant', text: `${first(userId)} read the tradesperson’s report and agreed it is theirs to pay.` },
      { at, by: 'system', text: `Invoiced the tenants ${money(billable)}${rest > 0 ? `; the remaining ${money(rest)} is over the careless-damage cap and stays with the owner` : ''}. Job closed.` },
    ],
  })
  db.insert('ledger', {
    id: newId('led'),
    orgId: tk.orgId,
    propertyId: tk.propertyId,
    tenancyId: tenancy.id,
    date: today(),
    kind: 'tenant_invoice',
    amount: billable,
    category: 'other_income',
    description: `Tenant invoice: ${tk.title.toLowerCase()} — accepted by ${user(userId)?.fullName ?? 'the tenant'}`,
    match: 'none',
    ticketId,
  })
  return billable
}

/** The renter does not agree. Nothing is billed; it goes to the landlord's queue to read both accounts. */
export function disputeFault(ticketId: ID, userId: ID, reason: string): void {
  const tk = db.get().tickets.find((t) => t.id === ticketId)
  if (!tk) return
  const at = nowIso()
  db.update('tickets', ticketId, {
    status: 'disputed',
    tenantResponse: { verdict: 'disputed', at, note: reason.trim() },
    events: [...tk.events, { at, by: 'tenant', text: `${first(userId)} does not agree with the cause: “${reason.trim()}” Nothing is billed while this is open.` }],
  })
}

/* ──────────────────────────────── requests ──────────────────────────────── */

export interface PetRequest {
  animal: string
  name: string
  age: string
  desexed: boolean
  indoors: string
  note: string
}

/** Asks the landlord for consent to keep a pet. The statutory clock to answer starts today. */
export function requestPet(userId: ID, tenancyId: ID, pet: PetRequest, pack: JurisdictionPack): ID | undefined {
  const state = db.get()
  const tenancy = state.tenancies.find((t) => t.id === tenancyId)
  const property = state.properties.find((p) => p.id === tenancy?.propertyId)
  if (!tenancy) return undefined
  const id = newId('var')
  const respondBy = petRespondBy(pack, today()) ?? undefined
  const animal = pet.animal.trim()
  const name = pet.name.trim()
  db.insert('variations', {
    id,
    orgId: tenancy.orgId,
    tenancyId,
    type: 'pet_request',
    status: 'awaiting_landlord',
    requestedBy: 'tenant',
    requestedAt: nowIso(),
    respondBy,
    summary: `One ${animal.toLowerCase()}${name ? `, ${name}` : ''}`,
    detail: { animal, name, age: pet.age.trim(), desexed: pet.desexed, indoors: pet.indoors, note: pet.note.trim() },
    conditions: [],
    signatures: [],
  })
  const rule = pack.rules['pets.response_deadline'].value
  logAutopilot(
    tenancy.orgId,
    'deadline',
    `${rule ? `Started the ${durationText(rule)} clock` : 'Logged'} on ${first(userId)}’s pet request for ${property?.address.line1 ?? 'the property'}${respondBy ? ` — an answer is due by ${fmtDate(respondBy)}` : ''}.`,
  )
  return id
}

export function withdrawRequest(variationId: ID): void {
  db.update('variations', variationId, { status: 'withdrawn' })
}

/**
 * The renter signs a change the landlord has agreed or offered: pet consent
 * with its conditions, or a renewed fixed term. A renewal also moves the
 * tenancy's end date, which is the whole point of signing it.
 */
export function signVariation(variationId: ID, signer: string): void {
  const state = db.get()
  const v = state.variations.find((x) => x.id === variationId)
  if (!v || v.status !== 'awaiting_tenant') return
  db.update('variations', variationId, { status: 'signed', signatures: [...v.signatures, { by: 'tenant', name: signer, at: nowIso() }] })
  if (v.type === 'term_extension') {
    const months = Number(v.detail.months)
    const from = typeof v.detail.from === 'string' ? v.detail.from : undefined
    if (from && months > 0) db.update('tenancies', v.tenancyId, { type: 'fixed', endDate: addDays(addMonths(from, months), -1) })
  }
}

/** The renter does not accept what was offered. For pet consent, the landlord may then refuse on that ground. */
export function declineVariation(variationId: ID): void {
  const state = db.get()
  const v = state.variations.find((x) => x.id === variationId)
  if (!v || v.status !== 'awaiting_tenant') return
  db.update('variations', variationId, { status: 'declined', declineGround: 'The tenant did not agree to what was offered.' })
  // Consent with conditions puts the pet on the tenancy as soon as the landlord says yes; without agreement it comes off again.
  const tenancy = state.tenancies.find((t) => t.id === v.tenancyId)
  if (v.type === 'pet_request' && tenancy) {
    const petName = String(v.detail.name ?? v.detail.animal ?? '')
    db.update('tenancies', tenancy.id, { pets: tenancy.pets.filter((p) => p.name !== petName) })
  }
}
