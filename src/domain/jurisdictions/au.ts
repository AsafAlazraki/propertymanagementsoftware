/**
 * Australian state rule packs — PREVIEW.
 *
 * These carry the headline values researched on 14 November 2026
 * (docs/research/au-tenancy-law.md) so the product can show what changes from
 * state to state. They are not signed off: most were read on regulator pages
 * rather than the Acts, several are flagged unverified, and each state needs
 * rules this schema does not hold yet (prescribed forms, re-letting bans,
 * portable bonds, fee-free rent payment). No calculator runs on a preview pack.
 */
import type { Duration, JurisdictionPack, Rule, RuleSet, Verification } from './types'
import type { JurisdictionCode } from '../types'

const V = '2026-11-14'

interface StateSpec {
  code: JurisdictionCode
  name: string
  shortName: string
  act: { name: string; url: string }
  regulator: { name: string; url: string }
  bondAuthority: { name: string; url: string }
  tribunal: string
  bondWeeks: number
  bondNote: string
  lodgement: Duration
  lodgementVerified?: Verification
  advanceWeeks: number
  advanceNote?: string
  acceptHigherOfferAllowed: boolean
  increaseNotice: Duration
  increaseNote?: string
  inspectionNotice: Duration
  inspectionNoticeMax: Duration | null
  inspectionInterval: Duration
  inspectionNote: string
  repairsNotice: Duration
  hours: { from: number; to: number } | null
  noCause: boolean
  noCauseNote: string
  landlordPeriodic: Duration | null
  ownerOccupy: Duration | null
  sale: Duration | null
  saleNote?: string
  tenantPeriodic: Duration
  fixedTermNote: string
  petDays: number
  petNote: string
  arrearsDays: number | null
  upcoming: JurisdictionPack['upcoming']
}

const d = (n: number, unit: Duration['unit'] = 'days'): Duration => ({ n, unit })

function rule<T>(value: T, label: string, plain: string, spec: StateSpec, verified: Verification = 'secondary', notes?: string): Rule<T> {
  return { value, label, plain, citation: spec.act.name, sourceUrl: spec.regulator.url, verified, lastVerified: V, notes }
}

function words(x: Duration): string {
  const unit = x.unit === 'working_days' ? 'working days' : x.unit
  return `${x.n} ${x.n === 1 ? unit.replace(/s$/, '') : unit}`
}

