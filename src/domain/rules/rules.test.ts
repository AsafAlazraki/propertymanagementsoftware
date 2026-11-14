import { describe, expect, it } from 'vitest'
import { NZ } from '../jurisdictions/nz'
import { PACKS, resolvePack } from '../jurisdictions'
import { addMonths, addWorkingDays, isWorkingDay, weekday, workingDaysBetween } from './calendar'
import { calendarFor, deemedReceived, latestSendDate } from './core'
import {
  arrearsState,
  bondCaps,
  bondLodgement,
  checkBond,
  checkInspectionSlot,
  checkPetRefusal,
  checkTenantInvoice,
  fixedTermWindow,
  inspectionWindow,
  petRespondBy,
  planRentIncrease,
  planTermination,
  tenantLiabilityCap,
} from './tenancy'
import { parseAdvertisedRent, redact, scanClause, checkRentOffer } from './text'

const national = calendarFor(NZ)
const nelson = calendarFor(NZ, 'nelson')

describe('working days under the Residential Tenancies Act', () => {
  it('excludes 24 December to 3 January, not the longer period other Acts use', () => {
    expect(isWorkingDay('2026-12-23', national)).toBe(true)
    expect(isWorkingDay('2026-12-24', national)).toBe(false)
    expect(isWorkingDay('2026-12-31', national)).toBe(false)
    // Sunday 3 January 2027 is excluded twice over; Tuesday 5 January is a working day.
    expect(isWorkingDay('2027-01-03', national)).toBe(false)
    expect(isWorkingDay('2027-01-05', national)).toBe(true)
    expect(isWorkingDay('2027-01-15', national)).toBe(true)
  })

  it('treats Easter Tuesday as a non-working day', () => {
    expect(weekday('2026-04-07')).toBe(2)
    expect(isWorkingDay('2026-04-03', national)).toBe(false) // Good Friday
    expect(isWorkingDay('2026-04-06', national)).toBe(false) // Easter Monday
    expect(isWorkingDay('2026-04-07', national)).toBe(false) // Easter Tuesday
    expect(isWorkingDay('2026-04-08', national)).toBe(true)
  })

  it('Mondayises Anzac Day and Waitangi Day', () => {
    expect(isWorkingDay('2026-04-27', national)).toBe(false) // Anzac Day fell on a Saturday
    expect(isWorkingDay('2027-02-08', national)).toBe(false) // Waitangi Day fell on a Saturday
  })

  it('counts the provincial anniversary only in its own area', () => {
    expect(isWorkingDay('2026-02-02', national)).toBe(true)
    expect(isWorkingDay('2026-02-02', nelson)).toBe(false)
  })

  it('counts working days the way a deadline is counted: day one is the next working day', () => {
    expect(addWorkingDays('2026-11-13', 1, national)).toBe('2026-11-16') // Friday → Monday
    expect(workingDaysBetween('2026-11-13', '2026-11-20', national)).toBe(5)
  })
})

describe('service of notices (s 136)', () => {
  it("matches Tenancy Services' worked example: posted Mon 22 Dec, received Wed 7 Jan", () => {
    expect(weekday('2025-12-22')).toBe(1)
    const served = deemedReceived(NZ, national, '2025-12-22', 'post')
    expect(served.received).toBe('2026-01-07')
  })

  it('treats a letterbox delivery as received on the second working day', () => {
    expect(deemedReceived(NZ, national, '2026-11-13', 'letterbox').received).toBe('2026-11-17')
  })

  it('rolls an email sent after 5 pm to the next working day', () => {
    expect(deemedReceived(NZ, national, '2026-11-13', 'email', 10).received).toBe('2026-11-13')
    expect(deemedReceived(NZ, national, '2026-11-13', 'email', 17).received).toBe('2026-11-16')
    expect(deemedReceived(NZ, national, '2026-11-13', 'email', 16).received).toBe('2026-11-13')
  })

  it('rolls an email sent on a weekend to the next working day, and marks that as policy', () => {
    const served = deemedReceived(NZ, national, '2026-11-14', 'email', 10)
    expect(served.received).toBe('2026-11-16')
    expect(served.steps.some((s) => s.policy)).toBe(true)
  })

  it('finds the last day a notice can be sent and still land in time', () => {
    // Must be received by Mon 16 Nov: by post, four working days earlier is Tue 10 Nov.
    expect(latestSendDate(NZ, national, '2026-11-16', 'post')).toBe('2026-11-10')
    expect(latestSendDate(NZ, national, '2026-11-16', 'email')).toBe('2026-11-16')
  })
})

