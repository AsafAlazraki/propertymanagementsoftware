/**
 * The statutory calculators. Each takes a rule pack, so the same code answers
 * for any jurisdiction, and each returns its working.
 */
import type { ISODate, Tenancy } from '../types'
import type { JurisdictionPack, ServiceMethod } from '../jurisdictions/types'
import {
  addDays,
  addMonths,
  addWorkingDays,
  diffDays,
  fmtDate,
  maxDate,
  workingDaysBetween,
  type CalendarConfig,
} from './calendar'
import { addDuration, deemedReceived, durationText, latestSendDate, OK, type Step, type Verdict } from './core'
import { money } from './format'

export interface Sending {
  sentOn: ISODate
  method: ServiceMethod['id']
  /** 24-hour clock. Matters for email: after 5 pm counts from the next working day. */
  hour?: number
}

/* ─────────────────────────────────── bond ───────────────────────────────── */

export function bondCaps(pack: JurisdictionPack, weeklyRent: number): { general: number; pet: number | null } {
  const petWeeks = pack.rules['bond.pet_max_weeks'].value
  return {
    general: pack.rules['bond.max_weeks'].value * weeklyRent,
    pet: petWeeks === null ? null : petWeeks * weeklyRent,
  }
}

export function checkBond(pack: JurisdictionPack, weeklyRent: number, general: number, pet = 0): Verdict {
  const caps = bondCaps(pack, weeklyRent)
  if (general > caps.general) {
    return {
      ok: false,
      rule: 'bond.max_weeks',
      reason: `A bond of ${money(general)} is more than ${pack.rules['bond.max_weeks'].value} weeks of rent.`,
      fix: `The most you can ask for at ${money(weeklyRent)} a week is ${money(caps.general)}.`,
    }
  }
  if (pet > 0 && caps.pet === null) {
    return { ok: false, rule: 'bond.pet_max_weeks', reason: 'A separate pet bond is not permitted here.' }
  }
  if (caps.pet !== null && pet > caps.pet) {
    return {
      ok: false,
      rule: 'bond.pet_max_weeks',
      reason: `A pet bond of ${money(pet)} is more than ${pack.rules['bond.pet_max_weeks'].value} weeks of rent.`,
      fix: `The most you can ask for is ${money(caps.pet)}.`,
    }
  }
  return OK
}

export interface BondLodgement {
  deadline: ISODate
  totalWorkingDays: number
  workingDaysUsed: number
  workingDaysLeft: number
  status: 'lodged' | 'on_track' | 'due_soon' | 'urgent' | 'overdue'
}

export function bondLodgement(
  pack: JurisdictionPack,
  cal: CalendarConfig,
  receivedOn: ISODate,
  lodgedOn: ISODate | undefined,
  today: ISODate,
): BondLodgement {
  const rule = pack.rules['bond.lodgement_deadline'].value
  const deadline = addDuration(receivedOn, rule, cal)
  const total = rule.unit === 'working_days' ? rule.n : workingDaysBetween(receivedOn, deadline, cal)
  const used = Math.min(total, workingDaysBetween(receivedOn, today, cal))
  const left = today > deadline ? -workingDaysBetween(deadline, today, cal) : workingDaysBetween(today, deadline, cal)
  const status = lodgedOn ? 'lodged' : left < 0 ? 'overdue' : left <= 3 ? 'urgent' : left <= 8 ? 'due_soon' : 'on_track'
  return { deadline, totalWorkingDays: total, workingDaysUsed: used, workingDaysLeft: left, status }
}

/* ────────────────────────────── rent increases ──────────────────────────── */

export interface RentIncreasePlan {
  /** The first day the new rent can lawfully apply. */
  earliest: ISODate
  /** The 12-month gate on its own. */
  gate: ISODate
  received: ISODate
  steps: Step[]
  blocked?: Verdict
}

