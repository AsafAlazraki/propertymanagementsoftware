/**
 * The demo world.
 *
 * Everything is placed relative to the day the app is first opened, so the
 * demo is always "now": a pet request with nine days left to answer, a fixed
 * term whose notice window is open, a tenant one day late. The people are
 * invented; the rents and values come from real November 2026 Nelson data
 * (docs/research/operations-domain.md).
 *
 * One organisation — the Whitaker Family Trust — is built in full detail. A
 * dozen lighter ones exist so the platform has tenants to administer and Pool
 * has homes to search.
 */
import type {
  Application,
  ArrearsEvent,
  BankLine,
  Doc,
  FieldTask,
  ID,
  Inspection,
  InspectionRoom,
  ISODate,
  ISODateTime,
  KeyEvent,
  LedgerEntry,
  LegalEntity,
  Notice,
  Org,
  Property,
  Provider,
  RenterProfile,
  Tenancy,
  Ticket,
  User,
  Variation,
} from '../types'
import type { AutopilotEntry, Db } from '../db'
import { addDays, addMonths, diffDays, weekday } from '../rules/calendar'
import { round2 } from '../rules/format'
import { BED_FACTOR, emailOf, FIRST_NAMES, LAST_NAMES, LISTING_FEATURES, phoneOf, prng, roundRent, STREETS, SUBURBS, type Suburb } from './world'
import { buildPlatform } from './platform'

export const SEED_VERSION = 1

export const DEMO = {
  org: 'org_whitaker',
  landlord: 'u_hana',
  tenant: 'u_mia',
  admin: 'u_riley',
  applicant: 'u_chloe',
} as const

/** A local-time instant on a calendar day. */
export function at(day: ISODate, hour = 9, minute = 0): ISODateTime {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute).toISOString()
}

const HH_OK = (detail: string, checkedAt: ISODate) => ({ status: 'compliant' as const, detail, checkedAt })

function rooms(beds: number, scores?: number[], notes: Record<string, string> = {}): InspectionRoom[] {
  const names = ['Entry and hallway', 'Living room', 'Kitchen', 'Bathroom', ...Array.from({ length: beds }, (_, i) => `Bedroom ${i + 1}`), 'Laundry', 'Exterior and grounds']
  return names.map((name, i) => ({ name, score: scores ? scores[i % scores.length] : undefined, note: notes[name], photoIds: [], flags: [] }))
}