function build(s: StateSpec): JurisdictionPack {
  const rules: RuleSet = {
    'bond.max_weeks': rule(s.bondWeeks, 'Maximum bond', s.bondNote, s),
    'bond.pet_max_weeks': rule(null, 'Pet bond', 'A separate pet bond is not part of this preview pack.', s, 'unverified'),
    'bond.lodgement_deadline': rule(s.lodgement, 'Lodge the bond', `Lodge with ${s.bondAuthority.name} within ${words(s.lodgement)} of receiving it.`, s, s.lodgementVerified ?? 'secondary'),
    'rent.in_advance_max_weeks': rule(s.advanceWeeks, 'Rent in advance', s.advanceNote ?? `No more than ${s.advanceWeeks} weeks of rent in advance.`, s),
    'listing.fixed_price_required': rule(true, 'State the rent', 'Rentals must be advertised at one fixed price — no ranges and no "offers from".', s),
    'listing.bidding_banned': rule(
      true,
      'No rent bidding',
      s.acceptHigherOfferAllowed
        ? 'Inviting an offer above the advertised rent is banned. An offer made freely by a renter may be accepted.'
        : 'It is unlawful to ask for, invite or accept rent above the advertised price: the advertised rent is a ceiling.',
      s,
    ),
    'listing.letting_fee_banned': rule(true, 'No application or letting fees', 'Renters cannot be charged application, background-check or agreement-preparation fees.', s, 'unverified'),
    'rent_increase.min_interval_months': rule(12, 'Rent increases', s.increaseNote ?? 'Rent can increase no more than once every 12 months.', s),
    'rent_increase.notice': rule(s.increaseNotice, 'Notice of a rent increase', `At least ${words(s.increaseNotice)} of written notice.`, s),
    'entry.inspection_notice_min': rule(s.inspectionNotice, 'Inspection notice', `At least ${words(s.inspectionNotice)} of written notice.`, s),
    'entry.inspection_notice_max': rule(s.inspectionNoticeMax, 'Inspection notice, at most', s.inspectionNoticeMax ? `No more than ${words(s.inspectionNoticeMax)} ahead.` : 'No maximum is stated.', s),
    'entry.inspection_min_interval': rule(s.inspectionInterval, 'How often you can inspect', s.inspectionNote, s),
    'entry.repairs_notice_min': rule(s.repairsNotice, 'Entry for repairs', `At least ${words(s.repairsNotice)} of notice for non-urgent repairs.`, s),
    'entry.hours': rule(s.hours, 'Entry hours', s.hours ? `Between ${s.hours.from} am and ${s.hours.to - 12} pm.` : 'Not captured in this preview.', s, s.hours ? 'secondary' : 'unverified'),
    'termination.no_cause_allowed': rule(s.noCause, 'Ending a tenancy without a reason', s.noCauseNote, s),
    'termination.landlord_periodic_notice': rule(s.landlordPeriodic, 'Landlord notice, periodic', s.landlordPeriodic ? `At least ${words(s.landlordPeriodic)} of notice${s.noCause ? '' : ', on a prescribed ground'}.` : 'Only on a prescribed ground.', s),
    'termination.owner_occupy_notice': rule(s.ownerOccupy, 'Owner or family moving in', s.ownerOccupy ? `At least ${words(s.ownerOccupy)} of notice.` : 'Not captured in this preview.', s, s.ownerOccupy ? 'secondary' : 'unverified'),
    'termination.sale_notice': rule(s.sale, 'Sale', s.saleNote ?? (s.sale ? `At least ${words(s.sale)} of notice.` : 'Not captured in this preview.'), s),
    'termination.tenant_periodic_notice': rule(s.tenantPeriodic, 'Tenant notice, periodic', `At least ${words(s.tenantPeriodic)} of notice.`, s),
    'fixed_term.notice_window': rule(null, 'Fixed term ending', s.fixedTermNote, s),
    'fixed_term.rolls_to_periodic': rule(true, 'What happens if nobody acts', 'The agreement continues as a periodic tenancy.', s, 'unverified'),
    'pets.response_deadline': rule(d(s.petDays), 'Answering a pet request', s.petNote, s),
    'pets.refusal_needs_grounds': rule(true, 'Refusing a pet', 'Only on the grounds the law prescribes.', s),
    'arrears.remedy_notice': rule(d(14), 'Arrears notice', 'Notice periods for unpaid rent vary by state and are not modelled in this preview.', s, 'unverified'),
    'arrears.tribunal_threshold': rule(d(s.arrearsDays ?? 14), 'Days in arrears before a notice', s.arrearsDays === null ? 'No minimum period is stated.' : `Rent must be unpaid for ${s.arrearsDays} days before a termination notice can be given.`, s, s.arrearsDays === null ? 'unverified' : 'secondary'),
    'arrears.repeat_rule': rule(null, 'Repeatedly late', 'Not modelled in this preview.', s, 'unverified'),
    'requests.minor_change_response': rule(null, 'Requests to change the home', 'Not modelled in this preview.', s, 'unverified'),
    'damage.careless_cap_weeks': rule(null, 'Careless damage', 'No statutory cap is modelled in this preview.', s, 'unverified'),
    'contract.contracting_out_void': rule(true, 'You cannot contract out of the Act', 'Terms that reduce a renter’s statutory rights have no effect.', s, 'unverified'),
    'privacy.unsuccessful_applicant_retention': rule(d(30), 'Unsuccessful applicants', 'Product default. Several states now prescribe application forms and data limits; those are not modelled yet.', s, 'unverified'),
    'records.retention_after_tenancy': rule({ n: 12, unit: 'months' }, 'Keeping records', 'Product default; state record-keeping rules are not modelled yet.', s, 'unverified'),
  }

  return {
    code: s.code,
    name: s.name,
    shortName: s.shortName,
    status: 'preview',
    version: '0.1.0-preview',
    publishedOn: V,
    currency: 'AUD',
    locale: 'en-AU',
    act: s.act,
    regulator: s.regulator,
    bondAuthority: s.bondAuthority,
    tribunal: { name: s.tribunal, url: s.regulator.url, maxClaim: null },
    salesTax: { name: 'GST', ratePct: 10, appliesToResidentialRent: false },
    emergencyNumber: '000',
    taxYearStartMonth: 7,
    safetyBufferDays: 1,
    calendar: { weekend: [0, 6], holidays: [], coveredThroughYear: 2026 },
    regionalHolidays: {},
    rules,
    service: [
      { id: 'email', label: 'Email', addWorkingDays: 0, plain: 'Service rules are not modelled in this preview.' },
      { id: 'hand', label: 'Handed to them in person', addWorkingDays: 0, plain: 'Service rules are not modelled in this preview.' },
      { id: 'post', label: 'Post', addWorkingDays: 4, plain: 'Service rules are not modelled in this preview.' },
    ],
    penalties: [],
    taxCategories: [],
    taxNotes: [],
    complianceChecks: [],
    privacyStages: [],
    petRefusalGrounds: [],
    petConditions: [],
    upcoming: s.upcoming,
  }
}

