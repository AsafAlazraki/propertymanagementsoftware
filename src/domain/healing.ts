/**
 * The self-healing engine.
 *
 * A sweep runs a set of checks over the whole dataset. Each check belongs to a
 * playbook, and a playbook is in one of two modes:
 *
 *   auto      the fix is safe and reversible, so the sweep applies it and
 *             records what it did;
 *   approval  the fix changes something an owner would notice, so the sweep
 *             only proposes it and a platform admin decides.
 *
 * The learning loop is deliberately modest and entirely visible: every
 * decision is counted on the playbook, and once a playbook has been approved
 * three times with no rejection the engine *suggests* promoting it to
 * automatic. A person accepts or declines that suggestion. Nothing promotes
 * itself.
 */
import type { ID, Incident, ISODate, Playbook } from './types'
import type { Db } from './db'
import { diffDays } from './rules/calendar'
import { money } from './rules/format'

export const PROMOTE_AFTER_APPROVALS = 3
const STALE_SOURCE_DAYS = 7
const CONFIDENT_MATCH = 0.9

interface Finding {
  playbookId: ID
  /** Stable key, so the same fault is never raised twice. */
  key: string
  orgId?: ID
  severity: Incident['severity']
  title: string
  signal: string
  diagnosis: string
  proposedFix: string
  refs: Incident['refs']
}

function nowIso(): string {
  return new Date().toISOString()
}

/* ───────────────────────────────── checks ───────────────────────────────── */

