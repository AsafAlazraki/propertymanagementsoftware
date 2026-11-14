/**
 * The landlord's action queue.
 *
 * Nothing here is stored. The queue is worked out from the state of the
 * portfolio every time it is shown, so it cannot go stale: lodge the bond and
 * the bond item is simply no longer true. Each item says what happened, what
 * the law gives you to do about it, and by when.
 */
import type { ID, ISODate } from './types'
import type { Db } from './db'
import type { JurisdictionPack, RuleKey } from './jurisdictions/types'
import { regionOf } from './jurisdictions'
import { addMonths, dateOf, diffDays, fmtDate } from './rules/calendar'
import { calendarFor } from './rules/core'
import { complianceReport } from './rules/compliance'
import { arrearsState, bondLodgement, fixedTermWindow } from './rules/tenancy'
import { money, plural } from './rules/format'

export type ActionKind =
  | 'bond'
  | 'arrears'
  | 'quote'
  | 'dispute'
  | 'pet'
  | 'variation'
  | 'fixed_term'
  | 'inspection'
  | 'rent_review'
  | 'compliance'
  | 'insurance'
  | 'applications'
  | 'bank'

export interface ActionItem {
  /** Stable across renders, so a dismissed or animated item stays the same item. */
  id: string
  kind: ActionKind
  /** 1 needs you today · 2 this week · 3 when you have a moment */
  priority: 1 | 2 | 3
  propertyId?: ID
  refId: ID
  title: string
  body: string
  due?: ISODate
  /** The few words that carry the urgency: "7 working days left". */
  clock?: string
  rule?: RuleKey
  tone: 'danger' | 'warn' | 'info' | 'accent'
  amount?: number
  cta: string
}