export function buildSeed(day: ISODate): Db {
  const D = (n: number): ISODate => addDays(day, n)
  const T = (n: number, h = 9, m = 0): ISODateTime => at(D(n), h, m)
  const rand = prng(20261114)

  /* ───────────────────────────── organisations ──────────────────────────── */

  const orgSpecs: [ID, string, Org['plan'], Org['status'], Org['source'], number, number, Org['kind']][] = [
    [DEMO.org, 'Whitaker Family Trust', 'portfolio_trust', 'active', 'founding_migration', 5, -146, 'landlord'],
    ['org_ropata', 'Ropata Rentals', 'autopilot_pro', 'active', 'founding_migration', 2, -148, 'landlord'],
    ['org_patel', 'J & S Patel Partnership', 'autopilot_pro', 'active', 'founding_migration', 3, -141, 'landlord'],
    ['org_okafor', 'Okafor Property', 'ledger_free', 'active', 'organic', 1, -95, 'landlord'],
    ['org_tasman', 'Tasman Bay Holdings LTC', 'portfolio_trust', 'active', 'founding_migration', 5, -139, 'landlord'],
    ['org_fonoti', 'Leilani Fonoti', 'ledger_free', 'active', 'referral', 1, -70, 'landlord'],
    ['org_mckenzie', 'McKenzie Family Trust', 'autopilot_pro', 'active', 'investor_association', 2, -44, 'landlord'],
    ['org_chenli', 'Chen & Li Partnership', 'autopilot_pro', 'active', 'founding_migration', 4, -133, 'landlord'],
    ['org_tamihana', 'Aroha Tamihana', 'autopilot_pro', 'trialing', 'organic', 1, -9, 'landlord'],
    ['org_brightwater', 'Brightwater Investments', 'autopilot_pro', 'past_due', 'founding_migration', 2, -126, 'landlord'],
    ['org_kowalczyk', 'D. Kowalczyk', 'ledger_free', 'active', 'organic', 1, -31, 'landlord'],
    ['org_hope', 'Hope Street Trust', 'portfolio_trust', 'suspended', 'investor_association', 3, -40, 'landlord'],
    ['org_lindqvist', 'Greta Lindqvist', 'autopilot_pro', 'churned', 'referral', 1, -112, 'landlord'],
    ['org_penguin', 'Blue Penguin Lettings', 'portfolio_trust', 'active', 'founding_migration', 0, -152, 'partner_agency'],
  ]

  const users: User[] = []
  const orgs: Org[] = []
  const entities: LegalEntity[] = []
  let nameCursor = 0
  const nextName = () => {
    const first = FIRST_NAMES[nameCursor % FIRST_NAMES.length]
    const last = LAST_NAMES[(nameCursor * 7 + 3) % LAST_NAMES.length]
    nameCursor++
    return `${first} ${last}`
  }
  const addUser = (u: Partial<User> & Pick<User, 'id' | 'fullName' | 'role'>): User => {
    const user: User = {
      email: emailOf(u.fullName),
      phone: phoneOf(users.length * 37 + 11),
      identityVerified: true,
      defaultPortal: u.role === 'tenant' || u.role === 'prospective_renter' ? 'pool' : u.role === 'platform_admin' ? 'admin' : 'loop',
      onboardingStep: 3,
      createdAt: T(-120),
      lastActiveAt: T(-rand.int(0, 6), rand.int(7, 21)),
      status: 'active',
      hue: (users.length * 47) % 360,
      ...u,
    }
    users.push(user)
    return user
  }

  // The demo household first, so their ids and hues are stable.
  addUser({ id: DEMO.landlord, orgId: DEMO.org, role: 'landlord', fullName: 'Hana Whitaker', hue: 172, createdAt: T(-146), lastActiveAt: T(0, 8) })
  addUser({ id: 'u_tom', orgId: DEMO.org, role: 'co_owner', fullName: 'Tom Whitaker', hue: 215, createdAt: T(-146) })
  addUser({ id: 'u_priya', orgId: DEMO.org, role: 'advisor', fullName: 'Priya Raman', hue: 285, createdAt: T(-90) })

  for (const [id, name, plan, status, source, , created, kind] of orgSpecs) {
    let ownerUserId: ID = DEMO.landlord
    if (id !== DEMO.org) {
      const ownerName = /^[A-Z][a-z]+ [A-Z]/.test(name) && !/(Trust|Rentals|Property|Holdings|Partnership|Investments|Lettings)/.test(name) ? name : nextName()
      const owner = addUser({ id: `u_owner_${id.slice(4)}`, orgId: id, role: 'landlord', fullName: ownerName.replace(/^D\. /, 'Dominik '), createdAt: T(created), status: status === 'churned' ? 'deactivated' : 'active' })
      ownerUserId = owner.id
    }
    orgs.push({
      id,
      name,
      kind,
      jurisdiction: 'NZ',
      region: 'Nelson / Tasman',
      plan,
      status,
      source,
      createdAt: T(created),
      lastActiveAt: status === 'churned' ? T(-58) : status === 'suspended' ? T(-12) : T(-rand.int(0, 4), rand.int(7, 21)),
      ownerUserId,
      suspendedReason: status === 'suspended' ? 'Card declined three times; no reply to two billing emails.' : undefined,
    })
    if (id !== DEMO.org) {
      entities.push({
        id: `ent_${id.slice(4)}`,
        orgId: id,
        name,
        type: /Trust/.test(name) ? 'family_trust' : /LTC/.test(name) ? 'ltc_company' : /Partnership|&/.test(name) ? 'partnership' : 'individual',
        taxIdMasked: `•••-•••-${rand.int(100, 999)}`,
        gstRegistered: false,
      })
    }
  }
  entities.push(
    { id: 'ent_trust', orgId: DEMO.org, name: 'Whitaker Family Trust', type: 'family_trust', taxIdMasked: '•••-•••-418', gstRegistered: false, dualApprovalThreshold: 1000 },
    { id: 'ent_hana', orgId: DEMO.org, name: 'Hana Whitaker', type: 'individual', taxIdMasked: '•••-•••-207', gstRegistered: false },
  )

  /* ─────────────────────────────── renters ──────────────────────────────── */

  const renter = (id: ID, fullName: string, hue: number, extra: Partial<User> = {}) => addUser({ id, role: 'tenant', fullName, hue, ...extra })
  renter(DEMO.tenant, 'Mia Thompson', 28, { createdAt: T(-612), lastActiveAt: T(0, 7, 40) })
  renter('u_jordan', 'Jordan Tuala', 200, { createdAt: T(-612) })
  renter('u_aleks', 'Aleks Petrov', 250, { createdAt: T(-292) })
  renter('u_wiremu', 'Wiremu Ngata', 140, { createdAt: T(-140) })
  renter('u_anahera', 'Anahera Ngata', 320, { createdAt: T(-140) })
  renter('u_lucy', 'Lucy Fraser', 60, { createdAt: T(-24) })
  const applicant = (id: ID, fullName: string, hue: number, verified = true) =>
    addUser({ id, role: 'prospective_renter', fullName, hue, identityVerified: verified, createdAt: T(-rand.int(3, 40)) })
  applicant('u_daniel', 'Daniel Okoro', 95)
  applicant('u_emma', 'Emma Bennett', 340)
  applicant('u_ravi', 'Ravi Sharma', 20)
  applicant(DEMO.applicant, 'Chloe Martin', 300, false)
  applicant('u_tavita', 'Tavita Sopoaga', 180)
  applicant('u_old', 'Finn Gallagher', 120)
  addUser({ id: DEMO.admin, role: 'platform_admin', fullName: 'Riley Chen', hue: 285, createdAt: T(-160), lastActiveAt: T(0, 8, 15) })
  addUser({ id: 'u_mere', role: 'platform_admin', fullName: 'Mere Parata', hue: 30, createdAt: T(-150) })

  /* ────────────────────────── the Whitaker portfolio ────────────────────── */

  const sub = SUBURBS
  const addr = (line1: string, s: Suburb) => ({ line1, suburb: s.name, city: s.city, postcode: s.postcode })
  const near = (s: Suburb, dLat: number, dLng: number) => ({ lat: s.lat + dLat, lng: s.lng + dLng })
  const depot = 'Loop Key Hub — Hardy Street office safe'

  const properties: Property[] = [
    {
      id: 'p_totara',
      orgId: DEMO.org,
      entityId: 'ent_trust',
      jurisdiction: 'NZ',
      address: addr('14 Tōtara Rise', sub.stoke),
      geo: near(sub.stoke, 0.004, -0.006),
      titleType: 'freehold',
      kind: 'house',
      beds: 3,
      baths: 1,
      parking: 2,
      floorArea: 112,
      yearBuilt: 1986,
      purchasePrice: 485_000,
      purchaseYear: 2017,
      currentValue: 725_000,
      mortgageBalance: 310_000,
      mortgageRatePct: 6.29,
      art: { style: 1, hue: 215 },
      onboardingMode: 'existing_tenancy_import',
      healthyHomes: {
        heating: HH_OK('6.0 kW heat pump in the living room; 4.8 kW required.', D(-380)),
        insulation: HH_OK('Ceiling R 3.2, underfloor R 1.4, topped up 2019.', D(-380)),
        ventilation: HH_OK('Extractor fans in kitchen (150 mm) and bathroom (125 mm), ducted outside.', D(-380)),
        moisture: HH_OK('Gutters clear; ground moisture barrier laid 2019.', D(-95)),
        draught: HH_OK('No gaps over 3 mm; no fireplace.', D(-95)),
        statementSignedAt: D(-395),
      },
      smokeAlarms: { lastChecked: D(-95), type: 'photoelectric_10yr', expiryYear: 2031 },
      meth: { status: 'clear', testedAt: D(-615) },
      insurance: { insurer: 'Initio', policyRef: 'LL-448201', renewsOn: D(140), excess: 500, statementInAgreement: true, inspectionIntervalWeeks: 13 },
      sinkingFund: { ratePct: 6, balance: 4180, autoApproveLimit: 350 },
      assets: [
        { id: 'a1', kind: 'hot_water', label: 'Hot water cylinder (180 L)', installedYear: 2012, lifespanYears: 15, replaceCost: 2900 },
        { id: 'a2', kind: 'heat_pump', label: 'Heat pump (6 kW)', installedYear: 2016, lifespanYears: 14, replaceCost: 3400 },
        { id: 'a3', kind: 'roof', label: 'Long-run steel roof', installedYear: 2009, lifespanYears: 40, replaceCost: 28000 },
        { id: 'a4', kind: 'carpet', label: 'Carpet, bedrooms and lounge', installedYear: 2018, lifespanYears: 10, replaceCost: 6500 },
        { id: 'a5', kind: 'paint_ext', label: 'Exterior repaint', installedYear: 2019, lifespanYears: 10, replaceCost: 9000 },
        { id: 'a6', kind: 'oven', label: 'Oven and cooktop', installedYear: 2015, lifespanYears: 15, replaceCost: 1600 },
      ],
      keys: [
        { id: 'k1', label: 'Tenant set (2)', holder: 'tenant', location: 'With Mia and Jordan' },
        { id: 'k2', label: 'Owner spare', holder: 'landlord', location: 'With Hana' },
        { id: 'k3', label: 'Trade set', holder: 'depot', location: depot },
      ],
      annualCosts: { rates: 3640, insurance: 1890, bodyCorp: 0 },
    },
    {
      id: 'p_beach',
      orgId: DEMO.org,
      entityId: 'ent_trust',
      jurisdiction: 'NZ',
      address: addr('3/27 Beachcomber Lane', sub.tahunanui),
      geo: near(sub.tahunanui, -0.002, 0.004),
      titleType: 'unit_title',
      bodyCorpRulesAttached: true,
      kind: 'unit',
      beds: 2,
      baths: 1,
      parking: 1,
      floorArea: 72,
      yearBuilt: 2004,
      purchasePrice: 420_000,
      purchaseYear: 2019,
      currentValue: 560_000,
      mortgageBalance: 265_000,
      mortgageRatePct: 6.09,
      art: { style: 3, hue: 195 },
      onboardingMode: 'existing_tenancy_import',
      healthyHomes: {
        heating: HH_OK('3.5 kW heat pump; 3.1 kW required.', D(-300)),
        insulation: HH_OK('Ceiling R 3.6. Concrete slab — no underfloor insulation needed.', D(-300)),
        ventilation: HH_OK('Rangehood and bathroom fan ducted outside.', D(-300)),
        moisture: HH_OK('Slab on ground; body corporate maintains guttering.', D(-60)),
        draught: HH_OK('Sealed aluminium joinery.', D(-60)),
        statementSignedAt: D(-292),
      },
      smokeAlarms: { lastChecked: D(-60), type: 'photoelectric_10yr', expiryYear: 2029 },
      meth: { status: 'clear', testedAt: D(-295) },
      insurance: { insurer: 'AMI', policyRef: 'RP-7720913', renewsOn: D(200), excess: 400, statementInAgreement: true, inspectionIntervalWeeks: 26 },
      sinkingFund: { ratePct: 5, balance: 2310, autoApproveLimit: 350 },
      assets: [
        { id: 'a1', kind: 'hot_water', label: 'Hot water cylinder (135 L)', installedYear: 2018, lifespanYears: 15, replaceCost: 2600 },
        { id: 'a2', kind: 'heat_pump', label: 'Heat pump (3.5 kW)', installedYear: 2019, lifespanYears: 14, replaceCost: 2800 },
        { id: 'a3', kind: 'carpet', label: 'Carpet', installedYear: 2019, lifespanYears: 10, replaceCost: 3900 },
        { id: 'a4', kind: 'oven', label: 'Oven and cooktop', installedYear: 2004, lifespanYears: 15, replaceCost: 1500 },
      ],
      keys: [
        { id: 'k1', label: 'Tenant set', holder: 'tenant', location: 'With Aleks' },
        { id: 'k2', label: 'Trade set', holder: 'lockbox', location: 'Lockbox by the meter board' },
      ],
      annualCosts: { rates: 2980, insurance: 1240, bodyCorp: 2400 },
    },
    {
      id: 'p_kowhai',
      orgId: DEMO.org,
      entityId: 'ent_trust',
      jurisdiction: 'NZ',
      address: addr('8 Kōwhai Close', sub.richmond),
      geo: near(sub.richmond, 0.003, 0.005),
      titleType: 'freehold',
      kind: 'house',
      beds: 4,
      baths: 2,
      parking: 2,
      floorArea: 152,
      yearBuilt: 1998,
      purchasePrice: 455_000,
      purchaseYear: 2014,
      currentValue: 810_000,
      mortgageBalance: 190_000,
      mortgageRatePct: 5.89,
      art: { style: 2, hue: 150 },
      onboardingMode: 'existing_tenancy_import',
      healthyHomes: {
        heating: HH_OK('7.1 kW heat pump; 5.6 kW required.', D(-420)),
        insulation: HH_OK('Ceiling R 3.2, underfloor R 1.5.', D(-420)),
        ventilation: { status: 'unknown', detail: 'Ensuite fan runs, but nobody has confirmed it is ducted to the outside.', checkedAt: D(-35) },
        moisture: HH_OK('Gutters cleaned in May; barrier in place.', D(-180)),
        draught: HH_OK('Wood burner flue sealed when not in use.', D(-35)),
        statementSignedAt: D(-420),
      },
      smokeAlarms: { lastChecked: D(-410), type: 'photoelectric_10yr', expiryYear: 2028 },
      meth: { status: 'untested' },
      insurance: { insurer: 'Tower', policyRef: 'TH-0091822', renewsOn: D(20), excess: 650, statementInAgreement: true, inspectionIntervalWeeks: 26 },
      sinkingFund: { ratePct: 7, balance: 6920, autoApproveLimit: 400 },
      assets: [
        { id: 'a1', kind: 'hot_water', label: 'Hot water cylinder (250 L)', installedYear: 2011, lifespanYears: 15, replaceCost: 3300 },
        { id: 'a2', kind: 'heat_pump', label: 'Heat pump (7.1 kW)', installedYear: 2020, lifespanYears: 14, replaceCost: 3900 },
        { id: 'a3', kind: 'roof', label: 'Concrete tile roof — repoint and seal', installedYear: 2012, lifespanYears: 18, replaceCost: 8500 },
        { id: 'a4', kind: 'carpet', label: 'Carpet', installedYear: 2014, lifespanYears: 10, replaceCost: 8200 },
        { id: 'a5', kind: 'paint_ext', label: 'Exterior repaint', installedYear: 2016, lifespanYears: 10, replaceCost: 11500 },
        { id: 'a6', kind: 'dishwasher', label: 'Dishwasher', installedYear: 2017, lifespanYears: 10, replaceCost: 1100 },
      ],
      keys: [
        { id: 'k1', label: 'Tenant set (2)', holder: 'tenant', location: 'With the Ngata whānau' },
        { id: 'k2', label: 'Owner spare', holder: 'landlord', location: 'With Tom' },
      ],
      annualCosts: { rates: 3920, insurance: 2140, bodyCorp: 0 },
    },
    {
      id: 'p_harbour',
      orgId: DEMO.org,
      entityId: 'ent_trust',
      jurisdiction: 'NZ',
      address: addr('21 Harbour View Terrace', sub.wood),
      geo: near(sub.wood, 0.002, -0.003),
      titleType: 'freehold',
      kind: 'townhouse',
      beds: 2,
      baths: 2,
      parking: 1,
      floorArea: 96,
      yearBuilt: 2011,
      purchasePrice: 610_000,
      purchaseYear: 2021,
      currentValue: 730_000,
      mortgageBalance: 420_000,
      mortgageRatePct: 6.45,
      art: { style: 4, hue: 25 },
      onboardingMode: 'first_time_rental',
      healthyHomes: {
        heating: HH_OK('5.0 kW heat pump; 3.9 kW required.', D(-14)),
        insulation: HH_OK('Built 2011 to code: ceiling R 3.6, underfloor R 1.9.', D(-14)),
        ventilation: HH_OK('Rangehood and two bathroom fans, all ducted outside.', D(-14)),
        moisture: HH_OK('Gutters and downpipes clear at exit inspection.', D(-12)),
        draught: HH_OK('Double-glazed; no gaps found at exit inspection.', D(-12)),
      },
      smokeAlarms: { lastChecked: D(-12), type: 'photoelectric_10yr', expiryYear: 2032 },
      meth: { status: 'clear', testedAt: D(-10) },
      insurance: { insurer: 'Initio', policyRef: 'LL-448377', renewsOn: D(96), excess: 500, statementInAgreement: true, inspectionIntervalWeeks: 13 },
      sinkingFund: { ratePct: 6, balance: 1840, autoApproveLimit: 350 },
      assets: [
        { id: 'a1', kind: 'hot_water', label: 'Hot water cylinder (180 L)', installedYear: 2011, lifespanYears: 15, replaceCost: 2900 },
        { id: 'a2', kind: 'heat_pump', label: 'Heat pump (5 kW)', installedYear: 2021, lifespanYears: 14, replaceCost: 3200 },
        { id: 'a3', kind: 'carpet', label: 'Carpet, stairs and bedrooms', installedYear: 2021, lifespanYears: 10, replaceCost: 5200 },
      ],
      keys: [
        { id: 'k1', label: 'Full set (3)', holder: 'depot', location: depot },
        { id: 'k2', label: 'Owner spare', holder: 'landlord', location: 'With Hana' },
      ],
      listing: {
        status: 'live',
        headline: 'Sunny two-bedroom townhouse, a walk from Founders Park',
        description:
          'A warm, double-glazed townhouse on a quiet terrace in The Wood. Open-plan living upstairs catches the afternoon sun and a slice of harbour; two double bedrooms and a second bathroom downstairs. Heat pump, dishwasher, single garage with internal access, and a small courtyard that takes care of itself.',
        advertisedWeeklyRent: 590,
        availableFrom: D(10),
        publishedAt: T(-6, 10),
        syndication: { pool: true, trademe: true, realestate: true },
        petsConsidered: true,
        viewingTimes: [T(2, 17, 30), T(4, 11, 0)],
        features: ['Heat pump', 'Double glazing', 'Dishwasher', 'Single garage', 'Fibre connected', 'Fully insulated'],
        views: 412,
      },
      annualCosts: { rates: 3310, insurance: 1620, bodyCorp: 0 },
    },
    {
      id: 'p_ngaio',
      orgId: DEMO.org,
      entityId: 'ent_hana',
      jurisdiction: 'NZ',
      address: addr('5B Ngaio Street', sub.south),
      geo: near(sub.south, -0.003, -0.004),
      titleType: 'cross_lease',
      kind: 'unit',
      beds: 1,
      baths: 1,
      parking: 1,
      floorArea: 48,
      yearBuilt: 1978,
      purchasePrice: 198_000,
      purchaseYear: 2010,
      currentValue: 410_000,
      mortgageBalance: 60_000,
      mortgageRatePct: 6.19,
      art: { style: 0, hue: 55 },
      onboardingMode: 'existing_tenancy_import',
      healthyHomes: {
        heating: { status: 'unknown', detail: 'A 2.4 kW panel heater is fitted. Nobody has run the heating calculation for this living room.' },
        insulation: HH_OK('Ceiling R 2.9 installed 2017; underfloor foil replaced with R 1.4 polyester.', D(-700)),
        ventilation: HH_OK('Bathroom fan (125 mm) ducted outside; kitchen rangehood ducted outside.', D(-23)),
        moisture: HH_OK('Barrier laid 2017; gutters clear at entry inspection.', D(-23)),
        draught: HH_OK('Door seals replaced at entry inspection.', D(-23)),
      },
      smokeAlarms: { lastChecked: D(-23), type: 'photoelectric_10yr', expiryYear: 2027 },
      meth: { status: 'untested' },
      insurance: { insurer: 'AMI', policyRef: 'RP-7718840', renewsOn: D(260), excess: 400, statementInAgreement: false, inspectionIntervalWeeks: 26 },
      sinkingFund: { ratePct: 8, balance: 960, autoApproveLimit: 350 },
      assets: [
        { id: 'a1', kind: 'hot_water', label: 'Hot water cylinder (135 L)', installedYear: 2009, lifespanYears: 15, replaceCost: 2600 },
        { id: 'a2', kind: 'oven', label: 'Freestanding oven', installedYear: 2016, lifespanYears: 15, replaceCost: 1200 },
        { id: 'a3', kind: 'vinyl', label: 'Kitchen and bathroom vinyl', installedYear: 2012, lifespanYears: 15, replaceCost: 2400 },
      ],
      keys: [
        { id: 'k1', label: 'Tenant set', holder: 'tenant', location: 'With Lucy' },
        { id: 'k2', label: 'Owner spare', holder: 'landlord', location: 'With Hana' },
      ],
      annualCosts: { rates: 2410, insurance: 980, bodyCorp: 0 },
    },
  ]

  const dueDay = (lastDueOffset: number) => weekday(D(lastDueOffset))
  const tenancies: Tenancy[] = [
    {
      id: 't_totara',
      orgId: DEMO.org,
      propertyId: 'p_totara',
      tenantIds: [DEMO.tenant, 'u_jordan'],
      status: 'active',
      type: 'periodic',
      startDate: D(-612),
      weeklyRent: 580,
      cadence: 'weekly',
      rentDueWeekday: dueDay(-3),
      rentPaidTo: D(3),
      lastRentIncrease: D(-395),
      bond: { amount: 2200, petBond: 0, receivedOn: D(-614), lodgedOn: D(-605), bondRef: 'BND-6612-0417' },
      pets: [],
      agreementSignedOn: D(-616),
      origin: 'imported',
    },
    {
      id: 't_beach',
      orgId: DEMO.org,
      propertyId: 'p_beach',
      tenantIds: ['u_aleks'],
      status: 'active',
      type: 'fixed',
      startDate: D(-290),
      endDate: D(75),
      weeklyRent: 495,
      cadence: 'weekly',
      rentDueWeekday: dueDay(-5),
      rentPaidTo: D(1),
      bond: { amount: 1980, petBond: 0, receivedOn: D(-292), lodgedOn: D(-284), bondRef: 'BND-6934-1102' },
      pets: [],
      agreementSignedOn: D(-294),
      origin: 'imported',
    },
    {
      id: 't_kowhai',
      orgId: DEMO.org,
      propertyId: 'p_kowhai',
      tenantIds: ['u_wiremu', 'u_anahera'],
      status: 'active',
      type: 'periodic',
      startDate: D(-905),
      weeklyRent: 690,
      cadence: 'weekly',
      rentDueWeekday: dueDay(-1),
      // Rent fell due yesterday and has not arrived: one day late today.
      rentPaidTo: D(-2),
      lastRentIncrease: D(-210),
      bond: { amount: 2600, petBond: 0, receivedOn: D(-907), lodgedOn: D(-899), bondRef: 'BND-5890-2291' },
      pets: [{ name: 'Tui', kind: 'Labrador cross', approvedAt: D(-905) }],
      agreementSignedOn: D(-910),
      origin: 'imported',
    },
    {
      id: 't_harbour_prev',
      orgId: DEMO.org,
      propertyId: 'p_harbour',
      tenantIds: ['u_old'],
      status: 'ended',
      type: 'fixed',
      startDate: D(-377),
      endDate: D(-12),
      weeklyRent: 570,
      cadence: 'weekly',
      rentDueWeekday: 1,
      rentPaidTo: D(-12),
      bond: { amount: 2280, petBond: 0, receivedOn: D(-380), lodgedOn: D(-372), bondRef: 'BND-6701-0088' },
      pets: [],
      agreementSignedOn: D(-384),
      origin: 'manual',
    },
    {
      id: 't_ngaio',
      orgId: DEMO.org,
      propertyId: 'p_ngaio',
      tenantIds: ['u_lucy'],
      status: 'active',
      type: 'periodic',
      startDate: D(-22),
      weeklyRent: 420,
      cadence: 'weekly',
      rentDueWeekday: dueDay(-1),
      rentPaidTo: D(5),
      // Received when Lucy moved in and still sitting in the bank: the countdown is running.
      bond: { amount: 1680, petBond: 0, receivedOn: D(-22) },
      pets: [],
      agreementSignedOn: D(-25),
      origin: 'imported',
    },
  ]

  /* ───────────────────────────────── ledger ─────────────────────────────── */

  const ledger: LedgerEntry[] = []
  const lateBy: Record<ID, Record<number, number>> = {
    t_totara: { 30: 1 },
    t_kowhai: { 3: 2, 9: 6, 15: 1, 22: 3, 31: 2 },
  }
  const bankRefs: Record<ID, [string, string]> = {
    t_totara: ['TOTARA 14 RENT', 'THOMPSON M & TUALA J'],
    t_beach: ['BEACHCOMBER 3', 'PETROV A'],
    t_kowhai: ['KOWHAI 8', 'NGATA W R'],
    t_ngaio: ['NGAIO 5B', 'FRASER L'],
    t_harbour_prev: ['HARBOUR VIEW 21', 'GALLAGHER F'],
  }
  const previousRent: Record<ID, number> = { t_totara: 550, t_kowhai: 660 }

  for (const t of tenancies) {
    const lastPaidDue = t.status === 'ended' ? addDays(t.rentPaidTo, -6) : addDays(t.rentPaidTo, -6)
    for (let k = 0; k < 53; k++) {
      const due = addDays(lastPaidDue, -7 * k)
      if (due < t.startDate || diffDays(due, day) > 364) break
      const late = lateBy[t.id]?.[k] ?? 0
      const amount = t.lastRentIncrease && due < t.lastRentIncrease ? previousRent[t.id] ?? t.weeklyRent : t.weeklyRent
      const paidOn = addDays(due, late)
      if (paidOn > day) continue
      ledger.push({
        id: `led_${t.id}_${due}`,
        orgId: t.orgId,
        propertyId: t.propertyId,
        tenancyId: t.id,
        date: paidOn,
        kind: 'rent',
        amount,
        category: 'rent',
        description: `Rent, week from ${due}`,
        bankRef: bankRefs[t.id][0],
        match: 'auto',
        dueDate: due,
      })
    }
  }

  const expense = (propertyId: ID, offset: number, amount: number, category: string, description: string, extra: Partial<LedgerEntry> = {}) => {
    if (offset > 0) return
    ledger.push({
      id: `led_x_${propertyId}_${category}_${Math.abs(offset)}`,
      orgId: DEMO.org,
      propertyId,
      date: D(offset),
      kind: 'expense',
      amount: -round2(amount),
      category,
      description,
      match: 'auto',
      ...extra,
    })
  }
  for (const p of properties) {
    for (let q = 0; q < 4; q++) expense(p.id, -20 - q * 91, p.annualCosts.rates / 4, 'rates', 'Council rates, quarterly instalment')
    expense(p.id, -(365 - diffDays(day, p.insurance.renewsOn ?? D(100))) % 365 || -200, p.annualCosts.insurance, 'insurance', `${p.insurance.insurer ?? 'Landlord'} insurance, annual premium`)
    if (p.annualCosts.bodyCorp) for (let q = 0; q < 4; q++) expense(p.id, -35 - q * 91, p.annualCosts.bodyCorp / 4, 'other', 'Body corporate levy, quarterly')
    for (let m = 0; m < 12; m++) expense(p.id, -8 - m * 30, (p.mortgageBalance * p.mortgageRatePct) / 100 / 12, 'interest', 'Mortgage interest')
  }
  for (let m = 0; m < 5; m++) expense('p_totara', -12 - m * 30, 79, 'agent_fees', 'Loop — Portfolio & Trust plan')
  expense('p_totara', -74, 129, 'repairs', 'Heat pump service and filter clean', { kind: 'sinking_draw' })
  expense('p_totara', -160, 185, 'repairs', 'Gutter clean and downpipe repair', { kind: 'sinking_draw' })
  expense('p_beach', -118, 145, 'repairs', 'Replace kitchen mixer cartridge', { kind: 'sinking_draw' })
  expense('p_kowhai', -41, 210, 'repairs', 'Hot water cylinder relief valve replaced', { kind: 'sinking_draw', ticketId: 'tk_valve' })
  expense('p_kowhai', -35, 85, 'agent_fees', 'Routine inspection — delegated to Kate Ferguson')
  expense('p_kowhai', -230, 2480, 'capital', 'New deck balustrade to building code')
  expense('p_harbour', -11, 140, 'agent_fees', 'Exit condition report — delegated')
  expense('p_harbour', -6, 279, 'other', 'Trade Me Property listing, at cost')
  expense('p_harbour', -4, 65, 'agent_fees', 'Viewing hosted by Manaia Rāwiri')
  expense('p_harbour', -9, 320, 'repairs', 'End-of-tenancy touch-up paint and clean', { kind: 'sinking_draw' })
  expense('p_ngaio', -24, 140, 'agent_fees', 'Entry condition report — delegated')
  expense('p_ngaio', -23, 96, 'repairs', 'Door seals replaced', { kind: 'sinking_draw' })
  ledger.push({
    id: 'led_bond_ngaio',
    orgId: DEMO.org,
    propertyId: 'p_ngaio',
    tenancyId: 't_ngaio',
    date: D(-22),
    kind: 'bond_received',
    amount: 1680,
    category: 'private',
    description: 'Bond received from L Fraser — to be lodged with Tenancy Services',
    bankRef: 'NGAIO 5B BOND',
    match: 'auto',
  })
  ledger.sort((a, b) => b.date.localeCompare(a.date))

  const bankLines: BankLine[] = [
    ...ledger
      .filter((l) => l.kind === 'rent' && diffDays(l.date, day) <= 12)
      .map((l) => ({ id: `bl_${l.id}`, orgId: l.orgId, date: l.date, amount: l.amount, reference: l.bankRef ?? '', payer: bankRefs[l.tenancyId ?? '']?.[1] ?? '', status: 'matched' as const, ledgerId: l.id })),
    { id: 'bl_water', orgId: DEMO.org, date: D(-2), amount: 48.2, reference: 'WATER SEPT', payer: 'PETROV A', status: 'suggested', suggestedTenancyId: 't_beach', confidence: 0.74 },
    { id: 'bl_unknown', orgId: DEMO.org, date: D(-4), amount: 200, reference: 'TFR 0931', payer: 'T WHITAKER', status: 'unmatched' },
    // The same payment reported twice by the bank feed — the self-healing sweep finds this.
    { id: 'bl_dupe', orgId: DEMO.org, date: D(-3), amount: 580, reference: 'TOTARA 14 RENT', payer: 'THOMPSON M & TUALA J', status: 'unmatched' },
  ]

  const arrearsEvents: ArrearsEvent[] = [
    { id: 'ae_1', orgId: DEMO.org, tenancyId: 't_kowhai', at: T(0, 7, 5), kind: 'reminder_sent', note: 'Friendly text and email sent to Wiremu at 7:05 am.' },
    { id: 'ae_0', orgId: DEMO.org, tenancyId: 't_kowhai', at: T(-58, 16), kind: 'cleared', note: 'Paid in full, six days late. Wiremu said his pay run had changed.' },
    { id: 'ae_00', orgId: DEMO.org, tenancyId: 't_kowhai', at: T(-62, 10), kind: 'landlord_called', note: 'Tom called. Pay cycle moved to fortnightly; Wiremu will pay Thursday.' },
  ]

  /* ─────────────────────────────── providers ────────────────────────────── */

  const providers: Provider[] = [
    { id: 'pr_heat', name: 'Korimako Heat Pumps', kind: 'trade', trade: 'Heat pump technician', region: 'Richmond', rating: 4.9, jobs: 212, vetting: 'vetted', checks: { identity: true, insurance: true, licence: true, policeVet: true }, calloutFee: 95, hourlyRate: 105, responseHours: 24, joinedAt: T(-140) },
    { id: 'pr_plumb', name: 'Tūī Plumbing & Gas', kind: 'trade', trade: 'Plumber and gasfitter', region: 'Nelson', rating: 4.8, jobs: 347, vetting: 'vetted', checks: { identity: true, insurance: true, licence: true, policeVet: true }, calloutFee: 110, hourlyRate: 120, responseHours: 4, joinedAt: T(-145) },
    { id: 'pr_elec', name: 'Brightwire Electrical', kind: 'trade', trade: 'Electrician', region: 'Stoke', rating: 4.7, jobs: 188, vetting: 'vetted', checks: { identity: true, insurance: true, licence: true, policeVet: true }, calloutFee: 100, hourlyRate: 115, responseHours: 8, joinedAt: T(-138) },
    { id: 'pr_lock', name: 'Latchkey Locksmiths', kind: 'trade', trade: 'Locksmith', region: 'Nelson', rating: 4.9, jobs: 96, vetting: 'vetted', checks: { identity: true, insurance: true, licence: true, policeVet: true }, calloutFee: 120, hourlyRate: 110, responseHours: 2, joinedAt: T(-120) },
    { id: 'pr_handy', name: 'Handy Hemi', kind: 'trade', trade: 'Handyman', region: 'Tāhunanui', rating: 4.6, jobs: 141, vetting: 'vetted', checks: { identity: true, insurance: true, licence: false, policeVet: true }, calloutFee: 60, hourlyRate: 75, responseHours: 48, joinedAt: T(-110) },
    { id: 'pr_glass', name: 'Clearpane Glass', kind: 'trade', trade: 'Glazier', region: 'Richmond', rating: 4.5, jobs: 12, vetting: 'pending', checks: { identity: true, insurance: false, licence: true, policeVet: false }, calloutFee: 130, hourlyRate: 110, responseHours: 24, joinedAt: T(-6) },
    { id: 'pr_kate', name: 'Kate Ferguson', kind: 'inspector', trade: 'Property inspector', region: 'Nelson / Richmond', rating: 4.9, jobs: 318, vetting: 'vetted', checks: { identity: true, insurance: true, licence: true, policeVet: true }, calloutFee: 0, hourlyRate: 0, responseHours: 48, joinedAt: T(-150) },
    { id: 'pr_manaia', name: 'Manaia Rāwiri', kind: 'inspector', trade: 'Inspector and viewing host', region: 'Nelson / Stoke', rating: 4.8, jobs: 164, vetting: 'vetted', checks: { identity: true, insurance: true, licence: true, policeVet: true }, calloutFee: 0, hourlyRate: 0, responseHours: 24, joinedAt: T(-130) },
    { id: 'pr_oliver', name: 'Oliver Schmidt', kind: 'inspector', trade: 'Property inspector', region: 'Richmond / Māpua', rating: 0, jobs: 0, vetting: 'pending', checks: { identity: true, insurance: true, licence: false, policeVet: false }, calloutFee: 0, hourlyRate: 0, responseHours: 48, joinedAt: T(-3) },
    { id: 'pr_penguin', name: 'Blue Penguin Lettings', kind: 'agent', trade: 'Tribunal representation and full management', region: 'Nelson / Tasman', rating: 4.7, jobs: 41, vetting: 'vetted', checks: { identity: true, insurance: true, licence: true, policeVet: true }, calloutFee: 0, hourlyRate: 0, responseHours: 24, joinedAt: T(-152) },
  ]

  /* ──────────────────────────────── tickets ─────────────────────────────── */

  const tickets: Ticket[] = [
    {
      id: 'tk_heatpump',
      orgId: DEMO.org,
      propertyId: 'p_totara',
      tenancyId: 't_totara',
      reportedBy: DEMO.tenant,
      createdAt: T(-3, 18, 20),
      title: 'Heat pump blowing cold air',
      description: 'The lounge heat pump runs but only blows cool air on heat mode. We cleaned the filters and tried a new remote battery. The outdoor unit makes a humming noise but the fan is not spinning.',
      category: 'Heating',
      room: 'Living room',
      photoIds: [],
      triage: {
        urgency: 'routine',
        confidence: 0.86,
        reasoning: 'Heating has failed, but it is late spring and nobody in the home is flagged as vulnerable. The outdoor fan not spinning points to a failed capacitor or fan motor, which is wear rather than misuse.',
        possibleTenantFault: false,
        suggestedTrade: 'Heat pump technician',
        selfHelpTried: 'Cleaned filters, replaced remote batteries, checked it was on heat mode.',
      },
      status: 'quote_ready',
      mode: 'quote_first',
      providerId: 'pr_heat',
      quote: {
        amount: 420,
        submittedAt: T(-1, 14, 10),
        lines: [
          { label: 'Call-out and diagnosis', amount: 95 },
          { label: 'Replace outdoor fan capacitor', amount: 185 },
          { label: 'Service, clean and pressure check', amount: 140 },
        ],
      },
      events: [
        { at: T(-3, 18, 20), by: 'tenant', text: 'Mia reported it from Pool, after trying the self-help steps.' },
        { at: T(-3, 18, 21), by: 'system', text: 'Sorted as routine. Likely over the $350 limit, so a quote was requested instead of sending someone straight away.' },
        { at: T(-2, 9, 5), by: 'provider', text: 'Korimako Heat Pumps accepted and inspected the outdoor unit from the driveway.' },
        { at: T(-1, 14, 10), by: 'provider', text: 'Quote received: $420 including GST.' },
      ],
    },
    {
      id: 'tk_sink',
      orgId: DEMO.org,
      propertyId: 'p_totara',
      tenancyId: 't_totara',
      reportedBy: 'u_jordan',
      createdAt: T(-9, 7, 50),
      title: 'Bathroom sink blocked',
      description: 'Bathroom basin was slow for a week and now will not drain at all. Plunger did not help.',
      category: 'Plumbing',
      room: 'Bathroom',
      photoIds: [],
      triage: {
        urgency: 'routine',
        confidence: 0.9,
        reasoning: 'One basin is out of use and the home has another tap. A single blocked waste is usually a trap blockage; what is in the trap decides who pays.',
        possibleTenantFault: true,
        suggestedTrade: 'Plumber',
        selfHelpTried: 'Plunger; hot water and dishwashing liquid.',
      },
      status: 'tenant_verifying',
      mode: 'auto_dispatch',
      providerId: 'pr_plumb',
      scheduledFor: T(-6, 10),
      entryNoticeServedAt: T(-8, 9),
      invoice: {
        amount: 165,
        submittedAt: T(-6, 11, 30),
        cause: 'tenant_damage',
        providerNote: 'Removed the trap. Blockage was hair ties, cotton buds and a bottle cap — not a fault in the pipework. Photos attached. Trap refitted and tested.',
      },
      events: [
        { at: T(-9, 7, 50), by: 'tenant', text: 'Jordan reported it from Pool.' },
        { at: T(-9, 7, 51), by: 'system', text: 'Sorted as routine, within the $350 limit: Tūī Plumbing & Gas booked. Flagged to check the cause.' },
        { at: T(-8, 9), by: 'system', text: 'Entry notice served by email. Key code held until the 24 hours had run.' },
        { at: T(-6, 11, 30), by: 'provider', text: 'Job done. Plumber recorded the cause as objects in the trap, with photos.' },
        { at: T(-6, 11, 31), by: 'system', text: 'Careless damage is capped at the $500 insurance excess; $165 is under it. Sent to Mia and Jordan to check before anything is billed.' },
      ],
    },
    {
      id: 'tk_fan',
      orgId: DEMO.org,
      propertyId: 'p_beach',
      tenancyId: 't_beach',
      reportedBy: 'u_aleks',
      createdAt: T(-2, 20, 5),
      title: 'Bathroom extractor fan rattling',
      description: 'The bathroom fan has started rattling loudly and smells a bit hot after ten minutes.',
      category: 'Electrical',
      room: 'Bathroom',
      photoIds: [],
      triage: {
        urgency: 'urgent',
        confidence: 0.78,
        reasoning: 'A hot smell from an electrical fitting is a possible fire risk, and the fan is part of the ventilation standard. Aleks was told to leave it switched off.',
        possibleTenantFault: false,
        suggestedTrade: 'Electrician',
      },
      status: 'scheduled',
      mode: 'auto_dispatch',
      providerId: 'pr_elec',
      scheduledFor: T(1, 10, 30),
      entryNoticeServedAt: T(-1, 8, 30),
      keyCode: { code: '418 207', validFrom: T(1, 10), validTo: T(1, 13), depot: 'Lockbox by the meter board' },
      events: [
        { at: T(-2, 20, 5), by: 'tenant', text: 'Aleks reported it from Pool.' },
        { at: T(-2, 20, 6), by: 'system', text: 'Sorted as urgent. Within the $350 limit: Brightwire Electrical booked without waiting for you.' },
        { at: T(-1, 8, 30), by: 'system', text: 'Entry notice served by email for tomorrow, 10:30 am.' },
      ],
    },
    {
      id: 'tk_lock',
      orgId: DEMO.org,
      propertyId: 'p_ngaio',
      tenancyId: 't_ngaio',
      reportedBy: 'u_lucy',
      createdAt: T(0, 7, 12),
      title: 'Front door lock sticking',
      description: 'The front door deadlock takes several tries to turn and this morning I could not lock it when I left.',
      category: 'Locks and security',
      room: 'Entry and hallway',
      photoIds: [],
      triage: {
        urgency: 'urgent',
        confidence: 0.91,
        reasoning: 'The home cannot be secured. Landlords must provide working locks, and an unlockable front door is a same-day job.',
        possibleTenantFault: false,
        suggestedTrade: 'Locksmith',
      },
      status: 'approved',
      mode: 'auto_dispatch',
      providerId: 'pr_lock',
      scheduledFor: T(0, 15, 0),
      events: [
        { at: T(0, 7, 12), by: 'tenant', text: 'Lucy reported it from Pool.' },
        { at: T(0, 7, 13), by: 'system', text: 'Sorted as urgent — the home cannot be locked. Latchkey Locksmiths booked for 3 pm; Lucy has agreed to be home, so no entry notice is needed.' },
      ],
    },
    {
      id: 'tk_valve',
      orgId: DEMO.org,
      propertyId: 'p_kowhai',
      tenancyId: 't_kowhai',
      reportedBy: 'u_anahera',
      createdAt: T(-44, 12),
      title: 'Hot water cylinder dripping',
      description: 'Water dripping steadily from a pipe on the side of the hot water cylinder into the tray.',
      category: 'Plumbing',
      room: 'Laundry',
      photoIds: [],
      triage: { urgency: 'urgent', confidence: 0.84, reasoning: 'A relief valve that will not seat wastes hot water and can fail completely. Not dangerous today, but not one to leave.', possibleTenantFault: false, suggestedTrade: 'Plumber' },
      status: 'closed',
      mode: 'auto_dispatch',
      providerId: 'pr_plumb',
      scheduledFor: T(-42, 9),
      invoice: { amount: 210, submittedAt: T(-42, 11), cause: 'wear_and_tear', providerNote: 'Pressure relief valve worn; replaced. Cylinder is a 2011 unit and will want replacing within a few years.' },
      paidFrom: 'sinking_fund',
      events: [
        { at: T(-44, 12), by: 'tenant', text: 'Anahera reported it from Pool.' },
        { at: T(-42, 11), by: 'provider', text: 'Valve replaced. Fair wear and tear.' },
        { at: T(-41, 8), by: 'system', text: 'Paid $210 from the sinking fund and filed under repairs.' },
      ],
    },
  ]

  /* ────────────────────────────── inspections ───────────────────────────── */

  const inspections: Inspection[] = [
    { id: 'in_totara_next', orgId: DEMO.org, propertyId: 'p_totara', tenancyId: 't_totara', type: 'routine', status: 'proposed', mode: 'diy', rooms: rooms(3) },
    { id: 'in_totara_last', orgId: DEMO.org, propertyId: 'p_totara', tenancyId: 't_totara', type: 'routine', status: 'completed', mode: 'diy', scheduledFor: T(-95, 16), noticeServedAt: T(-100, 9), completedAt: T(-95, 16, 40), rooms: rooms(3, [5, 4, 4, 4, 5, 4, 5, 4, 4], { Bathroom: 'Light mould starting on the ceiling above the shower. Talked through running the fan for ten minutes after showers.' }), overallScore: 4.4, summary: 'Well kept. One note about bathroom ventilation habits; smoke alarms tested and working.' },
    { id: 'in_beach_last', orgId: DEMO.org, propertyId: 'p_beach', tenancyId: 't_beach', type: 'routine', status: 'completed', mode: 'delegated', providerId: 'pr_manaia', scheduledFor: T(-60, 11), noticeServedAt: T(-66, 9), completedAt: T(-60, 11, 35), rooms: rooms(2, [5, 5, 4, 5, 5, 4, 5, 5]), overallScore: 4.8, summary: 'Immaculate. Nothing to follow up.' },
    { id: 'in_kowhai_last', orgId: DEMO.org, propertyId: 'p_kowhai', tenancyId: 't_kowhai', type: 'routine', status: 'completed', mode: 'delegated', providerId: 'pr_kate', scheduledFor: T(-35, 14), noticeServedAt: T(-41, 9), completedAt: T(-35, 14, 50), rooms: rooms(4, [4, 4, 4, 3, 4, 4, 5, 4, 4, 4], { Bathroom: 'Ensuite fan is running but I could not see where it vents — worth checking it is ducted outside, not into the roof space.', 'Exterior and grounds': 'Lawns and garden tidy. Deck balustrade is new and solid.' }), overallScore: 4.1, summary: 'Lived-in family home in good order. Check the ensuite fan ducting. I did not have a ladder to test the hallway smoke alarm.' },
    { id: 'in_harbour_exit', orgId: DEMO.org, propertyId: 'p_harbour', tenancyId: 't_harbour_prev', type: 'exit', status: 'completed', mode: 'delegated', providerId: 'pr_kate', scheduledFor: T(-12, 10), completedAt: T(-12, 11, 15), rooms: rooms(2, [5, 4, 5, 5, 4, 5, 5, 5], { 'Living room': 'Two picture hooks left in the wall; filled and touched up.' }), overallScore: 4.6, summary: 'Left clean and tidy. Minor touch-ups only; bond released in full.' },
    { id: 'in_ngaio_entry', orgId: DEMO.org, propertyId: 'p_ngaio', tenancyId: 't_ngaio', type: 'entry', status: 'completed', mode: 'delegated', providerId: 'pr_manaia', scheduledFor: T(-23, 13), completedAt: T(-23, 13, 55), rooms: rooms(1, [4, 4, 4, 4, 4, 4, 4]), overallScore: 4.0, summary: 'Entry condition recorded with 46 photos and signed by Lucy.' },
  ]

  const fieldTasks: FieldTask[] = [
    { id: 'ft_1', orgId: DEMO.org, propertyId: 'p_kowhai', type: 'routine_inspection', price: 85, platformFee: 17, status: 'paid_out', providerId: 'pr_kate', requestedAt: T(-44), scheduledFor: T(-35, 14), completedAt: T(-35, 14, 50), inspectionId: 'in_kowhai_last' },
    { id: 'ft_2', orgId: DEMO.org, propertyId: 'p_harbour', type: 'entry_exit_report', price: 140, platformFee: 28, status: 'paid_out', providerId: 'pr_kate', requestedAt: T(-20), scheduledFor: T(-12, 10), completedAt: T(-12, 11, 15), inspectionId: 'in_harbour_exit' },
    { id: 'ft_3', orgId: DEMO.org, propertyId: 'p_harbour', type: 'viewing', price: 65, platformFee: 13, status: 'completed', providerId: 'pr_manaia', requestedAt: T(-6), scheduledFor: T(-4, 17, 30), completedAt: T(-4, 18, 10), note: 'Seven groups through. Three asked for the application link.' },
    { id: 'ft_4', orgId: DEMO.org, propertyId: 'p_harbour', type: 'viewing', price: 65, platformFee: 13, status: 'scheduled', providerId: 'pr_manaia', requestedAt: T(-3), scheduledFor: T(2, 17, 30) },
    { id: 'ft_5', orgId: DEMO.org, propertyId: 'p_ngaio', type: 'entry_exit_report', price: 140, platformFee: 28, status: 'paid_out', providerId: 'pr_manaia', requestedAt: T(-30), scheduledFor: T(-23, 13), completedAt: T(-23, 13, 55), inspectionId: 'in_ngaio_entry' },
    { id: 'ft_6', orgId: DEMO.org, propertyId: 'p_beach', type: 'routine_inspection', price: 85, platformFee: 17, status: 'paid_out', providerId: 'pr_manaia', requestedAt: T(-70), scheduledFor: T(-60, 11), completedAt: T(-60, 11, 35), inspectionId: 'in_beach_last' },
  ]

  const keyEvents: KeyEvent[] = [
    { id: 'ke_1', orgId: DEMO.org, propertyId: 'p_harbour', keySetId: 'k1', at: T(-12, 12), action: 'deposited', actor: 'Kate Ferguson', note: 'Returned after the exit inspection.' },
    { id: 'ke_2', orgId: DEMO.org, propertyId: 'p_harbour', keySetId: 'k1', at: T(-4, 16, 45), action: 'code_issued', actor: 'Loop', note: 'One-time code for Manaia Rāwiri, valid 4:45–7:00 pm.' },
    { id: 'ke_3', orgId: DEMO.org, propertyId: 'p_harbour', keySetId: 'k1', at: T(-4, 17, 2), action: 'collected', actor: 'Manaia Rāwiri' },
    { id: 'ke_4', orgId: DEMO.org, propertyId: 'p_harbour', keySetId: 'k1', at: T(-4, 18, 32), action: 'returned', actor: 'Manaia Rāwiri' },
    { id: 'ke_5', orgId: DEMO.org, propertyId: 'p_totara', keySetId: 'k3', at: T(-6, 9, 40), action: 'collected', actor: 'Tūī Plumbing & Gas', note: 'Code released once the 24-hour entry notice had run.' },
    { id: 'ke_6', orgId: DEMO.org, propertyId: 'p_totara', keySetId: 'k3', at: T(-6, 12, 5), action: 'returned', actor: 'Tūī Plumbing & Gas' },
    { id: 'ke_7', orgId: DEMO.org, propertyId: 'p_beach', keySetId: 'k2', at: T(-1, 8, 31), action: 'code_issued', actor: 'Loop', note: 'Lockbox code for Brightwire Electrical — locked until 10:00 am tomorrow.' },
  ]

  /* ─────────────────────── variations, notices, documents ───────────────── */

  const variations: Variation[] = [
    {
      id: 'var_pet',
      orgId: DEMO.org,
      tenancyId: 't_totara',
      type: 'pet_request',
      status: 'awaiting_landlord',
      requestedBy: 'tenant',
      requestedAt: T(-12, 19, 30),
      respondBy: D(9),
      summary: 'One adult cat, Miso',
      detail: { animal: 'Cat', name: 'Miso', age: '4 years', desexed: true, indoors: 'Indoor and outdoor', note: 'Miso is my sister’s cat. She is moving overseas in January and we would love to give him a home. He is microchipped, desexed and has lived in a rental before with no problems.' },
      conditions: [],
      signatures: [],
    },
    {
      id: 'var_flat',
      orgId: DEMO.org,
      tenancyId: 't_kowhai',
      type: 'flatmate_change',
      status: 'signed',
      requestedBy: 'tenant',
      requestedAt: T(-205, 10),
      summary: 'Anahera Ngata added to the tenancy',
      detail: { adding: 'Anahera Ngata', removing: '—' },
      conditions: [],
      signatures: [
        { by: 'tenant', name: 'Wiremu Ngata', at: T(-203, 18) },
        { by: 'tenant', name: 'Anahera Ngata', at: T(-203, 18, 5) },
        { by: 'landlord', name: 'Tom Whitaker', at: T(-202, 8, 30) },
      ],
    },
  ]

  const notices: Notice[] = [
    {
      id: 'no_inc_totara',
      orgId: DEMO.org,
      tenancyId: 't_totara',
      type: 'rent_increase',
      createdAt: T(-458, 10),
      servedOn: D(-458),
      method: 'email',
      deemedReceivedOn: D(-458),
      effectiveOn: D(-395),
      status: 'acknowledged',
      title: 'Rent increase to $580 a week',
      body: 'Notice that the rent for 14 Tōtara Rise will increase from $550 to $580 a week.',
      rulesUsed: ['rent_increase.notice', 'rent_increase.min_interval_months'],
      packVersion: '2025.10.0',
    },
    {
      id: 'no_entry_beach',
      orgId: DEMO.org,
      tenancyId: 't_beach',
      type: 'entry_repairs',
      createdAt: T(-1, 8, 30),
      servedOn: D(-1),
      method: 'email',
      deemedReceivedOn: D(-1),
      effectiveOn: D(1),
      status: 'served',
      title: 'Entry for repairs: bathroom extractor fan',
      body: 'Brightwire Electrical will attend at 10:30 am to repair the bathroom extractor fan.',
      rulesUsed: ['entry.repairs_notice_min', 'entry.hours'],
      packVersion: '2026.11.0',
    },
  ]

  const docs: Doc[] = []
  const doc = (propertyId: ID, name: string, kind: Doc['kind'], offset: number, sizeKb: number, source: Doc['source'] = 'uploaded', tenancyId?: ID) =>
    docs.push({ id: `doc_${docs.length + 1}`, orgId: DEMO.org, propertyId, tenancyId, name, kind, addedAt: T(offset), sizeKb, source })
  doc('p_totara', 'Tenancy agreement — Thompson & Tuala.pdf', 'tenancy_agreement', -616, 412, 'imported', 't_totara')
  doc('p_totara', 'Healthy homes compliance statement.pdf', 'healthy_homes_statement', -395, 188, 'generated', 't_totara')
  doc('p_totara', 'Initio landlord policy schedule 2026.pdf', 'insurance', -225, 96)
  doc('p_totara', 'Bond lodgement receipt BND-6612-0417.pdf', 'bond_receipt', -605, 54, 'imported', 't_totara')
  doc('p_totara', 'Routine inspection report.pdf', 'inspection_report', -95, 2210, 'generated', 't_totara')
  doc('p_beach', 'Tenancy agreement — Petrov.pdf', 'tenancy_agreement', -294, 398, 'imported', 't_beach')
  doc('p_beach', 'Body corporate operational rules (2024).pdf', 'body_corp_rules', -294, 640)
  doc('p_beach', 'Healthy homes compliance statement.pdf', 'healthy_homes_statement', -292, 176, 'generated', 't_beach')
  doc('p_beach', 'Routine inspection report.pdf', 'inspection_report', -60, 1840, 'generated', 't_beach')
  doc('p_kowhai', 'Tenancy agreement — Ngata.pdf', 'tenancy_agreement', -910, 420, 'imported', 't_kowhai')
  doc('p_kowhai', 'Healthy homes compliance statement.pdf', 'healthy_homes_statement', -420, 190, 'generated', 't_kowhai')
  doc('p_kowhai', 'Routine inspection report — Kate Ferguson.pdf', 'inspection_report', -35, 2630, 'generated', 't_kowhai')
  doc('p_kowhai', 'Tūī Plumbing invoice 20418.pdf', 'invoice', -42, 38)
  doc('p_harbour', 'Exit condition report.pdf', 'inspection_report', -12, 3120, 'generated', 't_harbour_prev')
  doc('p_harbour', 'Meth screening result — clear.pdf', 'meth_report', -10, 210)
  doc('p_ngaio', 'Tenancy agreement — Fraser.pdf', 'tenancy_agreement', -25, 386, 'imported', 't_ngaio')
  doc('p_ngaio', 'Entry condition report.pdf', 'inspection_report', -23, 2980, 'generated', 't_ngaio')

  /* ────────────────────── other organisations' portfolios ───────────────── */

  const suburbKeys = Object.keys(sub)
  const kinds: Property['kind'][] = ['house', 'house', 'townhouse', 'unit', 'house', 'apartment']
  let streetCursor = 0
  const listingHeads = ['Warm family home with a north-facing deck', 'Tidy unit, moments from the shops', 'Quiet cul-de-sac living with room to grow', 'Light-filled townhouse close to town', 'Classic bungalow with a big back lawn', 'Low-maintenance and fully insulated', 'Sea breeze and an easy walk to the beach', 'Modern apartment with secure parking']
  let listingBudget = 9

  for (const [orgId, , , status, , count] of orgSpecs) {
    if (orgId === DEMO.org) continue
    for (let i = 0; i < count; i++) {
      const s = sub[suburbKeys[(streetCursor + i * 3) % suburbKeys.length]]
      const kind = kinds[(streetCursor * 5 + i) % kinds.length]
      const beds = kind === 'house' ? rand.pick([3, 3, 4, 2]) : kind === 'apartment' ? rand.pick([1, 2]) : 2
      const rent = roundRent(s.rent3 * BED_FACTOR[beds] * (0.95 + rand.next() * 0.14))
      const value = Math.round((s.value * (0.7 + beds * 0.1) * (0.92 + rand.next() * 0.16)) / 5000) * 5000
      const id = `p_${orgId.slice(4)}_${i + 1}`
      const street = STREETS[streetCursor % STREETS.length]
      streetCursor++
      const churned = status === 'churned'
      const vacant = !churned && listingBudget > 0 && (i === count - 1 || rand.chance(0.22))
      if (vacant) listingBudget--
      const compliant = rand.chance(0.86)
      const checked = D(-rand.int(30, 400))
      properties.push({
        id,
        orgId,
        entityId: `ent_${orgId.slice(4)}`,
        jurisdiction: 'NZ',
        address: addr(`${kind === 'unit' || kind === 'apartment' ? `${rand.int(1, 8)}/` : ''}${rand.int(2, 96)} ${street}`, s),
        geo: near(s, (rand.next() - 0.5) * 0.018, (rand.next() - 0.5) * 0.024),
        titleType: kind === 'apartment' || kind === 'unit' ? 'unit_title' : 'freehold',
        bodyCorpRulesAttached: kind === 'apartment' || kind === 'unit' ? rand.chance(0.8) : undefined,
        kind,
        beds,
        baths: beds >= 4 ? 2 : 1,
        parking: kind === 'apartment' ? 1 : rand.int(1, 2),
        floorArea: 40 + beds * 28 + rand.int(0, 20),
        yearBuilt: rand.int(1962, 2019),
        purchasePrice: Math.round((value * (0.55 + rand.next() * 0.3)) / 5000) * 5000,
        purchaseYear: rand.int(2008, 2022),
        currentValue: value,
        mortgageBalance: Math.round((value * rand.next() * 0.6) / 5000) * 5000,
        mortgageRatePct: 5.8 + rand.int(0, 8) / 10,
        art: { style: rand.int(0, 5), hue: rand.int(0, 359) },
        onboardingMode: 'existing_tenancy_import',
        healthyHomes: {
          heating: HH_OK('Heat pump meets the calculated requirement.', checked),
          insulation: HH_OK('Ceiling and underfloor to standard.', checked),
          ventilation: compliant ? HH_OK('Fans ducted outside.', checked) : { status: 'non_compliant', detail: 'No extractor fan in the bathroom.', checkedAt: checked },
          moisture: HH_OK('Gutters and drainage in order.', checked),
          draught: HH_OK('No unreasonable gaps.', checked),
          statementSignedAt: rand.chance(0.9) ? checked : undefined,
        },
        smokeAlarms: { lastChecked: rand.chance(0.85) ? D(-rand.int(20, 300)) : undefined, type: 'photoelectric_10yr', expiryYear: rand.int(2027, 2034) },
        meth: { status: rand.chance(0.5) ? 'clear' : 'untested' },
        insurance: { insurer: rand.pick(['AMI', 'Tower', 'Initio', 'AA Insurance', 'State']), renewsOn: D(rand.int(15, 340)), excess: rand.pick([400, 500, 650, 750]), statementInAgreement: rand.chance(0.9), inspectionIntervalWeeks: rand.pick([13, 26]) },
        sinkingFund: { ratePct: rand.pick([5, 6, 8]), balance: rand.int(300, 7000), autoApproveLimit: rand.pick([250, 350, 500]) },
        assets: [],
        keys: [],
        annualCosts: { rates: rand.int(2400, 4200), insurance: rand.int(900, 2300), bodyCorp: kind === 'apartment' ? rand.int(1800, 4200) : 0 },
        listing: vacant
          ? {
              status: 'live',
              headline: listingHeads[(streetCursor + i) % listingHeads.length],
              description: `A ${beds}-bedroom ${kind} in ${s.name}, well insulated and easy to keep warm. Viewings by appointment through Pool.`,
              advertisedWeeklyRent: rent,
              availableFrom: D(rand.int(3, 28)),
              publishedAt: T(-rand.int(1, 16), rand.int(8, 18)),
              syndication: { pool: true, trademe: rand.chance(0.8), realestate: rand.chance(0.5) },
              petsConsidered: rand.chance(0.6),
              viewingTimes: [T(rand.int(1, 6), rand.pick([11, 12, 17]), rand.pick([0, 30]))],
              features: rand.shuffle(LISTING_FEATURES).slice(0, rand.int(4, 6)),
              views: rand.int(40, 520),
            }
          : undefined,
      })
      if (!vacant && !churned) {
        const tenantUser = addUser({ id: `u_t_${id.slice(2)}`, role: 'tenant', fullName: nextName(), createdAt: T(-rand.int(60, 700)) })
        const start = D(-rand.int(40, 900))
        const fixed = rand.chance(0.35)
        const late = orgId === 'org_brightwater' && i === 0 ? 9 : orgId === 'org_chenli' && i === 2 ? 24 : rand.chance(0.08) ? rand.int(1, 4) : 0
        tenancies.push({
          id: `t_${id.slice(2)}`,
          orgId,
          propertyId: id,
          tenantIds: [tenantUser.id],
          status: 'active',
          type: fixed ? 'fixed' : 'periodic',
          startDate: start,
          endDate: fixed ? addMonths(start, 12 * Math.ceil(diffDays(start, day) / 365 + 0.2)) : undefined,
          weeklyRent: rent,
          cadence: 'weekly',
          rentDueWeekday: rand.int(1, 5),
          rentPaidTo: D(late > 0 ? -late - 1 : rand.int(0, 6)),
          lastRentIncrease: diffDays(start, day) > 400 ? D(-rand.int(30, 360)) : undefined,
          bond: { amount: rent * 4, petBond: 0, receivedOn: addDays(start, -2), lodgedOn: addDays(start, rand.int(3, 20)), bondRef: `BND-${rand.int(4000, 6999)}-${rand.int(1000, 9999)}` },
          pets: [],
          agreementSignedOn: addDays(start, -5),
          origin: 'imported',
        })
      }
    }
  }

  // Seeded faults for the self-healing sweep to find in other organisations.
  const stale = properties.find((p) => p.orgId === 'org_patel' && !p.listing)
  if (stale) {
    stale.listing = {
      status: 'live',
      headline: 'Family home near Richmond schools',
      description: 'Listing left live after the home was let.',
      advertisedWeeklyRent: tenancies.find((t) => t.propertyId === stale.id)?.weeklyRent ?? 600,
      availableFrom: D(-40),
      publishedAt: T(-61),
      syndication: { pool: true, trademe: true, realestate: false },
      petsConsidered: false,
      viewingTimes: [],
      features: ['Heat pump', 'Fenced section'],
      views: 288,
    }
  }
  const noRef = tenancies.find((t) => t.orgId === 'org_tasman')
  if (noRef) noRef.bond.bondRef = undefined
  bankLines.push({ id: 'bl_ropata_fuzzy', orgId: 'org_ropata', date: D(-1), amount: tenancies.find((t) => t.orgId === 'org_ropata')?.weeklyRent ?? 540, reference: 'RENT PURIRI PL', payer: 'UNKNOWN', status: 'suggested', suggestedTenancyId: tenancies.find((t) => t.orgId === 'org_ropata')?.id, confidence: 0.94 })

  /* ─────────────────────────── Pool: applications ───────────────────────── */

  const applications: Application[] = [
    { id: 'ap_daniel', orgId: DEMO.org, propertyId: 'p_harbour', applicantId: 'u_daniel', stage: 'preferred', submittedAt: T(-4, 19, 12), offeredWeeklyRent: 590, moveIn: D(10), occupants: 2, message: 'My partner and I both work at the hospital and are looking for somewhere within a bike ride. We saw the place on Tuesday and loved the light upstairs.', viewingAt: T(-4, 17, 30) },
    { id: 'ap_emma', orgId: DEMO.org, propertyId: 'p_harbour', applicantId: 'u_emma', stage: 'viewing_booked', submittedAt: T(-2, 8, 40), offeredWeeklyRent: 590, moveIn: D(14), occupants: 2, message: 'Relocating from Christchurch for work in December. Can view on Saturday.', viewingAt: T(2, 17, 30) },
    { id: 'ap_ravi', orgId: DEMO.org, propertyId: 'p_harbour', applicantId: 'u_ravi', stage: 'interest', submittedAt: T(-1, 21, 5), offeredWeeklyRent: 590, moveIn: D(10), occupants: 1, message: 'Software contractor working from home. Quiet, tidy, no pets.' },
    { id: 'ap_chloe', orgId: DEMO.org, propertyId: 'p_harbour', applicantId: DEMO.applicant, stage: 'interest', submittedAt: T(0, 6, 55), offeredWeeklyRent: 590, moveIn: D(21), occupants: 1, message: 'First time renting on my own after flatting through uni. Starting at the council in January.' },
    { id: 'ap_tavita', orgId: DEMO.org, propertyId: 'p_harbour', applicantId: 'u_tavita', stage: 'declined', submittedAt: T(-5, 12), offeredWeeklyRent: 590, moveIn: D(40), occupants: 4, message: 'Family of four, needing somewhere from late December.', decidedAt: T(-3, 9), purgeOn: D(27) },
    // Declined more than 30 days ago and still holding personal details: the purge job missed it.
    { id: 'ap_stale', orgId: 'org_chenli', propertyId: properties.find((p) => p.orgId === 'org_chenli')?.id ?? 'p_harbour', applicantId: 'u_old', stage: 'declined', submittedAt: T(-48, 12), offeredWeeklyRent: 560, moveIn: D(-20), occupants: 2, message: 'Looking for a 12-month lease.', decidedAt: T(-41, 9), purgeOn: D(-11) },
  ]

  const profile = (userId: ID, p: Omit<RenterProfile, 'userId' | 'savedPropertyIds' | 'visibleToLandlords'> & Partial<Pick<RenterProfile, 'savedPropertyIds' | 'visibleToLandlords'>>): RenterProfile & { id: ID } => ({
    id: `rp_${userId.slice(2)}`,
    userId,
    savedPropertyIds: [],
    visibleToLandlords: true,
    ...p,
  })
  const liveListings = properties.filter((p) => p.listing?.status === 'live' && p.orgId !== 'org_patel').map((p) => p.id)
  const renterProfiles = [
    profile(DEMO.tenant, {
      headline: 'Nurse at Nelson Hospital, renting in Stoke since 2025',
      bio: 'I work shifts at the hospital and share with my partner Jordan. We like a quiet street, a vege garden and a landlord who answers the phone.',
      employment: 'Full-time',
      householdSize: 2,
      hasPets: false,
      petDetail: 'Hoping to adopt Miso, a four-year-old cat.',
      references: [
        { name: 'Hana Whitaker', relation: 'Current landlord', verified: true },
        { name: 'R. Ellis', relation: 'Previous landlord, 2022–2025', verified: true },
      ],
      creditCheckedAt: D(-620),
      history: [
        { address: '14 Tōtara Rise, Stoke', from: D(-612), onTimePct: 99, careScore: 4.4, verifiedBy: 'loop_ledger' },
        { address: '2/40 Collingwood Street, Nelson', from: D(-1700), to: D(-615), onTimePct: 100, careScore: 4.5, verifiedBy: 'landlord_reference' },
      ],
      savedPropertyIds: liveListings.slice(0, 2),
    }),
    profile('u_jordan', { headline: 'Builder, renting with Mia', bio: 'Carpenter with a local firm.', employment: 'Full-time', householdSize: 2, hasPets: false, references: [{ name: 'Hana Whitaker', relation: 'Current landlord', verified: true }], history: [{ address: '14 Tōtara Rise, Stoke', from: D(-612), onTimePct: 99, careScore: 4.4, verifiedBy: 'loop_ledger' }] }),
    profile('u_aleks', { headline: 'Marine engineer at Port Nelson', bio: 'On a fixed term by the beach.', employment: 'Full-time', householdSize: 1, hasPets: false, references: [{ name: 'Tom Whitaker', relation: 'Current landlord', verified: true }], creditCheckedAt: D(-296), history: [{ address: '3/27 Beachcomber Lane, Tāhunanui', from: D(-290), onTimePct: 100, careScore: 4.8, verifiedBy: 'loop_ledger' }] }),
    profile('u_wiremu', { headline: 'Whānau of four in Richmond', bio: 'Two kids at the local primary and a very good dog.', employment: 'Full-time', householdSize: 4, hasPets: true, petDetail: 'Tui, a Labrador cross.', references: [{ name: 'Tom Whitaker', relation: 'Current landlord', verified: true }], history: [{ address: '8 Kōwhai Close, Richmond', from: D(-905), onTimePct: 90, careScore: 4.1, verifiedBy: 'loop_ledger' }] }),
    profile('u_lucy', { headline: 'Teacher, new to Nelson', bio: 'Moved up from Dunedin for a job at the college.', employment: 'Full-time', householdSize: 1, hasPets: false, references: [{ name: 'P. Doyle', relation: 'Previous landlord', verified: true }], creditCheckedAt: D(-27), history: [{ address: '5B Ngaio Street, Nelson South', from: D(-22), onTimePct: 100, careScore: 4.0, verifiedBy: 'loop_ledger' }, { address: '18 Leith Walk, Dunedin', from: D(-1150), to: D(-30), onTimePct: 98, careScore: 4.6, verifiedBy: 'landlord_reference' }] }),
    profile('u_daniel', { headline: 'Two hospital staff, looking near town', bio: 'Registrar and physio; we cycle to work.', employment: 'Full-time', householdSize: 2, hasPets: false, moveInFrom: D(10), budgetWeekly: 620, references: [{ name: 'M. Stewart', relation: 'Current landlord', verified: true }, { name: 'K. Wong', relation: 'Previous property manager', verified: true }], creditCheckedAt: D(-3), history: [{ address: '11 Rata Street, Wellington', from: D(-1400), to: D(-20), onTimePct: 100, careScore: 4.7, verifiedBy: 'landlord_reference' }] }),
    profile('u_emma', { headline: 'Relocating from Christchurch', bio: 'Project manager and a primary teacher.', employment: 'Full-time', householdSize: 2, hasPets: false, moveInFrom: D(14), budgetWeekly: 600, references: [{ name: 'A. Novak', relation: 'Current property manager', verified: true }], history: [{ address: '7 Peverel Street, Christchurch', from: D(-800), onTimePct: 97, careScore: 4.3, verifiedBy: 'landlord_reference' }] }),
    profile('u_ravi', { headline: 'Remote contractor', bio: 'Working from home for an Auckland firm.', employment: 'Self-employed', householdSize: 1, hasPets: false, moveInFrom: D(10), budgetWeekly: 600, references: [{ name: 'S. Kaur', relation: 'Current landlord', verified: false }], history: [{ address: '4/12 Vogel Street, Nelson', from: D(-420), onTimePct: 93, careScore: 4.0, verifiedBy: 'self_reported' }] }),
    profile(DEMO.applicant, { headline: 'First place of my own', bio: 'Graduate planner starting at the council.', employment: 'Starting full-time in January', householdSize: 1, hasPets: false, moveInFrom: D(21), budgetWeekly: 600, references: [{ name: 'Head tenant, Dunedin flat', relation: 'Flatmate', verified: false }], history: [], savedPropertyIds: liveListings.slice(1, 3) }),
    profile('u_tavita', { headline: 'Family of four', bio: 'Moving for work at the port.', employment: 'Full-time', householdSize: 4, hasPets: false, references: [{ name: 'T. Marino', relation: 'Current landlord', verified: true }], history: [{ address: '23 Beach Road, Motueka', from: D(-900), onTimePct: 95, careScore: 4.2, verifiedBy: 'landlord_reference' }] }),
  ]

  /* ─────────────────────────────── autopilot ────────────────────────────── */

  const auto = (offset: number, hour: number, kind: AutopilotEntry['kind'], text: string): AutopilotEntry => ({ id: `ap_${offset}_${hour}_${kind}`, orgId: DEMO.org, at: T(offset, hour, (hour * 7) % 60), kind, text })
  const autopilotLog: AutopilotEntry[] = [
    auto(0, 7, 'dispatch', 'Booked Latchkey Locksmiths for 5B Ngaio Street at 3 pm — the front door will not lock, and it is within your $350 limit.'),
    auto(0, 7, 'reminder', 'Sent Wiremu a friendly reminder: rent for 8 Kōwhai Close fell due yesterday.'),
    auto(-1, 14, 'quote', 'Filed a $420 heat pump quote for your decision — over your $350 limit, so I did not approve it.'),
    auto(-1, 8, 'dispatch', 'Served the 24-hour entry notice for the fan repair at 3/27 Beachcomber Lane and held the lockbox code until it runs out.'),
    auto(-2, 20, 'dispatch', 'Booked Brightwire Electrical for a fan that smells hot. Told Aleks to leave it switched off.'),
    auto(-3, 9, 'rent', 'Matched $580 from M Thompson to 14 Tōtara Rise and set aside $34.80 for the sinking fund.'),
    auto(-5, 9, 'rent', 'Matched $495 from A Petrov to 3/27 Beachcomber Lane and set aside $24.75.'),
    auto(-6, 11, 'compliance', 'Checked a $165 plumbing invoice against the careless-damage cap before sending it to the tenants to confirm.'),
    auto(-6, 10, 'listing', 'Published 21 Harbour View Terrace to Pool, Trade Me and realestate.co.nz at a fixed $590 a week.'),
    auto(-8, 9, 'deadline', 'Reminded you: the bond for 5B Ngaio Street must be lodged within 23 working days of receipt.'),
    auto(-12, 19, 'deadline', 'Started the 21-day clock on Mia’s pet request for 14 Tōtara Rise.'),
    auto(-12, 12, 'inspection', 'Filed the exit report for 21 Harbour View Terrace and released the bond in full.'),
  ]

  const platform = buildPlatform({ day, D, T, orgs, users, properties, tenancies, providers, rand })

  return {
    seedVersion: SEED_VERSION,
    seededOn: day,
    simulatedThrough: day,
    orgs,
    entities,
    users,
    properties,
    tenancies,
    ledger,
    bankLines,
    arrearsEvents,
    tickets,
    providers,
    inspections,
    fieldTasks,
    keyEvents,
    variations,
    notices,
    docs,
    renterProfiles,
    applications,
    autopilotLog,
    dismissedActions: [],
    ...platform,
  }
}
