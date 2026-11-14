/**
 * The "sleep-at-night" score: how ready a property is for a Tribunal claim or
 * an insurer's questions, as a number and as the list of things behind it.
 *
 * The number is only ever a summary of the checks. Each check says what was
 * looked at, what was found, and the one thing that would fix it.
 */
import type { Inspection, ISODate, Property, Tenancy } from '../types'
import type { ComplianceCheckDef, JurisdictionPack } from '../jurisdictions/types'
import { addMonths, addWeeks, dateOf, diffDays, fmtDate, type CalendarConfig } from './calendar'
import { bondLodgement } from './tenancy'

export type CheckStatus = 'ok' | 'attention' | 'fail' | 'na'

export interface CheckResult {
  def: ComplianceCheckDef
  status: CheckStatus
  /** What was found, as a sentence. */
  finding: string
  /** The one next step, when there is one. */
  fix?: string
  /** Where in the app the fix happens. */
  action?: 'bond' | 'healthy_homes' | 'smoke_alarms' | 'insurance' | 'inspection' | 'agreement' | 'documents'
  due?: ISODate
}

export interface ComplianceReport {
  score: number
  checks: CheckResult[]
  failing: number
  attention: number
}

const HH_KEYS = {
  hh_heating: 'heating',
  hh_insulation: 'insulation',
  hh_ventilation: 'ventilation',
  hh_moisture: 'moisture',
  hh_draught: 'draught',
} as const

export function complianceReport(
  pack: JurisdictionPack,
  cal: CalendarConfig,
  property: Property,
  tenancy: Tenancy | undefined,
  lastInspection: Inspection | undefined,
  today: ISODate,
): ComplianceReport {
  const checks: CheckResult[] = pack.complianceChecks.map((def) =>
    evaluate(def, pack, cal, property, tenancy, lastInspection, today),
  )
  const scored = checks.filter((c) => c.status !== 'na')
  const total = scored.reduce((a, c) => a + c.def.weight, 0)
  const earned = scored.reduce(
    (a, c) => a + c.def.weight * (c.status === 'ok' ? 1 : c.status === 'attention' ? 0.5 : 0),
    0,
  )
  return {
    score: total === 0 ? 100 : Math.round((earned / total) * 100),
    checks,
    failing: checks.filter((c) => c.status === 'fail').length,
    attention: checks.filter((c) => c.status === 'attention').length,
  }
}

