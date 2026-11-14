/**
 * Calendar maths for statutory dates.
 *
 * Everything here works on `YYYY-MM-DD` strings and UTC arithmetic, so a date
 * never shifts when daylight saving starts or when the viewer is in another
 * time zone. A statutory date is a calendar date at the property.
 */
import type { ISODate } from '../types'

export interface CalendarConfig {
  /** Statutory non-working dates (already Mondayised where the statute says so). */
  holidays: ISODate[]
  /**
   * An inclusive `MM-DD` range that is never a working day, whatever the year.
   * New Zealand's Residential Tenancies Act excludes 25 December – 15 January.
   */
  closedPeriod?: { from: string; to: string }
  /** Days of the week that are never working days. 0 = Sunday. */
  weekend: number[]
  /** Last year the holiday table covers. Past it, working-day results are flagged as estimates. */
  coveredThroughYear: number
}

const DAY = 86_400_000

export function toUTC(iso: ISODate): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function fromUTC(ms: number): ISODate {
  const d = new Date(ms)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today's calendar date where the viewer is. */
export function today(): ISODate {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function isoOf(d: Date): ISODate {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/**
 * The calendar date of an instant, where the viewer is. Never take the first ten
 * characters of an ISO timestamp for this: that is the date in UTC, which is
 * yesterday for anyone east of Greenwich before mid-morning.
 */
export function dateOf(instant: string): ISODate {
  return isoOf(new Date(instant))
}

export function addDays(iso: ISODate, n: number): ISODate {
  return fromUTC(toUTC(iso) + n * DAY)
}

export function addWeeks(iso: ISODate, n: number): ISODate {
  return addDays(iso, n * 7)
}

/** Adds calendar months, clamping to the last day of a shorter month (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(iso: ISODate, n: number): ISODate {
  const [y, m, d] = iso.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1 + n, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return fromUTC(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d, lastDay)))
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY)
}

export function weekday(iso: ISODate): number {
  return new Date(toUTC(iso)).getUTCDay()
}

export function isBefore(a: ISODate, b: ISODate): boolean {
  return toUTC(a) < toUTC(b)
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return toUTC(a) >= toUTC(b) ? a : b
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return toUTC(a) <= toUTC(b) ? a : b
}

function inClosedPeriod(iso: ISODate, period: { from: string; to: string }): boolean {
  const md = iso.slice(5)
  // A range such as 12-25 → 01-15 wraps the year end.
  return period.from <= period.to ? md >= period.from && md <= period.to : md >= period.from || md <= period.to
}

export function isWorkingDay(iso: ISODate, cal: CalendarConfig): boolean {
  if (cal.weekend.includes(weekday(iso))) return false
  if (cal.closedPeriod && inClosedPeriod(iso, cal.closedPeriod)) return false
  return !cal.holidays.includes(iso)
}

/** Why a date is not a working day, as a sentence fragment; `null` when it is one. */
export function nonWorkingReason(iso: ISODate, cal: CalendarConfig): string | null {
  if (cal.weekend.includes(weekday(iso))) return 'a weekend'
  if (cal.closedPeriod && inClosedPeriod(iso, cal.closedPeriod)) return 'inside the summer shutdown the Act excludes'
  if (cal.holidays.includes(iso)) return 'a public holiday'
  return null
}

/** The first working day on or after `iso`. */
export function onOrNextWorkingDay(iso: ISODate, cal: CalendarConfig): ISODate {
  let d = iso
  while (!isWorkingDay(d, cal)) d = addDays(d, 1)
  return d
}

/** The first working day strictly after `iso`. */
export function nextWorkingDay(iso: ISODate, cal: CalendarConfig): ISODate {
  return onOrNextWorkingDay(addDays(iso, 1), cal)
}

/**
 * Counts forward `n` working days. Day 1 is the first working day after `iso`,
 * which is how "within 23 working days of receiving" is counted.
 */
export function addWorkingDays(iso: ISODate, n: number, cal: CalendarConfig): ISODate {
  let d = iso
  for (let i = 0; i < n; i++) d = nextWorkingDay(d, cal)
  return d
}

/** Working days strictly after `from`, up to and including `to`. */
export function workingDaysBetween(from: ISODate, to: ISODate, cal: CalendarConfig): number {
  let count = 0
  let d = from
  while (isBefore(d, to)) {
    d = addDays(d, 1)
    if (isWorkingDay(d, cal)) count++
  }
  return count
}

/** True when a working-day result reaches past the holiday table and so is an estimate. */
export function beyondCoverage(iso: ISODate, cal: CalendarConfig): boolean {
  return Number(iso.slice(0, 4)) > cal.coveredThroughYear
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** `Fri 14 Nov` — or `Fri 14 Nov 2027` when the year differs from today's. */
export function fmtDate(iso: ISODate, opts: { weekday?: boolean; year?: 'auto' | 'always' | 'never' } = {}): string {
  const [y, m, d] = iso.split('-').map(Number)
  const showYear = opts.year === 'always' || (opts.year !== 'never' && y !== new Date().getFullYear())
  const wd = opts.weekday === false ? '' : `${DAYS[weekday(iso)]} `
  return `${wd}${d} ${MONTHS[m - 1]}${showYear ? ` ${y}` : ''}`
}

/** `Friday 14 November 2026` — for documents. */
export function fmtDateLong(iso: ISODate): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${DAYS_LONG[weekday(iso)]} ${d} ${MONTHS_LONG[m - 1]} ${y}`
}

/** `in 3 days`, `tomorrow`, `today`, `5 days ago`. */
export function fmtRelative(iso: ISODate, from: ISODate = today()): string {
  const n = diffDays(from, iso)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  const abs = Math.abs(n)
  const span = abs >= 60 ? `${Math.round(abs / 30.4)} months` : abs >= 14 ? `${Math.round(abs / 7)} weeks` : `${abs} days`
  return n > 0 ? `in ${span}` : `${span} ago`
}
