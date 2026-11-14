import { describe, expect, it } from 'vitest'
import { buildSeed, DEMO } from './index'
import { rollForward } from './simulate'
import { sweep, approveIncident, PROMOTE_AFTER_APPROVALS } from '../healing'
import { landlordActions } from '../actions'
import { resolvePack, regionOf } from '../jurisdictions'
import { calendarFor } from '../rules/core'
import { complianceReport } from '../rules/compliance'
import { arrearsState } from '../rules/tenancy'
import { addDays } from '../rules/calendar'
import { passportOf } from '../passport'
import { ask } from '../copilot'

const pack = resolvePack('NZ')

/** The demo has to tell the same story whatever day it is opened: weekdays, weekends, Christmas, Easter. */
const DAYS = ['2026-11-14', '2026-11-16', '2026-12-24', '2026-12-31', '2027-01-04', '2027-02-01', '2027-03-26', '2027-03-30', '2027-06-25', '2027-10-25', '2028-02-29']

describe('the demo world', () => {
  it.each(DAYS)('tells its story when opened on %s', (day) => {
    const db = buildSeed(day)
    const actions = landlordActions(db, DEMO.org, pack, day)
    const kinds = actions.map((a) => a.kind)

    // The decisions the demo is built around are all waiting.
    expect(kinds).toContain('bond')
    expect(kinds).toContain('arrears')
    expect(kinds).toContain('quote')
    expect(kinds).toContain('pet')
    expect(kinds).toContain('fixed_term')
    expect(kinds).toContain('inspection')
    expect(kinds).toContain('applications')
    expect(new Set(actions.map((a) => a.id)).size).toBe(actions.length)

    // Wiremu is exactly one day late; everyone else in the portfolio is paid up.
    const late = db.tenancies
      .filter((t) => t.orgId === DEMO.org && t.status === 'active')
      .map((t) => {
        const p = db.properties.find((x) => x.id === t.propertyId)!
        return { id: t.id, a: arrearsState(pack, calendarFor(pack, regionOf(p.address.city)), t, day) }
      })
    expect(late.find((x) => x.id === 't_kowhai')?.a.daysLate).toBe(1)
    expect(late.filter((x) => x.a.daysLate > 0)).toHaveLength(1)

    // The bond for Ngaio Street is unlodged and inside its deadline.
    const bond = actions.find((a) => a.kind === 'bond')!
    expect(bond.refId).toBe('t_ngaio')
    expect(bond.due! >= day).toBe(true)

    // The pet request has nine days left.
    expect(actions.find((a) => a.kind === 'pet')?.due).toBe(addDays(day, 9))
  })

  it('scores each property from its own record', () => {
    const day = '2026-11-14'
    const db = buildSeed(day)
    const score = (id: string) => {
      const p = db.properties.find((x) => x.id === id)!
      const t = db.tenancies.find((x) => x.propertyId === id && x.status === 'active')
      const last = db.inspections.filter((i) => i.propertyId === id && i.status === 'completed').sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
      return complianceReport(pack, calendarFor(pack, 'nelson'), p, t, last, day)
    }
    expect(score('p_beach').score).toBe(100)
    expect(score('p_totara').score).toBeGreaterThanOrEqual(90)
    // Ngaio Street: no bond lodged, no healthy homes statement, no insurance statement, heating unassessed.
    const ngaio = score('p_ngaio')
    expect(ngaio.score).toBeLessThanOrEqual(75)
    expect(ngaio.checks.filter((c) => c.status === 'fail').map((c) => c.def.key)).toEqual(expect.arrayContaining(['hh_statement', 'insurance_statement']))
  })

  it('has unique ids in every collection', () => {
    const db = buildSeed('2026-11-14')
    for (const [key, rows] of Object.entries(db)) {
      if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== 'object') continue
      const ids = (rows as { id: string }[]).map((r) => r.id)
      expect(new Set(ids).size, key).toBe(ids.length)
    }
  })

  it('gives Pool a map worth searching', () => {
    const db = buildSeed('2026-11-14')
    const live = db.properties.filter((p) => p.listing?.status === 'live')
    expect(live.length).toBeGreaterThanOrEqual(8)
    for (const p of live) expect(p.listing!.advertisedWeeklyRent).toBeGreaterThan(200)
  })
})

describe('the simulated bank feed', () => {
  it('keeps on-time tenants paid as days pass, and leaves the late one late', () => {
    const start = '2026-11-14'
    const later = addDays(start, 4)
    const db = rollForward(buildSeed(start), later)
    const state = (id: string) => {
      const t = db.tenancies.find((x) => x.id === id)!
      return arrearsState(pack, calendarFor(pack, 'nelson'), t, later)
    }
    expect(state('t_totara').daysLate).toBe(0)
    expect(state('t_beach').daysLate).toBe(0)
    expect(state('t_ngaio').daysLate).toBe(0)
    expect(state('t_kowhai').daysLate).toBe(5)
    expect(db.simulatedThrough).toBe(later)
  })

  it('has the late tenant catch up, so a demo left for weeks does not rot', () => {
    const start = '2026-11-14'
    const later = addDays(start, 20)
    const db = rollForward(buildSeed(start), later)
    const t = db.tenancies.find((x) => x.id === 't_kowhai')!
    expect(arrearsState(pack, calendarFor(pack, 'nelson'), t, later).daysLate).toBe(0)
    expect(db.arrearsEvents.some((e) => e.kind === 'cleared' && e.id.startsWith('ae_sim_'))).toBe(true)
  })

  it('never touches a day twice', () => {
    const db = rollForward(buildSeed('2026-11-14'), '2026-11-20')
    expect(rollForward(db, '2026-11-20')).toBe(db)
  })
})