function findAll(db: Db, today: ISODate): Finding[] {
  const out: Finding[] = []
  const orgName = (id?: ID) => db.orgs.find((o) => o.id === id)?.name ?? 'an organisation'
  const address = (id: ID) => db.properties.find((p) => p.id === id)?.address.line1 ?? 'a property'

  // Duplicate bank lines: same organisation, date, amount and reference, where one is already matched.
  const seen = new Map<string, ID>()
  for (const line of [...db.bankLines].sort((a, b) => (a.status === 'matched' ? -1 : 1) - (b.status === 'matched' ? -1 : 1))) {
    const key = `${line.orgId}|${line.date}|${line.amount}|${line.reference}`
    const first = seen.get(key)
    if (first && line.status === 'unmatched') {
      out.push({
        playbookId: 'pb_dupe_bank',
        key: `dupe:${line.id}`,
        orgId: line.orgId,
        severity: 'low',
        title: 'Duplicate bank line',
        signal: `Two identical lines for ${orgName(line.orgId)}: ${money(line.amount, { cents: true })}, “${line.reference}”, ${line.date}.`,
        diagnosis: 'The bank feed reported one payment twice. The first is already matched to rent.',
        proposedFix: 'Ignore the second line. The ledger is not touched.',
        refs: [{ collection: 'bankLines', id: line.id }],
      })
    } else if (!first) seen.set(key, line.id)
  }

  // Confident matches nobody has confirmed.
  for (const line of db.bankLines) {
    if (line.status === 'suggested' && (line.confidence ?? 0) >= CONFIDENT_MATCH && line.suggestedTenancyId) {
      const t = db.tenancies.find((x) => x.id === line.suggestedTenancyId)
      out.push({
        playbookId: 'pb_fuzzy_match',
        key: `fuzzy:${line.id}`,
        orgId: line.orgId,
        severity: 'low',
        title: 'Confident rent match left unapplied',
        signal: `${money(line.amount)} with reference “${line.reference}” matches ${t ? address(t.propertyId) : 'a tenancy'} at ${Math.round((line.confidence ?? 0) * 100)}%.`,
        diagnosis: 'The amount equals the weekly rent and the reference is one letter off the usual one.',
        proposedFix: 'Apply the match so the tenant is not shown as late.',
        refs: [{ collection: 'bankLines', id: line.id }],
      })
    }
  }

  // A live listing on a home that is let.
  for (const p of db.properties) {
    if (p.listing?.status !== 'live') continue
    const let_ = db.tenancies.some((t) => t.propertyId === p.id && (t.status === 'active' || t.status === 'notice_given'))
    if (let_) {
      out.push({
        playbookId: 'pb_stale_listing',
        key: `listing:${p.id}`,
        orgId: p.orgId,
        severity: 'medium',
        title: 'Listing still live on a let home',
        signal: `${p.address.line1}, ${p.address.suburb} is advertised at ${money(p.listing.advertisedWeeklyRent)} a week and has an active tenancy.`,
        diagnosis: 'The listing was not closed when the tenancy began. Renters are still applying for a home that is not available.',
        proposedFix: 'Pause the listing on Pool and the syndicated sites, and tell the owner.',
        refs: [{ collection: 'properties', id: p.id }],
      })
    }
  }

  // Bond lodged with no reference.
  for (const t of db.tenancies) {
    if (t.status === 'active' && t.bond.lodgedOn && !t.bond.bondRef) {
      out.push({
        playbookId: 'pb_bond_ref',
        key: `bondref:${t.id}`,
        orgId: t.orgId,
        severity: 'medium',
        title: 'Bond marked lodged with no reference',
        signal: `${address(t.propertyId)}: lodged ${t.bond.lodgedOn}, reference blank.`,
        diagnosis: 'Either the reference was never entered, or the bond was marked lodged before Tenancy Services confirmed it.',
        proposedFix: 'Ask the owner for the Bond Hub reference. If there is none, reopen the lodgement countdown.',
        refs: [{ collection: 'tenancies', id: t.id }],
      })
    }
  }

  // Unsuccessful applicants past their purge date.
  for (const a of db.applications) {
    if (a.stage === 'declined' && a.purgeOn && a.purgeOn < today && !a.purged) {
      out.push({
        playbookId: 'pb_privacy_purge',
        key: `purge:${a.id}`,
        orgId: a.orgId,
        severity: 'medium',
        title: 'Applicant data past its purge date',
        signal: `An application to ${address(a.propertyId)} was declined and due for deletion on ${a.purgeOn} — ${diffDays(a.purgeOn, today)} days ago.`,
        diagnosis: 'The nightly purge did not reach this row.',
        proposedFix: 'Delete the applicant’s message and details now; keep an anonymous row for counts.',
        refs: [{ collection: 'applications', id: a.id }],
      })
    }
  }

  // Open work assigned to a provider who is not vetted.
  for (const tk of db.tickets) {
    if (tk.status === 'closed' || !tk.providerId) continue
    const provider = db.providers.find((p) => p.id === tk.providerId)
    if (provider && provider.vetting !== 'vetted') {
      out.push({
        playbookId: 'pb_unvetted',
        key: `unvetted:${tk.id}`,
        orgId: tk.orgId,
        severity: 'high',
        title: 'Job assigned to an unvetted provider',
        signal: `“${tk.title}” at ${address(tk.propertyId)} is with ${provider.name}, whose vetting is ${provider.vetting}.`,
        diagnosis: 'The provider was assigned before their checks finished.',
        proposedFix: 'Hold the job and offer it to the next vetted provider.',
        refs: [{ collection: 'tickets', id: tk.id }],
      })
    }
  }

  // Watched legal sources that have gone quiet.
  const stale = db.ruleSources.filter((s) => s.priority === 1 && (!s.lastCheckedAt || diffDays(s.lastCheckedAt.slice(0, 10), today) > STALE_SOURCE_DAYS))
  if (stale.length) {
    out.push({
      playbookId: 'pb_stale_source',
      key: `stale:${stale.map((s) => s.id).join(',')}`,
      severity: 'high',
      title: `${stale.length} priority legal ${stale.length === 1 ? 'source has' : 'sources have'} not been read for over a week`,
      signal: stale.map((s) => s.name).join('; '),
      diagnosis: 'The scheduled watcher is failing or blocked for these sources.',
      proposedFix: 'Retry now. Until they are read, rules that depend on them are shown as “not recently verified”.',
      refs: stale.map((s) => ({ collection: 'ruleSources', id: s.id })),
    })
  }

  return out
}

/* ─────────────────────────────── applying fixes ─────────────────────────── */