export const AU_NSW = build({
  code: 'AU-NSW',
  name: 'New South Wales',
  shortName: 'NSW',
  act: { name: 'Residential Tenancies Act 2010 (NSW)', url: 'https://www.nsw.gov.au/departments-and-agencies/fair-trading/news/changes-to-rental-laws' },
  regulator: { name: 'NSW Fair Trading', url: 'https://www.nsw.gov.au/housing-and-construction/renting-a-place-to-live' },
  bondAuthority: { name: 'Rental Bonds Online', url: 'https://www.nsw.gov.au/housing-and-construction/renting-a-place-to-live/residential-rental-bonds' },
  tribunal: 'NSW Civil and Administrative Tribunal (NCAT)',
  bondWeeks: 4,
  bondNote: 'Four weeks of rent. A bond for keeping a pet is banned.',
  lodgement: d(10, 'working_days'),
  lodgementVerified: 'unverified',
  advanceWeeks: 2,
  acceptHigherOfferAllowed: true,
  increaseNotice: d(60),
  inspectionNotice: d(7),
  inspectionNoticeMax: null,
  inspectionInterval: d(13, 'weeks'),
  inspectionNote: 'No more than four inspections in any 12 months.',
  repairsNotice: d(2),
  hours: { from: 8, to: 20 },
  noCause: false,
  noCauseNote: 'No-grounds terminations ended on 19 May 2025. Every notice needs a prescribed reason, with documents.',
  landlordPeriodic: d(90),
  ownerOccupy: d(90),
  sale: d(90),
  saleNote: '90 days for a proposed sale; 30 days once a contract requires vacant possession. Re-letting is then banned for six months.',
  tenantPeriodic: d(21),
  fixedTermNote: 'The end of a term is not a ground by itself. On a prescribed ground: 90 days, or 60 days for a term of six months or less.',
  petDays: 21,
  petNote: 'Answer within 21 days on the standard form. No answer means approved.',
  arrearsDays: 14,
  upcoming: [
    { title: 'Tenants cannot be required to pay rent through an app', effective: 'In force', summary: 'A fee-free bank transfer and Centrepay must be offered; a landlord cannot require a particular service or app. Loop’s rent collection must stay optional here.', sourceUrl: 'https://www.nsw.gov.au/housing-and-construction/renting-a-place-to-live/how-and-when-to-pay-rent' },
  ],
})

