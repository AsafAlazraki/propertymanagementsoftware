/**
 * What Loop holds about a document.
 *
 * A row in the documents list is a name and a date. Behind most rows Loop also
 * holds the facts the document records: the terms it read from an agreement,
 * the bond reference, the notice it wrote. This turns a row into those facts,
 * so a document can be opened and read even where no file is attached, and so
 * nothing is shown that the records do not hold.
 */
import type { Doc, ID, Inspection, Notice } from './types'
import type { Db } from './db'
import type { JurisdictionPack } from './jurisdictions/types'
import { dateOf, fmtDate } from './rules/calendar'
import { money, plural } from './rules/format'

export const DOC_KIND_LABEL: Record<Doc['kind'], string> = {
  tenancy_agreement: 'Tenancy agreement',
  healthy_homes_statement: 'Healthy homes statement',
  insurance: 'Insurance policy',
  bond_receipt: 'Bond receipt',
  inspection_report: 'Inspection report',
  body_corp_rules: 'Body corporate rules',
  meth_report: 'Methamphetamine test report',
  invoice: 'Invoice',
  notice: 'Notice',
  other: 'Other document',
}

export const DOC_KINDS = Object.keys(DOC_KIND_LABEL) as Doc['kind'][]

export interface DocumentFacts {
  /** Facts from the records, in the order a person would read them. */
  rows: { label: string; value: string }[]
  /** A document Loop wrote, and so can show in full. */
  paper?: { title: string; body: string; footer: string }
  /** The record in the app this document was made from. */
  inspectionId?: ID
  /** What the rows are, and what they are not. */
  note: string
}

const day = (d: string) => fmtDate(d, { weekday: false, year: 'always' })

const STANDARD_WORD = { compliant: 'Meets the standard', non_compliant: 'Does not meet it', unknown: 'Not recorded', exempt: 'Exempt' } as const
const STANDARD_LABEL = { heating: 'Heating', insulation: 'Insulation', ventilation: 'Ventilation', moisture: 'Moisture and drainage', draught: 'Draught stopping' } as const
const SERVED_BY = { email: 'by email', hand: 'by hand', letterbox: 'in the letterbox', post: 'by post' } as const
const INSPECTION_TYPE = { routine: 'Routine inspection', entry: 'Entry condition report', exit: 'Exit condition report' } as const

/** The inspection a report row was made from: the one it names, or the nearest finished one for that home. */
function inspectionFor(db: Db, doc: Doc): Inspection | undefined {
  if (doc.refId) return db.inspections.find((i) => i.id === doc.refId)
  const filed = dateOf(doc.addedAt)
  return db.inspections
    .filter((i) => i.propertyId === doc.propertyId && i.status === 'completed' && i.completedAt)
    .map((i) => ({ i, gap: Math.abs(Date.parse(dateOf(i.completedAt!)) - Date.parse(filed)) }))
    .filter((x) => x.gap <= 3 * 86_400_000)
    .sort((a, b) => a.gap - b.gap)[0]?.i
}

/** The notice a row was made from: the one it names, or the one whose title and date are in the file name. */
function noticeFor(db: Db, doc: Doc): Notice | undefined {
  if (doc.refId) return db.notices.find((n) => n.id === doc.refId)
  return db.notices.find((n) => n.tenancyId === doc.tenancyId && doc.name.startsWith(n.title) && doc.name.includes(n.servedOn))
}

