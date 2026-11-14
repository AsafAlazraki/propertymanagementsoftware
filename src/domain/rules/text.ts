/**
 * Checks that read words rather than dates: clauses that contract out of the
 * Act, advertised rents that are not a single figure, and the redaction of
 * personal details from documents that will be shown to the other side.
 */
import type { JurisdictionPack } from '../jurisdictions/types'
import { OK, type Verdict } from './core'
import { money } from './format'

/* ───────────────────────────── clause scanner ───────────────────────────── */

export interface ClauseFinding {
  id: string
  /** `block` — of no effect and risky to include. `caution` — likely unenforceable; rewrite. */
  severity: 'block' | 'caution'
  title: string
  why: string
  citation: string
  /** The words in the clause that triggered the finding. */
  match: string
  /** What a lawful version would say. */
  instead: string
}

interface ClausePattern extends Omit<ClauseFinding, 'match'> {
  test: RegExp
}

/**
 * New Zealand patterns. Each `why` rests on a section read in
 * docs/research/nz-tenancy-law.md. The scanner is a safety net, not a lawyer:
 * it catches the clauses landlords most often write, and says so.
 */
const NZ_PATTERNS: ClausePattern[] = [
  {
    id: 'late_fee',
    severity: 'block',
    test: /\b(late (payment )?(fee|charge|penalt)|penalty (fee|interest)|interest (on|for) (late|overdue|unpaid)|\$\s?\d+\s*(per|a|each)\s*day\s*(late|overdue))/i,
    title: 'Late fees have no effect',
    why: 'A clause that makes a tenant pay a set sum, more rent, or interest for breaching the agreement is of no effect.',
    citation: 'RTA s 32',
    instead: 'Leave it out. Overdue rent is handled with a notice to remedy and, if needed, the Tribunal.',
  },
  {
    id: 'no_pets',
    severity: 'block',
    test: /\b(no|not?\s+any|strictly no)\s+(pets?|animals?|dogs?|cats?)\b(?!.*\bbecause\b)/i,
    title: 'A blanket ban on pets needs reasonable grounds',
    why: 'An agreement may not prohibit pets unless it gives reasonable grounds for doing so. Without them the clause has no effect, and including it is an unlawful act.',
    citation: 'RTA s 42D',
    instead: 'Either state the ground (for example a body corporate rule) in the clause, or say pets need written consent, which will not be unreasonably refused.',
  },
  {
    id: 'pro_cleaning',
    severity: 'caution',
    test: /\b(professional(ly)?|commercial(ly)?)\b[^.]{0,40}\b(clean|steam|shampoo)/i,
    title: 'Professional cleaning cannot be required as a rule',
    why: 'The Act asks a tenant to leave the home reasonably clean and tidy. Requiring more is likely to be of no effect — except as a condition of consenting to an indoor pet.',
    citation: 'RTA ss 40(1)(e), 42G(2)(c), 11',
    instead: '“The tenant will leave the premises reasonably clean and tidy.” Add professional carpet cleaning only as a pet-consent condition.',
  },
  {
    id: 'entry_any_time',
    severity: 'block',
    test: /\b(enter|access|inspect)\b[^.]{0,60}\b(at any time|without notice|whenever|at (the )?landlord'?s? (discretion|convenience))/i,
    title: 'Entry needs notice',
    why: 'Outside an emergency a landlord may enter only with consent or the notice the Act sets: 48 hours for an inspection, 24 hours for repairs, between 8 am and 7 pm.',
    citation: 'RTA s 48',
    instead: 'Leave entry to the Act. Loop schedules inspections and repairs inside the lawful windows.',
  },
  {
    id: 'rent_in_advance',
    severity: 'block',
    test: /\b(rent)\b[^.]{0,60}\b((one|1|a|two|2|three|3)\s+months?|monthly|four weeks|4 weeks)\s+in advance/i,
    title: 'No more than two weeks of rent in advance',
    why: 'A landlord may not require more than two weeks of rent in advance.',
    citation: 'RTA s 23',
    instead: 'Rent payable weekly or fortnightly in advance.',
  },
  {
    id: 'extra_security',
    severity: 'block',
    test: /\b(additional|extra|further|second)\s+(bond|deposit|security)|security deposit|holding deposit|credit card (details|imprint)/i,
    title: 'One bond, and no other security',
    why: 'The bond is capped at four weeks of rent (plus a pet bond of up to two), and no other form of security may be required. A guarantee is allowed.',
    citation: 'RTA ss 18, 18A',
    instead: 'Use the bond, and a guarantor if you need more assurance.',
  },
  {
    id: 'no_assignment',
    severity: 'block',
    test: /\b(may|must|shall|can)\s*not\s+assign|no assignment|assignment (is )?(prohibited|not permitted|forbidden)/i,
    title: 'A ban on assignment has no effect',
    why: 'A tenant may assign the tenancy with the landlord’s written consent, which cannot be unreasonably withheld. A clause forbidding it outright is of no effect.',
    citation: 'RTA ss 43A, 43B',
    instead: '“The tenant may assign the tenancy with the landlord’s prior written consent.”',
  },
  {
    id: 'frequent_increase',
    severity: 'block',
    test: /\brent\b[^.]{0,60}\b(increase|review|rise|adjust)[^.]{0,60}\b(every|each)\s+(month|quarter|(three|3|six|6)\s+months)|\b(quarterly|six-?monthly|monthly)\s+rent\s+(increase|review)/i,
    title: 'Rent can rise once every 12 months',
    why: 'Rent cannot increase within 12 months of the start of the tenancy or of the last increase taking effect.',
    citation: 'RTA s 24',
    instead: 'Provide for a rent review no more often than every 12 months, on 60 days of written notice.',
  },
  {
    id: 'letting_fee',
    severity: 'block',
    test: /\b(letting fee|key money|application fee|administration fee|admin fee|lease (preparation|renewal) fee)/i,
    title: 'Tenants cannot be charged letting or key fees',
    why: 'Nobody may require a tenant to pay a letting fee, and key money is prohibited.',
    citation: 'RTA ss 17, 17A',
    instead: 'Leave it out. These are the landlord’s costs.',
  },
  {
    id: 'break_fee',
    severity: 'caution',
    test: /\b(break(ing)?[- ](lease|fee)|early termination fee|re-?letting fee)\b[^.]{0,40}(\$|\d|week)/i,
    title: 'A fixed break fee is not recoverable',
    why: 'If a tenant leaves early by agreement, only reasonable expenses actually incurred can be recovered, and only after an itemised account.',
    citation: 'RTA s 44A',
    instead: '“The landlord may recover reasonable, itemised costs actually incurred in re-letting.”',
  },
  {
    id: 'all_damage',
    severity: 'block',
    test: /\btenant\b[^.]{0,80}\b(liable|responsible|pay)\b[^.]{0,40}\b(all|any|full cost of)\s+(damage|repairs|breakages?)/i,
    title: 'A tenant’s liability for damage is limited by the Act',
    why: 'A tenant is never liable for fair wear and tear, and careless damage is capped at the lesser of the insurance excess and four weeks of rent. Agreeing to more is an unlawful act.',
    citation: 'RTA ss 49A–49D',
    instead: 'Leave liability to the Act.',
  },
  {
    id: 'outgoings',
    severity: 'block',
    test: /\btenant\b[^.]{0,60}\b(pay|responsible for)\b[^.]{0,40}\b(rates|body corporate|landlord'?s? insurance|insurance premium)/i,
    title: 'Rates, insurance and body corporate levies are the landlord’s',
    why: 'The landlord pays outgoings that fall due whether or not the home is occupied. A tenant pays for what they use: power, gas, internet, and water charged by volume.',
    citation: 'RTA s 39',
    instead: '“The tenant pays for electricity, gas, internet and metered water.”',
  },
  {
    id: 'waiver',
    severity: 'block',
    test: /\b(waive[sd]?|give[s]? up|forgo(es)?|contract(s|ing)? out)\b[^.]{0,80}\b(right|act|tribunal|protection)|\b(not|never)\s+(apply|go|complain)\s+to\s+the\s+(tenancy\s+)?tribunal/i,
    title: 'A tenant cannot sign away rights under the Act',
    why: 'Any waiver by a tenant of a right the Act gives is of no effect, and requiring one is an unlawful act.',
    citation: 'RTA ss 11(3), 137',
    instead: 'Leave it out.',
  },
  {
    id: 'long_tenant_notice',
    severity: 'block',
    test: /\btenant\b[^.]{0,60}\b(give|provide)\b[^.]{0,30}\b(28|30|42|60|90)\s+days'?\s+(written\s+)?notice/i,
    title: 'A tenant’s notice period is 21 days',
    why: 'A tenant may end a periodic tenancy on 21 days of notice. An agreement cannot require longer.',
    citation: 'RTA ss 51(2A), 11',
    instead: 'Leave notice periods to the Act.',
  },
  {
    id: 'no_rollover',
    severity: 'caution',
    test: /\b(will|shall|does)\s+not\s+(automatically\s+)?(roll over|renew|continue|become periodic)/i,
    title: 'A fixed term rolls over unless notice is given',
    why: 'A fixed term of more than 90 days becomes periodic unless either side gives notice between 90 and 21 days before it ends, or you both agree otherwise before then.',
    citation: 'RTA s 60A',
    instead: 'Give notice in the window instead. Loop reminds you when it opens.',
  },
  {
    id: 'guests',
    severity: 'caution',
    test: /\bno\s+(overnight\s+)?(guests?|visitors?)\b|\bguests?\b[^.]{0,40}\b(not permitted|prohibited|must be approved)/i,
    title: 'Restricting visitors interferes with quiet enjoyment',
    why: 'A tenant is entitled to quiet enjoyment of their home. The agreement can set a maximum number of residents, not who may visit.',
    citation: 'RTA s 38',
    instead: 'State the maximum number of people who may live there.',
  },
]

export function scanClause(pack: JurisdictionPack, text: string): ClauseFinding[] {
  if (pack.code !== 'NZ' || !pack.rules['contract.contracting_out_void'].value) return []
  const findings: ClauseFinding[] = []
  for (const p of NZ_PATTERNS) {
    const m = p.test.exec(text)
    if (m) {
      const { test: _test, ...rest } = p
      findings.push({ ...rest, match: m[0].trim() })
    }
  }
  return findings
}

/* ────────────────────────────── advertised rent ─────────────────────────── */

/**
 * Reads what a landlord typed as the advertised rent. A listing needs one
 * figure: ranges, "from", "offers over", "negotiable" and "POA" are refused.
 */
export function parseAdvertisedRent(pack: JurisdictionPack, input: string): Verdict & { amount?: number } {
  const text = input.trim()
  const rule = 'listing.fixed_price_required' as const
  if (!pack.rules[rule].value) {
    const n = Number(text.replace(/[^0-9.]/g, ''))
    return Number.isFinite(n) && n > 0 ? { ok: true, amount: n } : { ok: false, reason: 'Enter the weekly rent.' }
  }
  if (!text) return { ok: false, rule, reason: 'A listing has to state the rent.', fix: 'Enter one weekly figure.' }
  if (/\b(poa|negotiable|neg\.?|by negotiation|on application|enquire|tba|tbc)\b/i.test(text)) {
    return { ok: false, rule, reason: 'A listing has to state the amount of rent.', fix: 'Replace this with one weekly figure.' }
  }
  if (/\b(offers?|from|over|above|starting|best|bids?|or more|\+)\b|\+/i.test(text)) {
    return { ok: false, rule: 'listing.bidding_banned', reason: 'That invites people to offer more than the advertised rent.', fix: 'Advertise the rent you will accept, as one figure.' }
  }
  const numbers = text.match(/\d[\d,]*(\.\d+)?/g) ?? []
  if (numbers.length > 1 || /\d\s*(-|–|—|to)\s*\$?\d/.test(text)) {
    return { ok: false, rule, reason: 'A range is not an amount.', fix: 'Pick one weekly figure.' }
  }
  const amount = Number((numbers[0] ?? '').replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, rule, reason: 'Enter the weekly rent as a number.' }
  return { ok: true, amount }
}

/** Pool has no way to offer more than the advertised rent. This is the server-side half of that. */
export function checkRentOffer(pack: JurisdictionPack, advertised: number, offered: number): Verdict {
  if (!pack.rules['listing.bidding_banned'].value) return OK
  if (offered > advertised) {
    return {
      ok: false,
      rule: 'listing.bidding_banned',
      reason: `Applications are at the advertised rent of ${money(advertised)} a week.`,
      fix: 'Pool does not take offers above it, so nobody is ever outbid on price.',
    }
  }
  return OK
}

/* ───────────────────────────────── redaction ────────────────────────────── */

export interface Redaction {
  kind: 'bank account' | 'tax number' | 'date of birth' | 'phone number' | 'email address' | 'home address'
  text: string
}

const REDACTION_RULES: { kind: Redaction['kind']; re: RegExp }[] = [
  // NZ bank account: bank-branch-account-suffix
  { kind: 'bank account', re: /\b\d{2}[- ]?\d{4}[- ]?\d{7}[- ]?\d{2,3}\b/g },
  // IRD number: 8 or 9 digits, usually grouped in threes
  { kind: 'tax number', re: /\b(?:IRD\s*(?:no\.?|number)?:?\s*)?\d{2,3}[- ]\d{3}[- ]\d{3}\b/gi },
  { kind: 'date of birth', re: /\b(?:d\.?o\.?b\.?|date of birth|born)\s*:?\s*\d{1,2}[/.\- ](?:\d{1,2}|[A-Za-z]{3,9})[/.\- ]\d{2,4}\b/gi },
  { kind: 'phone number', re: /(?<!\d)(?:\+?64[- ]?|0)2\d[- ]?\d{3,4}[- ]?\d{3,4}(?!\d)/g },
  { kind: 'email address', re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g },
]

/**
 * Removes personal details that are irrelevant to a dispute before a document
 * goes into a Tribunal pack. Everything filed with the Tribunal is disclosed to
 * the other party; the practice direction allows irrelevant personal
 * information to be redacted. `alsoHide` takes exact strings (such as the
 * landlord's home address) that no pattern would find.
 */
export function redact(text: string, alsoHide: { kind: Redaction['kind']; text: string }[] = []): { text: string; redactions: Redaction[] } {
  const redactions: Redaction[] = []
  let out = text
  for (const item of alsoHide) {
    if (!item.text) continue
    const parts = out.split(item.text)
    if (parts.length > 1) {
      redactions.push({ kind: item.kind, text: item.text })
      out = parts.join(`[${item.kind} removed]`)
    }
  }
  for (const { kind, re } of REDACTION_RULES) {
    out = out.replace(re, (m) => {
      redactions.push({ kind, text: m })
      return `[${kind} removed]`
    })
  }
  return { text: out, redactions }
}