export function landlordActions(db: Db, orgId: ID, pack: JurisdictionPack, today: ISODate): ActionItem[] {
  const out: ActionItem[] = []
  const properties = db.properties.filter((p) => p.orgId === orgId)
  const tenancies = db.tenancies.filter((t) => t.orgId === orgId)
  const name = (id: ID) => db.users.find((u) => u.id === id)?.fullName ?? 'The tenant'
  const first = (id: ID) => name(id).split(' ')[0]
  const prop = (id: ID) => properties.find((p) => p.id === id)
  const where = (id: ID) => prop(id)?.address.line1 ?? 'a property'
  const cal = (propertyId: ID) => calendarFor(pack, regionOf(prop(propertyId)?.address.city ?? ''))

  for (const t of tenancies) {
    if (t.status !== 'active' && t.status !== 'notice_given') continue
    const c = cal(t.propertyId)

    // Bond received and not yet lodged.
    if (t.bond.amount > 0 && t.bond.receivedOn && !t.bond.lodgedOn) {
      const b = bondLodgement(pack, c, t.bond.receivedOn, undefined, today)
      const overdue = b.status === 'overdue'
      out.push({
        id: `bond:${t.id}`,
        kind: 'bond',
        priority: b.status === 'on_track' ? 2 : 1,
        propertyId: t.propertyId,
        refId: t.id,
        title: `Lodge the bond for ${where(t.propertyId)}`,
        body: overdue
          ? `${money(t.bond.amount)} was received on ${fmtDate(t.bond.receivedOn)} and the 23 working days ran out on ${fmtDate(b.deadline)}. Lodge it today — every day late adds to the risk.`
          : `${money(t.bond.amount)} from ${first(t.tenantIds[0])} has been in your account since ${fmtDate(t.bond.receivedOn)}. It has to reach Tenancy Services by ${fmtDate(b.deadline)}.`,
        due: b.deadline,
        clock: overdue ? `${plural(-b.workingDaysLeft, 'working day')} overdue` : `${plural(b.workingDaysLeft, 'working day')} left`,
        rule: 'bond.lodgement_deadline',
        tone: b.status === 'on_track' ? 'info' : overdue || b.status === 'urgent' ? 'danger' : 'warn',
        amount: t.bond.amount,
        cta: 'Lodge with Bond Hub',
      })
    }

    // Rent overdue.
    const a = arrearsState(pack, c, t, today)
    if (a.daysLate > 0) {
      const events = db.arrearsEvents.filter((e) => e.tenancyId === t.id && dateOf(e.at) >= t.rentPaidTo)
      const contacted = events.some((e) => e.kind === 'landlord_called' || e.kind === 'concierge_requested' || e.kind === 'concierge_reported')
      const noticed = events.some((e) => e.kind === 'remedy_notice_sent')
      const who = first(t.tenantIds[0])
      if (a.atTribunalThreshold) {
        out.push({ id: `arrears:${t.id}`, kind: 'arrears', priority: 1, propertyId: t.propertyId, refId: t.id, title: `${who} is ${a.daysLate} days behind — you can apply to the Tribunal`, body: `${money(a.owed)} is owing on ${where(t.propertyId)}. At 21 days in arrears the Tribunal must end the tenancy unless the rent is caught up. The evidence pack is ready.`, clock: `${a.daysLate} days late`, rule: 'arrears.tribunal_threshold', tone: 'danger', amount: a.owed, cta: 'Review the Tribunal pack' })
      } else if (a.daysLate >= 3 && !noticed) {
        out.push({ id: `arrears:${t.id}`, kind: 'arrears', priority: 1, propertyId: t.propertyId, refId: t.id, title: `Send ${who} a 14-day notice to remedy`, body: `${money(a.owed)} is ${a.daysLate} days late on ${where(t.propertyId)}. The notice starts a 14-day clock; it is drafted and waiting for you.`, clock: `${a.daysLate} days late`, rule: 'arrears.remedy_notice', tone: 'danger', amount: a.owed, cta: 'Review and send the notice' })
      } else if (!contacted && !noticed) {
        out.push({ id: `arrears:${t.id}`, kind: 'arrears', priority: 1, propertyId: t.propertyId, refId: t.id, title: `${who} is ${plural(a.daysLate, 'day')} late with ${money(a.owed)}`, body: `Rent for ${where(t.propertyId)} fell due ${a.daysLate === 1 ? 'yesterday' : `${a.daysLate} days ago`}. A reminder has gone out. A quick, friendly call on day one settles most late payments before they become arrears.`, clock: a.daysLate === 1 ? 'Day 1' : `Day ${a.daysLate}`, rule: 'arrears.remedy_notice', tone: 'warn', amount: a.owed, cta: 'Call, or have Loop call' })
      }
    }

    // A fixed term whose notice window is open or about to open.
    if (t.type === 'fixed' && t.endDate) {
      const w = fixedTermWindow(pack, c, t.endDate, today)
      if (w?.status === 'open') {
        out.push({
          id: `fixed_term:${t.id}`,
          kind: 'fixed_term',
          priority: w.daysToChange <= 10 ? 1 : 2,
          propertyId: t.propertyId,
          refId: t.id,
          title: `Decide what happens when ${first(t.tenantIds[0])}’s fixed term ends`,
          body: `The term at ${where(t.propertyId)} ends ${fmtDate(t.endDate, { year: 'always' })}. Renew it, let it roll on as periodic, or give notice — but notice only counts if it lands by ${fmtDate(w.closes)}.`,
          due: w.closes,
          clock: `${plural(w.daysToChange, 'day')} to decide`,
          rule: 'fixed_term.notice_window',
          tone: w.daysToChange <= 10 ? 'warn' : 'info',
          cta: 'Choose what happens',
        })
      }
    }

    // A rent review that has become possible.
    if (t.type === 'periodic') {
      const gate = addMonths(t.lastRentIncrease ?? t.startDate, pack.rules['rent_increase.min_interval_months'].value)
      const noticeDays = pack.rules['rent_increase.notice'].value.n
      if (diffDays(today, gate) <= noticeDays && a.daysLate === 0) {
        out.push({
          id: `rent_review:${t.id}:${gate}`,
          kind: 'rent_review',
          priority: 3,
          propertyId: t.propertyId,
          refId: t.id,
          title: `A rent review is open for ${where(t.propertyId)}`,
          body: `Rent has been ${money(t.weeklyRent)} a week since ${fmtDate(t.lastRentIncrease ?? t.startDate, { year: 'always' })}. See what the market and a vacant week would do to the numbers before you decide.`,
          rule: 'rent_increase.min_interval_months',
          tone: 'accent',
          cta: 'Run the numbers',
        })
      }
    }
  }

  // Maintenance decisions.
  for (const tk of db.tickets) {
    if (tk.orgId !== orgId) continue
    if (tk.status === 'quote_ready' && tk.quote) {
      const limit = prop(tk.propertyId)?.sinkingFund.autoApproveLimit ?? 0
      out.push({ id: `quote:${tk.id}`, kind: 'quote', priority: tk.triage.urgency === 'routine' ? 2 : 1, propertyId: tk.propertyId, refId: tk.id, title: `Approve a ${money(tk.quote.amount)} quote: ${tk.title.toLowerCase()}`, body: `${db.providers.find((p) => p.id === tk.providerId)?.name ?? 'The tradesperson'} has quoted for ${where(tk.propertyId)}. It is over your ${money(limit)} automatic limit, so nothing happens until you say so.`, tone: 'info', amount: tk.quote.amount, cta: 'Review the quote' })
    }
    if (tk.status === 'disputed') {
      out.push({ id: `dispute:${tk.id}`, kind: 'dispute', priority: 2, propertyId: tk.propertyId, refId: tk.id, title: `${first(tk.reportedBy)} disputes the cause of a repair`, body: `The tradesperson recorded “${tk.title}” as tenant damage; the tenant disagrees. Read both accounts before anyone is billed.`, tone: 'warn', amount: tk.invoice?.amount, cta: 'Read both sides' })
    }
  }

  // Requests waiting on the landlord.
  for (const v of db.variations) {
    if (v.orgId !== orgId || v.status !== 'awaiting_landlord') continue
    const t = tenancies.find((x) => x.id === v.tenancyId)
    if (!t) continue
    const left = v.respondBy ? diffDays(today, v.respondBy) : undefined
    if (v.type === 'pet_request') {
      out.push({
        id: `pet:${v.id}`,
        kind: 'pet',
        priority: left !== undefined && left <= 3 ? 1 : 2,
        propertyId: t.propertyId,
        refId: v.id,
        title: `Answer ${first(t.tenantIds[0])}’s pet request`,
        body: `${v.summary}, at ${where(t.propertyId)}. You can consent, consent with conditions such as a pet bond, or refuse on a reasonable ground — in writing${v.respondBy ? `, by ${fmtDate(v.respondBy)}` : ''}.`,
        due: v.respondBy,
        clock: left === undefined ? undefined : left < 0 ? `${plural(-left, 'day')} overdue` : `${plural(left, 'day')} left`,
        rule: 'pets.response_deadline',
        tone: left !== undefined && left <= 3 ? 'danger' : 'info',
        cta: 'Respond',
      })
    } else {
      out.push({ id: `variation:${v.id}`, kind: 'variation', priority: 2, propertyId: t.propertyId, refId: v.id, title: `Sign a change to the tenancy at ${where(t.propertyId)}`, body: v.summary, tone: 'info', cta: 'Review and sign' })
    }
  }

  // Inspections waiting for a decision.
  for (const i of db.inspections) {
    if (i.orgId !== orgId || i.status !== 'proposed') continue
    out.push({ id: `inspection:${i.id}`, kind: 'inspection', priority: 2, propertyId: i.propertyId, refId: i.id, title: `A routine inspection is due at ${where(i.propertyId)}`, body: 'Walk through it yourself with the guided checklist, or hand it to a vetted local inspector for $85. Either way the notice is drafted with a lawful date.', rule: 'entry.inspection_notice_min', tone: 'info', cta: 'Do it or delegate it' })
  }

  // Compliance gaps, one item per property so the queue does not flood.
  for (const p of properties) {
    const t = tenancies.find((x) => x.propertyId === p.id && (x.status === 'active' || x.status === 'notice_given'))
    const last = db.inspections.filter((i) => i.propertyId === p.id && i.status === 'completed').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
    const report = complianceReport(pack, cal(p.id), p, t, last, today)
    const gaps = report.checks.filter((c) => (c.status === 'fail' || c.status === 'attention') && !['bond_lodged', 'insurance_current', 'inspection_current'].includes(c.def.key))
    if (gaps.length) {
      const failing = gaps.filter((g) => g.status === 'fail').length
      out.push({
        id: `compliance:${p.id}`,
        kind: 'compliance',
        priority: failing ? 2 : 3,
        propertyId: p.id,
        refId: p.id,
        title: gaps.length === 1 ? `${gaps[0].def.label}: ${p.address.line1}` : `${gaps.length} compliance gaps at ${p.address.line1}`,
        body: gaps.length === 1 ? `${gaps[0].finding} ${gaps[0].fix ?? ''}`.trim() : gaps.map((g) => g.def.label).join(' · '),
        tone: failing ? 'warn' : 'info',
        cta: gaps.length === 1 ? 'Fix this' : 'See what is missing',
      })
    }
    const insurance = report.checks.find((c) => c.def.key === 'insurance_current')
    if (insurance && insurance.status !== 'ok' && insurance.status !== 'na') {
      out.push({ id: `insurance:${p.id}`, kind: 'insurance', priority: insurance.status === 'fail' ? 1 : 3, propertyId: p.id, refId: p.id, title: `Landlord insurance: ${p.address.line1}`, body: `${insurance.finding} ${insurance.fix ?? ''}`.trim(), due: insurance.due, tone: insurance.status === 'fail' ? 'danger' : 'info', cta: 'Update the policy' })
    }
    if (p.listing?.status === 'live') {
      const open = db.applications.filter((ap) => ap.propertyId === p.id && (ap.stage === 'interest' || ap.stage === 'viewing_booked' || ap.stage === 'preferred'))
      if (open.length) {
        out.push({ id: `applications:${p.id}`, kind: 'applications', priority: 2, propertyId: p.id, refId: p.id, title: `${plural(open.length, 'applicant')} for ${p.address.line1}`, body: `Listed at a fixed ${money(p.listing.advertisedWeeklyRent)} a week. Checks open only for the one you prefer — that is the Privacy Commissioner’s rule, and it is built in.`, tone: 'accent', cta: 'Meet the applicants' })
      }
    }
  }

  const lines = db.bankLines.filter((l) => l.orgId === orgId && (l.status === 'suggested' || l.status === 'unmatched'))
  if (lines.length) {
    out.push({ id: `bank:${lines.map((l) => l.id).join(',')}`, kind: 'bank', priority: 3, refId: lines[0].id, title: `${plural(lines.length, 'bank line')} need your eye`, body: 'Everything else in the feed was matched automatically. These are the ones I was not sure enough about to file on my own.', tone: 'info', cta: 'Sort them' })
  }

  const dismissed = new Set(db.dismissedActions)
  return out.filter((a) => !dismissed.has(a.id)).sort((a, b) => a.priority - b.priority || (a.due ?? '9999').localeCompare(b.due ?? '9999'))
}

/* ───────────────────── what autopilot saved, as an estimate ─────────────── */

const MINUTES: Record<string, number> = { rent: 4, reminder: 6, dispatch: 25, quote: 10, deadline: 5, sinking: 2, compliance: 8, listing: 30, inspection: 20 }

/** A rough count of the minutes the automatic work would have taken by hand. An estimate, and labelled as one. */
export function minutesSaved(log: { kind: string }[]): number {
  return log.reduce((a, e) => a + (MINUTES[e.kind] ?? 5), 0)
}
