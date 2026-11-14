/**
 * Adding a home. One decision, like every other mutation: it creates the
 * property, the people and the tenancy the landlord described, and leaves
 * everything they did not tell us marked as unknown rather than guessed.
 */
import type { ID, ISODate, Property, Tenancy, User } from '@/domain/types'
import { SUBURBS } from '@/domain/seed/world'
import { addDays, today } from '@/domain/rules/calendar'
import { audit, db, logAutopilot, newId, nowIso } from './store'

export interface NewHome {
  orgId: ID
  entityId: ID
  address: { line1: string; suburb: string; city: string; postcode: string }
  kind: Property['kind']
  beds: number
  baths: number
  titleType: Property['titleType']
  currentValue: number
  mortgageBalance: number
  tenancy?: {
    tenants: string[]
    weeklyRent: number
    rentDueWeekday: number
    type: Tenancy['type']
    startDate: ISODate
    endDate?: ISODate
    bond: number
    bondReceivedOn?: ISODate
    bondRef?: string
  }
}

const unknown = { status: 'unknown' as const }

export function addHome(h: NewHome, by: string): ID {
  const now = nowIso()
  const day = today()
  const propertyId = newId('p')
  const suburb = Object.values(SUBURBS).find((s) => s.name.toLowerCase() === h.address.suburb.trim().toLowerCase())
  const hue = Math.floor(Math.random() * 360)

  const property: Property = {
    id: propertyId,
    orgId: h.orgId,
    entityId: h.entityId,
    jurisdiction: 'NZ',
    address: {
      line1: h.address.line1.trim(),
      suburb: h.address.suburb.trim(),
      city: h.address.city.trim(),
      postcode: h.address.postcode.trim(),
    },
    // Placed at the suburb's centre when we know it; this is for the map, not a survey.
    geo: suburb ? { lat: suburb.lat, lng: suburb.lng } : { lat: SUBURBS.central.lat, lng: SUBURBS.central.lng },
    titleType: h.titleType,
    kind: h.kind,
    beds: h.beds,
    baths: h.baths,
    parking: 0,
    floorArea: 0,
    yearBuilt: 0,
    purchasePrice: 0,
    purchaseYear: 0,
    currentValue: h.currentValue,
    mortgageBalance: h.mortgageBalance,
    mortgageRatePct: 0,
    art: { style: Math.floor(Math.random() * 6), hue },
    onboardingMode: h.tenancy ? 'existing_tenancy_import' : 'first_time_rental',
    healthyHomes: { heating: unknown, insulation: unknown, ventilation: unknown, moisture: unknown, draught: unknown },
    smokeAlarms: { type: 'unknown' },
    meth: { status: 'untested' },
    insurance: { statementInAgreement: false },
    sinkingFund: { ratePct: 0, balance: 0, autoApproveLimit: 0 },
    assets: [],
    keys: [],
    annualCosts: { rates: 0, insurance: 0, bodyCorp: 0 },
  }
  db.insert('properties', property)

  if (h.tenancy) {
    const t = h.tenancy
    const tenants: User[] = t.tenants.map((fullName) => ({
      id: newId('u'),
      role: 'tenant',
      fullName: fullName.trim(),
      email: '',
      phone: '',
      identityVerified: false,
      defaultPortal: 'pool',
      onboardingStep: 0,
      createdAt: now,
      lastActiveAt: now,
      status: 'invited',
      hue: Math.floor(Math.random() * 360),
    }))
    db.insertMany('users', tenants)
    db.insert('tenancies', {
      id: newId('t'),
      orgId: h.orgId,
      propertyId,
      tenantIds: tenants.map((u) => u.id),
      status: 'active',
      type: t.type,
      startDate: t.startDate,
      endDate: t.type === 'fixed' ? t.endDate : undefined,
      weeklyRent: t.weeklyRent,
      cadence: 'weekly',
      rentDueWeekday: t.rentDueWeekday,
      // Until the bank feed shows otherwise, rent is taken as paid up to yesterday.
      rentPaidTo: addDays(day, -1),
      bond: {
        amount: t.bond,
        petBond: 0,
        receivedOn: t.bond > 0 ? (t.bondReceivedOn ?? t.startDate) : undefined,
        lodgedOn: t.bondRef ? (t.bondReceivedOn ?? t.startDate) : undefined,
        bondRef: t.bondRef?.trim() || undefined,
      },
      pets: [],
      origin: 'manual',
    })
  }

  audit(
    by,
    'property.added',
    property.address.line1,
    h.tenancy ? 'Added with its tenancy.' : 'Added as an empty home.',
    h.orgId,
  )
  logAutopilot(
    h.orgId,
    'compliance',
    `Started the compliance checklist for ${property.address.line1}. Nothing is marked as met until you confirm it.`,
  )
  return propertyId
}
