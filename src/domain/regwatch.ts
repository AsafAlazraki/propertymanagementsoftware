/**
 * Rulewatch: how a detected change to the law becomes a reviewed, published
 * rule — and how a person is kept in the loop the whole way.
 *
 * The division of labour follows docs/research/regulatory-watch-sources.md §3:
 *
 *   detection   is deterministic. A scheduled job fetches, hashes and diffs,
 *               and writes what it saw to public/regwatch/feed.json;
 *   a model     may draft a summary and propose a patch, and nothing more;
 *   this file   checks the proposal mechanically (is there a verbatim quote,
 *               is the proposed number actually in it, is the source healthy,
 *               have two different people approved a high-impact rule) and
 *               runs the real calculators over the old and the new pack so the
 *               reviewer sees what would change before they sign;
 *   a person    approves, rejects or records "no action", and publishes.
 *
 * Everything here is pure: `Db` and packs in, values out. The console applies
 * the results through src/data/admin-mutations.ts.
 */
import type { ID, ISODate, ISODateTime, JurisdictionCode, RuleChange, RulePackVersion, RulePatch, RuleSource } from './types'
import type { Db } from './db'
import type { Duration, JurisdictionPack, Rule, RuleKey } from './jurisdictions/types'
import { PACKS, resolvePack } from './jurisdictions'
import { addDays, addMonths, dateOf, diffDays, fmtDate } from './rules/calendar'
import { addDuration, calendarFor, durationText, type Verdict } from './rules/core'
import {
  arrearsState,
  bondCaps,
  bondLodgement,
  checkInspectionSlot,
  checkPetRefusal,
  fixedTermWindow,
  inspectionWindow,
  petRespondBy,
  planRentIncrease,
  planTermination,
  remedyDeadline,
  repairsEntryFrom,
  tenantLiabilityCap,
  type EndGround,
  type Sending,
} from './rules/tenancy'
import { checkRentOffer, parseAdvertisedRent, scanClause } from './rules/text'
import { money, plural } from './rules/format'

/* ─────────────────────────────── the watcher feed ───────────────────────── */

export interface FeedRun {
  at: ISODateTime
  checked: number
  changed: number
  failed: number
}

export interface FeedSourceState {
  lastCheckedAt: ISODateTime
  lastChangedAt: ISODateTime | null
  status: 'ok' | 'changed' | 'unreachable'
  hash: string
  httpStatus: number
}

export interface FeedEvent {
  id: ID
  sourceId: ID
  detectedAt: ISODateTime
  title: string
  url: string
  summary: string | null
  addedLines: string[]
  removedLines: string[]
  /** The model's draft. Absent when no model ran, or when it abstained. */
  ai: { summary: string; patches: RulePatch[]; confidence: RuleChange['confidence']; quote: string } | null
}

export interface RegwatchFeed {
  generatedAt: ISODateTime | null
  runs: FeedRun[]
  sources: Record<ID, FeedSourceState>
  events: FeedEvent[]
}

/** Reads whatever the feed URL returned. Anything that is not the feed's shape is `null`, never a guess. */
export function parseFeed(raw: unknown): RegwatchFeed | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!('generatedAt' in r) || !Array.isArray(r.runs) || !Array.isArray(r.events) || typeof r.sources !== 'object' || r.sources === null) return null
  if (r.generatedAt !== null && typeof r.generatedAt !== 'string') return null
  return { generatedAt: r.generatedAt, runs: r.runs as FeedRun[], sources: r.sources as Record<ID, FeedSourceState>, events: r.events as FeedEvent[] }
}

/** False until the scheduled job has written at least one run. */
export function feedHasReported(feed: RegwatchFeed | null): feed is RegwatchFeed {
  return feed !== null && feed.generatedAt !== null
}

/**
 * Markers of a bot-challenge page. A site that answers "prove you are human"
 * has not changed its law; the fetch failed. The watcher applies this rule
 * first and this is the second line of defence.
 */
const CHALLENGE = /_Incapsula_Resource|Just a moment\.\.\.|cf-chl-|Attention Required!|Checking your browser|Access Denied|Request unsuccessful\. Incapsula/i

export function looksLikeChallenge(lines: string[]): boolean {
  return lines.some((l) => CHALLENGE.test(l))
}

/** Money caps, notice periods and termination grounds: the rules that need two reviewers. */
export const HIGH_IMPACT_RULES: RuleKey[] = [
  'bond.max_weeks',
  'bond.pet_max_weeks',
  'bond.lodgement_deadline',
  'rent.in_advance_max_weeks',
  'rent_increase.min_interval_months',
  'rent_increase.notice',
  'entry.inspection_notice_min',
  'entry.repairs_notice_min',
  'termination.no_cause_allowed',
  'termination.landlord_periodic_notice',
  'termination.owner_occupy_notice',
  'termination.sale_notice',
  'termination.tenant_periodic_notice',
  'fixed_term.notice_window',
  'pets.response_deadline',
  'arrears.remedy_notice',
  'arrears.tribunal_threshold',
  'arrears.repeat_rule',
  'damage.careless_cap_weeks',
]

export function impactOfPatches(patches: RulePatch[]): RuleChange['impact'] {
  if (patches.some((p) => (HIGH_IMPACT_RULES as string[]).includes(p.ruleKey))) return 'high'
  return 'medium'
}

/**
 * How strong the evidence is, worked out from where it came from rather than
 * from what a model says about itself. A regulator page or an announcement is
 * never enough on its own to publish.
 */
export function evidenceConfidence(source: Pick<RuleSource, 'signal'> | undefined, quoted: boolean): RuleChange['confidence'] {
  if (!source || !quoted) return 'low'
  if (source.signal === 'legislation') return 'medium'
  return 'low'
}

const RANK: Record<RuleChange['confidence'], number> = { low: 0, medium: 1, high: 2 }
function lowerOf(a: RuleChange['confidence'], b: RuleChange['confidence']): RuleChange['confidence'] {
  return RANK[a] <= RANK[b] ? a : b
}

export interface FeedMerge {
  ruleSources: RuleSource[]
  ruleChanges: RuleChange[]
  /** Changes this merge created. */
  added: RuleChange[]
  /** Sources whose health or dates the feed updated. */
  sourcesUpdated: number
  /** Events that were not turned into a change, each with the reason. */
  skipped: { id: ID; reason: string }[]
}