describe('bond', () => {
  it('caps the bond at four weeks and the pet bond at two', () => {
    expect(bondCaps(NZ, 580)).toEqual({ general: 2320, pet: 1160 })
    expect(checkBond(NZ, 580, 2320, 1160).ok).toBe(true)
    expect(checkBond(NZ, 580, 2400).ok).toBe(false)
    expect(checkBond(NZ, 580, 2320, 1200).ok).toBe(false)
  })

  it('gives 23 working days to lodge, counted from the day after receipt', () => {
    const b = bondLodgement(NZ, nelson, '2026-10-23', undefined, '2026-11-14')
    // 23 Oct is a Friday; Labour Day (Mon 26 Oct) is not a working day.
    expect(b.deadline).toBe('2026-11-26')
    expect(b.workingDaysUsed).toBe(14)
    expect(b.workingDaysLeft).toBe(9)
    expect(b.status).toBe('on_track')
    // A week later there are four working days left, which is inside the alert band.
    expect(bondLodgement(NZ, nelson, '2026-10-23', undefined, '2026-11-20').status).toBe('due_soon')
    expect(bondLodgement(NZ, nelson, '2026-10-23', undefined, '2026-11-24').status).toBe('urgent')
  })

  it('reports an overdue bond as overdue, and a lodged one as lodged', () => {
    expect(bondLodgement(NZ, nelson, '2026-09-01', undefined, '2026-11-14').status).toBe('overdue')
    expect(bondLodgement(NZ, nelson, '2026-09-01', '2026-09-10', '2026-11-14').status).toBe('lodged')
  })
})

describe('rent increases (s 24)', () => {
  const periodic = { startDate: '2025-03-10', lastRentIncrease: '2025-10-15', type: 'periodic' as const }

  it('needs 60 days of notice from the day it is received', () => {
    const plan = planRentIncrease(NZ, national, { ...periodic, lastRentIncrease: '2025-06-01' }, { sentOn: '2026-11-16', method: 'email', hour: 10 })
    // 16 Nov + 60 days = 15 Jan; plus Loop's one-day margin.
    expect(plan.received).toBe('2026-11-16')
    expect(plan.earliest).toBe('2027-01-16')
  })

  it('cannot take effect inside 12 months of the last increase, however early notice is given', () => {
    const plan = planRentIncrease(NZ, national, { ...periodic, lastRentIncrease: '2026-06-01' }, { sentOn: '2026-11-16', method: 'email' })
    expect(plan.gate).toBe(addMonths('2026-06-01', 12))
    expect(plan.earliest).toBe('2027-06-01')
  })

  it('is refused in a fixed term with no review clause', () => {
    const plan = planRentIncrease(NZ, national, { startDate: '2026-02-01', type: 'fixed', endDate: '2027-01-31' }, { sentOn: '2026-11-16', method: 'email' })
    expect(plan.blocked?.ok).toBe(false)
    expect(plan.blocked?.reason).toMatch(/fixed-term/)
  })
})

describe('entry (s 48)', () => {
  it('opens an inspection window from 48 hours to 14 days after the notice is received', () => {
    const w = inspectionWindow(NZ, national, { sentOn: '2026-11-16', method: 'email', hour: 9 })
    expect(w.earliest).toBe('2026-11-18')
    expect(w.latest).toBe('2026-11-30')
  })

  it('refuses a second inspection inside four weeks, and entry outside 8 am to 7 pm', () => {
    const w = inspectionWindow(NZ, national, { sentOn: '2026-11-16', method: 'email', hour: 9 }, '2026-11-02')
    expect(w.gate).toBe('2026-11-30')
    expect(checkInspectionSlot(NZ, w, '2026-11-20', 10).ok).toBe(false)
    expect(checkInspectionSlot(NZ, w, '2026-11-30', 10).ok).toBe(true)
    expect(checkInspectionSlot(NZ, w, '2026-11-30', 19).ok).toBe(false)
    expect(checkInspectionSlot(NZ, w, '2026-11-30', 7).ok).toBe(false)
  })
})