export const AU_VIC = build({
  code: 'AU-VIC',
  name: 'Victoria',
  shortName: 'VIC',
  act: { name: 'Residential Tenancies Act 1997 (Vic)', url: 'https://www.consumer.vic.gov.au/housing/renting/new-changes-to-the-rental-laws' },
  regulator: { name: 'Consumer Affairs Victoria', url: 'https://www.consumer.vic.gov.au/housing/renting' },
  bondAuthority: { name: 'Residential Tenancies Bond Authority', url: 'https://www.consumer.vic.gov.au/housing/renting/rent-bond-bills-and-condition-reports/bond/bond-amounts-and-paying-a-bond' },
  tribunal: 'VCAT, with Rental Dispute Resolution Victoria first',
  bondWeeks: 4.35,
  bondNote: 'One month of rent. No maximum where rent is above $900 a week.',
  lodgement: d(14),
  advanceWeeks: 4.35,
  advanceNote: 'One month of rent; 14 days where rent is paid weekly.',
  acceptHigherOfferAllowed: false,
  increaseNotice: d(90),
  increaseNote: 'Once every 12 months, on the prescribed form — the wrong form makes the notice invalid.',
  inspectionNotice: d(7),
  inspectionNoticeMax: null,
  inspectionInterval: d(6, 'months'),
  inspectionNote: 'Once every six months, and not in the first three months.',
  repairsNotice: d(24, 'hours'),
  hours: { from: 8, to: 18 },
  noCause: false,
  noCauseNote: 'No-reason notices were banned on 25 November 2025, including at the end of a fixed term.',
  landlordPeriodic: d(90),
  ownerOccupy: d(90),
  sale: d(90),
  tenantPeriodic: d(28),
  fixedTermNote: '90 days on a listed reason, with documentary evidence attached; the end date cannot be before the term ends.',
  petDays: 14,
  petNote: 'Answer within 14 days; refusal needs a VCAT order.',
  arrearsDays: 14,
  upcoming: [
    { title: 'Energy-efficiency minimum standards', effective: '1 March 2027, phased', summary: 'New minimum standards for heating, cooling, insulation and draught-proofing start to apply.', sourceUrl: 'https://www.consumer.vic.gov.au/housing/renting/new-changes-to-the-rental-laws' },
    { title: 'No fees to renters from platforms', effective: '31 March 2026', summary: 'No application or rent-payment fee may be charged to a renter, including by a third-party platform.', sourceUrl: 'https://www.consumer.vic.gov.au/housing/renting/new-changes-to-the-rental-laws' },
  ],
})

export const AU_QLD = build({
  code: 'AU-QLD',
  name: 'Queensland',
  shortName: 'QLD',
  act: { name: 'Residential Tenancies and Rooming Accommodation Act 2008 (Qld)', url: 'https://www.rta.qld.gov.au/forms-resources/rental-law-changes' },
  regulator: { name: 'Residential Tenancies Authority', url: 'https://www.rta.qld.gov.au/' },
  bondAuthority: { name: 'Residential Tenancies Authority', url: 'https://www.rta.qld.gov.au/starting-a-tenancy/rental-bond' },
  tribunal: 'Queensland Civil and Administrative Tribunal (QCAT)',
  bondWeeks: 4,
  bondNote: 'Four weeks of rent.',
  lodgement: d(10),
  advanceWeeks: 2,
  advanceNote: 'Two weeks for a periodic agreement; one month for a fixed term.',
  acceptHigherOfferAllowed: false,
  increaseNotice: d(2, 'months'),
  increaseNote: 'Once every 12 months — and the limit attaches to the property, not the tenancy, so a new tenant does not reset it.',
  inspectionNotice: d(7),
  inspectionNoticeMax: null,
  inspectionInterval: d(3, 'months'),
  inspectionNote: 'No more than once every three months.',
  repairsNotice: d(48, 'hours'),
  hours: null,
  noCause: false,
  noCauseNote: 'Without-grounds notices are banned for periodic agreements. Ending at the end of a fixed term is still a valid ground.',
  landlordPeriodic: d(2, 'months'),
  ownerOccupy: d(2, 'months'),
  sale: d(2, 'months'),
  tenantPeriodic: d(14),
  fixedTermNote: 'Two months of notice that the agreement will end with the term; no other ground needed.',
  petDays: 14,
  petNote: 'Answer within 14 days on a prescribed ground, or the request is taken as approved.',
  arrearsDays: 7,
  upcoming: [],
})