/** The change a playbook makes. Pure: returns the collections it altered. */
function applyFix(db: Db, incident: Pick<Incident, 'playbookId' | 'refs'>, today: ISODate): Partial<Db> {
  const ids = new Set(incident.refs.map((r) => r.id))
  switch (incident.playbookId) {
    case 'pb_dupe_bank':
      return { bankLines: db.bankLines.map((l) => (ids.has(l.id) ? { ...l, status: 'ignored' as const } : l)) }

    case 'pb_fuzzy_match': {
      const tenancies = [...db.tenancies]
      const ledger = [...db.ledger]
      const bankLines = db.bankLines.map((l) => {
        if (!ids.has(l.id) || !l.suggestedTenancyId) return l
        const i = tenancies.findIndex((t) => t.id === l.suggestedTenancyId)
        if (i < 0) return l
        const t = tenancies[i]
        const ledgerId = `led_heal_${l.id}`
        ledger.unshift({ id: ledgerId, orgId: t.orgId, propertyId: t.propertyId, tenancyId: t.id, date: l.date, kind: 'rent', amount: l.amount, category: 'rent', description: 'Rent — matched by the self-healing engine', bankRef: l.reference, match: 'auto' })
        const cycle = t.cadence === 'fortnightly' ? 14 : 7
        const [y, m, d] = t.rentPaidTo.split('-').map(Number)
        const next = new Date(Date.UTC(y, m - 1, d + cycle))
        tenancies[i] = { ...t, rentPaidTo: next.toISOString().slice(0, 10) }
        return { ...l, status: 'matched' as const, ledgerId }
      })
      return { bankLines, tenancies, ledger }
    }

    case 'pb_stale_listing':
      return { properties: db.properties.map((p) => (ids.has(p.id) && p.listing ? { ...p, listing: { ...p.listing, status: 'paused' as const } } : p)) }

    case 'pb_bond_ref':
      return {
        adminTasks: [
          ...incident.refs.map((r) => ({
            id: `at_bondref_${r.id}`,
            kind: 'feedback_followup' as const,
            title: 'Ask the owner for a bond reference',
            detail: 'A bond is marked lodged with no Bond Hub reference. Confirm it, or reopen the countdown.',
            orgId: db.tenancies.find((t) => t.id === r.id)?.orgId,
            refId: r.id,
            priority: 'p2' as const,
            status: 'open' as const,
            createdAt: nowIso(),
          })),
          ...db.adminTasks.filter((t) => !incident.refs.some((r) => t.id === `at_bondref_${r.id}`)),
        ],
      }

    case 'pb_privacy_purge':
      return { applications: db.applications.map((a) => (ids.has(a.id) ? { ...a, message: '', purged: true, occupants: 0 } : a)) }

    case 'pb_unvetted':
      return {
        tickets: db.tickets.map((t) =>
          ids.has(t.id) ? { ...t, providerId: undefined, status: 'submitted' as const, events: [...t.events, { at: nowIso(), by: 'admin' as const, text: 'Held: the assigned provider had not finished vetting. Being offered to the next vetted provider.' }] } : t,
        ),
      }

    case 'pb_stale_source':
      return { ruleSources: db.ruleSources.map((s) => (ids.has(s.id) ? { ...s, lastCheckedAt: `${today}T05:30:00.000Z`, health: 'ok' as const } : s)) }

    default:
      return {}
  }
}

function bump(playbooks: Playbook[], id: ID, patch: (p: Playbook) => Partial<Playbook>): Playbook[] {
  return playbooks.map((p) => (p.id === id ? { ...p, ...patch(p) } : p))
}

/* ─────────────────────────────────── API ────────────────────────────────── */

export interface SweepResult {
  patch: Partial<Db>
  found: number
  healed: number
  awaiting: number
}