export function documentFacts(db: Db, doc: Doc, pack: JurisdictionPack): DocumentFacts {
  const property = db.properties.find((p) => p.id === doc.propertyId)
  const tenancy = doc.tenancyId ? db.tenancies.find((t) => t.id === doc.tenancyId) : undefined
  const names = (ids: ID[]) => ids.map((id) => db.users.find((u) => u.id === id)?.fullName ?? 'A tenant').join(' and ')

  switch (doc.kind) {
    case 'tenancy_agreement': {
      if (!tenancy) return { rows: [], note: 'Loop holds no tenancy for this agreement, so there are no terms to show.' }
      return {
        rows: [
          { label: 'Tenants', value: names(tenancy.tenantIds) },
          ...(property ? [{ label: 'Home', value: `${property.address.line1}, ${property.address.suburb}` }] : []),
          { label: 'Started', value: day(tenancy.startDate) },
          { label: 'Term', value: tenancy.type === 'fixed' && tenancy.endDate ? `Fixed, to ${day(tenancy.endDate)}` : 'Periodic' },
          { label: 'Rent', value: `${money(tenancy.weeklyRent)} a week` },
          { label: 'Bond', value: money(tenancy.bond.amount) },
        ],
        note: 'These are the terms Loop holds for this tenancy. The agreement itself is the signed file.',
      }
    }
    case 'bond_receipt': {
      if (!tenancy) return { rows: [], note: 'Loop holds no tenancy for this receipt.' }
      const b = tenancy.bond
      return {
        rows: [
          { label: 'Bond', value: money(b.amount) },
          ...(b.receivedOn ? [{ label: 'Received from the tenant', value: day(b.receivedOn) }] : []),
          ...(b.lodgedOn ? [{ label: 'Lodged', value: day(b.lodgedOn) }] : []),
          ...(b.bondRef ? [{ label: 'Reference', value: b.bondRef }] : []),
          { label: 'Lodged with', value: pack.bondAuthority.name },
        ],
        note: `This is Loop’s record of the lodgement. The receipt itself comes from ${pack.bondAuthority.name}.`,
      }
    }
    case 'healthy_homes_statement': {
      if (!property) return { rows: [], note: 'Loop holds no home for this statement.' }
      const hh = property.healthyHomes
      return {
        rows: [
          ...(['heating', 'insulation', 'ventilation', 'moisture', 'draught'] as const).map((k) => ({
            label: STANDARD_LABEL[k],
            value: hh[k].detail ? `${STANDARD_WORD[hh[k].status]} — ${hh[k].detail}` : STANDARD_WORD[hh[k].status],
          })),
          ...(hh.statementSignedAt ? [{ label: 'Statement signed', value: day(hh.statementSignedAt) }] : []),
        ],
        note: 'This is the home’s healthy homes record as it stands today, which is what a statement is written from. A statement signed earlier may have said something different.',
      }
    }
    case 'insurance': {
      const ins = property?.insurance
      if (!ins?.insurer) return { rows: [], note: 'Loop holds no insurance details for this home yet.' }
      return {
        rows: [
          { label: 'Insurer', value: ins.insurer },
          ...(ins.policyRef ? [{ label: 'Policy', value: ins.policyRef }] : []),
          ...(ins.excess !== undefined ? [{ label: 'Excess', value: money(ins.excess) }] : []),
          ...(ins.renewsOn ? [{ label: 'Renews', value: day(ins.renewsOn) }] : []),
          ...(ins.inspectionIntervalWeeks ? [{ label: 'Inspections expected', value: `every ${plural(ins.inspectionIntervalWeeks, 'week')}` }] : []),
        ],
        note: 'These are the details Loop holds for the home’s insurance today. The policy schedule itself is the insurer’s file.',
      }
    }
    case 'inspection_report': {
      const i = inspectionFor(db, doc)
      if (!i) return { rows: [], note: 'Loop cannot find the inspection this report was made from.' }
      const photos = i.rooms.reduce((n, r) => n + r.photoIds.length, 0)
      return {
        rows: [
          { label: 'Kind', value: INSPECTION_TYPE[i.type] },
          ...(i.completedAt ? [{ label: 'Finished', value: day(dateOf(i.completedAt)) }] : []),
          ...(i.overallScore !== undefined ? [{ label: 'Overall', value: `${i.overallScore} out of 5` }] : []),
          { label: 'Rooms', value: String(i.rooms.length) },
          { label: 'Photos', value: String(photos) },
          ...(i.summary ? [{ label: 'Summary', value: i.summary }] : []),
        ],
        inspectionId: i.id,
        note: 'The report is made from the inspection’s own record, room by room.',
      }
    }
    case 'notice': {
      const n = noticeFor(db, doc)
      if (!n) return { rows: [], note: 'Loop cannot find the notice this row was made from.' }
      return {
        rows: [
          { label: 'Given', value: `${day(n.servedOn)}, ${SERVED_BY[n.method]}` },
          { label: 'Treated as received', value: day(n.deemedReceivedOn) },
          { label: 'Takes effect', value: day(n.effectiveOn) },
          ...(n.status === 'withdrawn' ? [{ label: 'Status', value: 'Withdrawn' }] : []),
        ],
        paper: { title: n.title, body: n.body, footer: `Given ${day(n.servedOn)} ${SERVED_BY[n.method]}. Worked out on rule pack ${n.packVersion}.` },
        note: 'This is the notice exactly as it was given: the same words that were stored when it was served.',
      }
    }
    default:
      return { rows: [], note: 'Loop holds nothing about this document beyond its name and the day it was added.' }
  }
}
