/**
 * What a landlord can do. Each function is one decision: it changes the
 * records, leaves a line in the history of the thing it touched, and — where
 * the tenant or the platform team needs to know — tells them.
 *
 * Screens call these; they never write to the store directly. In production
 * each becomes a server action behind the same name, where the rule checks run
 * again (a client is never trusted with the law).
 */
import type { ID, Inspection, ISODate, Variation } from '@/domain/types'
import type { JurisdictionPack } from '@/domain/jurisdictions/types'
import { at } from '@/domain/seed'
import { addDays, fmtDate, today } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { audit, db, logAutopilot, newId, nowIso } from './store'

const FIELD_PRICES = { routine_inspection: 85, viewing: 65, entry_exit_report: 140, tribunal_representation: 250 } as const
export const PLATFORM_FEE_PCT = 20
export { FIELD_PRICES }

function name(userId: ID): string {
  return db.get().users.find((u) => u.id === userId)?.fullName ?? 'the tenant'
}

/* ─────────────────────────────────── bond ───────────────────────────────── */

export function recordBondLodged(tenancyId: ID, bondRef: string, lodgedOn: ISODate = today()): void {
  const t = db.get().tenancies.find((x) => x.id === tenancyId)
  if (!t) return
  db.update('tenancies', tenancyId, { bond: { ...t.bond, lodgedOn, bondRef: bondRef.trim() } })
  db.insert('ledger', { id: newId('led'), orgId: t.orgId, propertyId: t.propertyId, tenancyId, date: lodgedOn, kind: 'bond_lodged', amount: -t.bond.amount, category: 'private', description: `Bond lodged with Tenancy Services · ${bondRef.trim()}`, match: 'manual' })
  db.insert('docs', { id: newId('doc'), orgId: t.orgId, propertyId: t.propertyId, tenancyId, name: `Bond lodgement receipt ${bondRef.trim()}.pdf`, kind: 'bond_receipt', addedAt: nowIso(), sizeKb: 52, source: 'generated' })
}

/* ────────────────────────────────── arrears ─────────────────────────────── */

export function logArrearsCall(tenancyId: ID, note: string): void {
  const t = db.get().tenancies.find((x) => x.id === tenancyId)
  if (!t) return
  db.insert('arrearsEvents', { id: newId('ae'), orgId: t.orgId, tenancyId, at: nowIso(), kind: 'landlord_called', note: note.trim() || 'Called the tenant.' })
}

/** Hands the day-one call to the Loop team. It lands in the admin action queue as a real task. */
export function requestConciergeCall(tenancyId: ID): void {
  const state = db.get()
  const t = state.tenancies.find((x) => x.id === tenancyId)
  if (!t) return
  const property = state.properties.find((p) => p.id === t.propertyId)
  const who = name(t.tenantIds[0])
  db.insert('arrearsEvents', { id: newId('ae'), orgId: t.orgId, tenancyId, at: nowIso(), kind: 'concierge_requested', note: 'Asked the Loop team to phone and report back.' })
  db.insert('adminTasks', {
    id: newId('at'),
    kind: 'concierge_call',
    title: `Call ${who} about late rent — ${property?.address.line1 ?? ''}`,
    detail: `${money(t.weeklyRent)} was due and has not arrived. A friendly check: was it a bank delay or a changed pay day? Log what they say and when they expect to pay.`,
    orgId: t.orgId,
    refId: tenancyId,
    priority: 'p1',
    status: 'open',
    createdAt: nowIso(),
    dueAt: at(today(), 17),
  })
}

export function sendRemedyNotice(tenancyId: ID, deadline: ISODate, owed: number, pack: JurisdictionPack): void {
  const t = db.get().tenancies.find((x) => x.id === tenancyId)
  if (!t) return
  db.insert('arrearsEvents', { id: newId('ae'), orgId: t.orgId, tenancyId, at: nowIso(), kind: 'remedy_notice_sent', note: `14-day notice to remedy served by email. ${money(owed)} to be paid by ${fmtDate(deadline)}.` })
  db.insert('notices', {
    id: newId('no'),
    orgId: t.orgId,
    tenancyId,
    type: 'remedy_14_day',
    createdAt: nowIso(),
    servedOn: today(),
    method: 'email',
    deemedReceivedOn: today(),
    effectiveOn: deadline,
    status: 'served',
    title: `Notice to remedy: ${money(owed)} of rent`,
    body: `Rent of ${money(owed)} is overdue. Please pay it by ${fmtDate(deadline, { year: 'always' })}.`,
    rulesUsed: ['arrears.remedy_notice'],
    packVersion: pack.version,
  })
}

