import { describe, expect, it } from 'vitest'
import type { FieldTask, Provider } from './types'
import { buildSeed, DEMO } from './seed'
import { canDo, fieldSpend, phaseOf, providersFor, SERVICES } from './fieldServices'

const db = buildSeed('2026-11-14')
const names = (ps: Provider[]) => ps.map((p) => p.name)

describe('who can be booked', () => {
  it('offers only vetted inspectors for inspections and condition reports, best record first', () => {
    expect(names(providersFor('routine_inspection', db.providers))).toEqual(['Kate Ferguson', 'Manaia Rāwiri'])
    expect(names(providersFor('entry_exit_report', db.providers))).toEqual(['Kate Ferguson', 'Manaia Rāwiri'])
  })

  it('offers a viewing only to someone who hosts viewings', () => {
    expect(names(providersFor('viewing', db.providers))).toEqual(['Manaia Rāwiri'])
  })

  it('sends Tribunal work to an agent, never to an inspector or a tradesperson', () => {
    expect(names(providersFor('tribunal_representation', db.providers))).toEqual(['Blue Penguin Lettings'])
    expect(db.providers.filter((p) => p.kind === 'trade').some((p) => SERVICES.some((s) => canDo(p, s.type)))).toBe(
      false,
    )
  })

  it('never offers someone whose vetting is not finished', () => {
    const oliver = db.providers.find((p) => p.id === 'pr_oliver')!
    expect(oliver.vetting).toBe('pending')
    expect(canDo(oliver, 'routine_inspection')).toBe(true)
    expect(SERVICES.flatMap((s) => providersFor(s.type, db.providers)).some((p) => p.id === oliver.id)).toBe(false)
  })
})

describe('what the jobs add up to', () => {
  const mine = db.fieldTasks.filter((t) => t.orgId === DEMO.org)

  it('counts money spent only for jobs that were done', () => {
    const s = fieldSpend(mine)
    expect(s.spent).toBe(85 + 140 + 65 + 140 + 85)
    expect(s.doneCount).toBe(5)
    expect(s.booked).toBe(65)
    expect(s.aheadCount).toBe(1)
    expect(s.byService.reduce((a, x) => a + x.amount, 0)).toBe(s.spent)
    expect(s.byService.map((x) => x.type)).toEqual(['routine_inspection', 'viewing', 'entry_exit_report'])
  })

  it('leaves a cancelled job out of both totals', () => {
    const cancelled: FieldTask = { ...mine[0], id: 'ft_x', status: 'cancelled', price: 999 }
    expect(phaseOf('cancelled')).toBe('cancelled')
    expect(fieldSpend([...mine, cancelled])).toEqual(fieldSpend(mine))
  })
})