export function planRentIncrease(
  pack: JurisdictionPack,
  cal: CalendarConfig,
  tenancy: Pick<Tenancy, 'startDate' | 'lastRentIncrease' | 'type' | 'endDate'>,
  sending: Sending,
  opts: { fixedTermClauseAllows?: boolean } = {},
): RentIncreasePlan {
  const months = pack.rules['rent_increase.min_interval_months'].value
  const notice = pack.rules['rent_increase.notice'].value
  const served = deemedReceived(pack, cal, sending.sentOn, sending.method, sending.hour)
  const anchor = tenancy.lastRentIncrease ?? tenancy.startDate
  const gate = addMonths(anchor, months)
  const noticeEnds = addDuration(served.received, notice, cal)
  const withMargin = addDays(noticeEnds, pack.safetyBufferDays)
  const earliest = maxDate(gate, withMargin)

  const steps: Step[] = [
    ...served.steps,
    { label: `${durationText(notice)} of notice`, date: noticeEnds, rule: 'rent_increase.notice' },
    ...(pack.safetyBufferDays > 0
      ? [{ label: `Loop’s ${pack.safetyBufferDays}-day margin`, date: withMargin, policy: true, detail: 'Not required by law. It keeps a disputed delivery time from sinking the notice.' }]
      : []),
    {
      label: tenancy.lastRentIncrease ? `${months} months since the last increase took effect` : `${months} months since the tenancy began`,
      date: gate,
      rule: 'rent_increase.min_interval_months',
    },
    { label: 'Earliest the new rent can start', date: earliest, detail: 'The later of the two dates above.' },
  ]

  let blocked: Verdict | undefined
  if (tenancy.type === 'fixed' && !opts.fixedTermClauseAllows) {
    blocked = {
      ok: false,
      rule: 'rent_increase.min_interval_months',
      reason: 'This is a fixed-term tenancy and the agreement has no rent review clause.',
      fix: tenancy.endDate
        ? `Rent can be reviewed when the term ends on ${fmtDate(tenancy.endDate, { year: 'always' })}, or by a signed variation both of you agree to.`
        : 'Rent can be reviewed by a signed variation both of you agree to.',
    }
  }
  return { earliest, gate, received: served.received, steps, blocked }
}

export function checkRentIncreaseDate(plan: RentIncreasePlan, effective: ISODate): Verdict {
  if (plan.blocked) return plan.blocked
  if (effective < plan.earliest) {
    return {
      ok: false,
      rule: effective < plan.gate ? 'rent_increase.min_interval_months' : 'rent_increase.notice',
      reason:
        effective < plan.gate
          ? `That is less than 12 months since rent was last set.`
          : `That does not leave the tenant the full notice period.`,
      fix: `The earliest date that works is ${fmtDate(plan.earliest, { year: 'always' })}.`,
    }
  }
  return OK
}

/* ────────────────────────────────── entry ───────────────────────────────── */

export interface InspectionWindow {
  /** First day an inspection can lawfully happen. */
  earliest: ISODate
  /** Last day this notice can cover; after it a fresh notice is needed. */
  latest: ISODate | null
  /** The frequency gate on its own, when a previous inspection exists. */
  gate: ISODate | null
  steps: Step[]
}

export function inspectionWindow(
  pack: JurisdictionPack,
  cal: CalendarConfig,
  sending: Sending,
  lastInspection?: ISODate,
): InspectionWindow {
  const min = pack.rules['entry.inspection_notice_min'].value
  const max = pack.rules['entry.inspection_notice_max'].value
  const interval = pack.rules['entry.inspection_min_interval'].value
  const served = deemedReceived(pack, cal, sending.sentOn, sending.method, sending.hour)
  const afterNotice = addDuration(served.received, min, cal)
  const gate = lastInspection ? addDuration(lastInspection, interval, cal) : null
  const earliest = gate ? maxDate(afterNotice, gate) : afterNotice
  const latest = max ? addDuration(served.received, max, cal) : null
  const steps: Step[] = [
    ...served.steps,
    { label: `At least ${durationText(min)} of notice`, date: afterNotice, rule: 'entry.inspection_notice_min' },
    ...(gate ? [{ label: `${durationText(interval)} since the last inspection`, date: gate, rule: 'entry.inspection_min_interval' as const }] : []),
    { label: 'First day you can inspect', date: earliest },
    ...(latest ? [{ label: 'This notice is good until', date: latest, rule: 'entry.inspection_notice_max' as const }] : []),
  ]
  return { earliest, latest, gate, steps }
}

