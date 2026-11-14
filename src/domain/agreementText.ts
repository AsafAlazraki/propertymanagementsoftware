/**
 * Reading a tenancy agreement.
 *
 * Given the text of an agreement (extracted from a PDF in the browser), find
 * the handful of facts a landlord would otherwise retype. Each fact comes back
 * with the words it was read from, so the person can see why Loop thinks so —
 * and every one is a suggestion to check, never a value Loop relies on unseen.
 *
 * Pattern matching, not a language model: it either finds the words or it
 * does not.
 */
import type { ISODate } from './types'

export interface Found<T> {
  value: T
  /** The words in the document this was read from. */
  from: string
}

export interface AgreementFacts {
  address?: Found<string>
  weeklyRent?: Found<number>
  bond?: Found<number>
  startDate?: Found<ISODate>
  endDate?: Found<ISODate>
  type?: Found<'periodic' | 'fixed'>
  tenants?: Found<string[]>
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]
const amount = (s: string) => Number(s.replace(/[,\s]/g, ''))
const tidy = (s: string) => s.replace(/\s+/g, ' ').trim()

/** `12/03/2025`, `12-3-25`, `12 March 2025` → `2025-03-12`. Day comes first, as it does in New Zealand. */
export function parseDate(text: string): ISODate | undefined {
  const numeric = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/.exec(text)
  const worded = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/i.exec(text)
  let d: number, m: number, y: number
  if (numeric) {
    d = Number(numeric[1])
    m = Number(numeric[2])
    y = Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
  } else if (worded) {
    d = Number(worded[1])
    m = MONTHS.findIndex((name) => name.startsWith(worded[2].toLowerCase().slice(0, 3))) + 1
    y = Number(worded[3])
  } else return undefined
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return undefined
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  // Reject dates the calendar does not have, such as 31 February.
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) === iso ? iso : undefined
}

function first(text: string, patterns: RegExp[]): RegExpExecArray | null {
  for (const p of patterns) {
    const m = p.exec(text)
    if (m) return m
  }
  return null
}

export function readAgreement(raw: string): AgreementFacts {
  const text = raw.replace(/ /g, ' ').replace(/[ \t]+/g, ' ')
  const facts: AgreementFacts = {}

  const address = first(text, [
    /(?:address of (?:the )?(?:tenancy|premises|property)|tenancy address|premises(?: address)?|property address)\s*[:\-–]\s*([^\n]{6,90})/i,
  ])
  if (address) facts.address = { value: tidy(address[1]).replace(/[.;,]$/, ''), from: tidy(address[0]) }

  const rent = first(text, [
    /(?:weekly rent|rent per week|rent(?: payable)? (?:is|of))\s*[:\-–]?\s*\$\s?([\d,]+(?:\.\d{2})?)/i,
    /\$\s?([\d,]+(?:\.\d{2})?)\s*(?:per|a|each|\/)\s*week/i,
  ])
  if (rent && amount(rent[1]) > 0) facts.weeklyRent = { value: amount(rent[1]), from: tidy(rent[0]) }

  const bond = first(text, [/bond(?: amount| paid| of)?\s*[:\-–]?\s*\$\s?([\d,]+(?:\.\d{2})?)/i])
  if (bond && amount(bond[1]) > 0) facts.bond = { value: amount(bond[1]), from: tidy(bond[0]) }

  const start = first(text, [
    /(?:tenancy (?:starts|begins|commences|start date|commencement)|commencement date|start date|date tenancy (?:is to )?begin\w*)\s*(?:on|:|-|–)?\s*([^\n]{6,40})/i,
  ])
  const startDate = start ? parseDate(start[1]) : undefined
  if (start && startDate) facts.startDate = { value: startDate, from: tidy(start[0]) }

  const end = first(text, [
    /(?:fixed[- ]term (?:tenancy )?(?:ends|ending|end date|expires)|tenancy (?:ends|will end)|end date|expiry date)\s*(?:on|:|-|–)?\s*([^\n]{6,40})/i,
  ])
  const endDate = end ? parseDate(end[1]) : undefined
  if (end && endDate) facts.endDate = { value: endDate, from: tidy(end[0]) }

  const periodic = /\bperiodic tenancy\b/i.exec(text)
  const fixed = /\bfixed[- ]term tenancy\b/i.exec(text)
  // An end date settles it. Otherwise only a document that names one kind and not the other is trusted.
  if (facts.endDate) facts.type = { value: 'fixed', from: facts.endDate.from }
  else if (periodic && !fixed) facts.type = { value: 'periodic', from: tidy(periodic[0]) }
  else if (fixed && !periodic) facts.type = { value: 'fixed', from: tidy(fixed[0]) }

  const tenants = first(text, [
    /tenant(?:\(s\)|s)?(?:'s?)?(?: full)?(?: legal)? names?\s*[:\-–]\s*([^\n]{3,120})/i,
    /\btenants?\s*[:\-–]\s*([A-Z][^\n]{2,120})/,
  ])
  if (tenants) {
    const names = tenants[1]
      .split(/\s*(?:,|;|&|\band\b)\s*/i)
      .map(tidy)
      .filter((n) => /^[A-Za-zÀ-ÿĀ-ž'’.\- ]{3,60}$/.test(n) && n.includes(' '))
    if (names.length) facts.tenants = { value: names.slice(0, 4), from: tidy(tenants[0]) }
  }
  return facts
}
