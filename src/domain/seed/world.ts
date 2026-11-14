/**
 * Reference data for the demo world.
 *
 * The people and street addresses are invented. The suburbs, median rents and
 * value estimates are real figures gathered in November 2026 — sources are in
 * docs/research/operations-domain.md — so the demo's numbers are believable.
 */

export interface Suburb {
  name: string
  city: string
  postcode: string
  lat: number
  lng: number
  /** Median weekly rent for a three-bedroom house (Tenancy Services bond data, Apr–Sep 2026). */
  rent3: number
  /** Median value estimate (Trade Me Property, Nov 2026). */
  value: number
  coastal: boolean
}

export const SUBURBS: Record<string, Suburb> = {
  stoke: { name: 'Stoke', city: 'Nelson', postcode: '7011', lat: -41.3132, lng: 173.2306, rent3: 560, value: 725_000, coastal: false },
  tahunanui: { name: 'Tāhunanui', city: 'Nelson', postcode: '7011', lat: -41.2846, lng: 173.2434, rent3: 538, value: 640_000, coastal: true },
  richmond: { name: 'Richmond', city: 'Tasman', postcode: '7020', lat: -41.3383, lng: 173.1836, rent3: 560, value: 795_000, coastal: false },
  wood: { name: 'The Wood', city: 'Nelson', postcode: '7010', lat: -41.2637, lng: 173.2918, rent3: 550, value: 730_000, coastal: false },
  south: { name: 'Nelson South', city: 'Nelson', postcode: '7010', lat: -41.2868, lng: 173.2766, rent3: 560, value: 700_000, coastal: false },
  central: { name: 'Nelson Central', city: 'Nelson', postcode: '7010', lat: -41.2716, lng: 173.2838, rent3: 595, value: 960_000, coastal: false },
  atawhai: { name: 'Atawhai', city: 'Nelson', postcode: '7010', lat: -41.2376, lng: 173.3168, rent3: 540, value: 825_000, coastal: true },
}

/** Rent scales with bedrooms off the three-bedroom median. */
export const BED_FACTOR: Record<number, number> = { 1: 0.72, 2: 0.87, 3: 1, 4: 1.2, 5: 1.36 }

export const STREETS = [
  'Pūriri Place',
  'Seaward Crescent',
  'Orchard Way',
  'Mānuka Road',
  'Tidewater Drive',
  'Fantail Grove',
  'Estuary Lane',
  'Rimu Court',
  'Sandpiper Street',
  'Kahikatea Avenue',
  'Lighthouse Lane',
  'Hop Garden Road',
  'Apple Tree Lane',
  'Ferncliff Way',
  'Wakatū Mews',
  'Bellbird Rise',
  'Saltmarsh Road',
  'Kererū Close',
]

export const FIRST_NAMES = [
  'Aroha', 'Liam', 'Mei', 'Tāne', 'Sofia', 'Noah', 'Isla', 'Kiri', 'Arjun', 'Olivia', 'Mateo', 'Ruby', 'Hemi', 'Zoe',
  'Lucas', 'Anika', 'Ben', 'Grace', 'Tevita', 'Hannah', 'Oscar', 'Nikhil', 'Ella', 'Rangi', 'Freya', 'Leo', 'Amara',
  'Jack', 'Maia', 'Felix', 'Sina', 'Callum', 'Yuki', 'Ngaire', 'Dev', 'Charlotte',
]

export const LAST_NAMES = [
  'Walker', 'Ropata', 'Patel', 'Okafor', 'Fonoti', 'McKenzie', 'Chen', 'Tamihana', 'Kowalczyk', 'Lindqvist', 'Harris',
  'Nguyen', 'Te Rangi', 'Clarke', 'Singh', 'Faleafa', 'Morrison', 'Kaur', 'Ellis', 'Parata', 'Schmidt', 'Wong',
  'Hēnare', 'Doyle', 'Marino', 'Ali', 'Stewart', 'Tuilagi', 'Novak', 'Reid',
]

export const LISTING_FEATURES = [
  'Heat pump', 'Fully insulated', 'Fenced section', 'Off-street parking', 'Dishwasher', 'Sunny deck', 'Garden shed',
  'Walk to the beach', 'Close to schools', 'Fibre connected', 'Double glazing', 'Single garage', 'Bath', 'Heated towel rail',
]

/** A small deterministic generator, so the demo world is identical on every machine and in every test. */
export function prng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
    shuffle: <T>(arr: readonly T[]): T[] => {
      const out = [...arr]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    },
  }
}

/** Rounds a rent to the nearest $5, the way rents are actually set. */
export function roundRent(n: number): number {
  return Math.round(n / 5) * 5
}

export function emailOf(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z ]/g, '')
      .trim()
      .replace(/\s+/g, '.') + '@example.nz'
  )
}

/** A made-up New Zealand-style mobile number. */
export function phoneOf(i: number): string {
  return `020 4000 ${String(100 + (i % 900)).padStart(4, '0')}`
}
