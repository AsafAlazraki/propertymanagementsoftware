import { describe, expect, it } from 'vitest'
import { isWorkingDay } from '../rules/calendar'
import { calendarFor } from '../rules/core'
import { regionOf, regionalHolidaysFor, regionalHolidaysLoaded } from './index'
import { NZ } from './nz'

describe('which towns have their local anniversary day loaded', () => {
  it('says yes for the towns of the one region the pack holds', () => {
    for (const town of ['Nelson', 'Tasman', 'Richmond', 'Stoke', 'Motueka', 'nelson ']) {
      expect(regionalHolidaysLoaded(NZ, town), town).toBe(true)
    }
    expect(regionalHolidaysFor(NZ, 'Nelson')).toBe(NZ.regionalHolidays.nelson)
  })

  it('says no for a town in any other province, and for no town at all', () => {
    for (const town of ['Auckland', 'Wellington', 'Christchurch', 'Dunedin', 'Blenheim', '']) {
      expect(regionalHolidaysLoaded(NZ, town), town).toBe(false)
      expect(regionalHolidaysFor(NZ, town), town).toBeUndefined()
    }
  })

  it('agrees with the calendar a deadline is counted on', () => {
    // Where the answer is yes, the loaded day is a non-working day; where it is no, the
    // calendar is the national one and that same day is counted as a working day.
    const day = NZ.regionalHolidays.nelson.dates[0]
    expect(isWorkingDay(day, calendarFor(NZ, regionOf('Richmond')))).toBe(false)
    expect(isWorkingDay(day, calendarFor(NZ, regionOf('Wellington')))).toBe(true)
  })

  it('says no when a region is known but holds no dates, and for a pack with no regions', () => {
    const empty = { regionalHolidays: { nelson: { label: 'Nelson Anniversary Day', dates: [] } } }
    expect(regionalHolidaysLoaded(empty, 'Nelson')).toBe(false)
    expect(regionalHolidaysLoaded({ regionalHolidays: {} }, 'Nelson')).toBe(false)
  })
})
