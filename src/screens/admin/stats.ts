/**
 * The platform's figures, worked out from the records every time they are
 * shown. Nothing on a console screen is a stored total: an organisation's rent
 * roll is the sum of its live tenancies, its compliance is the mean of its
 * homes' scores, and its arrears come from the same calculator a landlord sees.
 */
import { useMemo } from 'react'
import type { ISODate, Org, Property, Tenancy, User } from '@/domain/types'
import type { Db } from '@/domain/db'
import type { JurisdictionPack } from '@/domain/jurisdictions/types'
import { complianceReport } from '@/domain/rules/compliance'
import { arrearsState } from '@/domain/rules/tenancy'
import { dateOf, diffDays } from '@/domain/rules/calendar'
import { orgMrr } from '@/domain/finance'
import { calendarOf, usePack, useToday } from '@/data/hooks'
import { useStore } from '@/data/store'

export interface HomeRow {
  property: Property
  tenancy?: Tenancy
  /** 0–100 from the compliance checks. */
  score: number
  failing: number
  attention: number
  daysLate: number
  owed: number
  atThreshold: boolean
}

export interface OrgRow {
  org: Org
  owner?: User
  homes: HomeRow[]
  properties: number
  let: number
  /** Weekly rent across live tenancies. */
  rentRoll: number
  mrr: number
  /** Mean compliance score of its homes; `null` with no homes. */
  compliance: number | null
  /** Tenancies with rent overdue today. */
  arrears: number
  owed: number
  idleDays: number
}

type Slice = Pick<Db, 'orgs' | 'users' | 'properties' | 'tenancies' | 'inspections'>

export function homeRows(db: Pick<Db, 'properties' | 'tenancies' | 'inspections'>, pack: JurisdictionPack, day: ISODate): HomeRow[] {
  return db.properties.map((property) => {
    const tenancy = db.tenancies.find((t) => t.propertyId === property.id && (t.status === 'active' || t.status === 'notice_given'))
    const last = db.inspections
      .filter((i) => i.propertyId === property.id && i.status === 'completed')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
    const cal = calendarOf(pack, property)
    const report = complianceReport(pack, cal, property, tenancy, last, day)
    const a = tenancy ? arrearsState(pack, cal, tenancy, day) : null
    return { property, tenancy, score: report.score, failing: report.failing, attention: report.attention, daysLate: a?.daysLate ?? 0, owed: a?.owed ?? 0, atThreshold: a?.atTribunalThreshold ?? false }
  })
}

export function orgRows(db: Slice, homes: HomeRow[], day: ISODate): OrgRow[] {
  return db.orgs.map((org) => {
    const mine = homes.filter((h) => h.property.orgId === org.id)
    const tenanted = mine.filter((h) => h.tenancy)
    const late = mine.filter((h) => h.daysLate > 0)
    return {
      org,
      owner: db.users.find((u) => u.id === org.ownerUserId),
      homes: mine,
      properties: mine.length,
      let: tenanted.length,
      rentRoll: tenanted.reduce((a, h) => a + (h.tenancy?.weeklyRent ?? 0), 0),
      mrr: orgMrr(org, mine.length),
      compliance: mine.length ? Math.round(mine.reduce((a, h) => a + h.score, 0) / mine.length) : null,
      arrears: late.length,
      owed: late.reduce((a, h) => a + h.owed, 0),
      idleDays: Math.max(0, diffDays(dateOf(org.lastActiveAt), day)),
    }
  })
}

/** Every home and every organisation with its figures, recomputed when the records under them change. */
export function usePlatform(): { homes: HomeRow[]; orgs: OrgRow[]; pack: JurisdictionPack; day: ISODate } {
  const orgs = useStore((s) => s.db.orgs)
  const users = useStore((s) => s.db.users)
  const properties = useStore((s) => s.db.properties)
  const tenancies = useStore((s) => s.db.tenancies)
  const inspections = useStore((s) => s.db.inspections)
  const pack = usePack()
  const day = useToday()
  return useMemo(() => {
    const homes = homeRows({ properties, tenancies, inspections }, pack, day)
    return { homes, orgs: orgRows({ orgs, users, properties, tenancies, inspections }, homes, day), pack, day }
  }, [orgs, users, properties, tenancies, inspections, pack, day])
}

/** The Monday on or before a date: the start of its week. */
export function weekStart(date: ISODate): ISODate {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  const back = (utc.getUTCDay() + 6) % 7
  utc.setUTCDate(utc.getUTCDate() - back)
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`
}