/** Runs every check, applies the automatic fixes, and queues the rest for a person. */
export function sweep(db: Db, today: ISODate): SweepResult {
  const known = new Set(db.incidents.map((i) => i.refs.map((r) => r.id).join(',') + '|' + i.playbookId))
  let working = db
  let playbooks = db.playbooks
  const fresh: Incident[] = []
  let healed = 0
  let awaiting = 0

  for (const finding of findAll(db, today)) {
    const dedupe = finding.refs.map((r) => r.id).join(',') + '|' + finding.playbookId
    if (known.has(dedupe)) continue
    const playbook = playbooks.find((p) => p.id === finding.playbookId)
    if (!playbook) continue
    const base = {
      id: `inc_${finding.key.replace(/[^a-z0-9]+/gi, '_').slice(0, 48)}`,
      playbookId: finding.playbookId,
      orgId: finding.orgId,
      detectedAt: nowIso(),
      severity: finding.severity,
      title: finding.title,
      signal: finding.signal,
      diagnosis: finding.diagnosis,
      proposedFix: finding.proposedFix,
      refs: finding.refs,
    }
    if (playbook.mode === 'auto') {
      working = { ...working, ...applyFix(working, base, today) }
      fresh.push({ ...base, risk: 'safe', status: 'auto_healed', resolvedAt: nowIso(), resolvedBy: 'Playbook', outcomeNote: 'Fixed automatically. Nothing for you to do.' })
      playbooks = bump(playbooks, playbook.id, (p) => ({ runs: p.runs + 1, lastRunAt: nowIso() }))
      healed++
    } else {
      fresh.push({ ...base, risk: 'needs_approval', status: 'awaiting_approval' })
      awaiting++
    }
  }

  if (fresh.length === 0) return { patch: {}, found: 0, healed: 0, awaiting: 0 }
  const { incidents: _i, playbooks: _p, ...changed } = diffCollections(db, working)
  return { patch: { ...changed, incidents: [...fresh, ...db.incidents], playbooks }, found: fresh.length, healed, awaiting }
}

function diffCollections(before: Db, after: Db): Partial<Db> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(after) as (keyof Db)[]) if (after[key] !== before[key]) out[key] = after[key]
  return out as Partial<Db>
}

/** A platform admin approves a proposed fix: apply it and record the decision on the playbook. */
export function approveIncident(db: Db, incidentId: ID, by: string, today: ISODate): Partial<Db> {
  const incident = db.incidents.find((i) => i.id === incidentId)
  if (!incident || incident.status !== 'awaiting_approval') return {}
  const fix = applyFix(db, incident, today)
  const playbooks = bump(db.playbooks, incident.playbookId, (p) => {
    const approvals = p.approvals + 1
    return { runs: p.runs + 1, approvals, lastRunAt: nowIso(), promotionSuggested: p.mode === 'approval' && p.rejections === 0 && approvals >= PROMOTE_AFTER_APPROVALS }
  })
  return {
    ...fix,
    playbooks,
    incidents: db.incidents.map((i) => (i.id === incidentId ? { ...i, status: 'approved' as const, resolvedAt: nowIso(), resolvedBy: by, outcomeNote: 'Approved and applied.' } : i)),
  }
}

/** A rejection is a lesson too: it resets any promotion suggestion for that playbook. */
export function rejectIncident(db: Db, incidentId: ID, by: string, reason: string): Partial<Db> {
  const incident = db.incidents.find((i) => i.id === incidentId)
  if (!incident || incident.status !== 'awaiting_approval') return {}
  return {
    playbooks: bump(db.playbooks, incident.playbookId, (p) => ({ rejections: p.rejections + 1, promotionSuggested: false })),
    incidents: db.incidents.map((i) => (i.id === incidentId ? { ...i, status: 'rejected' as const, resolvedAt: nowIso(), resolvedBy: by, outcomeNote: reason || 'Rejected.' } : i)),
  }
}

/** The human decision the learning loop asks for. */
export function setPlaybookMode(db: Db, playbookId: ID, mode: Playbook['mode']): Partial<Db> {
  return { playbooks: bump(db.playbooks, playbookId, () => ({ mode, promotionSuggested: false })) }
}

export function declinePromotion(db: Db, playbookId: ID): Partial<Db> {
  return { playbooks: bump(db.playbooks, playbookId, () => ({ promotionSuggested: false, approvals: 0 })) }
}

/** Share of a playbook's decided runs that a person approved. `null` until there is a decision to count. */
export function approvalRate(p: Playbook): number | null {
  const decided = p.approvals + p.rejections
  return decided === 0 ? null : p.approvals / decided
}
