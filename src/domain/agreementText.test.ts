import { describe, expect, it } from 'vitest'
import { parseDate, readAgreement } from './agreementText'

describe('dates, day first', () => {
  it('reads the forms an agreement uses', () => {
    expect(parseDate('12/03/2025')).toBe('2025-03-12')
    expect(parseDate('1-7-26')).toBe('2026-07-01')
    expect(parseDate('on 23rd October 2026')).toBe('2026-10-23')
    expect(parseDate('3 Feb 2025')).toBe('2025-02-03')
  })

  it('refuses a date that does not exist, and text with no date', () => {
    expect(parseDate('31/02/2025')).toBeUndefined()
    expect(parseDate('13/13/2025')).toBeUndefined()
    expect(parseDate('as soon as possible')).toBeUndefined()
  })
})

describe('reading an agreement', () => {
  const text = `RESIDENTIAL TENANCY AGREEMENT
Address of tenancy: 12 Kererū Lane, Stoke, Nelson 7011
Landlord: Whitaker Family Trust
Tenant names: Sione Tupou and Grace O'Neill
This is a fixed-term tenancy.
Tenancy starts on: 14/03/2026
Fixed-term tenancy ends on 13 March 2027
Rent per week $ 565.00 payable weekly in advance.
Bond amount: $2,260
The tenant shall pay for water charged by metered consumption.`

  it('finds each fact with the words it came from', () => {
    const f = readAgreement(text)
    expect(f.address).toEqual({ value: '12 Kererū Lane, Stoke, Nelson 7011', from: 'Address of tenancy: 12 Kererū Lane, Stoke, Nelson 7011' })
    expect(f.weeklyRent?.value).toBe(565)
    expect(f.bond?.value).toBe(2260)
    expect(f.startDate?.value).toBe('2026-03-14')
    expect(f.endDate?.value).toBe('2027-03-13')
    expect(f.type?.value).toBe('fixed')
    expect(f.tenants?.value).toEqual(['Sione Tupou', "Grace O'Neill"])
    expect(f.bond?.from).toBe('Bond amount: $2,260')
  })

  it('reads a rent written as an amount per week', () => {
    expect(readAgreement('The rent is $480 per week. This is a periodic tenancy.')).toMatchObject({ weeklyRent: { value: 480 }, type: { value: 'periodic' } })
  })

  it('does not guess the kind of tenancy when the document names both', () => {
    expect(readAgreement('Tick one: periodic tenancy / fixed-term tenancy').type).toBeUndefined()
  })

  it('finds nothing in a document that is not an agreement', () => {
    expect(readAgreement('Invoice 4471. Gutter clean, 2 hours. Total $185 including GST.')).toEqual({})
  })
})
