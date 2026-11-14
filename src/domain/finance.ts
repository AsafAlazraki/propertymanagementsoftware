/**
 * Money questions a landlord asks about a portfolio: what it yields, what it
 * owes, what the sinking fund must cover, and what self-managing saves.
 *
 * The property-manager comparison uses the fee structure researched in
 * November 2026 (docs/research/operations-domain.md §1): 8% of rent plus GST,
 * a letting fee of one week's rent plus GST per new tenancy, and four
 * inspections a year at $55 plus GST. The inputs are exported so the screen
 * can show them — a saving nobody can check is not worth quoting.
 */
import type { CapexAsset, ISODate, LedgerEntry, Org, PlanTier, Property, Tenancy } from './types'
import { diffDays } from './rules/calendar'
import { round2, sum } from './rules/format'

export const PM_ASSUMPTIONS = {
  managementPct: 8,
  gstPct: 15,
  lettingFeeWeeks: 1,
  /** Median tenancy length in months; a letting fee recurs this often. */
  tenancyMonths: 25,
  inspectionsPerYear: 4,
  inspectionFee: 55,
}

export const PLAN: Record<PlanTier, { name: string; price: number; extraProperty: number; includes: number; blurb: string }> = {
  ledger_free: { name: 'Ledger Free', price: 0, extraProperty: 0, includes: 1, blurb: 'Rent tracking, an expense log and every legal date reminder, for one property.' },
  autopilot_pro: { name: 'Autopilot Pro', price: 25, extraProperty: 15, includes: 1, blurb: 'The full rules engine, notices, variations, sinking fund and tax pack.' },
  portfolio_trust: { name: 'Portfolio & Trust', price: 79, extraProperty: 15, includes: 5, blurb: 'Several owners and entities, two-trustee approvals, an accountant seat.' },
}

export function planMonthly(plan: PlanTier, properties: number): number {
  const p = PLAN[plan]
  return p.price + Math.max(0, properties - p.includes) * p.extraProperty
}

export function orgMrr(org: Pick<Org, 'plan' | 'status'>, properties: number): number {
  if (org.status === 'churned' || org.status === 'suspended') return 0
  if (org.status === 'trialing') return 0
  return planMonthly(org.plan, properties)
}

export interface Savings {
  managerCost: number
  loopCost: number
  saved: number
  parts: { label: string; amount: number }[]
}

/** What a traditional manager would charge a year for these tenancies, against Loop's plan price. */
export function savingsVsManager(weeklyRents: number[], plan: PlanTier, propertyCount: number, fieldTaskSpend = 0): Savings {
  const gst = 1 + PM_ASSUMPTIONS.gstPct / 100
  const annualRent = sum(weeklyRents) * 52
  const management = round2((annualRent * PM_ASSUMPTIONS.managementPct * gst) / 100)
  const letting = round2(sum(weeklyRents) * PM_ASSUMPTIONS.lettingFeeWeeks * gst * (12 / PM_ASSUMPTIONS.tenancyMonths))
  const inspections = round2(weeklyRents.length * PM_ASSUMPTIONS.inspectionsPerYear * PM_ASSUMPTIONS.inspectionFee * gst)
  const managerCost = round2(management + letting + inspections)
  const loopCost = round2(planMonthly(plan, propertyCount) * 12 + fieldTaskSpend)
  return {
    managerCost,
    loopCost,
    saved: round2(managerCost - loopCost),
    parts: [
      { label: `Management at ${PM_ASSUMPTIONS.managementPct}% + GST`, amount: management },
      { label: 'Letting fees, averaged per year', amount: letting },
      { label: `${PM_ASSUMPTIONS.inspectionsPerYear} inspections a year per home`, amount: inspections },
    ],
  }
}

export interface PropertyFinance {
  weeklyRent: number
  annualRent: number
  /** Rates, insurance, body corporate and a year of actual repairs. */
  operatingCosts: number
  interest: number
  grossYieldPct: number
  netYieldPct: number
  cashflow: number
  equity: number
  lvrPct: number
}

