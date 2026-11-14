/**
 * The assistant ("Ask Loop" / "Ask Pool").
 *
 * In this prototype the assistant is a rules-grounded expert system, not a
 * language model: it recognises what is being asked, then answers from the
 * rule pack and the asker's own portfolio, with the calculation done by the
 * same engine the rest of the product uses. It cannot make a number up,
 * because it never writes one — it reads them.
 *
 * In production a language model sits in front of this for understanding and
 * phrasing, but stays behind the same guardrail: an answer may only state what
 * a verified rule or a taught entry supports, and it always shows its sources.
 * When nothing verified matches, the assistant says so and the question goes
 * to a person, whose answer it then knows (see `KbEntry`).
 */
import type { ID, ISODate, KbEntry, Portal } from './types'
import type { Db } from './db'
import type { JurisdictionPack, RuleKey, Verification } from './jurisdictions/types'
import { regionOf } from './jurisdictions'
import { fmtDate } from './rules/calendar'
import { calendarFor } from './rules/core'
import { arrearsState, bondCaps, bondLodgement, fixedTermWindow, inspectionWindow, planRentIncrease, planTermination, tenantLiabilityCap } from './rules/tenancy'
import { money, plural } from './rules/format'

export interface Citation {
  label: string
  citation: string
  url: string
  verified: Verification
  lastVerified: ISODate
}

export interface Answer {
  intent: string
  /** The answer in one sentence. */
  headline: string
  body: string[]
  /** Figures worked out for the asker's own properties. */
  figures: { label: string; value: string; note?: string }[]
  citations: Citation[]
  /** Where in the app to act on it. */
  next?: { label: string; to: string }
  /** Set when the answer came from a person on the team rather than the rule pack. */
  taughtBy?: string
}

export interface AskContext {
  db: Db
  pack: JurisdictionPack
  portal: Portal
  userId: ID
  orgId?: ID
  today: ISODate
}

interface Intent {
  id: string
  test: RegExp
  /** Higher wins when several match. */
  weight?: number
  answer: (ctx: AskContext, q: string) => Answer
}

const TAX_URL = 'https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-property-deductions'

function cite(pack: JurisdictionPack, ...keys: RuleKey[]): Citation[] {
  return keys.map((k) => {
    const r = pack.rules[k]
    return { label: r.label, citation: r.citation, url: r.sourceUrl, verified: r.verified, lastVerified: r.lastVerified }
  })
}

function external(label: string, citation: string, url: string, lastVerified = '2026-11-14', verified: Verification = 'primary'): Citation {
  return { label, citation, url, verified, lastVerified }
}

/** The asker's tenancies: an owner's portfolio, or the homes a renter lives in. */
function myTenancies(ctx: AskContext) {
  const live = ctx.db.tenancies.filter((t) => t.status === 'active' || t.status === 'notice_given')
  const mine = ctx.portal === 'pool' ? live.filter((t) => t.tenantIds.includes(ctx.userId)) : live.filter((t) => t.orgId === ctx.orgId)
  return mine.map((t) => {
    const property = ctx.db.properties.find((p) => p.id === t.propertyId)!
    return { t, property, cal: calendarFor(ctx.pack, regionOf(property.address.city)) }
  })
}