export const AU_WA = build({
  code: 'AU-WA',
  name: 'Western Australia',
  shortName: 'WA',
  act: { name: 'Residential Tenancies Act 1987 (WA)', url: 'https://www.consumerprotection.wa.gov.au/wa-rent-reforms' },
  regulator: { name: 'Consumer Protection WA', url: 'https://www.consumerprotection.wa.gov.au/wa-rent-reforms' },
  bondAuthority: { name: 'Bonds Administration (BondsOnline)', url: 'https://www.consumerprotection.wa.gov.au/rental-bonds' },
  tribunal: 'Magistrates Court of Western Australia',
  bondWeeks: 4,
  bondNote: 'Four weeks of rent. No maximum where rent is above $1,200 a week.',
  lodgement: d(14),
  advanceWeeks: 2,
  acceptHigherOfferAllowed: true,
  increaseNotice: d(60),
  inspectionNotice: d(7),
  inspectionNoticeMax: d(14),
  inspectionInterval: d(13, 'weeks'),
  inspectionNote: 'No more than four inspections in any 12 months.',
  repairsNotice: d(72, 'hours'),
  hours: null,
  noCause: true,
  noCauseNote: 'Still allowed. The government announced on 4 May 2026 that it will be removed; there is no Bill or start date yet.',
  landlordPeriodic: d(60),
  ownerOccupy: null,
  sale: d(30),
  saleNote: '30 days once the property has been sold; 60 days otherwise.',
  tenantPeriodic: d(21),
  fixedTermNote: '30 days of notice before the end of the term; no ground needed.',
  petDays: 14,
  petNote: 'Answer within 14 days; refusal needs the Commissioner’s approval.',
  arrearsDays: null,
  upcoming: [
    { title: 'End of no-grounds terminations', effective: 'Announced 4 May 2026 — no date', summary: 'The WA Government has announced it will remove without-grounds terminations. Rulewatch is tracking the Bill.', sourceUrl: 'https://www.consumerprotection.wa.gov.au/wa-rent-reforms' },
  ],
})

export const AU_SA = build({
  code: 'AU-SA',
  name: 'South Australia',
  shortName: 'SA',
  act: { name: 'Residential Tenancies Act 1995 (SA)', url: 'https://www.cbs.sa.gov.au/sections/renting/renting/tenancy-reforms-for-landlords-and-agents' },
  regulator: { name: 'Consumer and Business Services', url: 'https://www.cbs.sa.gov.au/sections/renting/renting/tenancy-reforms-for-landlords-and-agents' },
  bondAuthority: { name: 'Residential Bonds Online', url: 'https://www.sa.gov.au/topics/housing/renting-and-letting/renting-privately/start-of-tenancy/Rent-and-bond' },
  tribunal: 'South Australian Civil and Administrative Tribunal (SACAT)',
  bondWeeks: 4,
  bondNote: 'Four weeks of rent; six weeks where rent is above $800 a week.',
  lodgement: d(2, 'weeks'),
  advanceWeeks: 2,
  acceptHigherOfferAllowed: true,
  increaseNotice: d(60),
  inspectionNotice: d(7),
  inspectionNoticeMax: d(28),
  inspectionInterval: d(13, 'weeks'),
  inspectionNote: 'No more than four inspections in any 12 months.',
  repairsNotice: d(48, 'hours'),
  hours: null,
  noCause: false,
  noCauseNote: 'No-cause terminations ended on 1 July 2024. A prescribed ground is required.',
  landlordPeriodic: d(60),
  ownerOccupy: d(60),
  sale: d(60),
  tenantPeriodic: d(21),
  fixedTermNote: '60 days of notice on a prescribed ground to end the tenancy with the term.',
  petDays: 14,
  petNote: 'Answer within 14 days; refusal only on prescribed grounds.',
  arrearsDays: 14,
  upcoming: [],
})
