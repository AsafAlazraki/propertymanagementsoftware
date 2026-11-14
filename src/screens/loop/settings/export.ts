/**
 * Everything Loop holds for one organisation, as a single file its owner can
 * keep or take elsewhere.
 *
 * Only rows that carry this organisation's id are gathered, plus the names of
 * the tenants its tenancies point at — an id on its own means nothing in a
 * spreadsheet. Other organisations, other renters, the platform's own records
 * and applicants' details are left out.
 */
import type { ID } from '@/domain/types'
import type { Db } from '@/domain/db'

export function collectOrgData(db: Db, orgId: ID, exportedAt: string) {
  const mine = <T extends { orgId?: ID }>(rows: T[]) => rows.filter((r) => r.orgId === orgId)
  const tenancies = mine(db.tenancies)
  const tenantIds = new Set(tenancies.flatMap((t) => t.tenantIds))
  return {
    about:
      'A copy of every record Loop holds for this organisation. Demo data: the people are invented. Photos are not included; they are kept in the browser that took them.',
    exportedAt,
    organisation: db.orgs.find((o) => o.id === orgId),
    owners: mine(db.entities),
    people: mine(db.users),
    tenants: db.users
      .filter((u) => tenantIds.has(u.id))
      .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, phone: u.phone })),
    properties: mine(db.properties),
    tenancies,
    ledger: mine(db.ledger),
    bankLines: mine(db.bankLines),
    arrearsEvents: mine(db.arrearsEvents),
    repairs: mine(db.tickets),
    inspections: mine(db.inspections),
    fieldTasks: mine(db.fieldTasks),
    keyEvents: mine(db.keyEvents),
    variations: mine(db.variations),
    notices: mine(db.notices),
    documents: mine(db.docs),
    applications: mine(db.applications),
    feedback: mine(db.feedback),
    autopilotLog: mine(db.autopilotLog),
  }
}

export type OrgExport = ReturnType<typeof collectOrgData>

/** What is in the file, in the words the screen uses, with a count for each. Empty kinds are left in: zero is an answer. */
export function exportContents(data: OrgExport): { label: string; rows: number }[] {
  return [
    { label: 'Homes', rows: data.properties.length },
    { label: 'Owners', rows: data.owners.length },
    { label: 'People with access', rows: data.people.length },
    { label: 'Tenancies', rows: data.tenancies.length },
    { label: 'Tenants named in them', rows: data.tenants.length },
    { label: 'Ledger entries', rows: data.ledger.length },
    { label: 'Bank feed lines', rows: data.bankLines.length },
    { label: 'Late-rent events', rows: data.arrearsEvents.length },
    { label: 'Repairs', rows: data.repairs.length },
    { label: 'Inspections', rows: data.inspections.length },
    { label: 'Field service jobs', rows: data.fieldTasks.length },
    { label: 'Key movements', rows: data.keyEvents.length },
    { label: 'Changes to tenancies', rows: data.variations.length },
    { label: 'Notices', rows: data.notices.length },
    { label: 'Documents on file', rows: data.documents.length },
    { label: 'Applications', rows: data.applications.length },
    { label: 'Feedback sent', rows: data.feedback.length },
    { label: 'Autopilot log lines', rows: data.autopilotLog.length },
  ]
}

/** Hands a JSON file to the browser to save. */
export function downloadJson(filename: string, data: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before the URL is released.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
