import { describe, expect, it } from 'vitest'
import type { Inspection, InspectionRoom } from './types'
import { NZ } from './jurisdictions/nz'
import { calendarFor } from './rules/core'
import { at } from './seed'
import {
  draftSummary,
  needsFollowUp,
  overallScore,
  repairBrief,
  rhythmOf,
  roomsFor,
  standingOf,
  studioGate,
  unscoredRooms,
} from './inspections'

const cal = calendarFor(NZ, 'nelson')
// A plain working week: Monday 16 to Friday 20 November 2026.
const MON = '2026-11-16'
const WED = '2026-11-18'
const THU = '2026-11-19'

const room = (name: string, score?: number, flags: string[] = [], note?: string): InspectionRoom => ({
  name,
  score,
  flags,
  note,
  photoIds: [],
})

function inspection(patch: Partial<Inspection>): Inspection {
  return {
    id: 'in_x',
    orgId: 'org',
    propertyId: 'p',
    type: 'routine',
    status: 'proposed',
    mode: 'diy',
    rooms: roomsFor(2),
    ...patch,
  }
}

describe('a walk-through', () => {
  it('covers the shared rooms, each bedroom, and outside', () => {
    expect(roomsFor(3).map((r) => r.name)).toEqual([
      'Entry and hallway',
      'Living room',
      'Kitchen',
      'Bathroom',
      'Bedroom 1',
      'Bedroom 2',
      'Bedroom 3',
      'Laundry',
      'Exterior and grounds',
    ])
    expect(roomsFor(0)).toHaveLength(6)
  })

  it('scores overall as the mean of the scored rooms, to one decimal place', () => {
    expect(overallScore([room('A', 5), room('B', 4), room('C', 4)])).toBe(4.3)
    expect(overallScore([room('A', 5), room('B')])).toBe(5)
    expect(overallScore([room('A'), room('B')])).toBeUndefined()
  })

  it('names the rooms that still need a score', () => {
    expect(unscoredRooms([room('Kitchen', 4), room('Laundry'), room('Bathroom')])).toEqual(['Laundry', 'Bathroom'])
  })

  it('follows up anything flagged, and anything scored poor or worse', () => {
    expect(needsFollowUp(room('Kitchen', 5, ['damage']))).toBe(true)
    expect(needsFollowUp(room('Kitchen', 2))).toBe(true)
    expect(needsFollowUp(room('Kitchen', 3))).toBe(false)
    expect(needsFollowUp(room('Kitchen'))).toBe(false)
  })

  it('drafts a summary from the scores and flags, and says so when there is nothing to chase', () => {
    expect(draftSummary([room('Kitchen', 4), room('Bathroom', 3, ['damp'])])).toBe(
      '2 rooms checked, 3.5 out of 5 overall. To follow up: bathroom (damp or mould).',
    )
    expect(draftSummary([room('Kitchen', 5)])).toBe('1 room checked, 5.0 out of 5 overall. Nothing to follow up.')
    expect(draftSummary([room('Kitchen')])).toBe('')
  })

  it('files a flagged room under the kind of fault the repairs sorter knows', () => {
    const done = { type: 'routine' as const, completedAt: at(WED, 11) }
    expect(repairBrief(room('Hallway', 2, ['smoke_alarm'], 'Chirping every minute.'), done)).toMatchObject({
      issueKey: 'smoke_alarm',
      title: 'Hallway: smoke alarm',
    })
    expect(repairBrief(room('Bathroom', 3, ['damage', 'damp']), done).issueKey).toBe('mould')
    expect(repairBrief(room('Laundry', 1), done)).toMatchObject({
      issueKey: 'other',
      title: 'Laundry: needs attention',
    })
    // The sorter needs a sentence to read even when the inspector wrote no note.
    expect(repairBrief(room('Laundry', 1), done).description.length).toBeGreaterThan(20)
  })
})