/* ─────────────────────────────── maintenance ────────────────────────────── */

export function approveQuote(ticketId: ID): void {
  const state = db.get()
  const tk = state.tickets.find((t) => t.id === ticketId)
  if (!tk?.quote) return
  const provider = state.providers.find((p) => p.id === tk.providerId)
  const when = at(addDays(today(), 2), 10)
  db.update('tickets', ticketId, {
    status: 'scheduled',
    scheduledFor: when,
    entryNoticeServedAt: nowIso(),
    events: [
      ...tk.events,
      { at: nowIso(), by: 'landlord', text: `Quote of ${money(tk.quote.amount)} approved.` },
      { at: nowIso(), by: 'system', text: `${provider?.name ?? 'The tradesperson'} booked for ${fmtDate(addDays(today(), 2))} at 10 am. Entry notice served; the key code stays locked until the 24 hours have run.` },
    ],
  })
  logAutopilot(tk.orgId, 'dispatch', `Booked ${provider?.name ?? 'the tradesperson'} after you approved the ${money(tk.quote.amount)} quote, and served the entry notice.`)
}

export function declineQuote(ticketId: ID, reason: string): void {
  const tk = db.get().tickets.find((t) => t.id === ticketId)
  if (!tk) return
  db.update('tickets', ticketId, {
    status: 'quote_requested',
    quote: undefined,
    providerId: undefined,
    events: [...tk.events, { at: nowIso(), by: 'landlord', text: `Quote declined${reason ? `: ${reason}` : ''}. A second quote has been requested.` }],
  })
}

/** Settles a dispute over who caused the damage. */
export function resolveFault(ticketId: ID, payer: 'tenant' | 'sinking_fund', note: string): void {
  const tk = db.get().tickets.find((t) => t.id === ticketId)
  if (!tk) return
  db.update('tickets', ticketId, {
    status: 'closed',
    paidFrom: payer,
    events: [...tk.events, { at: nowIso(), by: 'landlord', text: payer === 'tenant' ? `Decided the tenant pays. ${note}`.trim() : `Decided this is fair wear and tear; paid from the sinking fund. ${note}`.trim() }],
  })
}

/* ──────────────────────────────── requests ──────────────────────────────── */

export interface PetResponse {
  decision: 'consent' | 'refuse'
  conditions: string[]
  petBond: number
  ground?: string
  detail?: string
}

export function respondToPet(variationId: ID, r: PetResponse, pack: JurisdictionPack, signer: string): void {
  const state = db.get()
  const v = state.variations.find((x) => x.id === variationId)
  if (!v) return
  const t = state.tenancies.find((x) => x.id === v.tenancyId)
  const patch: Partial<Variation> =
    r.decision === 'consent'
      ? {
          status: 'awaiting_tenant',
          conditions: r.conditions.map((key) => {
            const c = pack.petConditions.find((x) => x.key === key)
            return key === 'pet_bond' ? `A pet bond of ${money(r.petBond)}` : c?.label ?? key
          }),
          signatures: [{ by: 'landlord', name: signer, at: nowIso() }],
        }
      : { status: 'declined', declineGround: `${pack.petRefusalGrounds.find((g) => g.key === r.ground)?.label ?? ''}${r.detail ? ` — ${r.detail}` : ''}` }
  db.update('variations', variationId, patch)
  if (t && r.decision === 'consent') {
    const animal = String(v.detail.animal ?? 'Pet')
    const petName = String(v.detail.name ?? animal)
    db.update('tenancies', t.id, { pets: [...t.pets, { name: petName, kind: animal, approvedAt: today() }] })
  }
}

