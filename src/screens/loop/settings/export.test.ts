import { describe, expect, it } from 'vitest'
import { buildSeed, DEMO } from '@/domain/seed'
import { collectOrgData, exportContents } from './export'

const db = buildSeed('2026-11-14')
const data = collectOrgData(db, DEMO.org, '2026-11-14T00:00:00.000Z')

/** Every array in the export whose rows say which organisation they belong to. */
const owned = Object.entries(data).flatMap(([key, value]) =>
  Array.isArray(value)
    ? (value as object[])
        .filter((row) => 'orgId' in row)
        .map((row) => ({ key, orgId: (row as { orgId?: string }).orgId }))
    : [],
)

describe('downloading everything', () => {
  it('carries every row of the organisation and no row of any other', () => {
    expect(owned.length).toBeGreaterThan(100)
    expect(owned.filter((r) => r.orgId !== DEMO.org)).toEqual([])
    expect(data.properties).toHaveLength(db.properties.filter((p) => p.orgId === DEMO.org).length)
    expect(data.ledger).toHaveLength(db.ledger.filter((l) => l.orgId === DEMO.org).length)
    expect(data.inspections).toHaveLength(db.inspections.filter((i) => i.orgId === DEMO.org).length)
    expect(data.organisation?.id).toBe(DEMO.org)
  })

  it('names the tenants its own tenancies point at, and nobody else', () => {
    const expected = new Set(db.tenancies.filter((t) => t.orgId === DEMO.org).flatMap((t) => t.tenantIds))
    expect(new Set(data.tenants.map((t) => t.id))).toEqual(expected)
    // Contact details only: nothing about a tenant's role, status or activity leaves with the landlord.
    expect(Object.keys(data.tenants[0]).sort()).toEqual(['email', 'fullName', 'id', 'phone'])
  })

  it('leaves the platform’s own records out', () => {
    const keys = Object.keys(data)
    for (const platform of ['adminTasks', 'audit', 'incidents', 'providers', 'renterProfiles', 'kb', 'ruleChanges'])
      expect(keys).not.toContain(platform)
  })

  it('describes its contents with counts that match the file', () => {
    const contents = exportContents(data)
    expect(contents.find((c) => c.label === 'Homes')?.rows).toBe(data.properties.length)
    const total = contents.reduce((a, c) => a + c.rows, 0)
    const arrays = Object.values(data).filter(Array.isArray) as unknown[][]
    expect(total).toBe(arrays.reduce((a, rows) => a + rows.length, 0))
  })
})
