/**
 * What a landlord can do to a tenancy and to the people applying for one.
 * Same contract as `mutations.ts`: one function is one decision, it leaves a
 * record, and in production it is a server action that checks the rules again.
 */
import type { ApplicationStage, ID, ISODate, Notice } from '@/domain/types'
import type { JurisdictionPack } from '@/domain/jurisdictions/types'
import type { NoticeDraft } from '@/domain/notices'
import type { ClauseFinding } from '@/domain/rules/text'
import { addDays, today } from '@/domain/rules/calendar'
import { db, newId, nowIso } from './store'

/** Puts a notice on the record as served, and files a copy with the property's documents. */
export function serveNotice(
  tenancyId: ID,
  draft: NoticeDraft,
  d: { servedOn: ISODate; method: Notice['method']; receivedOn: ISODate; effectiveOn: ISODate },
  pack: JurisdictionPack,
): ID | undefined {
  const t = db.get().tenancies.find((x) => x.id === tenancyId)
  if (!t) return undefined
  const id = newId('no')
  db.insert('notices', {
    id,
    orgId: t.orgId,
    tenancyId,
    type: draft.type,
    createdAt: nowIso(),
    servedOn: d.servedOn,
    method: d.method,
    deemedReceivedOn: d.receivedOn,
    effectiveOn: d.effectiveOn,
    status: 'served',
    title: draft.title,
    body: draft.body,
    rulesUsed: draft.rulesUsed,
    packVersion: pack.version,
  })
  db.insert('docs', {
    id: newId('doc'),
    orgId: t.orgId,
    propertyId: t.propertyId,
    tenancyId,
    name: `${draft.title} ${d.servedOn}.pdf`,
    kind: 'notice',
    addedAt: nowIso(),
    sizeKb: 38,
    source: 'generated',
  })
  return id
}

/** A termination notice also changes the tenancy: it now has an end date. */
export function recordTermination(
  tenancyId: ID,
  by: 'landlord' | 'tenant',
  ground: string,
  endsOn: ISODate,
  receivedOn: ISODate = today(),
): void {
  db.update('tenancies', tenancyId, { status: 'notice_given', noticeGiven: { by, on: receivedOn, ground, endsOn } })
}

/**
 * Moves an applicant along. Declining starts the clock on deleting their
 * details: the retention period comes from the rule pack.
 */
export function moveApplication(applicationId: ID, stage: ApplicationStage, pack: JurisdictionPack): void {
  const a = db.get().applications.find((x) => x.id === applicationId)
  if (!a) return
  const keep = pack.rules['privacy.unsuccessful_applicant_retention'].value
  const decided = stage === 'declined' || stage === 'approved'
  db.update('applications', applicationId, {
    stage,
    decidedAt: decided ? nowIso() : a.decidedAt,
    purgeOn: stage === 'declined' && keep ? addDays(today(), keep.unit === 'days' ? keep.n : keep.n * 7) : a.purgeOn,
  })
}

/** Sends a new clause to the tenant to sign. A clause the scanner blocks is never sent. */
export function proposeClause(tenancyId: ID, text: string, findings: ClauseFinding[], signer: string): ID | undefined {
  const t = db.get().tenancies.find((x) => x.id === tenancyId)
  if (!t || findings.some((f) => f.severity === 'block')) return undefined
  const id = newId('var')
  db.insert('variations', {
    id,
    orgId: t.orgId,
    tenancyId,
    type: 'custom_clause',
    status: 'awaiting_tenant',
    requestedBy: 'landlord',
    requestedAt: nowIso(),
    summary: text.trim().length > 70 ? `${text.trim().slice(0, 67)}…` : text.trim(),
    detail: { clause: text.trim() },
    conditions: [],
    signatures: [{ by: 'landlord', name: signer, at: nowIso() }],
  })
  return id
}

export function withdrawVariation(variationId: ID): void {
  db.update('variations', variationId, { status: 'withdrawn' })
}