export function checkInspectionSlot(pack: JurisdictionPack, window: InspectionWindow, date: ISODate, hour: number): Verdict {
  const hours = pack.rules['entry.hours'].value
  if (hours && (hour < hours.from || hour >= hours.to)) {
    return { ok: false, rule: 'entry.hours', reason: `Entry on notice has to be between ${hours.from} am and ${hours.to - 12} pm.` }
  }
  if (window.gate && date < window.gate) {
    return {
      ok: false,
      rule: 'entry.inspection_min_interval',
      reason: 'That would be a second inspection inside four weeks.',
      fix: `The next one can be on or after ${fmtDate(window.gate)}.`,
    }
  }
  if (date < window.earliest) {
    return {
      ok: false,
      rule: 'entry.inspection_notice_min',
      reason: 'That does not give the tenant 48 hours from when they receive the notice.',
      fix: `The first day that works is ${fmtDate(window.earliest)}.`,
    }
  }
  if (window.latest && date > window.latest) {
    return {
      ok: false,
      rule: 'entry.inspection_notice_max',
      reason: 'Inspection notice cannot be given more than 14 days ahead.',
      fix: `Pick a day up to ${fmtDate(window.latest)}, or send the notice closer to the time.`,
    }
  }
  return OK
}

/** The first day a tradesperson may enter for necessary repairs on a notice sent now. */
export function repairsEntryFrom(pack: JurisdictionPack, cal: CalendarConfig, sending: Sending): { earliest: ISODate; steps: Step[] } {
  const min = pack.rules['entry.repairs_notice_min'].value
  const served = deemedReceived(pack, cal, sending.sentOn, sending.method, sending.hour)
  const earliest = addDuration(served.received, min, cal)
  return {
    earliest,
    steps: [...served.steps, { label: `At least ${durationText(min)} of notice`, date: earliest, rule: 'entry.repairs_notice_min' }],
  }
}

/* ───────────────────────────── ending a tenancy ─────────────────────────── */

export type EndGround = 'no_cause' | 'owner_occupy' | 'sale' | 'tenant'

export interface TerminationPlan {
  endsOn: ISODate
  received: ISODate
  noticeDays: number
  steps: Step[]
  /** Things the notice must say, or facts that must be true, for this ground to hold. */
  conditions: string[]
  blocked?: Verdict
}

export function planTermination(
  pack: JurisdictionPack,
  cal: CalendarConfig,
  tenancy: Pick<Tenancy, 'type' | 'noticeGiven' | 'endDate'>,
  ground: EndGround,
  sending: Sending,
): TerminationPlan {
  const key =
    ground === 'tenant'
      ? 'termination.tenant_periodic_notice'
      : ground === 'owner_occupy'
        ? 'termination.owner_occupy_notice'
        : ground === 'sale'
          ? 'termination.sale_notice'
          : 'termination.landlord_periodic_notice'
  const rule = pack.rules[key]
  const served = deemedReceived(pack, cal, sending.sentOn, sending.method, sending.hour)
  const margin = ground === 'tenant' ? 0 : pack.safetyBufferDays

  let blocked: Verdict | undefined
  if (tenancy.type === 'fixed') {
    blocked = {
      ok: false,
      rule: 'fixed_term.notice_window',
      reason: 'A fixed-term tenancy cannot be ended by notice part-way through.',
      fix: tenancy.endDate
        ? `It runs to ${fmtDate(tenancy.endDate, { year: 'always' })}. To stop it rolling over, give notice in the window before that date.`
        : undefined,
    }
  } else if (tenancy.noticeGiven) {
    blocked = {
      ok: false,
      rule: key,
      reason: `A notice is already in force, ending the tenancy on ${fmtDate(tenancy.noticeGiven.endsOn, { year: 'always' })}.`,
      fix: 'A second notice can only be given if the first is withdrawn with the other person’s agreement.',
    }
  } else if (rule.value === null || (ground === 'no_cause' && !pack.rules['termination.no_cause_allowed'].value)) {
    blocked = { ok: false, rule: key, reason: 'Ending a tenancy without a ground is not permitted here.' }
  }

  const days = rule.value ? rule.value.n : 0
  const noticeEnds = rule.value ? addDuration(served.received, rule.value, cal) : served.received
  const endsOn = addDays(noticeEnds, margin)
  const conditions =
    ground === 'owner_occupy'
      ? [
          'The owner or a member of their family will move in within 90 days of the end date.',
          'They will live there as their main home for at least 90 days.',
          'The notice states this as the reason.',
        ]
      : ground === 'sale'
        ? ['There is an unconditional agreement for sale.', 'The agreement requires vacant possession.', 'The notice states this as the reason.']
        : ground === 'no_cause'
          ? ['The notice is not a response to the tenant raising a problem or using their rights.']
          : []

  return {
    endsOn,
    received: served.received,
    noticeDays: days,
    conditions,
    blocked,
    steps: [
      ...served.steps,
      { label: `${days} days of notice`, date: noticeEnds, rule: key, detail: 'The period starts the day after the notice is received and ends at the close of the last day.' },
      ...(margin > 0 ? [{ label: `Loop’s ${margin}-day margin`, date: endsOn, policy: true }] : []),
      { label: 'Tenancy ends', date: endsOn },
    ],
  }
}