/**
 * Lays the watcher's feed over the stored sources and turns its events into
 * changes for a person to review. Idempotent: an event already stored (matched
 * by id) is left exactly as the reviewer has it.
 */
export function mergeFeed(current: Pick<Db, 'ruleSources' | 'ruleChanges'>, feed: RegwatchFeed): FeedMerge {
  if (!feedHasReported(feed)) return { ruleSources: current.ruleSources, ruleChanges: current.ruleChanges, added: [], sourcesUpdated: 0, skipped: [] }

  // An event whose "new text" is a challenge page marks its source unreachable instead of changed.
  const challenged = new Set(feed.events.filter((e) => looksLikeChallenge(e.addedLines)).map((e) => e.sourceId))

  let sourcesUpdated = 0
  const ruleSources = current.ruleSources.map((s) => {
    const state = feed.sources[s.id]
    if (!state) return s
    const unreachable = state.status === 'unreachable' || challenged.has(s.id)
    const next: RuleSource = unreachable
      ? // `lastCheckedAt` means the last time the source was actually read, so a failed run does not advance it.
        { ...s, health: 'unreachable' }
      : { ...s, health: state.status, lastCheckedAt: state.lastCheckedAt, lastChangedAt: state.lastChangedAt ?? s.lastChangedAt }
    if (next.health !== s.health || next.lastCheckedAt !== s.lastCheckedAt || next.lastChangedAt !== s.lastChangedAt) {
      sourcesUpdated++
      return next
    }
    return s
  })

  const known = new Set(current.ruleChanges.map((c) => c.id))
  const added: RuleChange[] = []
  const skipped: FeedMerge['skipped'] = []
  for (const e of feed.events) {
    if (known.has(e.id)) continue
    known.add(e.id)
    const source = current.ruleSources.find((s) => s.id === e.sourceId)
    if (!source) {
      skipped.push({ id: e.id, reason: 'Its source is not in the watched registry.' })
      continue
    }
    if (looksLikeChallenge(e.addedLines)) {
      skipped.push({ id: e.id, reason: 'The fetched page was a bot challenge. That is a failed fetch, not a change.' })
      continue
    }
    if (source.jurisdiction === 'AU') {
      skipped.push({ id: e.id, reason: 'The source covers all of Australia, so there is no single rule pack to review it against.' })
      continue
    }
    const quote = (e.ai?.quote ?? '').trim()
    const patches = quote && Array.isArray(e.ai?.patches) ? e.ai.patches : []
    added.push({
      id: e.id,
      jurisdiction: source.jurisdiction,
      sourceId: e.sourceId,
      detectedAt: e.detectedAt,
      title: e.title,
      summary: e.ai?.summary ?? e.summary ?? 'The watcher saw this source change. No summary was drafted, so a person has to read the changed text and decide whether any rule is affected.',
      evidenceQuote: quote,
      evidenceUrl: e.url,
      // No quote, no patch: a proposed value with nothing verbatim behind it is dropped before review.
      patches,
      confidence: e.ai ? lowerOf(e.ai.confidence, evidenceConfidence(source, quote.length > 0)) : 'low',
      impact: impactOfPatches(patches),
      status: 'pending_review',
      origin: 'watcher',
      reviews: [],
    })
  }

  return { ruleSources, ruleChanges: added.length ? [...added, ...current.ruleChanges] : current.ruleChanges, added, sourcesUpdated, skipped }
}

/* ───────────────────────────────── sources ──────────────────────────────── */

/**
 * Days without a successful read before a source is called stale, by priority
 * (research §3.5: three days for a priority-1 source, fourteen for priority 2).
 */
export const STALE_AFTER_DAYS: Record<RuleSource['priority'], number> = { 1: 3, 2: 14, 3: 30 }

export type SourceState = 'ok' | 'changed' | 'stale' | 'unreachable' | 'never_checked'

export function sourceState(s: RuleSource, today: ISODate): { state: SourceState; daysSince: number | null } {
  const daysSince = s.lastCheckedAt ? Math.max(0, diffDays(dateOf(s.lastCheckedAt), today)) : null
  if (s.health === 'unreachable') return { state: 'unreachable', daysSince }
  if (s.health === 'never_checked' || daysSince === null) return { state: 'never_checked', daysSince }
  if (daysSince > STALE_AFTER_DAYS[s.priority]) return { state: 'stale', daysSince }
  return { state: s.health === 'changed' ? 'changed' : 'ok', daysSince }
}

export interface WatchSummary {
  total: number
  healthy: number
  changed: number
  stale: number
  unreachable: number
  neverChecked: number
  lastCheckedAt?: ISODateTime
}

export function watchSummary(sources: RuleSource[], today: ISODate): WatchSummary {
  const out: WatchSummary = { total: sources.length, healthy: 0, changed: 0, stale: 0, unreachable: 0, neverChecked: 0 }
  for (const s of sources) {
    const { state } = sourceState(s, today)
    if (state === 'ok') out.healthy++
    else if (state === 'changed') out.changed++
    else if (state === 'stale') out.stale++
    else if (state === 'unreachable') out.unreachable++
    else out.neverChecked++
    if (s.lastCheckedAt && (!out.lastCheckedAt || s.lastCheckedAt > out.lastCheckedAt)) out.lastCheckedAt = s.lastCheckedAt
  }
  return out
}

/* ─────────────────────────────── rule values ────────────────────────────── */

/** A rule that nobody has re-read against its source for this long is flagged in the pack browser. */
export const RULE_STALE_AFTER_DAYS = 90

export function ruleIsStale(rule: Pick<Rule<unknown>, 'lastVerified'>, today: ISODate): boolean {
  return diffDays(rule.lastVerified, today) > RULE_STALE_AFTER_DAYS
}

function isDuration(v: unknown): v is Duration {
  return typeof v === 'object' && v !== null && typeof (v as Duration).n === 'number' && typeof (v as Duration).unit === 'string'
}

