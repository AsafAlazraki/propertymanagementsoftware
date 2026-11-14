/** How the console writes instants. Dates go through the domain's calendar so "today" means the viewer's today. */
import type { ISODate } from '@/domain/types'
import { dateOf, diffDays, fmtDate } from '@/domain/rules/calendar'

/** `9:05 am` */
export function clock(instant: string): string {
  const d = new Date(instant)
  const h = d.getHours()
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

/** A compact "when" for a table cell: `Today 9:05 am`, `Yesterday`, `4 days ago`, `12 Aug`. */
export function whenShort(instant: string, day: ISODate): string {
  const date = dateOf(instant)
  const n = diffDays(date, day)
  if (n === 0) return `Today ${clock(instant)}`
  if (n === 1) return 'Yesterday'
  if (n > 1 && n < 14) return `${n} days ago`
  if (n === -1) return 'Tomorrow'
  if (n < -1 && n > -14) return `In ${-n} days`
  return fmtDate(date, { weekday: false })
}

/** The same, for the middle of a sentence: `today 9:05 am`, `4 days ago`, `on 12 Aug`. */
export function whenInline(instant: string, day: ISODate): string {
  const short = whenShort(instant, day)
  // Past a fortnight either way `whenShort` gives a calendar date, which reads as "on 12 Aug".
  return Math.abs(diffDays(dateOf(instant), day)) >= 14 ? `on ${short}` : short.charAt(0).toLowerCase() + short.slice(1)
}

/** The exact moment, for a tooltip or a detail line: `Sat 14 Nov 2026 at 9:05 am`. */
export function whenExact(instant: string): string {
  return `${fmtDate(dateOf(instant), { year: 'always' })} at ${clock(instant)}`
}

export function daysSince(instant: string, day: ISODate): number {
  return diffDays(dateOf(instant), day)
}

/** `87%`, or a dash when there is nothing to divide by. */
export function share(part: number, whole: number): string {
  return whole === 0 ? '–' : `${Math.round((part / whole) * 100)}%`
}

export function initialCap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Case- and macron-insensitive text match for search boxes. */
export function matches(haystack: (string | undefined)[], needle: string): boolean {
  const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const q = fold(needle.trim())
  if (!q) return true
  return haystack.some((h) => h !== undefined && fold(h).includes(q))
}

/** Reads a search param that must be one of a fixed set; anything else is dropped. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined
}

export function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