export function offerRenewal(tenancyId: ID, months: number, weeklyRent: number, signer: string): void {
  const t = db.get().tenancies.find((x) => x.id === tenancyId)
  if (!t || !t.endDate) return
  db.insert('variations', {
    id: newId('var'),
    orgId: t.orgId,
    tenancyId,
    type: 'term_extension',
    status: 'awaiting_tenant',
    requestedBy: 'landlord',
    requestedAt: nowIso(),
    summary: `Renew for ${months} months at ${money(weeklyRent)} a week`,
    detail: { months, weeklyRent, from: addDays(t.endDate, 1) },
    conditions: [],
    signatures: [{ by: 'landlord', name: signer, at: nowIso() }],
  })
}

export function giveNonRenewalNotice(tenancyId: ID, pack: JurisdictionPack, received: ISODate): void {
  const t = db.get().tenancies.find((x) => x.id === tenancyId)
  if (!t || !t.endDate) return
  db.update('tenancies', tenancyId, { status: 'notice_given', noticeGiven: { by: 'landlord', on: today(), ground: 'End of fixed term', endsOn: t.endDate } })
  db.insert('notices', {
    id: newId('no'),
    orgId: t.orgId,
    tenancyId,
    type: 'fixed_term_non_renewal',
    createdAt: nowIso(),
    servedOn: today(),
    method: 'email',
    deemedReceivedOn: received,
    effectiveOn: t.endDate,
    status: 'served',
    title: 'Notice that the tenancy will not continue past the fixed term',
    body: `The fixed term ends on ${fmtDate(t.endDate, { year: 'always' })} and will not continue as a periodic tenancy.`,
    rulesUsed: ['fixed_term.notice_window'],
    packVersion: pack.version,
  })
}

/* ─────────────────────────────── inspections ────────────────────────────── */

export function scheduleInspection(inspectionId: ID, date: ISODate, hour: number, mode: Inspection['mode'], pack: JurisdictionPack): void {
  const state = db.get()
  const i = state.inspections.find((x) => x.id === inspectionId)
  if (!i) return
  const property = state.properties.find((p) => p.id === i.propertyId)
  const inspector = state.providers.find((p) => p.kind === 'inspector' && p.vetting === 'vetted')
  db.update('inspections', inspectionId, { status: 'notice_served', mode, scheduledFor: at(date, hour), noticeServedAt: nowIso(), providerId: mode === 'delegated' ? inspector?.id : undefined })
  if (i.tenancyId) {
    db.insert('notices', {
      id: newId('no'),
      orgId: i.orgId,
      tenancyId: i.tenancyId,
      type: 'entry_inspection',
      createdAt: nowIso(),
      servedOn: today(),
      method: 'email',
      deemedReceivedOn: today(),
      effectiveOn: date,
      status: 'served',
      title: `Routine inspection on ${fmtDate(date)}`,
      body: `A routine inspection of ${property?.address.line1 ?? 'the property'} will take place on ${fmtDate(date, { year: 'always' })} at ${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'pm' : 'am'}.`,
      rulesUsed: ['entry.inspection_notice_min', 'entry.inspection_min_interval', 'entry.hours'],
      packVersion: pack.version,
    })
  }
  if (mode === 'delegated') {
    const price = FIELD_PRICES.routine_inspection
    db.insert('fieldTasks', { id: newId('ft'), orgId: i.orgId, propertyId: i.propertyId, type: 'routine_inspection', price, platformFee: Math.round((price * PLATFORM_FEE_PCT) / 100), status: 'accepted', providerId: inspector?.id, requestedAt: nowIso(), scheduledFor: at(date, hour), inspectionId })
    logAutopilot(i.orgId, 'inspection', `Booked ${inspector?.name ?? 'a local inspector'} for ${property?.address.line1 ?? 'the property'} on ${fmtDate(date)} and served the 48-hour notice.`)
  }
}

/* ────────────────────────────────── queue ───────────────────────────────── */

export function snoozeAction(actionId: string): void {
  db.patch((d) => ({ dismissedActions: [...d.dismissedActions, actionId] }))
}

export function unsnoozeAll(): void {
  db.patch(() => ({ dismissedActions: [] }))
}

export function recordAudit(actor: string, action: string, target: string, detail?: string, orgId?: ID): void {
  audit(actor, action, target, detail, orgId)
}