export function propertyFinance(p: Property, t: Tenancy | undefined, ledger: LedgerEntry[], today: ISODate): PropertyFinance {
  const weeklyRent = t && (t.status === 'active' || t.status === 'notice_given') ? t.weeklyRent : 0
  const annualRent = weeklyRent * 52
  const repairs = -sum(ledger.filter((l) => l.propertyId === p.id && l.category === 'repairs' && diffDays(l.date, today) <= 365).map((l) => l.amount))
  const operatingCosts = round2(p.annualCosts.rates + p.annualCosts.insurance + p.annualCosts.bodyCorp + repairs)
  const interest = round2((p.mortgageBalance * p.mortgageRatePct) / 100)
  return {
    weeklyRent,
    annualRent,
    operatingCosts,
    interest,
    grossYieldPct: p.currentValue ? (annualRent / p.currentValue) * 100 : 0,
    netYieldPct: p.currentValue ? ((annualRent - operatingCosts) / p.currentValue) * 100 : 0,
    cashflow: round2(annualRent - operatingCosts - interest),
    equity: p.currentValue - p.mortgageBalance,
    lvrPct: p.currentValue ? (p.mortgageBalance / p.currentValue) * 100 : 0,
  }
}

export function portfolioFinance(items: PropertyFinance[], values: { value: number; mortgage: number }[]) {
  const value = sum(values.map((v) => v.value))
  const mortgage = sum(values.map((v) => v.mortgage))
  const annualRent = sum(items.map((i) => i.annualRent))
  const operatingCosts = sum(items.map((i) => i.operatingCosts))
  return {
    value,
    mortgage,
    equity: value - mortgage,
    lvrPct: value ? (mortgage / value) * 100 : 0,
    weeklyRent: sum(items.map((i) => i.weeklyRent)),
    annualRent,
    operatingCosts,
    interest: sum(items.map((i) => i.interest)),
    netYieldPct: value ? ((annualRent - operatingCosts) / value) * 100 : 0,
    cashflow: sum(items.map((i) => i.cashflow)),
  }
}

/* ───────────────────────────── sinking fund ─────────────────────────────── */

export interface AssetOutlook {
  asset: CapexAsset
  dueYear: number
  yearsLeft: number
  /** Share of its expected life already used, 0–1 (can exceed 1 when overdue). */
  lifeUsed: number
  status: 'healthy' | 'plan' | 'soon' | 'overdue'
}

export function assetOutlook(asset: CapexAsset, year: number): AssetOutlook {
  const dueYear = asset.installedYear + asset.lifespanYears
  const yearsLeft = dueYear - year
  const lifeUsed = (year - asset.installedYear) / asset.lifespanYears
  return { asset, dueYear, yearsLeft, lifeUsed, status: yearsLeft < 0 ? 'overdue' : yearsLeft <= 1 ? 'soon' : yearsLeft <= 4 ? 'plan' : 'healthy' }
}

export interface FundYear {
  year: number
  contribution: number
  spend: number
  balance: number
  items: string[]
}

/**
 * Projects a sinking fund forward: each year it gains the skim from rent and
 * pays for the assets that fall due. Overdue assets are assumed to be replaced
 * in the first year. A negative balance is the year the fund runs short.
 */
export function forecastFund(p: Property, weeklyRent: number, fromYear: number, years = 10): FundYear[] {
  const contribution = round2((weeklyRent * 52 * p.sinkingFund.ratePct) / 100)
  let balance = p.sinkingFund.balance
  const out: FundYear[] = []
  for (let i = 0; i < years; i++) {
    const year = fromYear + i
    const due = p.assets.filter((a) => {
      const dueYear = a.installedYear + a.lifespanYears
      return i === 0 ? dueYear <= year : dueYear === year
    })
    const spend = sum(due.map((a) => a.replaceCost))
    balance = round2(balance + contribution - spend)
    out.push({ year, contribution, spend, balance, items: due.map((a) => a.label) })
  }
  return out
}

/** The skim rate that would keep the fund from going negative over the forecast. */
export function recommendedSkimPct(p: Property, weeklyRent: number, fromYear: number, years = 10): number | null {
  if (weeklyRent <= 0) return null
  for (let pct = 1; pct <= 25; pct++) {
    const trial = { ...p, sinkingFund: { ...p.sinkingFund, ratePct: pct } }
    if (forecastFund(trial, weeklyRent, fromYear, years).every((y) => y.balance >= 0)) return pct
  }
  return null
}

/* ─────────────────────────────── tax summary ────────────────────────────── */

/** The tax year a date falls in, named by the year it ends (NZ: 1 April – 31 March). */
export function taxYearOf(date: ISODate, startMonth = 4): number {
  const [y, m] = date.split('-').map(Number)
  return m >= startMonth ? y + 1 : y
}

export function taxSummary(ledger: LedgerEntry[], taxYear: number, startMonth = 4): Record<string, number> {
  const out: Record<string, number> = {}
  for (const l of ledger) {
    if (taxYearOf(l.date, startMonth) !== taxYear) continue
    if (l.kind === 'bond_received' || l.kind === 'bond_lodged') continue
    out[l.category] = round2((out[l.category] ?? 0) + l.amount)
  }
  return out
}