describe('ending a tenancy (ss 51, 60A, 136A)', () => {
  const periodic = { type: 'periodic' as const }

  it("matches Tenancy Services' example: a 21-day notice received Thu 7 Aug ends Thu 28 Aug", () => {
    const plan = planTermination(NZ, national, periodic, 'tenant', { sentOn: '2025-08-07', method: 'hand' })
    expect(plan.endsOn).toBe('2025-08-28')
  })

  it('gives 90 days without a reason and 42 for a sale or the owner moving in', () => {
    const send = { sentOn: '2026-11-16', method: 'email' as const, hour: 10 }
    expect(planTermination(NZ, national, periodic, 'no_cause', send).noticeDays).toBe(90)
    expect(planTermination(NZ, national, periodic, 'sale', send).noticeDays).toBe(42)
    const owner = planTermination(NZ, national, periodic, 'owner_occupy', send)
    expect(owner.noticeDays).toBe(42)
    expect(owner.conditions.length).toBeGreaterThan(0)
    // 16 Nov + 42 days = 28 Dec, plus Loop's one-day margin.
    expect(owner.endsOn).toBe('2026-12-29')
  })

  it('refuses a second notice while one stands, and any notice part-way through a fixed term', () => {
    const send = { sentOn: '2026-11-16', method: 'email' as const }
    const second = planTermination(NZ, national, { type: 'periodic', noticeGiven: { by: 'landlord', on: '2026-11-01', ground: 'no_cause', endsOn: '2027-02-01' } }, 'sale', send)
    expect(second.blocked?.ok).toBe(false)
    expect(planTermination(NZ, national, { type: 'fixed', endDate: '2027-03-01' }, 'no_cause', send).blocked?.ok).toBe(false)
  })

  it('opens the fixed-term notice window 90 days before the end and closes it 21 days before', () => {
    const w = fixedTermWindow(NZ, national, '2027-01-28', '2026-11-14')
    expect(w?.opens).toBe('2026-10-30')
    expect(w?.closes).toBe('2027-01-07')
    expect(w?.status).toBe('open')
    expect(fixedTermWindow(NZ, national, '2027-06-30', '2026-11-14')?.status).toBe('not_open')
    expect(fixedTermWindow(NZ, national, '2026-11-30', '2026-11-14')?.status).toBe('closed')
  })
})

describe('pets (ss 42C–42G)', () => {
  it('gives 21 days to answer', () => {
    expect(petRespondBy(NZ, '2026-11-02')).toBe('2026-11-23')
  })

  it('refuses a refusal with no ground, or a ground with no facts', () => {
    expect(checkPetRefusal(NZ, undefined, '').ok).toBe(false)
    expect(checkPetRefusal(NZ, 'premises', 'no').ok).toBe(false)
    expect(checkPetRefusal(NZ, 'premises', 'The section is unfenced and borders a busy road.').ok).toBe(true)
    expect(checkPetRefusal(NZ, 'dangerous_dog', '').ok).toBe(true)
  })
})

describe('arrears (ss 55, 56)', () => {
  const t = { weeklyRent: 690, cadence: 'weekly' as const }

  it('is one day late the day after rent fell due', () => {
    // Paid to Wed 11 Nov: rent fell due Thu 12 Nov, so Fri 13 Nov is day one.
    expect(arrearsState(NZ, national, { ...t, rentPaidTo: '2026-11-11' }, '2026-11-12').daysLate).toBe(0)
    const s = arrearsState(NZ, national, { ...t, rentPaidTo: '2026-11-11' }, '2026-11-13')
    expect(s.daysLate).toBe(1)
    expect(s.owed).toBe(690)
    expect(s.atTribunalThreshold).toBe(false)
  })

  it('reaches the Tribunal threshold at 21 days and owes each missed week', () => {
    const s = arrearsState(NZ, national, { ...t, rentPaidTo: '2026-10-21' }, '2026-11-14')
    expect(s.daysLate).toBe(23)
    expect(s.periodsMissed).toBe(4)
    expect(s.owed).toBe(2760)
    expect(s.atTribunalThreshold).toBe(true)
    expect(s.tribunalOn).toBe('2026-11-12')
  })
})

describe('tenant liability for damage (s 49B)', () => {
  it('caps careless damage at the lesser of the excess and four weeks of rent', () => {
    expect(tenantLiabilityCap(NZ, 'careless', 580, { insured: true, excess: 500 }).cap).toBe(500)
    expect(tenantLiabilityCap(NZ, 'careless', 100, { insured: true, excess: 500 }).cap).toBe(400)
    expect(tenantLiabilityCap(NZ, 'careless', 580, { insured: false }).cap).toBe(2320)
  })

  it('never bills fair wear and tear, and does not cap pet or intentional damage', () => {
    expect(tenantLiabilityCap(NZ, 'wear_and_tear', 580, { insured: true, excess: 500 }).cap).toBe(0)
    expect(tenantLiabilityCap(NZ, 'pet', 580, { insured: true, excess: 500 }).cap).toBeNull()
    expect(tenantLiabilityCap(NZ, 'intentional', 580, { insured: true, excess: 500 }).cap).toBeNull()
  })

  it('splits an invoice that is over the cap', () => {
    const v = checkTenantInvoice(NZ, 900, 'careless', 580, { insured: true, excess: 500 })
    expect(v.ok).toBe(false)
    expect(v.billable).toBe(500)
    expect(checkTenantInvoice(NZ, 165, 'careless', 580, { insured: true, excess: 500 })).toMatchObject({ ok: true, billable: 165 })
  })
})