const INTENTS: Intent[] = [
  {
    id: 'rent_increase',
    test: /\b(rent)\b.*\b(increase|rise|raise|up|review|more)\b|\b(increase|raise|put up|lift)\b.*\brent\b/i,
    weight: 3,
    answer: (ctx) => {
      const mine = myTenancies(ctx)
      const figures = mine.map(({ t, property, cal }) => {
        const plan = planRentIncrease(ctx.pack, cal, t, { sentOn: ctx.today, method: 'email' })
        return plan.blocked
          ? { label: property.address.line1, value: 'Not during the fixed term', note: plan.blocked.fix }
          : { label: property.address.line1, value: fmtDate(plan.earliest, { year: 'always' }), note: `If notice is emailed today. Currently ${money(t.weeklyRent)} a week.` }
      })
      return {
        intent: 'rent_increase',
        headline: 'Rent can go up once every 12 months, with at least 60 days of written notice.',
        body: [
          'The 12 months run from the start of the tenancy and from the day the last increase took effect — not from when you sent the last notice. The notice must state the new rent and the day it starts.',
          'In a fixed term, rent can only rise if the agreement says so. There is no legal cap on the amount, but a tenant can ask the Tribunal to reduce rent that is well above market.',
        ],
        figures,
        citations: cite(ctx.pack, 'rent_increase.min_interval_months', 'rent_increase.notice'),
        next: ctx.portal === 'loop' ? { label: 'Open the rent review tool', to: '/loop/tenancies' } : undefined,
      }
    },
  },
  {
    id: 'bond',
    test: /\bbond\b/i,
    weight: 2,
    answer: (ctx) => {
      const mine = myTenancies(ctx)
      const figures: Answer['figures'] = mine
        .filter(({ t }) => t.bond.receivedOn && !t.bond.lodgedOn)
        .map(({ t, property, cal }) => {
          const b = bondLodgement(ctx.pack, cal, t.bond.receivedOn!, undefined, ctx.today)
          return { label: property.address.line1, value: `Lodge by ${fmtDate(b.deadline)}`, note: b.workingDaysLeft >= 0 ? `${plural(b.workingDaysLeft, 'working day')} left` : 'Overdue' }
        })
      const sample = mine[0]
      if (sample) {
        const caps = bondCaps(ctx.pack, sample.t.weeklyRent)
        figures.push({ label: `Most you can hold at ${money(sample.t.weeklyRent)} a week`, value: money(caps.general), note: caps.pet ? `Plus a pet bond of up to ${money(caps.pet)}` : undefined })
      }
      return {
        intent: 'bond',
        headline: 'A bond is at most four weeks of rent, and must be lodged within 23 working days of receiving it.',
        body: [
          'Lodgement is online through Bond Hub — paper forms stopped being accepted on 29 June 2026. Working days leave out weekends, public holidays, the Nelson anniversary day here, and 24 December to 3 January.',
          'If you agree to a pet you can also take a pet bond of up to two weeks of rent. Not lodging a bond on time is an unlawful act, with exemplary damages of up to $1,500.',
          'When a tenant on the bond changes, it is a change of tenant on the existing bond in Bond Hub, not a refund and a new bond.',
        ],
        figures,
        citations: cite(ctx.pack, 'bond.max_weeks', 'bond.lodgement_deadline', 'bond.pet_max_weeks'),
        next: ctx.portal === 'loop' ? { label: 'See your bonds', to: '/loop/tenancies' } : undefined,
      }
    },
  },
  {
    id: 'inspection',
    test: /\binspect/i,
    weight: 2,
    answer: (ctx) => {
      const figures = myTenancies(ctx).map(({ t, property, cal }) => {
        const last = ctx.db.inspections.filter((i) => i.tenancyId === t.id && i.status === 'completed').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
        const w = inspectionWindow(ctx.pack, cal, { sentOn: ctx.today, method: 'email' }, last?.completedAt?.slice(0, 10))
        return { label: property.address.line1, value: `From ${fmtDate(w.earliest)}`, note: w.latest ? `If notice is emailed today; that notice is good until ${fmtDate(w.latest)}.` : undefined }
      })
      return {
        intent: 'inspection',
        headline: 'An inspection needs 48 hours to 14 days of notice, between 8 am and 7 pm, and no more than once in four weeks.',
        body: [
          'The notice has to name the day. The 48 hours run from when the tenant receives it — an email after 5 pm counts from the next working day.',
          'The law sets the maximum frequency; your insurer usually sets the minimum, commonly every three or six months. Check your policy.',
        ],
        figures,
        citations: cite(ctx.pack, 'entry.inspection_notice_min', 'entry.inspection_notice_max', 'entry.inspection_min_interval', 'entry.hours'),
        next: ctx.portal === 'loop' ? { label: 'Schedule an inspection', to: '/loop/inspections' } : undefined,
      }
    },
  },
  {
    id: 'viewings',
    test: /\b(show|viewing|open home|buyer|purchaser|prospective|valuer|agent)\b/i,
    weight: 2,
    answer: (ctx) => ({
      intent: 'viewings',
      headline: 'Showing a tenanted home to buyers or new tenants needs the tenant’s consent — notice is not enough.',
      body: [
        'This catches many landlords out. Inspections and repairs run on notice; viewings run on consent. The tenant cannot unreasonably refuse and may set reasonable conditions, such as times or being present.',
        'You must also tell the tenant in writing as soon as the home goes on the market.',
      ],
      figures: [],
      citations: cite(ctx.pack, 'entry.repairs_notice_min'),
    }),
  },
  {
    id: 'entry',
    test: /\b(enter|entry|access|let myself in|come (in|over|round)|turn up)\b|\brepairs?\b.*\bnotice\b/i,
    answer: (ctx) => ({
      intent: 'entry',
      headline: 'Repairs need 24 hours of notice; emergencies need none; everything else needs the notice the Act sets or the tenant’s consent.',
      body: [
        'Necessary repairs and maintenance: at least 24 hours, with the reason, between 8 am and 7 pm. Healthy homes and smoke alarm work is the same. A routine inspection is 48 hours to 14 days.',
        'If the tenant freely agrees at the time, you do not need notice at all. Entering without either is an unlawful act — up to $1,500.',
      ],
      figures: [],
      citations: cite(ctx.pack, 'entry.repairs_notice_min', 'entry.inspection_notice_min', 'entry.hours'),
    }),
  },
  {
    id: 'fixed_term',
    test: /\bfixed[- ]?term\b|\blease\b.*\b(end|expir|renew|run out)|\brenew/i,
    weight: 3,
    answer: (ctx) => {
      const figures = myTenancies(ctx)
        .filter(({ t }) => t.type === 'fixed' && t.endDate)
        .map(({ t, property, cal }) => {
          const w = fixedTermWindow(ctx.pack, cal, t.endDate!, ctx.today)!
          return { label: property.address.line1, value: `Ends ${fmtDate(t.endDate!, { year: 'always' })}`, note: w.status === 'open' ? `Notice window is open until ${fmtDate(w.closes)}.` : w.status === 'not_open' ? `Notice window opens ${fmtDate(w.opens)}.` : 'The window has closed: it will roll on as a periodic tenancy.' }
        })
      return {
        intent: 'fixed_term',
        headline: 'A fixed term rolls into a periodic tenancy unless someone gives notice between 90 and 21 days before it ends.',
        body: [
          'Either side can give that notice and no reason is needed. It must land inside the window — given too early it does not count, just as it does not if it is too late. You can also agree to renew or extend before the end date.',
          'A fixed term cannot otherwise be ended early by notice. It ends early only by agreement, or by the Tribunal for serious hardship.',
        ],
        figures,
        citations: cite(ctx.pack, 'fixed_term.notice_window', 'fixed_term.rolls_to_periodic'),
        next: ctx.portal === 'loop' ? { label: 'See your tenancies', to: '/loop/tenancies' } : undefined,
      }
    },
  },
  {
    id: 'ending',
    test: /\b(end|ending|terminat|evict|kick|get (them|the tenant|him|her) out|move (them|the tenant) out|notice period|give notice|notice to (quit|vacate|leave))\b/i,
    weight: 2,
    answer: (ctx) => {
      const send = { sentOn: ctx.today, method: 'email' as const }
      const figures = myTenancies(ctx)
        .filter(({ t }) => t.type === 'periodic')
        .slice(0, 3)
        .map(({ t, property, cal }) => {
          const p = planTermination(ctx.pack, cal, t, ctx.portal === 'pool' ? 'tenant' : 'no_cause', send)
          return { label: property.address.line1, value: fmtDate(p.endsOn, { year: 'always' }), note: `Earliest end date if ${ctx.portal === 'pool' ? 'you give' : 'a 90-day'} notice ${ctx.portal === 'pool' ? '' : 'is emailed '}today.` }
        })
      return {
        intent: 'ending',
        headline: 'A periodic tenancy: 90 days from the landlord, 42 days if the home is sold or the owner is moving in, 21 days from the tenant.',
        body: [
          'The 42-day grounds have conditions. A sale counts only once there is an unconditional agreement requiring vacant possession. Moving in means the owner or their family living there within 90 days, for at least 90 days. A notice shorter than 90 days must state its reason.',
          'Notice cannot be retaliation for a tenant raising a problem, and using a ground that is not true is an unlawful act — each up to $6,500. Only one notice can stand at a time.',
          'The clock starts the day after the notice is received, and ends at the close of the last day.',
        ],
        figures,
        citations: cite(ctx.pack, 'termination.landlord_periodic_notice', 'termination.owner_occupy_notice', 'termination.sale_notice', 'termination.tenant_periodic_notice'),
        next: ctx.portal === 'loop' ? { label: 'Open the notice builder', to: '/loop/tenancies' } : undefined,
      }
    },
  },
  {
    id: 'pets',
    test: /\b(pets?|dogs?|cats?|puppy|kitten|animals?)\b/i,
    weight: 3,
    answer: (ctx) => ({
      intent: 'pets',
      headline: 'A landlord must answer a written pet request within 21 days and can refuse only on reasonable grounds.',
      body: [
        'The answer has to be in writing and say yes, yes with conditions, or no with the grounds. Reasonable grounds include a home that is unsuitable, a body corporate rule, or an animal that is unsuitable or dangerous. A blanket “no pets” is not a ground.',
        'Reasonable conditions include a pet bond of up to two weeks of rent, restraining the pet during lawful entry, and professional carpet cleaning at the end if the pet lives inside.',
        'Silence is not consent — but not answering is an unlawful act (up to $1,500). A tenant is fully liable for damage their pet causes; the usual cap on careless damage does not apply.',
      ],
      figures: ctx.db.variations
        .filter((v) => v.type === 'pet_request' && v.status === 'awaiting_landlord' && v.respondBy && (ctx.portal === 'pool' ? true : v.orgId === ctx.orgId))
        .slice(0, 2)
        .map((v) => ({ label: v.summary, value: `Answer by ${fmtDate(v.respondBy!)}` })),
      citations: cite(ctx.pack, 'pets.response_deadline', 'pets.refusal_needs_grounds', 'bond.pet_max_weeks'),
      next: ctx.portal === 'loop' ? { label: 'Respond to requests', to: '/loop/tenancies' } : { label: 'Your requests', to: '/pool' },
    }),
  },
  {
    id: 'late_fee',
    test: /\b(late fee|late charge|penalt|interest on (late|overdue)|fine (them|the tenant))\b/i,
    weight: 4,
    answer: (ctx) => ({
      intent: 'late_fee',
      headline: 'No. A late fee or penalty for overdue rent has no legal effect.',
      body: ['A clause that makes a tenant pay a set sum, extra rent or interest for breaching the agreement is of no effect. The lawful route for overdue rent is a notice to remedy and, if it comes to it, the Tribunal.'],
      figures: [],
      citations: cite(ctx.pack, 'arrears.remedy_notice', 'contract.contracting_out_void'),
    }),
  },
  {
    id: 'arrears',
    test: /\b(arrears|behind|overdue|late|not paid|hasn'?t paid|missed|owes?|owing|stopped paying)\b/i,
    answer: (ctx) => {
      const figures = myTenancies(ctx)
        .map(({ t, property, cal }) => ({ property, a: arrearsState(ctx.pack, cal, t, ctx.today) }))
        .filter((x) => x.a.daysLate > 0)
        .map(({ property, a }) => ({ label: property.address.line1, value: `${money(a.owed)} · ${plural(a.daysLate, 'day')} late`, note: a.atTribunalThreshold ? 'At the 21-day Tribunal threshold.' : `Reaches 21 days on ${fmtDate(a.tribunalOn)}.` }))
      return {
        intent: 'arrears',
        headline: 'Talk first, then a 14-day notice to remedy; at 21 days behind, the Tribunal must end the tenancy unless the rent is caught up.',
        body: [
          'Day one: a friendly call. Most late payments are a bank delay or a changed pay day, and the conversation is worth more than the notice.',
          'From any day the rent is overdue you can give a notice to remedy, allowing at least 14 days. You do not need to wait, and there is no minimum amount.',
          'If rent is five or more working days late three times in 90 days, and you gave written notice each time, you can apply to end a periodic tenancy within 28 days of the third notice.',
          'You cannot charge late fees, change the locks, or take the tenant’s belongings.',
        ],
        figures,
        citations: cite(ctx.pack, 'arrears.remedy_notice', 'arrears.tribunal_threshold', 'arrears.repeat_rule'),
        next: ctx.portal === 'loop' ? { label: 'Open the rent ledger', to: '/loop/money' } : undefined,
      }
    },
  },
  {
    id: 'damage',
    test: /\b(damage|broke|broken|smashed|stain|hole|who pays|liable|liability|wear and tear|accident)\b/i,
    answer: (ctx) => {
      const figures = myTenancies(ctx)
        .slice(0, 3)
        .map(({ t, property }) => {
          const cap = tenantLiabilityCap(ctx.pack, 'careless', t.weeklyRent, { insured: Boolean(property.insurance.insurer), excess: property.insurance.excess })
          return { label: property.address.line1, value: cap.cap === null ? 'No cap' : `Up to ${money(cap.cap)}`, note: 'For careless damage.' }
        })
      return {
        intent: 'damage',
        headline: 'Fair wear and tear is never the tenant’s cost. Careless damage is capped; intentional and pet damage are not.',
        body: [
          'For careless damage a tenant owes at most the lesser of the landlord’s insurance excess and four weeks of rent. That is why the agreement has to state the excess.',
          'Asking a tenant for more than the cap is itself an unlawful act (up to $1,800). The landlord has to show the damage is more than wear and tear; the tenant has to show it was not careless.',
        ],
        figures,
        citations: cite(ctx.pack, 'damage.careless_cap_weeks'),
        next: ctx.portal === 'loop' ? { label: 'See repairs', to: '/loop/repairs' } : { label: 'Your repairs', to: '/pool/repairs' },
      }
    },
  },
  {
    id: 'healthy_homes',
    test: /\b(healthy homes?|heating|heater|heat pump|insulation|ventilation|extractor|draught|draft|moisture|mould|mold|damp)\b/i,
    answer: (ctx) => ({
      intent: 'healthy_homes',
      headline: 'Every rental must meet five standards from day one of a tenancy: heating, insulation, ventilation, moisture and drainage, and draught stopping.',
      body: [
        'Heating: a fixed heater that can keep the main living room at 18 °C — at least 1.5 kW, sized with the official heating tool. Insulation: ceiling R 2.9 here (R 3.3 in the coldest zone) and underfloor R 1.3, or older ceiling insulation at least 120 mm thick.',
        'Ventilation: opening windows in living spaces, and extractor fans ducted outside in kitchens and bathrooms. Moisture: working gutters and drains, and a ground moisture barrier under an enclosed subfloor. Draughts: no unreasonable gaps; unused fireplaces blocked.',
        'A signed compliance statement goes in every new, renewed or varied agreement. A breach can cost up to $7,200.',
      ],
      figures: [],
      citations: [
        external('Healthy homes standards', 'Residential Tenancies (Healthy Homes Standards) Regulations 2019', 'https://www.tenancy.govt.nz/healthy-homes/healthy-homes-compliance/'),
        external('Heating assessment tool', 'Tenancy Services', 'https://www.tenancy.govt.nz/heating-tool/'),
      ],
      next: ctx.portal === 'loop' ? { label: 'Check your properties', to: '/loop/properties' } : undefined,
    }),
  },
  {
    id: 'smoke_alarms',
    test: /\bsmoke (alarm|detector)/i,
    weight: 4,
    answer: () => ({
      intent: 'smoke_alarms',
      headline: 'A working smoke alarm within 3 metres of every bedroom door, and at least one on every level.',
      body: [
        'The landlord must make sure they work at the start of each tenancy. New alarms must be photoelectric with a long-life battery (or hard-wired). The tenant replaces ordinary batteries and must not remove or disable an alarm.',
        'Checking them needs 24 hours of notice like any repair. Log each test — it is the first thing an insurer or the Tribunal asks for.',
      ],
      figures: [],
      citations: [external('Smoke alarms', 'Residential Tenancies (Smoke Alarms) Regulations 2016', 'https://www.tenancy.govt.nz/maintenance-and-inspections/smoke-alarms/')],
    }),
  },
  {
    id: 'tax_interest',
    test: /\binterest\b.*\b(deduct|claim|tax)|\b(deduct|claim)\b.*\binterest\b/i,
    weight: 5,
    answer: () => ({
      intent: 'tax_interest',
      headline: 'Yes — mortgage interest on a residential rental is fully deductible again from 1 April 2025.',
      body: [
        'It was limited to 80% for the 2024–25 year and is 100% for 2025–26 and 2026–27. Only the interest counts; repaying principal is never an expense.',
        'A loss on a rental is ring-fenced: it carries forward against future rental income rather than reducing tax on your wages. This is general information, not tax advice.',
      ],
      figures: [],
      citations: [external('Residential rental property deductions', 'Inland Revenue', TAX_URL)],
    }),
  },
  {
    id: 'tax',
    test: /\b(tax|deduct|claim|ir3r|depreciat|gst|bright[- ]?line|accountant)\b/i,
    answer: (ctx) => ({
      intent: 'tax',
      headline: 'Rent is income; rates, insurance, interest, repairs, and agent and platform fees are deductible. Improvements are not.',
      body: [
        'The rental schedule (IR3R) has a line for each: rents, rates, insurance, interest, agent fees, repairs and maintenance, other, and depreciation on chattels. Buildings depreciate at 0%.',
        'A repair restores what was there. Making it better — a heat pump where there was none, a new deck — is an improvement and is added to the cost of the property instead. Residential rent has no GST. The bright-line period is two years.',
        'Every ledger line in Loop is already filed under the right IR3R line. This is general information, not tax advice.',
      ],
      figures: [],
      citations: [external('Residential rental income', 'Inland Revenue', 'https://www.ird.govt.nz/property/renting-out-residential-property/residential-rental-income-and-paying-tax-on-it'), external('Deductions', 'Inland Revenue', TAX_URL)],
      next: ctx.portal === 'loop' ? { label: 'Open the tax pack', to: '/loop/money' } : undefined,
    }),
  },
  {
    id: 'selling',
    test: /\b(sell|selling|sale|sold|on the market)\b/i,
    weight: 2,
    answer: (ctx) => ({
      intent: 'selling',
      headline: 'You can sell with a tenant in place. To get vacant possession of a periodic tenancy: 42 days of notice, once the sale is unconditional.',
      body: [
        'Tell the tenant in writing as soon as the home goes on the market. Viewings and open homes need their consent. A fixed term stays in force — the buyer takes it over.',
        'The 42-day notice is only available once there is an unconditional agreement that requires vacant possession. Before that, the notice is 90 days.',
      ],
      figures: [],
      citations: cite(ctx.pack, 'termination.sale_notice', 'termination.landlord_periodic_notice'),
    }),
  },
  {
    id: 'assignment',
    test: /\b(flatmates?|assign|sublet|sub-let|swap|add (a |another )?(tenant|person|name)|remove (a |my )?(tenant|flatmate|name)|moving out|take over)\b/i,
    answer: (ctx) => ({
      intent: 'assignment',
      headline: 'A tenant can pass on their tenancy with the landlord’s written consent, which cannot be unreasonably refused.',
      body: [
        'A clause banning assignment has no effect. The landlord must answer a written request within a reasonable time and can recover only itemised, reasonable costs — not a flat fee.',
        'Swapping one flatmate for another is done as a signed variation, plus a change of tenant on the bond in Bond Hub.',
      ],
      figures: [],
      citations: cite(ctx.pack, 'contract.contracting_out_void'),
      next: ctx.portal === 'loop' ? { label: 'Start a variation', to: '/loop/tenancies' } : { label: 'Make a request', to: '/pool' },
    }),
  },
  {
    id: 'bidding',
    test: /\b(bid|bidding|offer (more|above|over)|higher offer|above (the )?(asking|advertised)|outbid)\b/i,
    weight: 4,
    answer: (ctx) => ({
      intent: 'bidding',
      headline: 'A listing must state one rent, and a landlord may not invite anyone to offer more.',
      body: [
        'The law bans inviting or encouraging bids; it does not stop a renter from offering more unprompted. Pool goes further: applications are at the advertised rent, with no field to offer above it, so nobody is ever outbid on price.',
      ],
      figures: [],
      citations: cite(ctx.pack, 'listing.fixed_price_required', 'listing.bidding_banned'),
    }),
  },
  {
    id: 'privacy',
    test: /\b(applicants?|application|bank statements?|credit check|references?|referee|what can i (ask|collect)|background check|privacy|payslip|proof of income)\b/i,
    answer: (ctx) => ({
      intent: 'privacy',
      headline: 'Collect in stages: contact details to view, identity and referees to apply, and checks only for the applicant you intend to choose.',
      body: [
        ...ctx.pack.privacyStages.map((s) => `${s.stage}: ${s.mayCollect.join(', ').toLowerCase()}.`),
        'Never ask for bank statements showing transactions, employment history, social media, or anything about age, family, ethnicity, religion or disability. Unsuccessful applicants’ details are deleted after 30 days.',
      ],
      figures: [],
      citations: [external('Rental guidance for landlords', 'Office of the Privacy Commissioner', 'https://www.privacy.org.nz/resources-and-learning/a-z-topics/rental-guidance-for-landlords/'), ...cite(ctx.pack, 'privacy.unsuccessful_applicant_retention')],
    }),
  },
  {
    id: 'tribunal',
    test: /\b(tribunal|dispute|mediation|mediator|hearing|take (them|me) to)\b/i,
    answer: (ctx) => ({
      intent: 'tribunal',
      headline: 'The Tenancy Tribunal hears claims up to $100,000. It costs $29 to apply and most cases start with mediation.',
      body: [
        'If you and the other person already agree on a repayment plan, FastTrack Resolution turns it into an enforceable order without a hearing.',
        'Everything you file is shown to the other side. You may remove personal details that have nothing to do with the dispute; Loop’s Tribunal pack does this for you. Decisions are published online, and a party who substantially wins can ask for their name to be suppressed.',
      ],
      figures: [],
      citations: [external('Tenancy Tribunal', 'Ministry of Justice', ctx.pack.tribunal.url), external('Applications to the Tribunal', 'Practice Direction 4/2026', 'https://www.justice.govt.nz/tribunals/tenancy/practice/')],
    }),
  },
  {
    id: 'advance',
    test: /\b(in advance|up ?front|ahead)\b/i,
    answer: (ctx) => ({
      intent: 'advance',
      headline: 'No more than two weeks of rent can be asked for in advance.',
      body: ['Nor can the next payment be required before the period already paid for has run out. Monthly-in-advance rent is not lawful for a residential tenancy.'],
      figures: [],
      citations: cite(ctx.pack, 'rent.in_advance_max_weeks'),
    }),
  },
  {
    id: 'meth',
    test: /\b(meth|methamphetamine|contaminat|\bp\b lab)\b/i,
    weight: 3,
    answer: () => ({
      intent: 'meth',
      headline: 'A home testing above 15 µg per 100 cm² is contaminated; above 30 it is uninhabitable.',
      body: [
        'Regulations in force since 16 April 2026 set the levels. Testing needs 48 hours to 14 days of notice, and the tenant must be given the results in writing within 7 days.',
        'Above the uninhabitable level a tenant can end the tenancy on 2 days of notice and a landlord on 7. A landlord must not let a home they know is contaminated.',
      ],
      figures: [],
      citations: [external('Methamphetamine contamination', 'Residential Tenancies (Managing Methamphetamine Contamination) Regulations 2026', 'https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2026/24/en/latest/')],
    }),
  },
  {
    id: 'working_days',
    test: /\b(working days?|business days?|christmas|public holiday|easter|weekend)\b/i,
    answer: (ctx) => ({
      intent: 'working_days',
      headline: 'Tenancy law has its own working days: no weekends, no public holidays, nothing from 24 December to 3 January.',
      body: [
        'Also excluded: Good Friday through to the Tuesday after Easter, and the anniversary day of the province the home is in. Only Waitangi Day and Anzac Day shift to a Monday when they fall on a weekend.',
        'Notice periods are counted in ordinary days. Working days matter for how long a posted or letterbox notice takes to arrive, and for the 23 days to lodge a bond.',
      ],
      figures: [],
      citations: [external('Meaning of “working day”', 'RTA 1986, s 2(1)', `${ctx.pack.act.url}#DLM94283`)],
    }),
  },
  {
    id: 'pricing',
    test: /\b(price|pricing|cost|plan|subscription|how much (is|does) (loop|pool|this)|free)\b/i,
    answer: (ctx) => ({
      intent: 'pricing',
      headline: 'Pool is free for renters. Loop is free for one property, $25 a month for the full engine, or $79 for trusts and portfolios.',
      body: [
        'Ledger Free tracks rent and reminds you of every legal date. Autopilot Pro adds notices, variations, the sinking fund and the tax pack, at $15 for each extra property. Physical jobs are priced per job: $85 for an inspection, $65 for a viewing, $140 for an entry or exit report.',
        'Loop never holds your rent. It reads your own bank feed; the money stays in your account.',
      ],
      figures: [],
      citations: [],
      next: ctx.portal === 'loop' ? { label: 'See your plan', to: '/loop/settings' } : undefined,
    }),
  },
]

function fromKb(kb: KbEntry[], q: string, portal: Portal): Answer | null {
  const text = q.toLowerCase()
  const hit = kb.filter((k) => k.portal === 'both' || k.portal === portal).find((k) => k.keywords.some((w) => text.includes(w.toLowerCase())))
  if (!hit) return null
  return {
    intent: `kb:${hit.id}`,
    headline: hit.answer.split('. ')[0] + '.',
    body: [hit.answer.split('. ').slice(1).join('. ')].filter(Boolean),
    figures: [],
    citations: hit.citation && hit.sourceUrl ? [external(hit.question, hit.citation, hit.sourceUrl, hit.taughtAt.slice(0, 10), 'secondary')] : [],
    taughtBy: hit.taughtBy,
  }
}

/** Answers a question, or returns `null` when nothing verified matches — which the caller must say plainly. */
export function ask(question: string, ctx: AskContext): Answer | null {
  const q = question.trim()
  if (q.length < 3) return null
  // An answer a person on the team wrote for this exact topic beats a general built-in one.
  const taught = fromKb(ctx.db.kb, q, ctx.portal)
  if (taught) return taught
  const scored = INTENTS.filter((i) => i.test.test(q)).sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
  return scored.length ? scored[0].answer(ctx, q) : null
}

/** Opening questions, led by whatever is actually pressing for this person. */
export function suggestedQuestions(ctx: AskContext): string[] {
  const out: string[] = []
  const mine = myTenancies(ctx)
  if (ctx.portal === 'loop') {
    if (mine.some(({ t }) => t.bond.receivedOn && !t.bond.lodgedOn)) out.push('How long do I have to lodge a bond?')
    if (mine.some(({ t, cal }) => arrearsState(ctx.pack, cal, t, ctx.today).daysLate > 0)) out.push('A tenant is late with rent — what do I do?')
    if (ctx.db.variations.some((v) => v.orgId === ctx.orgId && v.type === 'pet_request' && v.status === 'awaiting_landlord')) out.push('Can I say no to a pet?')
    if (mine.some(({ t }) => t.type === 'fixed')) out.push('What happens when a fixed term ends?')
    out.push('When can I next increase the rent?', 'Do I need permission to show buyers through?', 'Is mortgage interest deductible?', 'What can I ask an applicant for?')
  } else {
    out.push('Can my landlord say no to a cat?', 'How much notice for an inspection?', 'Who pays if something gets damaged?', 'Can I be charged a late fee?', 'How much notice do I give to move out?', 'What happens when my fixed term ends?')
  }
  return out.slice(0, 6)
}
