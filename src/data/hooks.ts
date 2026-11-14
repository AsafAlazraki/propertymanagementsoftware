import { useMemo } from 'react'
import type { ID, Property, Tenancy } from '@/domain/types'
import type { JurisdictionPack } from '@/domain/jurisdictions/types'
import { regionOf, resolvePack } from '@/domain/jurisdictions'
import { calendarFor } from '@/domain/rules/core'
import type { CalendarConfig } from '@/domain/rules/calendar'
import { today } from '@/domain/rules/calendar'
import { landlordActions, type ActionItem } from '@/domain/actions'
import { complianceReport, type ComplianceReport } from '@/domain/rules/compliance'
import { useStore } from './store'

/** The live rule pack: the shipped values with anything published through Rulewatch laid over them. */
export function usePack(): JurisdictionPack {
  const versions = useStore((s) => s.db.packVersions)
  const day = today()
  return useMemo(() => resolvePack('NZ', versions, day), [versions, day])
}

/** Today's date. One call per render keeps every calculation on a screen on the same day. */
export function useToday(): string {
  return today()
}

export function calendarOf(pack: JurisdictionPack, property: Pick<Property, 'address'> | undefined): CalendarConfig {
  return calendarFor(pack, property ? regionOf(property.address.city) : undefined)
}

/** The signed-in organisation's action queue, worked out from the current state of its records. */
export function useActions(): ActionItem[] {
  const db = useStore((s) => s.db)
  const orgId = useStore((s) => s.session?.orgId)
  const pack = usePack()
  const day = useToday()
  return useMemo(() => (orgId ? landlordActions(db, orgId, pack, day) : []), [db, orgId, pack, day])
}

export function activeTenancy(tenancies: Tenancy[], propertyId: ID): Tenancy | undefined {
  return tenancies.find((t) => t.propertyId === propertyId && (t.status === 'active' || t.status === 'notice_given'))
}

/** One compliance report per property in the signed-in organisation. */
export function useComplianceReports(): { property: Property; tenancy: Tenancy | undefined; report: ComplianceReport }[] {
  const orgId = useStore((s) => s.session?.orgId)
  const properties = useStore((s) => s.db.properties)
  const tenancies = useStore((s) => s.db.tenancies)
  const inspections = useStore((s) => s.db.inspections)
  const pack = usePack()
  const day = useToday()
  return useMemo(
    () =>
      properties
        .filter((p) => p.orgId === orgId)
        .map((property) => {
          const tenancy = activeTenancy(tenancies, property.id)
          const last = inspections
            .filter((i) => i.propertyId === property.id && i.status === 'completed')
            .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
          return { property, tenancy, report: complianceReport(pack, calendarOf(pack, property), property, tenancy, last, day) }
        }),
    [properties, tenancies, inspections, orgId, pack, day],
  )
}

export function useNameOf(): (userId: ID) => string {
  const users = useStore((s) => s.db.users)
  return useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.fullName]))
    return (id: ID) => map.get(id) ?? 'Someone'
  }, [users])
}
