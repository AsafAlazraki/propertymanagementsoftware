/**
 * Inspections, as arithmetic.
 *
 * Three questions the list, the studio and the mutations all ask: where does a
 * home stand in its inspection rhythm, may the walk-through begin right now,
 * and what does a finished walk-through add up to. They are answered here,
 * pure, so the answer is the same wherever it is asked.
 *
 * Nothing in this file is law. The dates come from `rules/tenancy` and the
 * rule pack; this only arranges them.
 */
import type { Inspection, InspectionRoom, ISODate, Tenancy } from './types'
import type { JurisdictionPack } from './jurisdictions/types'
import type { CheckResult } from './rules/compliance'
import { dateOf, diffDays, fmtDate, type CalendarConfig } from './rules/calendar'
import type { Verdict } from './rules/core'
import { listOf, plural } from './rules/format'
import { checkInspectionSlot, inspectionWindow, type InspectionWindow } from './rules/tenancy'

/* ────────────────────────────────── rooms ───────────────────────────────── */

/** The rooms a walk-through covers, in the order a person would walk them. */
export function roomsFor(beds: number): InspectionRoom[] {
  const names = [
    'Entry and hallway',
    'Living room',
    'Kitchen',
    'Bathroom',
    ...Array.from({ length: Math.max(0, beds) }, (_, i) => `Bedroom ${i + 1}`),
    'Laundry',
    'Exterior and grounds',
  ]
  return names.map((name) => ({ name, photoIds: [], flags: [] }))
}

/** What a score means, in a word. The scale is the one on the record: 1 needs action, 5 is excellent. */
export const SCORE_WORDS: Record<number, string> = {
  1: 'Needs action',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Excellent',
}

export const SCORES = [1, 2, 3, 4, 5] as const

/** Things worth a second look. `issueKey` is how the repairs sorter would file it. */
export const ROOM_FLAGS = [
  { key: 'damp', label: 'Damp or mould', issueKey: 'mould' },
  { key: 'damage', label: 'Damage', issueKey: 'other' },
  { key: 'smoke_alarm', label: 'Smoke alarm', issueKey: 'smoke_alarm' },
  { key: 'needs_repair', label: 'Needs repair', issueKey: 'other' },
] as const

export function flagLabel(key: string): string {
  return ROOM_FLAGS.find((f) => f.key === key)?.label ?? key
}

/** A room someone should come back to: anything flagged, or scored poor or worse. */
export function needsFollowUp(room: InspectionRoom): boolean {
  return room.flags.length > 0 || (room.score !== undefined && room.score <= 2)
}

export function unscoredRooms(rooms: InspectionRoom[]): string[] {
  return rooms.filter((r) => r.score === undefined).map((r) => r.name)
}

/** The mean of the scored rooms, to one decimal place. Undefined until a room has a score. */
export function overallScore(rooms: InspectionRoom[]): number | undefined {
  const scores = rooms.map((r) => r.score).filter((s): s is number => s !== undefined)
  if (scores.length === 0) return undefined
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
}

/** A first draft of the report's summary, from the scores and flags alone. The inspector rewrites it. */
export function draftSummary(rooms: InspectionRoom[]): string {
  const overall = overallScore(rooms)
  if (overall === undefined) return ''
  const scored = rooms.filter((r) => r.score !== undefined).length
  const follow = rooms.filter(needsFollowUp).map((r) => {
    const why = r.flags.length ? listOf(r.flags.map((f) => flagLabel(f).toLowerCase())) : `scored ${r.score} out of 5`
    return `${r.name.toLowerCase()} (${why})`
  })
  const lead = `${plural(scored, 'room')} checked, ${overall.toFixed(1)} out of 5 overall.`
  return follow.length ? `${lead} To follow up: ${listOf(follow)}.` : `${lead} Nothing to follow up.`
}