describe('words', () => {
  it('accepts one advertised figure and refuses ranges, bids and "POA"', () => {
    expect(parseAdvertisedRent(NZ, '$590')).toMatchObject({ ok: true, amount: 590 })
    expect(parseAdvertisedRent(NZ, '590 per week')).toMatchObject({ ok: true, amount: 590 })
    expect(parseAdvertisedRent(NZ, '').ok).toBe(false)
    expect(parseAdvertisedRent(NZ, '550-600').ok).toBe(false)
    expect(parseAdvertisedRent(NZ, 'from $550').ok).toBe(false)
    expect(parseAdvertisedRent(NZ, 'offers over 550').ok).toBe(false)
    expect(parseAdvertisedRent(NZ, 'POA').ok).toBe(false)
    expect(parseAdvertisedRent(NZ, 'negotiable').ok).toBe(false)
  })

  it('takes applications at the advertised rent and no higher', () => {
    expect(checkRentOffer(NZ, 590, 590).ok).toBe(true)
    expect(checkRentOffer(NZ, 590, 620).ok).toBe(false)
  })

  it('catches the clauses landlords most often write', () => {
    const ids = (text: string) => scanClause(NZ, text).map((f) => f.id)
    expect(ids('A late fee of $25 will apply to overdue rent.')).toContain('late_fee')
    expect(ids('The tenant pays a $50 fee if rent is late.')).toContain('late_fee')
    expect(ids('Overdue rent attracts a charge of $10.')).toContain('late_fee')
    expect(ids('Rent is due every Friday. Late rent will be followed up by phone.')).not.toContain('late_fee')
    expect(ids('No pets are permitted at the premises.')).toContain('no_pets')
    expect(ids('The landlord may enter the premises at any time to inspect.')).toContain('entry_any_time')
    expect(ids('Rent is payable one month in advance.')).toContain('rent_in_advance')
    expect(ids('The tenant waives the right to apply to the Tribunal.')).toContain('waiver')
    expect(ids('The tenant is liable for all damage to the premises.')).toContain('all_damage')
    expect(ids('The tenant must give 42 days written notice to end the tenancy.')).toContain('long_tenant_notice')
    expect(ids('Carpets must be professionally cleaned on exit.')).toContain('pro_cleaning')
  })

  it('leaves an ordinary clause alone', () => {
    expect(scanClause(NZ, 'The tenant will mow the lawns and keep the gardens tidy.')).toEqual([])
    expect(scanClause(NZ, 'Rent is $580 per week, payable weekly in advance by automatic payment.')).toEqual([])
  })

  it('removes bank accounts, tax numbers, birth dates and named private details', () => {
    const { text, redactions } = redact(
      'Hana Whitaker, DOB 14/03/1981, of 9 Example Road, pays from 12-3456-0123456-00. IRD 123-456-789. Rent was 3 weeks late.',
      [{ kind: 'home address', text: '9 Example Road' }],
    )
    expect(text).not.toMatch(/12-3456/)
    expect(text).not.toMatch(/14\/03\/1981/)
    expect(text).not.toMatch(/9 Example Road/)
    expect(text).not.toMatch(/123-456-789/)
    expect(text).toMatch(/Rent was 3 weeks late/)
    expect(redactions.length).toBe(4)
  })
})

describe('rule packs', () => {
  it('every rule in every pack carries a citation and a source', () => {
    for (const pack of Object.values(PACKS)) {
      for (const [key, rule] of Object.entries(pack.rules)) {
        expect(rule.citation, `${pack.code} ${key}`).toBeTruthy()
        expect(rule.sourceUrl, `${pack.code} ${key}`).toMatch(/^https:\/\//)
        expect(rule.plain.length, `${pack.code} ${key}`).toBeGreaterThan(10)
      }
    }
  })

  it('only New Zealand is live; the Australian packs are previews', () => {
    expect(PACKS.NZ.status).toBe('live')
    for (const code of ['AU-NSW', 'AU-VIC', 'AU-QLD', 'AU-WA', 'AU-SA'] as const) expect(PACKS[code].status).toBe('preview')
  })

  it('a published override changes what the calculators return', () => {
    const before = planTermination(NZ, national, { type: 'periodic' }, 'tenant', { sentOn: '2026-11-16', method: 'hand' })
    const pack = resolvePack('NZ', [
      { id: 'v1', jurisdiction: 'NZ', version: '2026.12.0', publishedAt: '2026-12-01T00:00:00.000Z', publishedBy: 'test', note: '', overrides: { 'termination.tenant_periodic_notice': { n: 28, unit: 'days' } }, changeIds: [] },
    ])
    const after = planTermination(pack, national, { type: 'periodic' }, 'tenant', { sentOn: '2026-11-16', method: 'hand' })
    expect(before.endsOn).toBe('2026-12-07')
    expect(after.endsOn).toBe('2026-12-14')
    expect(pack.version).toBe('2026.12.0')
  })
})