export interface FixedTermWindow {
  opens: ISODate
  closes: ISODate
  status: 'not_open' | 'open' | 'closed' | 'ended'
  /** Days until the window opens (when not open) or closes (when open). */
  daysToChange: number
  /** The last day an email sent before 5 pm still lands inside the window. */
  lastSafeEmail: ISODate
}

export function fixedTermWindow(pack: JurisdictionPack, cal: CalendarConfig, endDate: ISODate, today: ISODate): FixedTermWindow | null {
  const w = pack.rules['fixed_term.notice_window'].value
  if (!w) return null
  const opens = addDays(endDate, -w.earliest.n)
  const closes = addDays(endDate, -w.latest.n)
  const status = today > endDate ? 'ended' : today > closes ? 'closed' : today >= opens ? 'open' : 'not_open'
  return {
    opens,
    closes,
    status,
    daysToChange: status === 'not_open' ? diffDays(today, opens) : status === 'open' ? diffDays(today, closes) : 0,
    lastSafeEmail: latestSendDate(pack, cal, closes, 'email'),
  }
}

/* ─────────────────────────────────── pets ───────────────────────────────── */

export function petRespondBy(pack: JurisdictionPack, receivedOn: ISODate): ISODate | null {
  const rule = pack.rules['pets.response_deadline'].value
  return rule ? addDays(receivedOn, rule.n) : null
}

export function checkPetRefusal(pack: JurisdictionPack, groundKey: string | undefined, detail: string): Verdict {
  if (!pack.rules['pets.refusal_needs_grounds'].value) return OK
  const ground = pack.petRefusalGrounds.find((g) => g.key === groundKey)
  if (!ground) {
    return {
      ok: false,
      rule: 'pets.refusal_needs_grounds',
      reason: 'A refusal has to rest on a reasonable ground, stated in writing.',
      fix: 'Choose the ground that applies. If none does, consider consenting with conditions instead.',
    }
  }
  if (ground.needsDetail && detail.trim().length < 12) {
    return {
      ok: false,
      rule: 'pets.refusal_needs_grounds',
      reason: 'The ground needs the specific facts behind it.',
      fix: 'Say what it is about this home or this animal that makes it unsuitable.',
    }
  }
  return OK
}

/* ────────────────────────────────── arrears ─────────────────────────────── */

export interface ArrearsState {
  daysLate: number
  owed: number
  periodsMissed: number
  /** The day rent reaches the Tribunal threshold. */
  tribunalOn: ISODate
  /** The day this missed payment becomes five working days overdue — a "strike". */
  strikeOn: ISODate
  atTribunalThreshold: boolean
  atStrike: boolean
}

/**
 * Where a tenancy stands on rent. `rentPaidTo` is the last day paid for, so the
 * next payment fell due the day after it; a tenant is one day late the day
 * after that.
 */
