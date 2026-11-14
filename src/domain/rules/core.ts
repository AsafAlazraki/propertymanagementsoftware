/**
 * The parts every statutory calculation shares: the calendar for a place, how
 * a duration is counted, and when the law treats a notice as received.
 *
 * Every calculator returns its working as `Step`s. Showing the steps is the
 * product: a landlord who can see why the date is the date does not need to
 * take it on trust, and can check it against the Act.
 */
import type { ISODate } from '../types'
import type { Duration, JurisdictionPack, RuleKey, ServiceMethod } from '../jurisdictions/types'
import {
  addDays,
  addMonths,
  addWeeks,
  addWorkingDays,
  beyondCoverage,
  isWorkingDay,
  nextWorkingDay,
  nonWorkingReason,
  type CalendarConfig,
} from './calendar'

export interface Step {
  label: string
  date?: ISODate
  detail?: string
  /** The rule this step applies, so the UI can link to its citation. */
  rule?: RuleKey
  /** True when the step is Loop's own margin rather than a legal requirement. */
  policy?: boolean
}

/** The answer to "may I do this?" — and, when the answer is no, why and what would work. */
export interface Verdict {
  ok: boolean
  reason?: string
  fix?: string
  rule?: RuleKey
}

export const OK: Verdict = { ok: true }

/** The calendar that applies at a property: the national table plus its area's anniversary day. */
export function calendarFor(pack: JurisdictionPack, region?: string): CalendarConfig {
  const regional = region ? pack.regionalHolidays[region]?.dates ?? [] : []
  return regional.length ? { ...pack.calendar, holidays: [...pack.calendar.holidays, ...regional] } : pack.calendar
}

/**
 * The date a period ends when it starts running the day after `from`.
 * Hours are rounded up to whole days: "48 hours" from any time on Monday is
 * safely satisfied on Wednesday.
 */
export function addDuration(from: ISODate, d: Duration, cal: CalendarConfig): ISODate {
  switch (d.unit) {
    case 'hours':
      return addDays(from, Math.ceil(d.n / 24))
    case 'days':
      return addDays(from, d.n)
    case 'weeks':
      return addWeeks(from, d.n)
    case 'months':
      return addMonths(from, d.n)
    case 'working_days':
      return addWorkingDays(from, d.n, cal)
  }
}

export function durationText(d: Duration): string {
  const unit = d.unit === 'working_days' ? (d.n === 1 ? 'working day' : 'working days') : d.n === 1 ? d.unit.slice(0, -1) : d.unit
  return `${d.n} ${unit}`
}

/**
 * A hyphen followed by a word joiner (U+2060), which has no width and no glyph.
 * A browser may break a line after a plain hyphen, and on a phone that left
 * "14-" at the end of one line and "day notice" at the start of the next.
 */
const HYPHEN = '-\u2060'

/** `14-day`, `23-working-day`, `48-hour`: a duration standing in front of a noun, kept in one piece. */
export function durationAdjective(d: Duration): string {
  return `${d.n}${HYPHEN}${d.unit === 'working_days' ? `working${HYPHEN}day` : d.unit.slice(0, -1)}`
}

/** `a 14-day`, `an 80-day`: the same, with the article its number takes when said aloud. */
export function aDuration(d: Duration): string {
  const vowel = d.n === 11 || d.n === 18 || String(d.n).startsWith('8')
  return `${vowel ? 'an' : 'a'} ${durationAdjective(d)}`
}

function isDuration(v: unknown): v is Duration {
  return typeof v === 'object' && v !== null && typeof (v as Duration).n === 'number' && typeof (v as Duration).unit === 'string'
}

/** Any rule value as words: for a diff line, a comparison cell, or a note that a value has changed. */
export function ruleValueText(ruleKey: string, value: unknown): string {
  if (value === null || value === undefined) return 'No rule'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') {
    if (ruleKey.endsWith('_weeks')) return `${value} ${value === 1 ? 'week' : 'weeks'} of rent`
    if (ruleKey.endsWith('_months')) return `${value} ${value === 1 ? 'month' : 'months'}`
    return String(value)
  }
  if (isDuration(value)) return durationText(value)
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    if (isDuration(v.earliest) && isDuration(v.latest)) return `${durationText(v.earliest)} to ${durationText(v.latest)} before the end`
    if (typeof v.occasions === 'number' && isDuration(v.lateBy) && isDuration(v.within)) return `${v.occasions} times, each ${durationText(v.lateBy)} late, within ${durationText(v.within)}`
    if (typeof v.from === 'number' && typeof v.to === 'number') return `${String(v.from).padStart(2, '0')}:00 to ${String(v.to).padStart(2, '0')}:00`
  }
  return JSON.stringify(value)
}

function stable(value: unknown): string {
  if (typeof value !== 'object' || value === null) return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  const o = value as Record<string, unknown>
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${k}:${stable(o[k])}`)
    .join(',')}}`
}

/** Deep equality for rule values, which are plain data. */
export function sameValue(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b)
}

export interface Served {
  /** The day the law treats the notice as received. Notice periods start the day after. */
  received: ISODate
  method: ServiceMethod
  steps: Step[]
  /** True when the result relies on holiday dates beyond the verified table. */
  estimate: boolean
}

/**
 * When a notice sent on `sentOn` is treated as received.
 *
 * Email: the same day, or the next working day if sent after the cut-off. The
 * Act is silent on email sent on a weekend or holiday; this rolls those to the
 * next working day as well, which can only make a notice period longer.
 */
export function deemedReceived(
  pack: JurisdictionPack,
  cal: CalendarConfig,
  sentOn: ISODate,
  methodId: ServiceMethod['id'],
  sentHour = 10,
): Served {
  const method = pack.service.find((m) => m.id === methodId) ?? pack.service[0]
  const steps: Step[] = [{ label: `Sent by ${method.label.toLowerCase()}`, date: sentOn }]
  let received = sentOn

  if (method.addWorkingDays > 0) {
    received = addWorkingDays(sentOn, method.addWorkingDays, cal)
    steps.push({
      label: `Treated as received ${method.addWorkingDays} working days later`,
      date: received,
      detail: method.plain,
    })
  } else if (method.cutoffHour !== undefined) {
    const late = sentHour >= method.cutoffHour
    const off = nonWorkingReason(sentOn, cal)
    if (late || off) {
      received = nextWorkingDay(sentOn, cal)
      steps.push({
        label: late ? 'Sent after 5 pm, so it counts from the next working day' : `Sent on ${off}, so it counts from the next working day`,
        date: received,
        detail: late ? method.plain : 'The Act does not say; counting from the next working day can only lengthen the notice.',
        policy: !late,
      })
    } else {
      steps.push({ label: 'Received the same day', date: received })
    }
  } else {
    steps.push({ label: 'Received when handed over', date: received })
  }
  return { received, method, steps, estimate: beyondCoverage(received, cal) }
}

/** The latest day a notice can be sent by `methodId` and still be received on or before `mustBeReceivedBy`. */
export function latestSendDate(
  pack: JurisdictionPack,
  cal: CalendarConfig,
  mustBeReceivedBy: ISODate,
  methodId: ServiceMethod['id'],
  sentHour = 10,
): ISODate {
  let candidate = mustBeReceivedBy
  for (let i = 0; i < 40; i++) {
    if (deemedReceived(pack, cal, candidate, methodId, sentHour).received <= mustBeReceivedBy) return candidate
    candidate = addDays(candidate, -1)
  }
  return candidate
}

export { isWorkingDay }
