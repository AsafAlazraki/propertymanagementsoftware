import { describe, expect, it } from 'vitest'
import type { Doc } from './types'
import { buildSeed, DEMO } from './seed'
import { resolvePack } from './jurisdictions'
import { DOC_KINDS, DOC_KIND_LABEL, documentFacts } from './documents'

const TODAY = '2026-11-14'
const db = buildSeed(TODAY)
const pack = resolvePack('NZ', db.packVersions, TODAY)
const row = (kind: Doc['kind']) => db.docs.find((d) => d.kind === kind && d.propertyId === 'p_totara')!
const value = (doc: Doc, label: string) => documentFacts(db, doc, pack).rows.find((r) => r.label === label)?.value

describe('what Loop holds about a document', () => {
  it('names every kind of document', () => {
    expect(DOC_KINDS.every((k) => DOC_KIND_LABEL[k].length > 0)).toBe(true)
  })

  it('shows the terms of the tenancy behind an agreement, from the tenancy record', () => {
    const doc = row('tenancy_agreement')
    const tenancy = db.tenancies.find((t) => t.id === doc.tenancyId)!
    expect(value(doc, 'Rent')).toBe(`$${tenancy.weeklyRent} a week`)
    expect(value(doc, 'Tenants')).toContain('Mia Thompson')
    expect(value(doc, 'Term')).toBe('Periodic')
  })

  it('shows the bond reference and where it was lodged, with the authority named by the pack', () => {
    const doc = row('bond_receipt')
    const tenancy = db.tenancies.find((t) => t.id === doc.tenancyId)!
    expect(value(doc, 'Reference')).toBe(tenancy.bond.bondRef)
    expect(value(doc, 'Lodged with')).toBe(pack.bondAuthority.name)
    expect(documentFacts(db, doc, pack).note).toContain(pack.bondAuthority.name)
  })

  it('shows all five healthy homes standards for a statement', () => {
    const { rows } = documentFacts(db, row('healthy_homes_statement'), pack)
    expect(rows.slice(0, 5).map((r) => r.label)).toEqual(['Heating', 'Insulation', 'Ventilation', 'Moisture and drainage', 'Draught stopping'])
  })

  it('finds the inspection behind a seeded report by its date, and the one it names when it names one', () => {
    const seeded = documentFacts(db, row('inspection_report'), pack)
    expect(seeded.inspectionId).toBeDefined()
    const inspection = db.inspections.find((i) => i.status === 'completed')!
    const named = documentFacts(db, { ...row('inspection_report'), refId: inspection.id }, pack)
    expect(named.inspectionId).toBe(inspection.id)
  })

  it('shows a notice in full, in the words that were stored when it was given', () => {
    const notice = db.notices.find((n) => n.status === 'served')!
    const tenancy = db.tenancies.find((t) => t.id === notice.tenancyId)!
    const doc: Doc = { id: 'doc_x', orgId: DEMO.org, propertyId: tenancy.propertyId, tenancyId: tenancy.id, name: 'A notice.pdf', kind: 'notice', addedAt: `${TODAY}T00:00:00.000Z`, sizeKb: 38, source: 'generated', refId: notice.id }
    const facts = documentFacts(db, doc, pack)
    expect(facts.paper?.title).toBe(notice.title)
    expect(facts.paper?.body).toBe(notice.body)
    expect(facts.paper?.footer).toContain(notice.packVersion)
  })

  it('says so, and invents nothing, where the records hold nothing', () => {
    const doc: Doc = { ...row('tenancy_agreement'), kind: 'other' }
    const facts = documentFacts(db, doc, pack)
    expect(facts.rows).toEqual([])
    expect(facts.paper).toBeUndefined()
    expect(facts.note).toContain('nothing about this document')
    // A row that points at a tenancy that is gone shows no terms, not another tenancy's.
    expect(documentFacts(db, { ...row('tenancy_agreement'), tenancyId: 't_gone' }, pack).rows).toEqual([])
  })
})