/** What the repairs sorter needs to open a job for a room that was flagged. */
export function repairBrief(
  room: InspectionRoom,
  inspection: Pick<Inspection, 'type' | 'completedAt'>,
): { issueKey: string; title: string; description: string } {
  const flag =
    ROOM_FLAGS.find((f) => room.flags.includes(f.key) && f.issueKey !== 'other') ??
    ROOM_FLAGS.find((f) => room.flags.includes(f.key))
  const labels = room.flags.map((f) => flagLabel(f).toLowerCase())
  const what = labels.length ? listOf(labels) : 'needs attention'
  const when = inspection.completedAt ? ` on ${fmtDate(dateOf(inspection.completedAt), { year: 'always' })}` : ''
  const note = room.note?.trim()
  return {
    issueKey: flag?.issueKey ?? 'other',
    title: `${room.name}: ${what}`,
    description: `Found in the ${room.name.toLowerCase()} at the ${inspection.type} inspection${when}.${note ? ` ${note}` : ` Noted as: ${what}.`}`,
  }
}

/* ───────────────────────────── a home's rhythm ──────────────────────────── */

export function byNewest(a: Inspection, b: Inspection): number {
  return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
}

/** The most recent finished inspection of a home. `routineOnly` is what the four-week rule counts. */
export function lastCompleted(
  inspections: Inspection[],
  propertyId: string,
  opts: { routineOnly?: boolean; excludeId?: string } = {},
): Inspection | undefined {
  return inspections
    .filter(
      (i) =>
        i.propertyId === propertyId &&
        i.status === 'completed' &&
        i.id !== opts.excludeId &&
        (!opts.routineOnly || i.type === 'routine'),
    )
    .sort(byNewest)[0]
}

export type Standing =
  /** Nobody lives there, so there is no routine inspection to plan. */
  | { kind: 'vacant' }
  /** A walk-through has been started and not finished. */
  | { kind: 'underway'; inspection: Inspection }
  /** Notice is served and a day is named. `late` once that day has gone by. */
  | { kind: 'booked'; inspection: Inspection; on: ISODate; late: boolean }
  /** One is due, or nearly, and no day is booked. */
  | { kind: 'to_book'; inspection?: Inspection; due?: ISODate; overdue: boolean }
  /** Nothing to do until `due`. */
  | { kind: 'current'; due?: ISODate }

/**
 * Where one home stands. `check` is the compliance engine's own reading of
 * "routine inspection up to date", so this screen can never disagree with the
 * compliance score about whether one is due.
 */
export function standingOf(
  tenancy: Pick<Tenancy, 'status'> | undefined,
  inspections: Inspection[],
  check: Pick<CheckResult, 'status' | 'due'> | undefined,
  today: ISODate,
): Standing {
  const underway = inspections.find((i) => i.status === 'in_progress')
  if (underway) return { kind: 'underway', inspection: underway }

  const booked = inspections
    .filter((i) => i.status === 'notice_served' && i.scheduledFor)
    .sort((a, b) => (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? ''))[0]
  if (booked?.scheduledFor) {
    const on = dateOf(booked.scheduledFor)
    return { kind: 'booked', inspection: booked, on, late: on < today }
  }

  const lived = tenancy && (tenancy.status === 'active' || tenancy.status === 'notice_given')
  if (!lived) return { kind: 'vacant' }

  const proposed = inspections.find((i) => i.status === 'proposed')
  if (proposed || check?.status === 'attention' || check?.status === 'fail') {
    return { kind: 'to_book', inspection: proposed, due: check?.due, overdue: check?.status === 'fail' }
  }
  return { kind: 'current', due: check?.due }
}

/** Lower sorts first: what needs the landlord, then what is coming, then what is quiet. */
export function standingRank(s: Standing): number {
  switch (s.kind) {
    case 'underway':
      return 0
    case 'booked':
      return s.late ? 1 : 4
    case 'to_book':
      return s.overdue ? 2 : 3
    case 'current':
      return 5
    case 'vacant':
      return 6
  }
}

