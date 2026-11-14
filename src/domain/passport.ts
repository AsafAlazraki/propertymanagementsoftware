/**
 * The Rent Passport.
 *
 * The founder's spec asks for a 0–100 renter score. The research
 * (docs/research/competitive-landscape.md §4) found that single-number renter
 * scores have drawn regulatory and legal action elsewhere, so this is built as
 * verified facts first, with the number as a summary of them:
 *
 *   • it is computed only from things that were verified — rent that cleared,
 *     inspections that happened, references a landlord confirmed;
 *   • it never uses employment, income, age, family or anything a landlord may
 *     not lawfully select on;
 *   • the renter sees exactly what goes in and decides who sees it;
 *   • a renter with no verified history has no score at all, rather than a low
 *     one — "nothing yet" is not "bad";
 *   • landlords are shown the facts beside the number, and applications are
 *     never auto-ranked or auto-declined by it.
 *
 * Weights are the spec's: 50% rent paid on time, 30% care of the home, 20%
 * length of tenancy and verified references.
 */
import type { ISODate, RenterProfile } from './types'
import { diffDays } from './rules/calendar'

export const PASSPORT_WEIGHTS = { punctuality: 50, care: 30, tenure: 20 } as const

export interface Passport {
  /** `null` until there is verified history to summarise. */
  score: number | null
  pillars: {
    punctuality: { value: number | null; detail: string }
    care: { value: number | null; detail: string }
    tenure: { value: number | null; detail: string }
  }
  verifiedMonths: number
  verifiedTenancies: number
  band: 'building' | 'fair' | 'good' | 'strong' | 'excellent'
}

function months(from: ISODate, to: ISODate): number {
  return Math.max(0, diffDays(from, to) / 30.44)
}

export function passportOf(profile: Pick<RenterProfile, 'history' | 'references'>, today: ISODate): Passport {
  const verified = profile.history.filter((h) => h.verifiedBy !== 'self_reported')
  const spans = verified.map((h) => ({ h, m: months(h.from, h.to ?? today) })).filter((x) => x.m > 0)
  const totalMonths = spans.reduce((a, x) => a + x.m, 0)
  const verifiedRefs = profile.references.filter((r) => r.verified).length

  if (totalMonths < 1) {
    const refNote = verifiedRefs ? `${verifiedRefs} verified reference${verifiedRefs === 1 ? '' : 's'}; no tenancy on record yet.` : 'No verified tenancy or reference yet.'
    return {
      score: null,
      pillars: {
        punctuality: { value: null, detail: 'Builds from your first rent payment tracked in Pool.' },
        care: { value: null, detail: 'Builds from your first inspection.' },
        tenure: { value: null, detail: refNote },
      },
      verifiedMonths: 0,
      verifiedTenancies: 0,
      band: 'building',
    }
  }

  // Each tenancy counts in proportion to how long it ran.
  const punctuality = spans.reduce((a, x) => a + x.h.onTimePct * x.m, 0) / totalMonths
  const care = (spans.reduce((a, x) => a + x.h.careScore * x.m, 0) / totalMonths / 5) * 100
  // Five verified years is a full mark for length; two verified references is a full mark for references.
  const lengthPart = Math.min(1, totalMonths / 60)
  const refPart = Math.min(1, verifiedRefs / 2)
  const tenure = (lengthPart * 0.6 + refPart * 0.4) * 100

  const score = Math.round((punctuality * PASSPORT_WEIGHTS.punctuality + care * PASSPORT_WEIGHTS.care + tenure * PASSPORT_WEIGHTS.tenure) / 100)
  const years = totalMonths / 12
  return {
    score,
    pillars: {
      punctuality: { value: Math.round(punctuality), detail: `${Math.round(punctuality)}% of rent payments cleared on or before the due date.` },
      care: { value: Math.round(care), detail: `Average inspection result ${(care / 20).toFixed(1)} out of 5.` },
      tenure: {
        value: Math.round(tenure),
        detail: `${years >= 1 ? `${years.toFixed(1)} years` : `${Math.round(totalMonths)} months`} of verified renting, ${verifiedRefs} verified reference${verifiedRefs === 1 ? '' : 's'}.`,
      },
    },
    verifiedMonths: Math.round(totalMonths),
    verifiedTenancies: spans.length,
    band: score >= 90 ? 'excellent' : score >= 80 ? 'strong' : score >= 65 ? 'good' : 'fair',
  }
}

export const BAND_LABEL: Record<Passport['band'], string> = {
  building: 'Building',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
  excellent: 'Excellent',
}