describe('the self-healing sweep', () => {
  const day = '2026-11-14'

  it('fixes what is safe and queues what is not', () => {
    const db = buildSeed(day)
    const result = sweep(db, day)
    const after = { ...db, ...result.patch }
    const by = (playbook: string) => after.incidents.filter((i) => i.playbookId === playbook && i.detectedAt.slice(0, 4) >= '2026' && !i.id.startsWith('inc_h'))

    // Safe: the duplicate bank line is ignored and the stale applicant data is purged, without anyone asking.
    expect(by('pb_dupe_bank')[0]?.status).toBe('auto_healed')
    expect(after.bankLines.find((l) => l.id === 'bl_dupe')?.status).toBe('ignored')
    expect(by('pb_privacy_purge')[0]?.status).toBe('auto_healed')
    expect(after.applications.find((a) => a.id === 'ap_stale')).toMatchObject({ purged: true, message: '' })

    // Not safe to do unasked: these wait for a person.
    expect(by('pb_stale_listing')[0]?.status).toBe('awaiting_approval')
    expect(by('pb_fuzzy_match')[0]?.status).toBe('awaiting_approval')
    expect(by('pb_bond_ref')[0]?.status).toBe('awaiting_approval')
    expect(result.healed).toBe(2)
    expect(result.awaiting).toBeGreaterThanOrEqual(3)
  })

  it('does not raise the same fault twice', () => {
    const db = buildSeed(day)
    const once = { ...db, ...sweep(db, day).patch }
    expect(sweep(once, day).found).toBe(0)
  })

  it('suggests promoting a playbook after three clean approvals — and only suggests', () => {
    const db = buildSeed(day)
    const swept = { ...db, ...sweep(db, day).patch }
    const incident = swept.incidents.find((i) => i.playbookId === 'pb_stale_listing' && i.status === 'awaiting_approval')!
    const before = swept.playbooks.find((p) => p.id === 'pb_stale_listing')!
    expect(before.approvals).toBe(PROMOTE_AFTER_APPROVALS - 1)

    const after = { ...swept, ...approveIncident(swept, incident.id, 'Riley Chen', day) }
    const playbook = after.playbooks.find((p) => p.id === 'pb_stale_listing')!
    expect(playbook.promotionSuggested).toBe(true)
    expect(playbook.mode).toBe('approval')
    expect(after.properties.find((p) => p.id === incident.refs[0].id)?.listing?.status).toBe('paused')
  })
})

describe('the Rent Passport', () => {
  const db = buildSeed('2026-11-14')
  const of = (userId: string) => passportOf(db.renterProfiles.find((p) => p.userId === userId)!, '2026-11-14')

  it('summarises verified history into a score', () => {
    const mia = of(DEMO.tenant)
    expect(mia.score).toBeGreaterThanOrEqual(90)
    expect(mia.verifiedTenancies).toBe(2)
  })

  it('gives no score — not a low one — to someone with no verified history', () => {
    const chloe = of(DEMO.applicant)
    expect(chloe.score).toBeNull()
    expect(chloe.band).toBe('building')
  })

  it('ignores self-reported history', () => {
    expect(of('u_ravi').score).toBeNull()
  })
})

describe('the assistant', () => {
  const day = '2026-11-14'
  const db = buildSeed(day)
  const ctx = { db, pack, portal: 'loop' as const, userId: DEMO.landlord, orgId: DEMO.org, today: day }

  it('answers from the rule pack, with sources and the asker’s own figures', () => {
    const a = ask('When can I next increase the rent?', ctx)!
    expect(a.intent).toBe('rent_increase')
    expect(a.citations.length).toBeGreaterThan(0)
    expect(a.figures.some((f) => f.label === '14 Tōtara Rise')).toBe(true)
    expect(a.figures.find((f) => f.label === '3/27 Beachcomber Lane')?.value).toMatch(/fixed term/)
  })

  it.each([
    ['How long do I have to lodge a bond?', 'bond'],
    ['Can I charge a late fee?', 'late_fee'],
    ['My tenant is behind on rent', 'arrears'],
    ['Can I say no to a dog?', 'pets'],
    ['Do I need permission to show buyers through?', 'viewings'],
    ['Is mortgage interest deductible?', 'tax_interest'],
    ['What happens when the fixed term ends?', 'fixed_term'],
    ['Can I ask applicants for bank statements?', 'privacy'],
    ['How much notice to end the tenancy?', 'ending'],
  ])('understands “%s”', (question, intent) => {
    expect(ask(question, ctx)?.intent).toBe(intent)
  })

  it('uses what a person taught it', () => {
    expect(ask('Who pays the water bill?', ctx)?.taughtBy).toBe('Mere Parata')
  })

  it('says nothing rather than guess', () => {
    expect(ask('Can I charge for a lost garage remote?', ctx)).toBeNull()
  })
})