/** How far through the gap between inspections a home is, in whole weeks. */
export function rhythmOf(
  last: ISODate | undefined,
  due: ISODate | undefined,
  today: ISODate,
): { weeksSince: number; weeksBetween: number } | undefined {
  if (!last || !due) return undefined
  return {
    weeksSince: Math.max(0, Math.floor(diffDays(last, today) / 7)),
    weeksBetween: Math.max(1, Math.round(diffDays(last, due) / 7)),
  }
}

/* ─────────────────────────────── the studio ─────────────────────────────── */

export type StudioGate =
  | { open: true; window?: InspectionWindow }
  | {
      open: false
      verdict: Verdict
      /** What would open it: book a day, wait for the day, book again, read the report — or nothing here. */
      next: 'book' | 'wait' | 'rebook' | 'report' | 'none'
      window?: InspectionWindow
    }

/**
 * Whether the room-by-room studio may open for an inspection right now.
 *
 * A walk-through that has already begun always reopens: finishing the notes at
 * the kitchen table that evening is not entry. One that has not begun opens
 * only on the day the notice names, once the notice has run, inside the hours
 * entry is allowed — each of which is `checkInspectionSlot`'s call, not ours.
 */
export function studioGate(
  pack: JurisdictionPack,
  cal: CalendarConfig,
  i: Pick<Inspection, 'status' | 'mode' | 'scheduledFor' | 'noticeServedAt'>,
  ctx: { today: ISODate; hour: number; lastRoutine?: ISODate; providerName?: string },
): StudioGate {
  if (i.status === 'completed') {
    return {
      open: false,
      next: 'report',
      verdict: { ok: false, reason: 'This inspection is finished.', fix: 'Its report is on file.' },
    }
  }
  if (i.status === 'cancelled') {
    return {
      open: false,
      next: 'none',
      verdict: {
        ok: false,
        reason: 'This inspection was cancelled.',
        fix: 'Book a new one from the list of inspections.',
      },
    }
  }
  if (i.mode === 'delegated' && i.status !== 'proposed') {
    return {
      open: false,
      next: 'none',
      verdict: {
        ok: false,
        reason: `This one is booked with ${ctx.providerName ?? 'a local inspector'}.`,
        fix: 'The studio is for a walk-through you do yourself. Their report will appear in the list of inspections.',
      },
    }
  }
  if (i.status === 'in_progress') return { open: true }

  if (i.status === 'proposed' || !i.scheduledFor || !i.noticeServedAt) {
    return {
      open: false,
      next: 'book',
      verdict: {
        ok: false,
        rule: 'entry.inspection_notice_min',
        reason: 'No day has been booked, so the tenants have had no notice.',
        fix: 'Book a day first. The notice goes to the tenants when you do.',
      },
    }
  }

  const on = dateOf(i.scheduledFor)
  const served = new Date(i.noticeServedAt)
  const window = inspectionWindow(
    pack,
    cal,
    { sentOn: dateOf(i.noticeServedAt), method: 'email', hour: served.getHours() },
    ctx.lastRoutine,
  )

  if (ctx.today > on) {
    return {
      open: false,
      next: 'rebook',
      window,
      verdict: {
        ok: false,
        rule: 'entry.inspection_notice_min',
        reason: `The day the notice named, ${fmtDate(on)}, has passed.`,
        fix: 'Book a new day so the tenants get a fresh notice.',
      },
    }
  }
  if (ctx.today < on) {
    return {
      open: false,
      next: 'wait',
      window,
      verdict: {
        ok: false,
        rule: 'entry.inspection_notice_min',
        reason: `This inspection is booked for ${fmtDate(on)}.`,
        fix: 'The notice names that day, so the studio opens then.',
      },
    }
  }
  const slot = checkInspectionSlot(pack, window, ctx.today, ctx.hour)
  if (!slot.ok) return { open: false, next: 'wait', window, verdict: slot }
  return { open: true, window }
}
