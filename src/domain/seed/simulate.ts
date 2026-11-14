/**
 * The simulated bank feed.
 *
 * A prototype has no bank to listen to, so each time the app opens this walks
 * the calendar forward from the last simulated day to today and does what the
 * real feed would have done: tenants who were up to date pay on their due
 * date, the payment is matched, and a share goes to the sinking fund. Tenants
 * who were already behind stay behind — arrears are for the landlord to act on.
 *
 * It is labelled as a simulation wherever its output appears.
 */
import type { ArrearsEvent, BankLine, ISODate, LedgerEntry, Property, Tenancy } from '../types'
import type { AutopilotEntry, Db } from '../db'
import { addDays, diffDays, fmtDate } from '../rules/calendar'
import { money, round2 } from '../rules/format'

const DEMO_ORG = 'org_whitaker'
/** One demo tenant is left late so the arrears path can be shown; after this many days the simulation has him catch up. */
const CATCH_UP_AFTER_DAYS = 6

function instant(day: ISODate, hour: number, minute = 0): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute).toISOString()
}

export function rollForward(db: Db, today: ISODate): Db {
  if (db.simulatedThrough >= today) return db

  const tenancies: Tenancy[] = db.tenancies.map((t) => ({ ...t }))
  const properties: Property[] = db.properties.map((p) => ({ ...p, sinkingFund: { ...p.sinkingFund } }))
  const ledger: LedgerEntry[] = []
  const bankLines: BankLine[] = []
  const log: AutopilotEntry[] = []
  const arrearsEvents: ArrearsEvent[] = []
  const propertyById = new Map(properties.map((p) => [p.id, p]))
  const userName = (id: string) => db.users.find((u) => u.id === id)?.fullName ?? 'the tenant'

  // Never replay more than ten weeks: a demo left for a year should not grow a year of rows.
  const from = diffDays(db.simulatedThrough, today) > 70 ? addDays(today, -70) : db.simulatedThrough

  for (let day = addDays(from, 1); day <= today; day = addDays(day, 1)) {
    for (const t of tenancies) {
      if (t.status !== 'active' && t.status !== 'notice_given') continue
      const dueOn = addDays(t.rentPaidTo, 1)
      const cycle = t.cadence === 'fortnightly' ? 14 : 7
      const onTime = dueOn === day
      const catchingUp = t.id === 't_kowhai' && diffDays(dueOn, day) === CATCH_UP_AFTER_DAYS
      if (!onTime && !catchingUp) continue

      const periods = catchingUp ? Math.floor(diffDays(dueOn, day) / cycle) + 1 : 1
      const amount = t.weeklyRent * (cycle / 7) * periods
      t.rentPaidTo = addDays(t.rentPaidTo, cycle * periods)

      const property = propertyById.get(t.propertyId)
      const skim = property ? round2((amount * property.sinkingFund.ratePct) / 100) : 0
      if (property) property.sinkingFund.balance = round2(property.sinkingFund.balance + skim)

      if (t.orgId !== DEMO_ORG || !property) continue
      const id = `led_${t.id}_${dueOn}`
      const reference = `${property.address.line1.replace(/^\d+[A-Z]?\/?\d*\s*/, '').split(' ')[0].toUpperCase()} RENT`
      ledger.push({
        id,
        orgId: t.orgId,
        propertyId: t.propertyId,
        tenancyId: t.id,
        date: day,
        kind: 'rent',
        amount,
        category: 'rent',
        description: periods > 1 ? `Rent, ${periods} weeks from ${fmtDate(dueOn, { weekday: false, year: 'never' })}` : `Rent, week from ${fmtDate(dueOn, { weekday: false, year: 'never' })}`,
        bankRef: reference,
        match: 'auto',
        dueDate: dueOn,
      })
      bankLines.push({ id: `bl_${id}`, orgId: t.orgId, date: day, amount, reference, payer: userName(t.tenantIds[0]).toUpperCase(), status: 'matched', ledgerId: id })
      log.push({
        id: `ap_sim_${id}`,
        orgId: t.orgId,
        at: instant(day, 9, 12),
        kind: 'rent',
        text: catchingUp
          ? `Matched ${money(amount)} from ${userName(t.tenantIds[0])} — ${property.address.line1} is paid up again. Closed the arrears file.`
          : `Matched ${money(amount)} from ${userName(t.tenantIds[0])} to ${property.address.line1} and set aside ${money(skim, { cents: true })} for the sinking fund.`,
      })
      if (catchingUp) {
        arrearsEvents.push({ id: `ae_sim_${dueOn}`, orgId: t.orgId, tenancyId: t.id, at: instant(day, 9, 12), kind: 'cleared', note: 'Paid in full. (Simulated bank feed.)' })
      }
    }
  }

  return {
    ...db,
    simulatedThrough: today,
    tenancies,
    properties,
    ledger: ledger.length ? [...ledger.reverse(), ...db.ledger] : db.ledger,
    bankLines: bankLines.length ? [...bankLines.reverse(), ...db.bankLines] : db.bankLines,
    autopilotLog: log.length ? [...log.reverse(), ...db.autopilotLog].slice(0, 200) : db.autopilotLog,
    arrearsEvents: arrearsEvents.length ? [...arrearsEvents, ...db.arrearsEvents] : db.arrearsEvents,
  }
}
