/**
 * Everything Pool holds about one renter, as a single file they can keep.
 *
 * A person is entitled to a copy of their information. This gathers it from
 * every collection that mentions them — and only them: a shared tenancy's
 * records are included, the housemates' own profiles are not.
 */
import type { ID } from '@/domain/types'
import type { Db } from '@/domain/db'

export function collectMyData(db: Db, userId: ID, exportedAt: string) {
  const tenancies = db.tenancies.filter((t) => t.tenantIds.includes(userId))
  const tenancyIds = new Set(tenancies.map((t) => t.id))
  const mine = <T extends { tenancyId?: ID }>(rows: T[]) => rows.filter((r) => r.tenancyId !== undefined && tenancyIds.has(r.tenancyId))
  return {
    about: 'A copy of everything Pool holds about you. Demo data: the people are invented.',
    exportedAt,
    account: db.users.find((u) => u.id === userId),
    profile: db.renterProfiles.find((p) => p.userId === userId),
    applications: db.applications.filter((a) => a.applicantId === userId),
    tenancies,
    rentPayments: mine(db.ledger).filter((l) => l.kind === 'rent' || l.kind === 'tenant_invoice' || l.kind === 'tenant_invoice_payment'),
    repairs: db.tickets.filter((t) => t.reportedBy === userId || (t.tenancyId !== undefined && tenancyIds.has(t.tenancyId))),
    requests: mine(db.variations),
    notices: mine(db.notices),
    inspections: mine(db.inspections).map(({ rooms, ...rest }) => ({ ...rest, rooms: rooms.map((r) => ({ name: r.name, score: r.score, note: r.note })) })),
    feedback: db.feedback.filter((f) => f.userId === userId),
    assistantQuestions: db.copilotTurns.filter((t) => t.userId === userId),
  }
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
