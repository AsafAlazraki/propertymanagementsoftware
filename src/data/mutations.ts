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
import type { Finding, StandardKey } from '@/domain/healthyHomes'
import { at } from '@/domain/seed'
import { addDays, fmtDate, today } from '@/domain/rules/calendar'
import { money, round2 } from '@/domain/rules/format'
import { checkTenantInvoice } from '@/domain/rules/tenancy'
import { dispatchMode, issueOf, triage } from '@/domain/triage'
import { audit, db, logAutopilot, newId, nowIso } from './store'

const FIELD_PRICES = { routine_inspection: 85, viewing: 65, entry_exit_report: 140, tribunal_representation: 250 } as const
export const PLATFORM_FEE_PCT = 20
export { FIELD_PRICES }

function name(userId: ID): string {
  return db.get().users.find((u) => u.id === userId)?.fullName ?? 'the tenant'
}

/* ─────────────────────────────────── bond ───────────────────────────────── */

export function recordBondLodged(tenancyId: ID, bondRef: string, pack: JurisdictionPack, lodgedOn: ISODate = today()): void {
  const t = db.get().tenancies.find((x) => x.id === tenancyId)
  if (!t) return
  db.update('tenancies', tenancyId, { bond: { ...t.bond, lodgedOn, bondRef: bondRef.trim() } })
  db.insert('ledger', { id: newId('led'), orgId: t.orgId, propertyId: t.propertyId, tenancyId, date: lodgedOn, kind: 'bond_lodged', amount: -t.bond.amount, category: 'private', description: `Bond lodged with ${pack.bondAuthority.name} · ${bondRef.trim()}`, match: 'manual' })
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

/**
 * Approves a quote. A quote above the owner's second-approval line is not
 * booked on one person's word: the first yes is recorded and the job waits
 * for a different owner. Returns what happened.
 */
export function approveQuote(ticketId: ID, by: string): 'booked' | 'waiting' | 'same_person' | 'nothing' {
  const state = db.get()
  const tk = state.tickets.find((t) => t.id === ticketId)
  if (!tk?.quote) return 'nothing'
  const property = state.properties.find((p) => p.id === tk.propertyId)
  const line = state.entities.find((e) => e.id === property?.entityId)?.dualApprovalThreshold
  if (line !== undefined && tk.quote.amount > line) {
    if (!tk.quote.firstApproval) {
      db.update('tickets', ticketId, {
        quote: { ...tk.quote, firstApproval: { by, at: nowIso() } },
        events: [...tk.events, { at: nowIso(), by: 'landlord', text: `${by} approved the ${money(tk.quote.amount)} quote. It is over the ${money(line)} second-approval line, so nothing is booked until another owner approves too.` }],
      })
      return 'waiting'
    }
    if (tk.quote.firstApproval.by === by) return 'same_person'
  }
  const provider = state.providers.find((p) => p.id === tk.providerId)
  const when = at(addDays(today(), 2), 10)
  db.update('tickets', ticketId, {
    status: 'scheduled',
    scheduledFor: when,
    entryNoticeServedAt: nowIso(),
    events: [
      ...tk.events,
      { at: nowIso(), by: 'landlord', text: tk.quote.firstApproval ? `${by} gave the second approval for the ${money(tk.quote.amount)} quote.` : `Quote of ${money(tk.quote.amount)} approved.` },
      { at: nowIso(), by: 'system', text: `${provider?.name ?? 'The tradesperson'} booked for ${fmtDate(addDays(today(), 2))} at 10 am. Entry notice served; the key code stays locked until the 24 hours have run.` },
    ],
  })
  logAutopilot(tk.orgId, 'dispatch', `Booked ${provider?.name ?? 'the tradesperson'} after you approved the ${money(tk.quote.amount)} quote, and served the entry notice.`)
  return 'booked'
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

/**
 * Settles who pays for a repair the tradesperson recorded as tenant damage.
 * Billing the tenant always goes through the careless-damage cap; the landlord
 * decides the cause, never the amount. Returns what was billed.
 */
export function resolveFault(ticketId: ID, payer: 'tenant' | 'sinking_fund', note: string, pack: JurisdictionPack): number {
  const state = db.get()
  const tk = state.tickets.find((t) => t.id === ticketId)
  const tenancy = state.tenancies.find((t) => t.id === tk?.tenancyId)
  const property = state.properties.find((p) => p.id === tk?.propertyId)
  if (!tk?.invoice || !property) return 0
  const now = nowIso()
  const said = note.trim()
  const events = [...tk.events]
  let billed = 0

  if (payer === 'tenant' && tenancy) {
    billed = checkTenantInvoice(pack, tk.invoice.amount, 'careless', tenancy.weeklyRent, { insured: Boolean(property.insurance.insurer), excess: property.insurance.excess }).billable
    const rest = round2(tk.invoice.amount - billed)
    events.push({ at: now, by: 'landlord', text: `Decided this was careless damage.${said ? ` ${said}` : ''}` })
    events.push({
      at: now,
      by: 'system',
      text: `Invoiced the tenants ${money(billed)}${rest > 0 ? `; the remaining ${money(rest)} is over the careless-damage cap and stays with the owner` : ''}. If they still disagree, the Tribunal decides.`,
    })
    db.insert('ledger', { id: newId('led'), orgId: tk.orgId, propertyId: tk.propertyId, tenancyId: tenancy.id, date: today(), kind: 'tenant_invoice', amount: billed, category: 'other_income', description: `Tenant invoice: ${tk.title.toLowerCase()}`, match: 'none', ticketId })
  } else {
    events.push({ at: now, by: 'landlord', text: `Decided this is fair wear and tear.${said ? ` ${said}` : ''}` })
    events.push({ at: now, by: 'system', text: `Nothing is billed to the tenants. The ${money(tk.invoice.amount)} stays with the owner, paid from the sinking fund.` })
  }
  db.update('tickets', ticketId, { status: 'closed', paidFrom: payer === 'tenant' && tenancy ? 'tenant' : 'sinking_fund', events })
  return billed
}

/** The landlord has found their own tradesperson for a job the network could not cover. */
export function arrangeOwnTrade(ticketId: ID, who: string): void {
  const tk = db.get().tickets.find((t) => t.id === ticketId)
  if (!tk) return
  db.update('tickets', ticketId, {
    status: 'approved',
    events: [...tk.events, { at: nowIso(), by: 'landlord', text: `You arranged ${who.trim()} yourself. Loop is not tracking their visit; record the cost in Money when the invoice arrives.` }],
  })
}

export interface RepairLog {
  orgId: ID
  propertyId: ID
  reporterId: ID
  issueKey: string
  title: string
  description: string
}

/**
 * The landlord logs a fault themselves. It is sorted by the same rules as a
 * report from a renter: urgent work is sent, routine work inside the home's
 * limit is sent, anything else waits for a quote. Returns the ticket id.
 */
export function logRepair(r: RepairLog): ID | undefined {
  const state = db.get()
  const property = state.properties.find((p) => p.id === r.propertyId)
  if (!property) return undefined
  const issue = issueOf(r.issueKey)
  const sorted = triage(r.description, r.issueKey, today())
  const limit = property.sinkingFund.autoApproveLimit
  const mode = dispatchMode(sorted.urgency, issue.cost, limit)
  const want = sorted.suggestedTrade.toLowerCase().split(/ or |, | and /)[0]
  const provider = state.providers.find((p) => p.kind === 'trade' && p.vetting === 'vetted' && p.trade.toLowerCase().includes(want))
  const who = provider?.name ?? `a ${sorted.suggestedTrade.toLowerCase()}`
  const tenancy = state.tenancies.find((t) => t.propertyId === property.id && (t.status === 'active' || t.status === 'notice_given'))
  const now = nowIso()
  const id = newId('tk')
  const tier = sorted.urgency === 'emergency' ? 'an emergency' : sorted.urgency
  db.insert('tickets', {
    id,
    orgId: r.orgId,
    propertyId: property.id,
    tenancyId: tenancy?.id,
    reportedBy: r.reporterId,
    createdAt: now,
    title: r.title.trim(),
    description: r.description.trim(),
    category: issue.category,
    photoIds: [],
    triage: sorted,
    status: !provider ? 'submitted' : mode === 'auto_dispatch' ? 'approved' : 'quote_requested',
    mode,
    providerId: provider?.id,
    events: [
      { at: now, by: 'landlord', text: 'You logged this yourself.' },
      {
        at: now,
        by: 'system',
        text: !provider
          ? `Sorted as ${tier}. There is no vetted ${sorted.suggestedTrade.toLowerCase()} in the network yet, so it is yours to arrange.`
          : mode === 'quote_first'
            ? `Sorted as routine. ${issue.cost ? `Likely over the ${money(limit)} limit` : 'The cost is not known yet'}, so a quote was requested from ${who}.`
            : `Sorted as ${tier}${sorted.urgency === 'routine' ? `, within the ${money(limit)} limit` : ''}: sent to ${who}.`,
      },
    ],
  })
  return id
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

/* ──────────────────────────────── compliance ────────────────────────────── */

export function saveStandard(propertyId: ID, key: StandardKey, finding: Finding): void {
  const p = db.get().properties.find((x) => x.id === propertyId)
  if (!p) return
  db.update('properties', propertyId, { healthyHomes: { ...p.healthyHomes, [key]: { status: finding.status, detail: finding.detail, checkedAt: today() } } })
}

export function logSmokeAlarmTest(propertyId: ID): void {
  const p = db.get().properties.find((x) => x.id === propertyId)
  if (!p) return
  db.update('properties', propertyId, { smokeAlarms: { ...p.smokeAlarms, lastChecked: today() } })
}

/** Generates the signed healthy homes statement from the property's own record and files it. */
export function generateHealthyHomesStatement(propertyId: ID, tenancyId: ID | undefined): void {
  const p = db.get().properties.find((x) => x.id === propertyId)
  if (!p) return
  db.update('properties', propertyId, { healthyHomes: { ...p.healthyHomes, statementSignedAt: today() } })
  db.insert('docs', { id: newId('doc'), orgId: p.orgId, propertyId, tenancyId, name: 'Healthy homes compliance statement.pdf', kind: 'healthy_homes_statement', addedAt: nowIso(), sizeKb: 184, source: 'generated' })
}

export function addInsuranceStatement(propertyId: ID, tenancyId: ID | undefined, signer: string): void {
  const p = db.get().properties.find((x) => x.id === propertyId)
  if (!p) return
  db.update('properties', propertyId, { insurance: { ...p.insurance, statementInAgreement: true } })
  if (tenancyId) {
    db.insert('variations', {
      id: newId('var'),
      orgId: p.orgId,
      tenancyId,
      type: 'custom_clause',
      status: 'awaiting_tenant',
      requestedBy: 'landlord',
      requestedAt: nowIso(),
      summary: 'Insurance statement added to the agreement',
      detail: { insured: Boolean(p.insurance.insurer), excess: p.insurance.excess ?? 0 },
      conditions: [],
      signatures: [{ by: 'landlord', name: signer, at: nowIso() }],
    })
  }
}

export function setSinkingFund(propertyId: ID, patch: Partial<{ ratePct: number; autoApproveLimit: number }>): void {
  const p = db.get().properties.find((x) => x.id === propertyId)
  if (!p) return
  db.update('properties', propertyId, { sinkingFund: { ...p.sinkingFund, ...patch } })
}

/* ─────────────────────────────────── money ──────────────────────────────── */

/** Files a bank line the feed was unsure about. The landlord says what it was; the ledger entry follows. */
export function fileBankLine(lineId: ID, propertyId: ID, category: string, description: string): void {
  const state = db.get()
  const line = state.bankLines.find((l) => l.id === lineId)
  const property = state.properties.find((p) => p.id === propertyId)
  if (!line || !property) return
  const ledgerId = newId('led')
  db.insert('ledger', {
    id: ledgerId,
    orgId: line.orgId,
    propertyId,
    tenancyId: line.suggestedTenancyId,
    date: line.date,
    kind: line.amount >= 0 ? (category === 'rent' ? 'rent' : 'tenant_invoice_payment') : 'expense',
    amount: line.amount,
    category,
    description,
    bankRef: line.reference,
    match: 'manual',
  })
  db.update('bankLines', lineId, { status: 'matched', ledgerId })
}

export function ignoreBankLine(lineId: ID): void {
  db.update('bankLines', lineId, { status: 'ignored' })
}

/** Puts a bank line back the way the feed left it, and removes the ledger entry filing it made. */
export function unfileBankLine(lineId: ID, was: 'suggested' | 'unmatched'): void {
  const line = db.get().bankLines.find((l) => l.id === lineId)
  if (!line) return
  if (line.ledgerId) db.remove('ledger', line.ledgerId)
  db.update('bankLines', lineId, { status: was, ledgerId: undefined })
}

/** Adds a cost by hand. Returns the entry's id so the screen can offer to take it back. */
export function addExpense(input: { orgId: ID; propertyId: ID; date: ISODate; amount: number; category: string; description: string }): ID {
  const id = newId('led')
  db.insert('ledger', { id, orgId: input.orgId, propertyId: input.propertyId, date: input.date, kind: 'expense', amount: -Math.abs(input.amount), category: input.category, description: input.description.trim(), match: 'manual' })
  return id
}

export function removeLedgerEntry(id: ID): void {
  db.remove('ledger', id)
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