describe('where a home stands', () => {
  const tenancy = { status: 'active' as const }

  it('puts a walk-through that has begun ahead of everything else', () => {
    const s = standingOf(
      tenancy,
      [inspection({ status: 'proposed' }), inspection({ id: 'b', status: 'in_progress' })],
      { status: 'fail' },
      WED,
    )
    expect(s).toMatchObject({ kind: 'underway', inspection: { id: 'b' } })
  })

  it('reports a booking, and notices when its day has gone by', () => {
    const booked = inspection({ status: 'notice_served', scheduledFor: at(WED, 11), noticeServedAt: at(MON, 9) })
    expect(standingOf(tenancy, [booked], { status: 'attention' }, MON)).toMatchObject({
      kind: 'booked',
      on: WED,
      late: false,
    })
    expect(standingOf(tenancy, [booked], { status: 'attention' }, WED)).toMatchObject({ kind: 'booked', late: false })
    expect(standingOf(tenancy, [booked], { status: 'attention' }, THU)).toMatchObject({ kind: 'booked', late: true })
  })

  it('agrees with the compliance check about whether one is due', () => {
    expect(standingOf(tenancy, [], { status: 'ok', due: '2027-02-01' }, WED)).toEqual({
      kind: 'current',
      due: '2027-02-01',
    })
    expect(standingOf(tenancy, [], { status: 'attention', due: WED }, WED)).toMatchObject({
      kind: 'to_book',
      overdue: false,
    })
    expect(standingOf(tenancy, [], { status: 'fail', due: '2026-10-01' }, WED)).toMatchObject({
      kind: 'to_book',
      overdue: true,
    })
  })

  it('plans nothing routine for a home nobody lives in', () => {
    expect(standingOf(undefined, [], { status: 'na' }, WED)).toEqual({ kind: 'vacant' })
    expect(standingOf({ status: 'ended' }, [inspection({ status: 'proposed' })], undefined, WED)).toEqual({
      kind: 'vacant',
    })
  })

  it('counts the weeks since the last one against the gap the insurer expects', () => {
    expect(rhythmOf('2026-08-19', '2026-11-18', WED)).toEqual({ weeksSince: 13, weeksBetween: 13 })
    expect(rhythmOf(undefined, WED, WED)).toBeUndefined()
  })
})

describe('the studio door', () => {
  const booked = inspection({ status: 'notice_served', scheduledFor: at(WED, 11), noticeServedAt: at(MON, 9) })

  it('stays shut until a day is booked', () => {
    const gate = studioGate(NZ, cal, inspection({ status: 'proposed' }), { today: WED, hour: 11 })
    expect(gate).toMatchObject({ open: false, next: 'book', verdict: { rule: 'entry.inspection_notice_min' } })
  })

  it('opens on the named day once the notice has run', () => {
    expect(studioGate(NZ, cal, booked, { today: WED, hour: 11 }).open).toBe(true)
  })

  it('stays shut before the named day and after it', () => {
    expect(studioGate(NZ, cal, booked, { today: MON, hour: 11 })).toMatchObject({ open: false, next: 'wait' })
    expect(studioGate(NZ, cal, booked, { today: THU, hour: 11 })).toMatchObject({ open: false, next: 'rebook' })
  })

  it('refuses a day the notice has not reached, with the rule that says so', () => {
    // Served on Tuesday for Wednesday: one day of notice, not the minimum.
    const rushed = inspection({
      status: 'notice_served',
      scheduledFor: at(WED, 11),
      noticeServedAt: at('2026-11-17', 9),
    })
    expect(studioGate(NZ, cal, rushed, { today: WED, hour: 11 })).toMatchObject({
      open: false,
      next: 'wait',
      verdict: { rule: 'entry.inspection_notice_min' },
    })
  })

  it('refuses to begin outside the hours entry is allowed', () => {
    expect(studioGate(NZ, cal, booked, { today: WED, hour: 21 })).toMatchObject({
      open: false,
      verdict: { rule: 'entry.hours' },
    })
    expect(studioGate(NZ, cal, booked, { today: WED, hour: 7 })).toMatchObject({
      open: false,
      verdict: { rule: 'entry.hours' },
    })
  })

  it('refuses a second inspection inside the minimum gap', () => {
    const gate = studioGate(NZ, cal, booked, { today: WED, hour: 11, lastRoutine: '2026-11-02' })
    expect(gate).toMatchObject({ open: false, verdict: { rule: 'entry.inspection_min_interval' } })
  })

  it('always reopens a walk-through that has begun, whatever the hour', () => {
    expect(studioGate(NZ, cal, { ...booked, status: 'in_progress' }, { today: THU, hour: 22 }).open).toBe(true)
  })

  it('is not for an inspection someone else is doing, or one that is over', () => {
    const delegated = studioGate(
      NZ,
      cal,
      { ...booked, mode: 'delegated' },
      { today: WED, hour: 11, providerName: 'Kate Ferguson' },
    )
    expect(delegated).toMatchObject({ open: false, next: 'none' })
    expect(delegated.open === false && delegated.verdict.reason).toContain('Kate Ferguson')
    expect(studioGate(NZ, cal, { ...booked, status: 'completed' }, { today: WED, hour: 11 })).toMatchObject({
      open: false,
      next: 'report',
    })
    expect(studioGate(NZ, cal, { ...booked, status: 'cancelled' }, { today: WED, hour: 11 })).toMatchObject({
      open: false,
      next: 'none',
    })
  })
})