function evaluate(
  def: ComplianceCheckDef,
  pack: JurisdictionPack,
  cal: CalendarConfig,
  p: Property,
  t: Tenancy | undefined,
  lastInspection: Inspection | undefined,
  today: ISODate,
): CheckResult {
  const active = t && (t.status === 'active' || t.status === 'notice_given')
  const na = (finding: string): CheckResult => ({ def, status: 'na', finding })

  switch (def.key) {
    case 'agreement':
      if (!active) return na('No tenancy at the moment.')
      return t.agreementSignedOn
        ? { def, status: 'ok', finding: `Signed ${fmtDate(t.agreementSignedOn, { year: 'always' })}.` }
        : {
            def,
            status: 'fail',
            finding: 'No signed agreement is on file.',
            fix: 'Create the agreement and send it for signature.',
            action: 'agreement',
          }

    case 'bond_lodged': {
      if (!active || t.bond.amount === 0) return na(active ? 'No bond was taken.' : 'No tenancy at the moment.')
      if (t.bond.lodgedOn)
        return {
          def,
          status: 'ok',
          finding: `Lodged ${fmtDate(t.bond.lodgedOn, { year: 'always' })}${t.bond.bondRef ? ` · ${t.bond.bondRef}` : ''}.`,
        }
      if (!t.bond.receivedOn)
        return { def, status: 'attention', finding: 'Bond agreed but not yet received.', action: 'bond' }
      const b = bondLodgement(pack, cal, t.bond.receivedOn, undefined, today)
      if (b.status === 'overdue') {
        return {
          def,
          status: 'fail',
          finding: `The deadline was ${fmtDate(b.deadline)}.`,
          fix: 'Lodge it today. A late bond is an unlawful act.',
          action: 'bond',
          due: b.deadline,
        }
      }
      return {
        def,
        status: b.status === 'on_track' ? 'attention' : 'fail',
        finding: `Not lodged yet — ${b.workingDaysLeft} working ${b.workingDaysLeft === 1 ? 'day' : 'days'} left.`,
        fix: `Lodge through ${pack.bondAuthority.name} by ${fmtDate(b.deadline)}.`,
        action: 'bond',
        due: b.deadline,
      }
    }

    case 'hh_heating':
    case 'hh_insulation':
    case 'hh_ventilation':
    case 'hh_moisture':
    case 'hh_draught': {
      const std = p.healthyHomes[HH_KEYS[def.key]]
      if (std.status === 'compliant') return { def, status: 'ok', finding: std.detail ?? 'Meets the standard.' }
      if (std.status === 'exempt') return { def, status: 'ok', finding: std.detail ?? 'An exemption applies.' }
      if (std.status === 'unknown') {
        return {
          def,
          status: 'attention',
          finding: std.detail ?? 'Not assessed yet.',
          fix: 'Run the guided check — it takes a few minutes.',
          action: 'healthy_homes',
        }
      }
      return {
        def,
        status: 'fail',
        finding: std.detail ?? 'Does not meet the standard.',
        fix: 'Book the work; this must comply from day one of a tenancy.',
        action: 'healthy_homes',
      }
    }

    case 'hh_statement':
      if (!active) return na('No tenancy at the moment.')
      return p.healthyHomes.statementSignedAt
        ? {
            def,
            status: 'ok',
            finding: `Statement signed ${fmtDate(p.healthyHomes.statementSignedAt, { year: 'always' })}.`,
          }
        : {
            def,
            status: 'fail',
            finding: 'The agreement has no signed healthy homes statement.',
            fix: 'Generate the statement from your compliance record and add it by variation.',
            action: 'healthy_homes',
          }

    case 'smoke_alarms': {
      const s = p.smokeAlarms
      if (!s.lastChecked)
        return {
          def,
          status: 'fail',
          finding: 'No test is on record.',
          fix: 'Test every alarm and log it — or have it done at the next inspection.',
          action: 'smoke_alarms',
        }
      const thisYear = Number(today.slice(0, 4))
      if (s.expiryYear !== undefined && s.expiryYear <= thisYear) {
        return {
          def,
          status: 'fail',
          finding: `The alarms reach their replacement date in ${s.expiryYear}.`,
          fix: 'Replace them with long-life photoelectric alarms.',
          action: 'smoke_alarms',
        }
      }
      const due = addMonths(s.lastChecked, def.recursMonths || 12)
      if (today > due) {
        return {
          def,
          status: 'attention',
          finding: `Last tested ${fmtDate(s.lastChecked, { year: 'always' })} — more than a year ago.`,
          fix: 'Test and log them at the next visit.',
          action: 'smoke_alarms',
          due,
        }
      }
      return { def, status: 'ok', finding: `Tested ${fmtDate(s.lastChecked, { year: 'always' })}.`, due }
    }

    case 'insurance_statement':
      if (!active) return na('No tenancy at the moment.')
      return p.insurance.statementInAgreement
        ? {
            def,
            status: 'ok',
            finding:
              p.insurance.excess !== undefined
                ? `Agreement states the home is insured, excess $${p.insurance.excess}.`
                : 'Agreement includes the insurance statement.',
          }
        : {
            def,
            status: 'fail',
            finding: 'The agreement does not say whether the home is insured or what the excess is.',
            fix: 'Add the insurance statement by variation.',
            action: 'agreement',
          }

    case 'insurance_current': {
      const renews = p.insurance.renewsOn
      if (!p.insurance.insurer || !renews)
        return {
          def,
          status: 'attention',
          finding: 'No landlord insurance on record.',
          fix: 'Add your policy so its conditions can be tracked.',
          action: 'insurance',
        }
      const days = diffDays(today, renews)
      if (days < 0)
        return {
          def,
          status: 'fail',
          finding: `The policy lapsed on ${fmtDate(renews)}.`,
          fix: 'Renew it and upload the new schedule.',
          action: 'insurance',
          due: renews,
        }
      if (days <= 30)
        return {
          def,
          status: 'attention',
          finding: `Renews ${fmtDate(renews)} — in ${days} days.`,
          fix: 'Confirm the renewal and check the excess has not changed.',
          action: 'insurance',
          due: renews,
        }
      return {
        def,
        status: 'ok',
        finding: `${p.insurance.insurer}, renews ${fmtDate(renews, { year: 'always' })}.`,
        due: renews,
      }
    }

    case 'inspection_current': {
      if (!active) return na('No tenancy at the moment.')
      const weeks = p.insurance.inspectionIntervalWeeks ?? 13
      const last = lastInspection?.completedAt ? dateOf(lastInspection.completedAt) : undefined
      if (!last)
        return {
          def,
          status: 'attention',
          finding: 'No inspection has been recorded for this tenancy.',
          fix: 'Schedule one.',
          action: 'inspection',
        }
      const due = addWeeks(last, weeks)
      const days = diffDays(today, due)
      if (days < -14)
        return {
          def,
          status: 'fail',
          finding: `Last inspected ${fmtDate(last, { year: 'always' })}; your policy expects one every ${weeks} weeks.`,
          fix: 'Schedule one now.',
          action: 'inspection',
          due,
        }
      if (days <= 14)
        return {
          def,
          status: 'attention',
          finding: `Next inspection is due around ${fmtDate(due)}.`,
          fix: 'Choose to do it yourself or delegate it.',
          action: 'inspection',
          due,
        }
      return { def, status: 'ok', finding: `Inspected ${fmtDate(last, { year: 'always' })}.`, due }
    }

    case 'body_corp':
      if (p.titleType !== 'unit_title') return na('Not a unit title.')
      if (!active) return na('No tenancy at the moment.')
      return p.bodyCorpRulesAttached
        ? { def, status: 'ok', finding: 'Operational rules are attached to the agreement.' }
        : {
            def,
            status: 'fail',
            finding: 'The body corporate rules are not attached.',
            fix: 'Upload the current rules; without them they do not bind the tenant.',
            action: 'documents',
          }

    case 'meth':
      if (p.meth.status === 'contaminated')
        return {
          def,
          status: 'fail',
          finding: 'A test found contamination above the limit.',
          fix: 'The home must be decontaminated and re-tested before it is let.',
          action: 'documents',
        }
      if (p.meth.status === 'untested')
        return {
          def,
          status: 'ok',
          finding:
            'No test on record, and nothing to suggest contamination. A baseline test between tenancies is optional.',
        }
      return {
        def,
        status: 'ok',
        finding: p.meth.testedAt ? `Clear — tested ${fmtDate(p.meth.testedAt, { year: 'always' })}.` : 'Clear.',
      }

    default:
      return na('Not assessed.')
  }
}

/** One portfolio figure: each property's score weighted equally. */
export function portfolioScore(reports: ComplianceReport[]): number {
  if (reports.length === 0) return 100
  return Math.round(reports.reduce((a, r) => a + r.score, 0) / reports.length)
}