export function arrearsState(pack: JurisdictionPack, cal: CalendarConfig, tenancy: Pick<Tenancy, 'rentPaidTo' | 'weeklyRent' | 'cadence'>, today: ISODate): ArrearsState {
  const dueOn = addDays(tenancy.rentPaidTo, 1)
  const daysLate = Math.max(0, diffDays(dueOn, today))
  const cycle = tenancy.cadence === 'fortnightly' ? 14 : 7
  const periodsMissed = today < dueOn ? 0 : Math.floor(diffDays(dueOn, today) / cycle) + 1
  const owed = periodsMissed * tenancy.weeklyRent * (cycle / 7)
  const threshold = pack.rules['arrears.tribunal_threshold'].value
  const repeat = pack.rules['arrears.repeat_rule'].value
  const tribunalOn = addDuration(dueOn, threshold, cal)
  const strikeOn = repeat ? addWorkingDays(dueOn, repeat.lateBy.n, cal) : tribunalOn
  return {
    daysLate,
    owed: daysLate > 0 ? owed : 0,
    periodsMissed: daysLate > 0 ? periodsMissed : 0,
    tribunalOn,
    strikeOn,
    atTribunalThreshold: daysLate >= threshold.n,
    atStrike: daysLate > 0 && today >= strikeOn,
  }
}

/** The date a notice to remedy runs out, counted from the day after it is received. */
export function remedyDeadline(pack: JurisdictionPack, cal: CalendarConfig, sending: Sending): { deadline: ISODate; steps: Step[] } {
  const rule = pack.rules['arrears.remedy_notice'].value
  const served = deemedReceived(pack, cal, sending.sentOn, sending.method, sending.hour)
  const deadline = addDuration(served.received, rule, cal)
  return { deadline, steps: [...served.steps, { label: `${durationText(rule)} to put it right`, date: deadline, rule: 'arrears.remedy_notice' }] }
}

/* ───────────────────────────── tenant liability ─────────────────────────── */

export type DamageCause = 'wear_and_tear' | 'careless' | 'intentional' | 'pet'

/**
 * The most a tenant can be asked to pay for damage. `null` means no cap.
 * Fair wear and tear is always zero.
 */
export function tenantLiabilityCap(
  pack: JurisdictionPack,
  cause: DamageCause,
  weeklyRent: number,
  insurance: { insured: boolean; excess?: number },
): { cap: number | null; why: string } {
  if (cause === 'wear_and_tear') return { cap: 0, why: 'Fair wear and tear is never the tenant’s to pay.' }
  if (cause === 'intentional') return { cap: null, why: 'Intentional damage is not capped.' }
  if (cause === 'pet') return { cap: null, why: 'Damage from keeping a pet is not capped.' }
  const weeks = pack.rules['damage.careless_cap_weeks'].value
  if (weeks === null) return { cap: null, why: 'No statutory cap applies here.' }
  const rentCap = weeks * weeklyRent
  if (insurance.insured && insurance.excess !== undefined && insurance.excess < rentCap) {
    return { cap: insurance.excess, why: `Careless damage is capped at your insurance excess (${money(insurance.excess)}), because that is less than ${weeks} weeks of rent.` }
  }
  return { cap: rentCap, why: `Careless damage is capped at ${weeks} weeks of rent (${money(rentCap)}).` }
}

export function checkTenantInvoice(pack: JurisdictionPack, amount: number, cause: DamageCause, weeklyRent: number, insurance: { insured: boolean; excess?: number }): Verdict & { billable: number } {
  const { cap, why } = tenantLiabilityCap(pack, cause, weeklyRent, insurance)
  if (cap === null) return { ok: true, billable: amount }
  if (amount > cap) {
    return {
      ok: false,
      billable: cap,
      rule: 'damage.careless_cap_weeks',
      reason: why,
      fix: cap === 0 ? 'This one is the owner’s cost.' : `The tenant can be billed ${money(cap)}; the remaining ${money(amount - cap)} is the owner’s (or the insurer’s).`,
    }
  }
  return { ok: true, billable: amount }
}
