/**
 * A jurisdiction rule pack: every statutory constant the product relies on,
 * each one carrying its citation, the page it was verified against and the
 * date someone last checked it.
 *
 * Packs are data. The calculators in `src/domain/rules` read them through
 * `resolvePack`, which lays admin-published overrides on top of the shipped
 * values — so approving a law change in the admin console changes what every
 * calculator returns, with no deploy.
 */
import type { ISODate, JurisdictionCode } from '../types'
import type { CalendarConfig } from '../rules/calendar'

export interface Duration {
  n: number
  unit: 'hours' | 'days' | 'working_days' | 'weeks' | 'months'
}

export type Verification =
  /** Read on the legislation or regulator's own page. */
  | 'primary'
  /** Confirmed by a reputable secondary source; the primary text was not reachable. */
  | 'secondary'
  /** Carried from the product spec or general knowledge. Shown with a warning. */
  | 'unverified'

export interface RuleMeta {
  /** Short name, as a landlord would say it. */
  label: string
  /** One or two plain sentences. No section numbers, no legalese. */
  plain: string
  /** `RTA 1986, s 18` */
  citation: string
  sourceUrl: string
  verified: Verification
  lastVerified: ISODate
  /** When this value came into force, if recent enough to matter. */
  effectiveFrom?: ISODate
  /** Edge cases a careful person should know. */
  notes?: string
  /**
   * Set by `resolvePack`, never written in a pack file: a published value
   * that has not commenced. The calculators keep `value` until `from`.
   */
  upcoming?: { value: unknown; from: ISODate; version: string }
  /**
   * Set by `resolvePack`: the shipped value a published version replaced.
   * `plain` and `notes` were written for that value, so wherever they are
   * shown this has to be shown with them.
   */
  revised?: { was: unknown; on: ISODate; version: string }
}

export interface Rule<T> extends RuleMeta {
  value: T
}

export interface ServiceMethod {
  id: 'hand' | 'email' | 'letterbox' | 'post'
  label: string
  /** Working days after sending before the law treats the notice as received. */
  addWorkingDays: number
  /** Sent after this hour (24h), the clock starts on the next working day. */
  cutoffHour?: number
  plain: string
}

/**
 * The shared rule schema. Every jurisdiction answers the same questions, which
 * is what lets a new state or country be added as data. `null` means the
 * jurisdiction has no such rule.
 */
export interface RuleValues {
  'bond.max_weeks': number
  'bond.pet_max_weeks': number | null
  'bond.lodgement_deadline': Duration
  'rent.in_advance_max_weeks': number

  'listing.fixed_price_required': boolean
  'listing.bidding_banned': boolean
  'listing.letting_fee_banned': boolean

  'rent_increase.min_interval_months': number
  'rent_increase.notice': Duration

  'entry.inspection_notice_min': Duration
  'entry.inspection_notice_max': Duration | null
  'entry.inspection_min_interval': Duration
  'entry.repairs_notice_min': Duration
  /** Permitted hours for entry, 24h clock. */
  'entry.hours': { from: number; to: number } | null

  'termination.no_cause_allowed': boolean
  'termination.landlord_periodic_notice': Duration | null
  'termination.owner_occupy_notice': Duration | null
  'termination.sale_notice': Duration | null
  'termination.tenant_periodic_notice': Duration

  /** Window before a fixed term ends in which notice can be given. */
  'fixed_term.notice_window': { earliest: Duration; latest: Duration } | null
  'fixed_term.rolls_to_periodic': boolean

  'pets.response_deadline': Duration | null
  'pets.refusal_needs_grounds': boolean

  'arrears.remedy_notice': Duration
  'arrears.tribunal_threshold': Duration
  'arrears.repeat_rule': { occasions: number; lateBy: Duration; within: Duration } | null

  'requests.minor_change_response': Duration | null
  'damage.careless_cap_weeks': number | null
  'contract.contracting_out_void': boolean

  'privacy.unsuccessful_applicant_retention': Duration
  'records.retention_after_tenancy': Duration
}

export type RuleKey = keyof RuleValues
export type RuleSet = { [K in RuleKey]: Rule<RuleValues[K]> }

export interface Penalty {
  /** A stable name for the entry, so a sentence can quote its amount without matching on the wording of `act`. */
  key?: string
  act: string
  /** Maximum exemplary damages or fine, in the pack's currency. */
  max: number
  citation: string
  sourceUrl: string
  /** The product feature that stops it happening. */
  preventedBy: string
}

export interface TaxCategory {
  key: string
  label: string
  kind: 'income' | 'deductible' | 'non_deductible' | 'capital'
  /** Where it lands on the return, in the tax office's words. */
  formLine: string
  hint: string
}

export interface ComplianceCheckDef {
  key: string
  label: string
  /** Why it matters, in one sentence. */
  why: string
  citation: string
  sourceUrl: string
  /** Share of the 0–100 score this check is worth. */
  weight: number
  /** How often it recurs, in months. 0 = once per tenancy. */
  recursMonths: number
}

export interface PrivacyStage {
  stage: string
  when: string
  mayCollect: string[]
  mustNotCollect: string[]
}

export interface JurisdictionPack {
  code: JurisdictionCode
  name: string
  shortName: string
  /** `live` packs drive calculators. `preview` packs are researched but not yet signed off. */
  status: 'live' | 'preview'
  version: string
  publishedOn: ISODate
  currency: 'NZD' | 'AUD'
  locale: string
  act: { name: string; url: string }
  regulator: { name: string; url: string }
  bondAuthority: { name: string; url: string }
  tribunal: {
    name: string
    url: string
    maxClaim: number | null
    /** What happens to documents filed with an application, where that has been read at source. */
    filing?: { disclosed: string; redaction: string; citation: string; sourceUrl: string }
  }
  salesTax: { name: string; ratePct: number; appliesToResidentialRent: boolean }
  /** The number to call when someone is in danger. */
  emergencyNumber: string
  taxYearStartMonth: number
  calendar: CalendarConfig
  /** Non-working days that apply only in one area (provincial anniversary days). */
  regionalHolidays: Record<string, { label: string; dates: ISODate[] }>
  /**
   * Days of margin Loop adds to notices a landlord serves. Product policy, not
   * law — every calculation shows it as its own line so nobody mistakes it for one.
   */
  safetyBufferDays: number
  rules: RuleSet
  service: ServiceMethod[]
  penalties: Penalty[]
  taxCategories: TaxCategory[]
  /** The schedule a landlord files for rental income, where the jurisdiction has one. */
  taxForm?: { name: string; url: string }
  /** Plain-language tax points shown beside the rental schedule. General information, each with its source. */
  taxNotes: { key: string; title: string; plain: string; citation: string; sourceUrl: string; lastVerified: ISODate }[]
  complianceChecks: ComplianceCheckDef[]
  privacyStages: PrivacyStage[]
  /** Statutory examples of reasonable grounds to refuse a pet, and of reasonable conditions. */
  petRefusalGrounds: { key: string; label: string; needsDetail: boolean }[]
  petConditions: { key: string; label: string }[]
  /** Reforms that are enacted or announced but not yet in force. */
  upcoming: { title: string; effective: string; summary: string; sourceUrl: string }[]
}