/** Any rule value as words, for a diff line or a comparison cell. */
export function formatRuleValue(ruleKey: string, value: unknown): string {
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

/** The rules whose values can be laid side by side across jurisdictions. */
export const COMPARABLE_RULES: RuleKey[] = [
  'bond.max_weeks',
  'bond.pet_max_weeks',
  'bond.lodgement_deadline',
  'rent.in_advance_max_weeks',
  'rent_increase.min_interval_months',
  'rent_increase.notice',
  'entry.inspection_notice_min',
  'entry.inspection_min_interval',
  'entry.repairs_notice_min',
  'entry.hours',
  'termination.no_cause_allowed',
  'termination.landlord_periodic_notice',
  'termination.owner_occupy_notice',
  'termination.sale_notice',
  'termination.tenant_periodic_notice',
  'pets.response_deadline',
  'arrears.tribunal_threshold',
]

/* ──────────────────────────────── guardrails ────────────────────────────── */

export type GuardrailStatus = 'pass' | 'warn' | 'fail' | 'na'
export type ReviewStep = 'approve' | 'publish'

export interface Guardrail {
  id: 'quote' | 'known_rules' | 'value_in_quote' | 'effective_date' | 'before_matches' | 'source' | 'pack_live' | 'evidence' | 'two_reviewers'
  label: string
  status: GuardrailStatus
  /** What the check found, as a sentence. */
  detail: string
  /** The steps this check stops while it is not passing. */
  blocks: ReviewStep[]
}

/** Every number a rule value carries, with the unit it must be read in. */
function numbersIn(value: unknown): { n: number; unit?: Duration['unit'] }[] {
  if (typeof value === 'number') return [{ n: value }]
  if (isDuration(value)) return [{ n: value.n, unit: value.unit }]
  if (typeof value === 'object' && value !== null) return Object.values(value as Record<string, unknown>).flatMap(numbersIn)
  return []
}

const UNIT_WORD: Record<Duration['unit'], RegExp> = {
  hours: /\bhours?\b/i,
  days: /\bdays?\b/i,
  working_days: /\bworking days?\b/i,
  weeks: /\bweeks?\b/i,
  months: /\bmonths?\b/i,
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

/** True when `n` stands in the text as its own number: "28 days" yes, "128" or "2028" no. */
export function numberAppears(text: string, n: number): boolean {
  const digits = new RegExp(`(^|[^0-9.,])${String(n).replace('.', '\\.')}(?![0-9]|[.,][0-9])`)
  if (digits.test(text)) return true
  const word = NUMBER_WORDS[n]
  return word !== undefined && new RegExp(`\\b${word}\\b`, 'i').test(text)
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** True when a calendar date is written in the text, as `2025-12-01`, `1 December 2025` or `1 Dec 2025`. */
export function dateAppears(text: string, iso: ISODate): boolean {
  if (!isCalendarDate(iso)) return false
  if (text.includes(iso)) return true
  const [y, m, d] = iso.split('-').map(Number)
  const month = MONTHS[m - 1]
  return new RegExp(`\\b0?${d}(st|nd|rd|th)?\\s+${month.slice(0, 3)}[a-z]*\\.?,?\\s+${y}\\b`, 'i').test(text)
}

export function isCalendarDate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** The names of the different people who have approved a change, in order. */
export function approversOf(change: Pick<RuleChange, 'reviews'>): string[] {
  const out: string[] = []
  for (const r of change.reviews) if (r.verdict === 'approve' && !out.includes(r.by)) out.push(r.by)
  return out
}

export function needsTwoReviewers(change: Pick<RuleChange, 'impact' | 'patches'>): boolean {
  return change.impact === 'high' || impactOfPatches(change.patches) === 'high'
}

export interface GuardrailContext {
  /** The watched source the change came from, if it is still in the registry. */
  source?: RuleSource
  /** The pack as it stands now: shipped values with every published override applied. */
  pack: JurisdictionPack
  today: ISODate
}

/**
 * The checklist a reviewer sees. Each line is computed from the change itself;
 * none of it is the model's opinion of its own work.
 */
export function guardrails(change: RuleChange, ctx: GuardrailContext): Guardrail[] {
  const quote = change.evidenceQuote.trim()
  const hasPatch = change.patches.length > 0
  const out: Guardrail[] = []

  // 1. No quote, no patch.
  out.push(
    quote.length >= 12
      ? { id: 'quote', label: 'Rests on a verbatim quote', status: 'pass', detail: 'The source text the summary relies on is quoted below it.', blocks: [] }
      : hasPatch
        ? { id: 'quote', label: 'Rests on a verbatim quote', status: 'fail', detail: 'There is no quoted source text. A value with nothing verbatim behind it cannot be approved.', blocks: ['approve', 'publish'] }
        : { id: 'quote', label: 'Rests on a verbatim quote', status: 'warn', detail: 'Nothing is quoted. Read the source itself before deciding.', blocks: [] },
  )

  // 2. Every patch points at a rule the pack actually has.
  const unknown = change.patches.filter((p) => !(p.ruleKey in ctx.pack.rules))
  out.push(
    !hasPatch
      ? { id: 'known_rules', label: 'Targets rules in the pack', status: 'na', detail: 'No rule value is proposed to change.', blocks: [] }
      : unknown.length
        ? { id: 'known_rules', label: 'Targets rules in the pack', status: 'fail', detail: `${unknown.map((p) => p.ruleKey).join(', ')} ${unknown.length === 1 ? 'is not a rule' : 'are not rules'} in the ${ctx.pack.shortName} pack.`, blocks: ['approve', 'publish'] }
        : { id: 'known_rules', label: 'Targets rules in the pack', status: 'pass', detail: `${plural(change.patches.length, 'rule')} in the ${ctx.pack.shortName} pack.`, blocks: [] },
  )

  // 3. The proposed number is in the quote, in the right unit.
  if (!hasPatch) {
    out.push({ id: 'value_in_quote', label: 'Proposed value appears in the quote', status: 'na', detail: 'No rule value is proposed to change.', blocks: [] })
  } else {
    const missing: string[] = []
    const unitUnclear: string[] = []
    let figures = 0
    for (const p of change.patches) {
      for (const { n, unit } of numbersIn(p.to)) {
        figures++
        if (!numberAppears(quote, n)) missing.push(`${n} (${p.ruleKey})`)
        else if (unit && !UNIT_WORD[unit].test(quote)) unitUnclear.push(`${durationText({ n, unit })} (${p.ruleKey})`)
      }
    }
    out.push(
      missing.length
        ? { id: 'value_in_quote', label: 'Proposed value appears in the quote', status: 'fail', detail: `Not found in the quoted text: ${missing.join(', ')}. A number that is not in the quote may have been invented.`, blocks: ['approve', 'publish'] }
        : unitUnclear.length
          ? { id: 'value_in_quote', label: 'Proposed value appears in the quote', status: 'warn', detail: `The number is quoted but its unit is not: ${unitUnclear.join(', ')}. Days and working days are easily swapped; check the source.`, blocks: [] }
          : figures === 0
            ? { id: 'value_in_quote', label: 'Proposed value appears in the quote', status: 'warn', detail: 'This is a yes-or-no rule, so there is no figure to find in the quote. Only reading the source can confirm it.', blocks: [] }
            : { id: 'value_in_quote', label: 'Proposed value appears in the quote', status: 'pass', detail: `${figures === 1 ? 'The proposed figure is' : `All ${figures} proposed figures are`} in the quoted text, with ${figures === 1 ? 'its unit' : 'their units'}.`, blocks: [] },
    )
  }

  // 4. Commencement: a real date, and one that the quote states.
  if (!hasPatch) {
    out.push({ id: 'effective_date', label: 'Has a commencement date', status: 'na', detail: 'No rule value is proposed to change.', blocks: [] })
  } else {
    const undated = change.patches.filter((p) => !isCalendarDate(p.effectiveFrom))
    const unquoted = change.patches.filter((p) => isCalendarDate(p.effectiveFrom) && !dateAppears(quote, p.effectiveFrom))
    out.push(
      undated.length
        ? { id: 'effective_date', label: 'Has a commencement date', status: 'fail', detail: `No valid commencement date for ${undated.map((p) => p.ruleKey).join(', ')}. If the date depends on a later instrument, this is not ready to publish.`, blocks: ['approve', 'publish'] }
        : unquoted.length
          ? { id: 'effective_date', label: 'Has a commencement date', status: 'warn', detail: `${fmtDate(unquoted[0].effectiveFrom, { weekday: false, year: 'always' })} is not stated in the quoted text. Confirm the commencement date at the source; assent and commencement are easily confused.`, blocks: [] }
          : { id: 'effective_date', label: 'Has a commencement date', status: 'pass', detail: 'Each patch has a commencement date that the quoted text states.', blocks: [] },
    )
  }

  // 5. The "before" side of the diff is what the pack holds today.
  if (!hasPatch || unknown.length) {
    out.push({ id: 'before_matches', label: 'Drafted against the current pack', status: 'na', detail: 'No rule value to compare.', blocks: [] })
  } else {
    const landed = change.patches.every((p) => sameValue(ctx.pack.rules[p.ruleKey as RuleKey].value, p.to))
    const drifted = change.patches.filter((p) => !sameValue(ctx.pack.rules[p.ruleKey as RuleKey].value, p.from))
    out.push(
      landed
        ? { id: 'before_matches', label: 'Drafted against the current pack', status: 'pass', detail: `The ${ctx.pack.shortName} pack already holds the proposed ${change.patches.length === 1 ? 'value' : 'values'}.`, blocks: [] }
        : drifted.length
          ? { id: 'before_matches', label: 'Drafted against the current pack', status: 'warn', detail: `The pack holds ${formatRuleValue(drifted[0].ruleKey, ctx.pack.rules[drifted[0].ruleKey as RuleKey].value)} for ${drifted[0].ruleKey}, not the ${formatRuleValue(drifted[0].ruleKey, drifted[0].from)} this proposal started from.`, blocks: [] }
          : { id: 'before_matches', label: 'Drafted against the current pack', status: 'pass', detail: 'The “before” values match what the pack holds today.', blocks: [] },
    )
  }

  // 6. The source can still be read.
  if (!ctx.source) {
    out.push({ id: 'source', label: 'Source is being read', status: 'warn', detail: 'The source is not in the watched registry, so nothing re-reads it automatically.', blocks: [] })
  } else {
    const { state, daysSince } = sourceState(ctx.source, ctx.today)
    out.push(
      state === 'ok' || state === 'changed'
        ? { id: 'source', label: 'Source is being read', status: 'pass', detail: `Last read ${daysSince === 0 ? 'today' : `${plural(daysSince ?? 0, 'day')} ago`}.`, blocks: [] }
        : state === 'unreachable'
          ? { id: 'source', label: 'Source is being read', status: 'warn', detail: 'The scheduled reader could not reach this source on its last run. Open the link and read it yourself.', blocks: [] }
          : state === 'stale'
            ? { id: 'source', label: 'Source is being read', status: 'warn', detail: `Not read for ${plural(daysSince ?? 0, 'day')}; a priority-${ctx.source.priority} source should be read at least every ${STALE_AFTER_DAYS[ctx.source.priority]}.`, blocks: [] }
            : { id: 'source', label: 'Source is being read', status: 'warn', detail: 'This source has never been read by the scheduled watcher.', blocks: [] },
    )
  }

  // 7. Only a live pack drives calculators.
  out.push(
    ctx.pack.status === 'live'
      ? { id: 'pack_live', label: 'Pack is live', status: 'pass', detail: `${ctx.pack.name} is a live pack: publishing changes what every calculator returns.`, blocks: [] }
      : { id: 'pack_live', label: 'Pack is live', status: 'warn', detail: `${ctx.pack.name} is a preview pack. This can be approved and kept on record, but previews drive no calculator, so there is nothing to publish.`, blocks: ['publish'] },
  )

  // 8. Nothing publishes on thin evidence.
  out.push(
    change.confidence === 'low'
      ? { id: 'evidence', label: 'Evidence is strong enough to publish', status: 'warn', detail: 'Low: this rests on an announcement or a regulator page, not on enacted text. It can be tracked, not published.', blocks: ['publish'] }
      : { id: 'evidence', label: 'Evidence is strong enough to publish', status: 'pass', detail: change.confidence === 'high' ? 'High: primary legislation, quoted, and the regulator agrees.' : 'Medium: primary legislation only.', blocks: [] },
  )

  // 9. Two different people for money caps, notice periods and termination grounds.
  const approvers = approversOf(change)
  if (!needsTwoReviewers(change)) {
    out.push({ id: 'two_reviewers', label: 'Enough reviewers', status: approvers.length >= 1 ? 'pass' : 'warn', detail: approvers.length >= 1 ? `Approved by ${approvers[0]}. One reviewer is enough at this impact.` : 'One reviewer is enough at this impact. Nobody has approved yet.', blocks: ['publish'] })
  } else {
    out.push(
      approvers.length >= 2
        ? { id: 'two_reviewers', label: 'Two different reviewers', status: 'pass', detail: `Approved by ${approvers[0]} and ${approvers[1]}.`, blocks: [] }
        : approvers.length === 1
          ? { id: 'two_reviewers', label: 'Two different reviewers', status: 'warn', detail: `Approved by ${approvers[0]}. High-impact rules need a second approval from someone else.`, blocks: ['publish'] }
          : { id: 'two_reviewers', label: 'Two different reviewers', status: 'warn', detail: 'High-impact rules need two approvals from two different people. Nobody has approved yet.', blocks: ['publish'] },
    )
  }

  return out
}

function blocking(rails: Guardrail[], step: ReviewStep): Guardrail | undefined {
  return rails.find((g) => g.status !== 'pass' && g.status !== 'na' && g.blocks.includes(step))
}

/** May this person approve this change now? A refusal carries its reason. */
export function canApprove(change: RuleChange, rails: Guardrail[], reviewer: string): Verdict {
  if (change.status !== 'pending_review' && change.status !== 'needs_second_review') return { ok: false, reason: 'This change has already been decided.' }
  if (change.patches.length === 0) return { ok: false, reason: 'There is no rule value here to approve.', fix: 'Record it as “no action needed”, or reject it if the detection was wrong.' }
  if (approversOf(change).includes(reviewer)) {
    return { ok: false, reason: `${reviewer} has already approved this change.`, fix: 'A high-impact rule needs its second approval from a different person.' }
  }
  const stop = blocking(rails, 'approve')
  if (stop) return { ok: false, reason: stop.detail }
  return { ok: true }
}

export function canPublish(change: RuleChange, rails: Guardrail[]): Verdict {
  if (change.status === 'published') return { ok: false, reason: 'This change is already published.' }
  if (change.status !== 'approved') return { ok: false, reason: 'Only an approved change can be published.', fix: change.status === 'needs_second_review' ? 'It is waiting for its second reviewer.' : undefined }
  if (change.patches.length === 0) return { ok: false, reason: 'There is no rule value to publish.' }
  const stop = blocking(rails, 'publish')
  if (stop) return { ok: false, reason: stop.detail }
  return { ok: true }
}

export type ReviewVerdict = RuleChange['reviews'][number]['verdict']

/**
 * Records one person's verdict and moves the change to its next state. An
 * approval of a high-impact change by its first reviewer parks it for a second.
 */
export function applyReview(change: RuleChange, rails: Guardrail[], verdict: ReviewVerdict, by: string, at: ISODateTime, note?: string): { change: RuleChange } | { refused: Verdict } {
  const trimmed = note?.trim() || undefined
  if (change.status !== 'pending_review' && change.status !== 'needs_second_review') return { refused: { ok: false, reason: 'This change has already been decided.' } }
  if (verdict === 'reject' && !trimmed) return { refused: { ok: false, reason: 'A rejection needs its reason.', fix: 'Say what is wrong with the detection or the proposal, so the next reviewer does not repeat the work.' } }
  if (verdict === 'approve') {
    const ok = canApprove(change, rails, by)
    if (!ok.ok) return { refused: ok }
  }
  const reviews = [...change.reviews, { by, at, verdict, note: trimmed }]
  const next = { ...change, reviews }
  const status: RuleChange['status'] =
    verdict === 'reject' ? 'rejected' : verdict === 'no_action' ? 'no_action' : needsTwoReviewers(change) && approversOf(next).length < 2 ? 'needs_second_review' : 'approved'
  return { change: { ...next, status } }
}

/* ──────────────────────────────── publishing ────────────────────────────── */

/** `2026.11.1`: year, month, then a counter that starts again each month. */
export function nextVersion(versions: RulePackVersion[], code: JurisdictionCode, today: ISODate): string {
  const prefix = `${today.slice(0, 4)}.${today.slice(5, 7)}.`
  const taken = [PACKS[code].version, ...versions.filter((v) => v.jurisdiction === code).map((v) => v.version)]
    .filter((v) => v.startsWith(prefix))
    .map((v) => Number(v.slice(prefix.length)))
    .filter((n) => Number.isInteger(n))
  return `${prefix}${taken.length ? Math.max(...taken) + 1 : 0}`
}

function versionId(code: JurisdictionCode, version: string): ID {
  return `pv_${code.toLowerCase().replace(/[^a-z]/g, '')}_${version.replace(/\./g, '_')}`
}

/** The pack version that publishing `change` creates: its patches as overrides on the shipped pack. */
export function buildVersion(change: RuleChange, versions: RulePackVersion[], by: string, at: ISODateTime, today: ISODate): RulePackVersion {
  const version = nextVersion(versions, change.jurisdiction, today)
  return {
    id: versionId(change.jurisdiction, version),
    jurisdiction: change.jurisdiction,
    version,
    publishedAt: at,
    publishedBy: by,
    note: change.title,
    overrides: Object.fromEntries(change.patches.map((p) => [p.ruleKey, p.to])),
    changeIds: [change.id],
  }
}

/**
 * A new version that puts back the values a published version replaced. Packs
 * are never edited in place: rolling back is publishing again. `null` when the
 * version changed no value, so there is nothing to restore.
 */
export function buildRollback(target: RulePackVersion, versions: RulePackVersion[], by: string, at: ISODateTime, today: ISODate): RulePackVersion | null {
  const keys = Object.keys(target.overrides)
  if (keys.length === 0) return null
  const before = resolvePack(target.jurisdiction, versions.filter((v) => v.publishedAt < target.publishedAt))
  const version = nextVersion(versions, target.jurisdiction, today)
  return {
    id: versionId(target.jurisdiction, version),
    jurisdiction: target.jurisdiction,
    version,
    publishedAt: at,
    publishedBy: by,
    note: `Rolled back ${target.version}: ${target.note}`,
    overrides: Object.fromEntries(keys.filter((k) => k in before.rules).map((k) => [k, before.rules[k as RuleKey].value])),
    changeIds: target.changeIds,
  }
}

/** The newest version of a jurisdiction that changed a value, which is the one a rollback undoes. */
export function latestOverriding(versions: RulePackVersion[], code: JurisdictionCode): RulePackVersion | undefined {
  return versions
    .filter((v) => v.jurisdiction === code && Object.keys(v.overrides).length > 0)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0]
}

/** True when every value a change proposes is what the pack returns today. */
export function inForce(change: Pick<RuleChange, 'patches'>, pack: JurisdictionPack): boolean {
  return change.patches.length > 0 && change.patches.every((p) => p.ruleKey in pack.rules && sameValue(pack.rules[p.ruleKey as RuleKey].value, p.to))
}

/* ───────────────────────────── impact analysis ──────────────────────────── */

const DRAFT_AT = '9999-12-31T00:00:00.000Z'

/**
 * The pack as it would be with a set of values published on top of everything
 * already published. It goes through `resolvePack`, the same path a real
 * publish takes, so the analysis cannot disagree with what publishing does.
 */
export function packWith(code: JurisdictionCode, versions: RulePackVersion[], values: Record<string, unknown>): JurisdictionPack {
  const live = resolvePack(code, versions)
  const draft: RulePackVersion = { id: 'pv_draft', jurisdiction: code, version: `${live.version}+draft`, publishedAt: DRAFT_AT, publishedBy: 'draft', note: 'Unpublished draft for impact analysis', overrides: values, changeIds: [] }
  return resolvePack(code, [...versions, draft])
}

export interface Scenario {
  id: string
  label: string
  before: string
  after: string
  changed: boolean
}

export interface PatchImpact {
  ruleKey: string
  label: string
  /** The calculator that reads this rule, in words. `null` when none does. */
  reads: string | null
  scenarios: Scenario[]
  /** Records in the store this rule governs. */
  orgs: number
  records: number
  /** `periodic tenancies`, `live listings` … */
  noun: string
}

export interface ImpactAnalysis {
  jurisdiction: JurisdictionCode
  /** False for a preview pack: the figures are what would happen, and nothing reads them. */
  drivesCalculators: boolean
  patches: PatchImpact[]
  scenarios: number
  changed: number
  /** Distinct organisations and records across every patch. */
  orgs: number
  records: number
}

type Scope = 'periodic' | 'fixed' | 'tenancies' | 'listings' | 'applications'

interface Fixture {
  today: ISODate
  /** Median weekly rent of the tenancies in scope, or `null` when the store has none. */
  rent: number | null
  sendings: { id: string; label: string; s: Sending }[]
}

type Probe = { id: string; label: string; value: string }
type Runner = { reads: string; scope: Scope; run: (pack: JurisdictionPack, fx: Fixture) => Probe[] }

const day = (d: ISODate) => fmtDate(d, { year: 'always' })

/** One probe per way a notice can be sent. */
function eachSending(fx: Fixture, value: (s: Sending) => string): Probe[] {
  return fx.sendings.map(({ id, label, s }) => ({ id, label, value: value(s) }))
}

function termination(ground: EndGround, reads: string): Runner {
  return {
    reads,
    scope: 'periodic',
    run: (pack, fx) =>
      eachSending(fx, (s) => {
        const plan = planTermination(pack, calendarFor(pack), { type: 'periodic' }, ground, s)
        return plan.blocked ? `Refused: ${plan.blocked.reason}` : `Tenancy ends ${day(plan.endsOn)}`
      }),
  }
}

function withRent(fx: Fixture, value: (rent: number) => string): Probe[] {
  return fx.rent === null ? [] : [{ id: 'median_rent', label: `At the median rent of ${money(fx.rent)} a week`, value: value(fx.rent) }]
}

const RUNNERS: Partial<Record<RuleKey, Runner>> = {
  'termination.tenant_periodic_notice': termination('tenant', 'Tenant’s notice to end a periodic tenancy'),
  'termination.landlord_periodic_notice': termination('no_cause', 'Landlord’s notice to end a periodic tenancy'),
  'termination.no_cause_allowed': termination('no_cause', 'Landlord’s notice to end a periodic tenancy'),
  'termination.owner_occupy_notice': termination('owner_occupy', 'Notice where the owner is moving in'),
  'termination.sale_notice': termination('sale', 'Notice on a sale with vacant possession'),
  'rent_increase.notice': {
    reads: 'Earliest date a rent increase can start',
    scope: 'tenancies',
    run: (pack, fx) => eachSending(fx, (s) => `New rent from ${day(planRentIncrease(pack, calendarFor(pack), { startDate: addMonths(s.sentOn, -30), type: 'periodic' }, s).earliest)}`),
  },
  'rent_increase.min_interval_months': {
    reads: 'Earliest date a rent increase can start',
    scope: 'tenancies',
    run: (pack, fx) => [
      { id: 'ten_months', label: 'Rent last went up 10 months ago; notice emailed today', value: `New rent from ${day(planRentIncrease(pack, calendarFor(pack), { startDate: addMonths(fx.today, -30), lastRentIncrease: addMonths(fx.today, -10), type: 'periodic' }, fx.sendings[0].s).earliest)}` },
      { id: 'new_tenancy', label: 'Tenancy began 3 months ago; notice emailed today', value: `New rent from ${day(planRentIncrease(pack, calendarFor(pack), { startDate: addMonths(fx.today, -3), type: 'periodic' }, fx.sendings[0].s).earliest)}` },
    ],
  },
  'bond.lodgement_deadline': {
    reads: 'Bond lodgement countdown',
    scope: 'tenancies',
    run: (pack, fx) => fx.sendings.map(({ id, s }) => ({ id, label: `Bond received ${day(s.sentOn)}`, value: `Lodge by ${day(bondLodgement(pack, calendarFor(pack), s.sentOn, undefined, s.sentOn).deadline)}` })).filter((p, i, all) => all.findIndex((x) => x.label === p.label) === i),
  },
  'bond.max_weeks': { reads: 'Bond cap on agreements and imports', scope: 'tenancies', run: (pack, fx) => withRent(fx, (rent) => `Bond capped at ${money(bondCaps(pack, rent).general)}`) },
  'bond.pet_max_weeks': {
    reads: 'Pet bond cap on pet consents',
    scope: 'tenancies',
    run: (pack, fx) =>
      withRent(fx, (rent) => {
        const cap = bondCaps(pack, rent).pet
        return cap === null ? 'No pet bond can be taken' : `Pet bond capped at ${money(cap)}`
      }),
  },
  'rent.in_advance_max_weeks': { reads: 'Rent-in-advance limit on agreements', scope: 'tenancies', run: (pack, fx) => withRent(fx, (rent) => `At most ${money(pack.rules['rent.in_advance_max_weeks'].value * rent)} in advance`) },
  'damage.careless_cap_weeks': {
    reads: 'Cap on tenant invoices for careless damage',
    scope: 'tenancies',
    run: (pack, fx) =>
      withRent(fx, (rent) => {
        const { cap } = tenantLiabilityCap(pack, 'careless', rent, { insured: false })
        return cap === null ? 'No cap on a tenant invoice' : `Tenant invoice capped at ${money(cap)}`
      }),
  },
  'entry.inspection_notice_min': { reads: 'First lawful day for a routine inspection', scope: 'tenancies', run: (pack, fx) => eachSending(fx, (s) => `Inspect from ${day(inspectionWindow(pack, calendarFor(pack), s).earliest)}`) },
  'entry.inspection_notice_max': {
    reads: 'How long an inspection notice stays good',
    scope: 'tenancies',
    run: (pack, fx) =>
      eachSending(fx, (s) => {
        const { latest } = inspectionWindow(pack, calendarFor(pack), s)
        return latest ? `Notice good until ${day(latest)}` : 'No upper limit on notice'
      }),
  },
  'entry.inspection_min_interval': {
    reads: 'Gap required between routine inspections',
    scope: 'tenancies',
    run: (pack, fx) => [{ id: 'last_week', label: 'Last inspected a week ago; notice emailed today', value: `Next inspection from ${day(inspectionWindow(pack, calendarFor(pack), fx.sendings[0].s, addDays(fx.today, -7)).earliest)}` }],
  },
  'entry.repairs_notice_min': { reads: 'First lawful day of entry for repairs', scope: 'tenancies', run: (pack, fx) => eachSending(fx, (s) => `Enter from ${day(repairsEntryFrom(pack, calendarFor(pack), s).earliest)}`) },
  'entry.hours': {
    reads: 'Inspection and repair booking slots',
    scope: 'tenancies',
    run: (pack, fx) => {
      const window = inspectionWindow(pack, calendarFor(pack), fx.sendings[0].s)
      return [7, 8, 18, 19, 20].map((hour) => {
        const verdict = checkInspectionSlot(pack, window, window.earliest, hour)
        const refusedForHour = !verdict.ok && verdict.rule === 'entry.hours'
        return { id: `hour_${hour}`, label: `A slot starting at ${String(hour).padStart(2, '0')}:00`, value: refusedForHour ? 'Refused: outside entry hours' : 'Offered' }
      })
    },
  },
  'pets.response_deadline': {
    reads: 'Countdown on a pet request',
    scope: 'tenancies',
    run: (pack, fx) => {
      const by = petRespondBy(pack, fx.today)
      return [{ id: 'today', label: 'Pet request received today', value: by ? `Answer by ${day(by)}` : 'No deadline tracked' }]
    },
  },
  'pets.refusal_needs_grounds': {
    reads: 'Pet refusal form',
    scope: 'tenancies',
    run: (pack) => [{ id: 'blanket', label: 'A refusal with no ground chosen', value: checkPetRefusal(pack, undefined, '').ok ? 'Accepted' : 'Refused: a ground is required' }],
  },
  'arrears.remedy_notice': { reads: 'Deadline on a notice to remedy', scope: 'tenancies', run: (pack, fx) => eachSending(fx, (s) => `Pay by ${day(remedyDeadline(pack, calendarFor(pack), s).deadline)}`) },
  'arrears.tribunal_threshold': {
    reads: 'Arrears ladder and the Tribunal threshold',
    scope: 'tenancies',
    run: (pack, fx) => [{ id: 'due_today', label: 'Rent fell due today and is unpaid', value: `Threshold reached ${day(arrearsState(pack, calendarFor(pack), { rentPaidTo: addDays(fx.today, -1), weeklyRent: fx.rent ?? 0, cadence: 'weekly' }, fx.today).tribunalOn)}` }],
  },
  'arrears.repeat_rule': {
    reads: 'Late-payment strikes',
    scope: 'periodic',
    run: (pack, fx) => [{ id: 'due_today', label: 'Rent fell due today and is unpaid', value: `Counts as a strike from ${day(arrearsState(pack, calendarFor(pack), { rentPaidTo: addDays(fx.today, -1), weeklyRent: fx.rent ?? 0, cadence: 'weekly' }, fx.today).strikeOn)}` }],
  },
  'fixed_term.notice_window': {
    reads: 'Notice window before a fixed term ends',
    scope: 'fixed',
    run: (pack, fx) => {
      const ends = addDays(fx.today, 180)
      const w = fixedTermWindow(pack, calendarFor(pack), ends, fx.today)
      return [{ id: 'six_months', label: `A fixed term ending ${day(ends)}`, value: w ? `Notice window ${day(w.opens)} to ${day(w.closes)}` : 'No notice window' }]
    },
  },
  'listing.fixed_price_required': {
    reads: 'Advertised-rent check on listings and imports',
    scope: 'listings',
    run: (pack, fx) => {
      const sample = fx.rent ?? 0
      const typed = `${money(sample)}-${money(sample + 20)}`
      return [{ id: 'range', label: `A rent typed as “${typed}”`, value: parseAdvertisedRent(pack, typed).ok ? 'Accepted' : 'Refused: one figure is required' }]
    },
  },
  'listing.bidding_banned': {
    reads: 'Offer check on Pool applications',
    scope: 'applications',
    run: (pack, fx) =>
      fx.rent === null
        ? []
        : [{ id: 'above', label: `An application offering ${money(fx.rent + 20)} on a ${money(fx.rent)} listing`, value: checkRentOffer(pack, fx.rent, fx.rent + 20).ok ? 'Accepted' : 'Refused: applications are at the advertised rent' }],
  },
  'contract.contracting_out_void': {
    reads: 'Clause scanner on agreements and variations',
    scope: 'tenancies',
    run: (pack) => [{ id: 'late_fee', label: 'A clause charging a daily late fee', value: scanClause(pack, 'A late fee of $20 per day late applies to overdue rent.').length ? 'Flagged as having no effect' : 'Not flagged' }],
  },
  'privacy.unsuccessful_applicant_retention': {
    reads: 'Purge date for unsuccessful applicants',
    scope: 'applications',
    run: (pack, fx) => [{ id: 'today', label: 'An application declined today', value: `Details deleted ${day(addDuration(fx.today, pack.rules['privacy.unsuccessful_applicant_retention'].value, calendarFor(pack)))}` }],
  },
  'requests.minor_change_response': {
    reads: 'Countdown on a request to change the home',
    scope: 'tenancies',
    run: (pack, fx) => {
      const rule = pack.rules['requests.minor_change_response'].value
      return [{ id: 'today', label: 'A request received today', value: rule ? `Answer by ${day(addDuration(fx.today, rule, calendarFor(pack)))}` : 'No deadline tracked' }]
    },
  },
  'records.retention_after_tenancy': {
    reads: 'Record retention after a tenancy ends',
    scope: 'tenancies',
    run: (pack, fx) => [{ id: 'today', label: 'A tenancy ending today', value: `Records kept until ${day(addDuration(fx.today, pack.rules['records.retention_after_tenancy'].value, calendarFor(pack)))}` }],
  },
}

const SCOPE_NOUN: Record<Scope, [string, string]> = {
  periodic: ['periodic tenancy', 'periodic tenancies'],
  fixed: ['fixed-term tenancy', 'fixed-term tenancies'],
  tenancies: ['tenancy', 'tenancies'],
  listings: ['listing', 'listings'],
  applications: ['open application', 'open applications'],
}

/** The records in the store that a rule of this scope governs, in one jurisdiction. */
function governed(db: Db, code: JurisdictionCode, scope: Scope): { ids: ID[]; orgIds: ID[]; rents: number[] } {
  const here = new Map(db.properties.filter((p) => p.jurisdiction === code).map((p) => [p.id, p]))
  const live = db.tenancies.filter((t) => here.has(t.propertyId) && (t.status === 'active' || t.status === 'notice_given'))
  const rents = live.map((t) => t.weeklyRent)
  if (scope === 'listings') {
    const rows = [...here.values()].filter((p) => p.listing && p.listing.status !== 'let')
    return { ids: rows.map((p) => p.id), orgIds: rows.map((p) => p.orgId), rents: rows.map((p) => p.listing!.advertisedWeeklyRent) }
  }
  if (scope === 'applications') {
    const rows = db.applications.filter((a) => here.has(a.propertyId) && a.stage !== 'declined' && a.stage !== 'withdrawn')
    return { ids: rows.map((a) => a.id), orgIds: rows.map((a) => a.orgId), rents }
  }
  const rows = scope === 'periodic' ? live.filter((t) => t.type === 'periodic') : scope === 'fixed' ? live.filter((t) => t.type === 'fixed') : live
  return { ids: rows.map((t) => t.id), orgIds: rows.map((t) => t.orgId), rents: rows.length ? rows.map((t) => t.weeklyRent) : rents }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

/** The dates the fixtures use: an ordinary day, and the two places date arithmetic most often goes wrong. */
function fixtureSendings(today: ISODate): Fixture['sendings'] {
  const year = Number(today.slice(0, 4))
  const next = (monthDay: string) => (`${year}-${monthDay}` > today ? `${year}-${monthDay}` : `${year + 1}-${monthDay}`)
  const beforeShutdown = next('12-23')
  const monthEnd = next('01-31')
  return [
    { id: 'email_morning', label: 'Emailed today at 10:00', s: { sentOn: today, method: 'email', hour: 10 } },
    { id: 'email_evening', label: 'Emailed today at 18:00', s: { sentOn: today, method: 'email', hour: 18 } },
    { id: 'post', label: 'Posted today', s: { sentOn: today, method: 'post' } },
    { id: 'summer', label: `Emailed ${day(beforeShutdown)}, just before Christmas`, s: { sentOn: beforeShutdown, method: 'email', hour: 10 } },
    { id: 'month_end', label: `Emailed ${day(monthEnd)}, a month end`, s: { sentOn: monthEnd, method: 'email', hour: 10 } },
  ]
}

/**
 * What a change would do, found by running the calculators twice: once on the
 * pack before the patch and once after. For a change that is still open,
 * "before" is the live pack; for one already published it is the live pack
 * with the patch's old values put back, so the history stays readable.
 */
export function impactAnalysis(db: Db, change: RuleChange, today: ISODate): ImpactAnalysis {
  const code = change.jurisdiction
  const live = resolvePack(code, db.packVersions)
  const known = change.patches.filter((p) => p.ruleKey in live.rules)
  const historical = change.status === 'published' || inForce(change, live)
  const before = historical ? packWith(code, db.packVersions, Object.fromEntries(known.map((p) => [p.ruleKey, p.from]))) : live
  const after = packWith(code, db.packVersions, Object.fromEntries(known.map((p) => [p.ruleKey, p.to])))
  const sendings = fixtureSendings(today)

  const orgIds = new Set<ID>()
  const recordIds = new Set<ID>()
  const patches: PatchImpact[] = known.map((p) => {
    const key = p.ruleKey as RuleKey
    const runner = RUNNERS[key]
    const scope: Scope = runner?.scope ?? 'tenancies'
    const g = governed(db, code, scope)
    g.orgIds.forEach((id) => orgIds.add(id))
    g.ids.forEach((id) => recordIds.add(id))
    const fx: Fixture = { today, rent: median(g.rents), sendings }
    const was = runner ? runner.run(before, fx) : []
    const now = runner ? runner.run(after, fx) : []
    const scenarios: Scenario[] = was.map((b, i) => ({ id: b.id, label: b.label, before: b.value, after: now[i]?.value ?? b.value, changed: b.value !== (now[i]?.value ?? b.value) }))
    return { ruleKey: p.ruleKey, label: live.rules[key].label, reads: runner?.reads ?? null, scenarios, orgs: new Set(g.orgIds).size, records: g.ids.length, noun: SCOPE_NOUN[scope][g.ids.length === 1 ? 0 : 1] }
  })

  return {
    jurisdiction: code,
    drivesCalculators: PACKS[code].status === 'live',
    patches,
    scenarios: patches.reduce((a, p) => a + p.scenarios.length, 0),
    changed: patches.reduce((a, p) => a + p.scenarios.filter((s) => s.changed).length, 0),
    orgs: orgIds.size,
    records: recordIds.size,
  }
}
