/**
 * A published law change has to reach the words as well as the dates. These
 * tests publish a change the way Rulewatch does — a `RulePackVersion` laid
 * over the shipped pack by `resolvePack` — and read what the assistant and the
 * action queue then say.
 */
import { describe, expect, it } from 'vitest'
import type { RulePackVersion } from './types'
import type { JurisdictionPack } from './jurisdictions/types'
import { buildSeed, DEMO } from './seed'
import { resolvePack } from './jurisdictions'
import { addDays } from './rules/calendar'
import { landlordActions } from './actions'
import { ask, suggestedQuestions, type Answer, type AskContext } from './copilot'
import { aDuration, durationAdjective } from './rules/core'

const TODAY = '2026-11-14'
const seeded = buildSeed(TODAY)
/** The taught answers are put aside: one of them is keyed on “smoke”, which would answer for the smoke alarm rules. */
const db = { ...seeded, kb: [] }
const shipped = resolvePack('NZ', db.packVersions)

/** The pack as it stands once a reviewed change has been published. */
function publish(overrides: RulePackVersion['overrides']): JurisdictionPack {
  const version: RulePackVersion = {
    id: 'pv_test',
    jurisdiction: 'NZ',
    version: '2026.11.1',
    publishedAt: '2026-11-14T04:00:00.000Z',
    publishedBy: 'Mere Parata',
    note: 'A change made for this test.',
    overrides,
    changeIds: [],
  }
  return resolvePack('NZ', [...db.packVersions, version])
}

const owner = (pack: JurisdictionPack): AskContext => ({
  db,
  pack,
  portal: 'loop',
  userId: DEMO.landlord,
  orgId: DEMO.org,
  today: TODAY,
})
const renter = (pack: JurisdictionPack): AskContext => ({ db, pack, portal: 'pool', userId: DEMO.tenant, today: TODAY })

/** The words as a person reads them: without the invisible joiner that keeps “14-day” on one line. */
const plain = (s: string): string => s.replaceAll('⁠', '')

/** Everything an answer says, as one piece of text. */
const words = (a: Answer | null): string => {
  if (!a) throw new Error('The assistant had no answer.')
  return plain([a.headline, ...a.body, ...a.figures.flatMap((f) => [f.label, f.value, f.note ?? ''])].join('\n'))
}
const said = (question: string, pack: JurisdictionPack, as = owner) => words(ask(question, as(pack)))

describe('a published change reaches the sentences', () => {
  const changed = publish({
    'rent_increase.notice': { n: 90, unit: 'days' },
    'bond.lodgement_deadline': { n: 10, unit: 'working_days' },
  })

  it('is the pack the calculators read', () => {
    expect(changed.rules['rent_increase.notice'].value).toEqual({ n: 90, unit: 'days' })
    expect(changed.rules['bond.lodgement_deadline'].value).toEqual({ n: 10, unit: 'working_days' })
    expect(changed.version).toBe('2026.11.1')
  })

  it('in the assistant’s answer on rent increases', () => {
    const question = 'When can I next increase the rent?'
    expect(said(question, shipped)).toContain('with at least 60 days of written notice')
    const after = said(question, changed)
    expect(after).toContain('with at least 90 days of written notice')
    expect(after).not.toContain('60 days')
  })

  it('in the assistant’s answer on bonds, and wherever else the deadline is mentioned', () => {
    const question = 'How long do I have to lodge a bond?'
    expect(said(question, shipped)).toContain('must be lodged within 23 working days of receiving it')
    const after = said(question, changed)
    expect(after).toContain('must be lodged within 10 working days of receiving it')
    expect(after).not.toContain('23 working days')

    expect(said('What counts as a working day?', shipped)).toContain('the 23 working days to lodge a bond')
    const days = said('What counts as a working day?', changed)
    expect(days).toContain('the 10 working days to lodge a bond')
    expect(days).not.toContain('23 working days')
  })

  it('in the action queue’s sentence about a late bond', () => {
    const received = db.tenancies.find((t) => t.id === 't_ngaio')!.bond.receivedOn!
    // Long enough after the money arrived to be past the deadline under either pack.
    const day = addDays(received, 60)
    const bond = (pack: JurisdictionPack) => landlordActions(db, DEMO.org, pack, day).find((a) => a.kind === 'bond')!
    expect(bond(shipped).body).toContain('and the 23 working days ran out on')
    expect(bond(changed).body).toContain('and the 10 working days ran out on')
    expect(bond(changed).body).not.toContain('23 working days')
    // The sentence and the date beside it come from the same rule.
    expect(bond(changed).due! < bond(shipped).due!).toBe(true)
  })

  it('in the action queue’s sentences about arrears', () => {
    const arrears = publish({
      'arrears.remedy_notice': { n: 18, unit: 'days' },
      'arrears.tribunal_threshold': { n: 28, unit: 'days' },
    })
    const item = (pack: JurisdictionPack, daysOn: number) =>
      landlordActions(db, DEMO.org, pack, addDays(TODAY, daysOn)).find(
        (a) => a.kind === 'arrears' && a.refId === 't_kowhai',
      )!

    expect(plain(item(shipped, 4).title)).toBe('Send Wiremu a 14-day notice to remedy')
    expect(plain(item(shipped, 4).body)).toContain('The notice starts a 14-day clock')
    expect(plain(item(arrears, 4).title)).toBe('Send Wiremu an 18-day notice to remedy')
    expect(plain(item(arrears, 4).body)).toContain('The notice starts an 18-day clock')
    expect(plain(item(arrears, 4).body)).not.toContain('14-day')

    expect(item(shipped, 30).body).toContain('At 21 days in arrears the Tribunal must end the tenancy')
    expect(item(arrears, 30).body).toContain('At 28 days in arrears the Tribunal must end the tenancy')
    expect(item(arrears, 30).body).not.toContain('21 days')
  })
})

describe('every figure the pack holds is read from it', () => {
  const far = publish({
    'bond.max_weeks': 6,
    'bond.pet_max_weeks': 3,
    'bond.lodgement_deadline': { n: 10, unit: 'working_days' },
    'rent.in_advance_max_weeks': 1,
    'rent_increase.min_interval_months': 24,
    'entry.inspection_notice_min': { n: 72, unit: 'hours' },
    'entry.inspection_notice_max': { n: 10, unit: 'days' },
    'entry.inspection_min_interval': { n: 8, unit: 'weeks' },
    'entry.repairs_notice_min': { n: 36, unit: 'hours' },
    'entry.hours': { from: 9, to: 18 },
    'termination.landlord_periodic_notice': { n: 120, unit: 'days' },
    'termination.owner_occupy_notice': { n: 63, unit: 'days' },
    'termination.sale_notice': { n: 56, unit: 'days' },
    'termination.tenant_periodic_notice': { n: 28, unit: 'days' },
    'fixed_term.notice_window': { earliest: { n: 100, unit: 'days' }, latest: { n: 30, unit: 'days' } },
    'pets.response_deadline': { n: 15, unit: 'days' },
    'arrears.remedy_notice': { n: 18, unit: 'days' },
    'arrears.tribunal_threshold': { n: 35, unit: 'days' },
    'arrears.repeat_rule': { occasions: 4, lateBy: { n: 7, unit: 'working_days' }, within: { n: 150, unit: 'days' } },
    'damage.careless_cap_weeks': 5,
    'privacy.unsuccessful_applicant_retention': { n: 45, unit: 'days' },
  })

  /** A question, what the answer says under the shipped pack, what it says after the change, and what must be gone. */
  const cases: [question: string, before: string[], after: string[], gone: string[]][] = [
    [
      'When can I next increase the rent?',
      ['once every 12 months', 'The 12 months run from the start'],
      ['once every 24 months', 'The 24 months run from the start'],
      ['12 months'],
    ],
    [
      'How long do I have to lodge a bond?',
      ['A bond is at most 4 weeks of rent', 'a pet bond of up to 2 weeks of rent'],
      ['A bond is at most 6 weeks of rent', 'a pet bond of up to 3 weeks of rent'],
      ['4 weeks', '2 weeks'],
    ],
    [
      'How much notice for an inspection?',
      [
        'An inspection needs 48 hours to 14 days of notice, between 8 am and 7 pm, and no more than once in 4 weeks.',
        'The 48 hours run from when the tenant receives it — an email after 5 pm counts',
      ],
      [
        'An inspection needs 72 hours to 10 days of notice, between 9 am and 6 pm, and no more than once in 8 weeks.',
        'The 72 hours run from when the tenant receives it',
      ],
      ['48 hours', '14 days', '8 am', '7 pm', '4 weeks'],
    ],
    [
      'Can I enter for repairs?',
      [
        'Repairs need 24 hours of notice;',
        'at least 24 hours, with the reason, between 8 am and 7 pm.',
        'A routine inspection is 48 hours to 14 days.',
      ],
      [
        'Repairs need 36 hours of notice;',
        'at least 36 hours, with the reason, between 9 am and 6 pm.',
        'A routine inspection is 72 hours to 10 days.',
      ],
      ['24 hours', '48 hours', '14 days', '7 pm'],
    ],
    [
      'What happens when the fixed term ends?',
      ['unless someone gives notice between 90 and 21 days before it ends'],
      ['unless someone gives notice between 100 and 30 days before it ends'],
      ['90 and 21'],
    ],
    [
      'How much notice to end the tenancy?',
      [
        'A periodic tenancy: 90 days from the landlord, 42 days if the home is sold or the owner is moving in, 21 days from the tenant.',
        'The 42-day grounds have conditions.',
        'A notice shorter than 90 days must state its reason.',
        'if a 90-day notice is emailed today',
      ],
      [
        'A periodic tenancy: 120 days from the landlord, 56 days if the home is sold, 63 days if the owner is moving in, 28 days from the tenant.',
        'The shorter periods have conditions.',
        'A notice shorter than 120 days must state its reason.',
        'if a 120-day notice is emailed today',
      ],
      ['42 days', '42-day', '21 days', '90 days from', 'shorter than 90 days', '90-day'],
    ],
    [
      'Can I say no to a dog?',
      ['must answer a written pet request within 21 days', 'a pet bond of up to 2 weeks of rent'],
      ['must answer a written pet request within 15 days', 'a pet bond of up to 3 weeks of rent'],
      ['21 days', '2 weeks'],
    ],
    [
      'My tenant is behind on rent',
      [
        'then a 14-day notice to remedy; at 21 days behind',
        'allowing at least 14 days',
        'at least 5 working days late 3 times in 90 days',
        'Reaches 21 days on',
      ],
      [
        'then an 18-day notice to remedy; at 35 days behind',
        'allowing at least 18 days',
        'at least 7 working days late 4 times in 150 days',
        'Reaches 35 days on',
      ],
      ['14-day', '14 days', '21 days', '5 working days', '3 times', '90 days'],
    ],
    [
      'Who pays for damage?',
      ['the lesser of the landlord’s insurance excess and 4 weeks of rent'],
      ['the lesser of the landlord’s insurance excess and 5 weeks of rent'],
      ['4 weeks'],
    ],
    [
      'I am selling the house',
      ['42 days of notice, once the sale is unconditional', 'The 42-day notice', 'Before that, the notice is 90 days.'],
      [
        '56 days of notice, once the sale is unconditional',
        'The 56-day notice',
        'Before that, the notice is 120 days.',
      ],
      ['42 days', '42-day', '90 days'],
    ],
    [
      'What can I ask an applicant for?',
      ['details are deleted after 30 days'],
      ['details are deleted after 45 days'],
      ['30 days'],
    ],
    [
      'Can I ask for rent in advance?',
      ['No more than 2 weeks of rent can be asked for in advance.'],
      ['No more than 1 week of rent can be asked for in advance.'],
      ['2 weeks'],
    ],
    [
      'Do I need a smoke alarm?',
      ['Checking them needs 24 hours of notice'],
      ['Checking them needs 36 hours of notice'],
      ['24 hours'],
    ],
  ]

  it.each(cases)('“%s”', (question, before, after, gone) => {
    const was = said(question, shipped)
    for (const phrase of before) expect(was).toContain(phrase)
    const now = said(question, far)
    for (const phrase of after) expect(now).toContain(phrase)
    for (const phrase of gone) expect(now).not.toContain(phrase)
  })

  it('a renter is told their own notice, not the landlord’s', () => {
    expect(said('How much notice to end the tenancy?', shipped, renter)).toContain(
      'Earliest end date if you give notice today.',
    )
    expect(said('How much notice to end the tenancy?', far, renter)).toContain('28 days from the tenant')
  })

  it('reads the Tribunal’s limit, the closed days and the email cut-off from the pack too', () => {
    expect(said('How do I apply to the Tribunal?', shipped)).toContain('hears claims up to $100,000.')
    const raised = { ...shipped, tribunal: { ...shipped.tribunal, maxClaim: 150_000 } }
    expect(said('How do I apply to the Tribunal?', raised)).toContain('hears claims up to $150,000.')

    expect(said('What counts as a working day?', shipped)).toContain('nothing from 24 December to 3 January.')
    const longer = { ...shipped, calendar: { ...shipped.calendar, closedPeriod: { from: '12-20', to: '01-10' } } }
    expect(said('What counts as a working day?', longer)).toContain('nothing from 20 December to 10 January.')
    expect(said('How long do I have to lodge a bond?', longer)).toContain('and 20 December to 10 January.')

    const earlier = {
      ...shipped,
      service: shipped.service.map((m) => (m.id === 'email' ? { ...m, cutoffHour: 16 } : m)),
    }
    expect(said('How much notice for an inspection?', earlier)).toContain('an email after 4 pm counts')
  })

  it('reads each penalty from the pack’s table', () => {
    expect(said('How long do I have to lodge a bond?', shipped)).toContain(
      'an unlawful act, with exemplary damages of up to $1,500.',
    )
    expect(said('Can I enter for repairs?', shipped)).toContain(
      'Entering without either is an unlawful act — up to $1,500.',
    )
    expect(said('How much notice to end the tenancy?', shipped)).toContain('is an unlawful act — each up to $6,500.')
    expect(said('Can I say no to a dog?', shipped)).toContain('not answering is an unlawful act (up to $1,500).')
    expect(said('Who pays for damage?', shipped)).toContain('is itself an unlawful act (up to $1,800).')
    expect(said('What are the healthy homes standards?', shipped)).toContain('A breach can cost up to $7,200.')

    const raised = {
      ...shipped,
      penalties: shipped.penalties.map((p) =>
        p.key === 'bond_not_lodged' ? { ...p, max: 2_000 } : p.key === 'untrue_ground' ? { ...p, max: 9_000 } : p,
      ),
    }
    const bond = said('How long do I have to lodge a bond?', raised)
    expect(bond).toContain('exemplary damages of up to $2,000.')
    expect(bond).not.toContain('$1,500')
    expect(said('How much notice to end the tenancy?', raised)).toContain(
      'is an unlawful act — up to $6,500 for the first and $9,000 for the second.',
    )
  })

  it('names the bond authority and the regulator as the pack names them', () => {
    const bond = said('How long do I have to lodge a bond?', shipped)
    expect(bond).toContain(`Lodgement is online, through ${shipped.bondAuthority.name}.`)
    expect(said('Can I swap a flatmate?', shipped)).toContain(`on the bond with ${shipped.bondAuthority.name}.`)

    const elsewhere = {
      ...shipped,
      regulator: { ...shipped.regulator, name: 'The Housing Office' },
      bondAuthority: { ...shipped.bondAuthority, name: 'The Bond Office' },
    }
    const answer = said('How long do I have to lodge a bond?', elsewhere)
    expect(answer).toContain('Lodgement is online, through The Bond Office.')
    expect(answer).toContain('made through The Bond Office.')
    expect(answer).not.toContain('Bond Hub')

    const item = (pack: JurisdictionPack) => landlordActions(db, DEMO.org, pack, TODAY).find((a) => a.kind === 'bond')!
    // The button stays short enough for a phone; the sentence above it says where the bond goes.
    expect(item(shipped).body).toContain(`It has to reach ${shipped.bondAuthority.name} by`)
    expect(item(shipped).cta).toBe('Lodge the bond')
    expect(item(elsewhere).body).toContain('It has to reach The Bond Office by')
  })
})

describe('where a place has no such rule', () => {
  const without = publish({
    'bond.pet_max_weeks': null,
    'entry.inspection_notice_max': null,
    'entry.hours': null,
    'termination.landlord_periodic_notice': null,
    'termination.owner_occupy_notice': null,
    'termination.sale_notice': null,
    'fixed_term.notice_window': null,
    'pets.response_deadline': null,
    'arrears.repeat_rule': null,
    'damage.careless_cap_weeks': null,
  })
  const bare: JurisdictionPack = {
    ...without,
    penalties: [],
    tribunal: { ...without.tribunal, maxClaim: null },
    calendar: { ...without.calendar, closedPeriod: undefined },
    service: without.service.map((m) => ({ ...m, cutoffHour: undefined })),
  }

  const QUESTIONS = [
    'When can I next increase the rent?',
    'How long do I have to lodge a bond?',
    'How much notice for an inspection?',
    'Do I need permission to show buyers through?',
    'Can I enter for repairs?',
    'What happens when the fixed term ends?',
    'How much notice to end the tenancy?',
    'Can I say no to a dog?',
    'Can I charge a late fee?',
    'My tenant is behind on rent',
    'Who pays for damage?',
    'What are the healthy homes standards?',
    'Do I need a smoke alarm?',
    'Is mortgage interest deductible?',
    'What expenses can I claim at tax time?',
    'I am selling the house',
    'Can I swap a flatmate?',
    'Can a renter outbid someone?',
    'What can I ask an applicant for?',
    'How do I apply to the Tribunal?',
    'Can I ask for rent in advance?',
    'What if the house tests positive for meth?',
    'What counts as a working day?',
    'How much does Loop cost?',
  ]

  it('has a question here for every kind of answer the assistant gives', () => {
    const intents = new Set(QUESTIONS.map((q) => ask(q, owner(shipped))?.intent))
    expect(intents.has(undefined)).toBe(false)
    expect(intents.size).toBe(QUESTIONS.length)
  })

  it.each(QUESTIONS)('“%s” never prints an empty value', (question) => {
    for (const pack of [without, bare]) {
      for (const as of [owner, renter]) {
        const text = said(question, pack, as)
        expect(text).not.toMatch(/\b(null|undefined|NaN)\b/)
        expect(text).not.toMatch(/ {2}|\( ?\)| ,| \./)
      }
    }
  })

  it('says so in a sentence', () => {
    expect(said('How long do I have to lodge a bond?', without)).toContain('A separate pet bond is not permitted here.')
    expect(said('How much notice for an inspection?', without)).toContain(
      'An inspection needs at least 48 hours of notice, and no more than once in 4 weeks.',
    )
    expect(said('What happens when the fixed term ends?', without)).toContain(
      'There is no set window for giving notice before a fixed term ends here.',
    )
    expect(said('Can I say no to a dog?', without)).toContain('There is no set time to answer one here.')
    expect(said('Who pays for damage?', without)).toContain('There is no set cap on other damage here.')
    expect(said('I am selling the house', without)).toContain('There is no shorter notice for a sale here.')

    const ending = ask('How much notice to end the tenancy?', owner(without))!
    expect(ending.headline).toBe(
      'A periodic tenancy: no notice from the landlord without a ground, 21 days from the tenant.',
    )
    // With no notice a landlord can give, there is no end date to work out.
    expect(ending.figures).toEqual([])
    expect(words(ending)).not.toContain('90 days')

    const arrears = said('My tenant is behind on rent', without)
    expect(arrears).not.toContain('working days late')
    expect(arrears).toContain('a 14-day notice to remedy')
  })

  it('leaves out an amount the pack does not list, and the limit the Tribunal does not have', () => {
    expect(said('How long do I have to lodge a bond?', bare)).toContain(
      'Not lodging a bond on time is an unlawful act.',
    )
    expect(said('Can I enter for repairs?', bare)).toContain('Entering without either is an unlawful act.')
    expect(said('How do I apply to the Tribunal?', bare)).toContain('The Tenancy Tribunal hears claims. It costs')
    expect(said('What counts as a working day?', bare)).toContain('no weekends, no public holidays.')
    for (const question of QUESTIONS.filter((q) => !/cost|Tribunal/.test(q))) {
      expect(said(question, bare), question).not.toContain('up to $')
    }
  })

  it('keeps the action queue in sentences as well', () => {
    for (const day of [TODAY, addDays(TODAY, 4), addDays(TODAY, 30), addDays(TODAY, 90)]) {
      for (const a of landlordActions(db, DEMO.org, bare, day)) {
        expect(`${a.title}\n${a.body}\n${a.clock ?? ''}\n${a.cta}`).not.toMatch(/\b(null|undefined|NaN)\b/)
      }
    }
  })
})

describe('a duration in front of a noun', () => {
  it('takes the unit in the singular', () => {
    expect(plain(durationAdjective({ n: 14, unit: 'days' }))).toBe('14-day')
    expect(plain(durationAdjective({ n: 23, unit: 'working_days' }))).toBe('23-working-day')
    expect(plain(durationAdjective({ n: 48, unit: 'hours' }))).toBe('48-hour')
    expect(plain(durationAdjective({ n: 4, unit: 'weeks' }))).toBe('4-week')
    expect(plain(durationAdjective({ n: 12, unit: 'months' }))).toBe('12-month')
  })

  it('cannot be split across two lines', () => {
    // A hyphen, then a word joiner: no width, no glyph, and no line break after the hyphen.
    expect(durationAdjective({ n: 14, unit: 'days' })).toBe('14-\u2060day')
    expect(durationAdjective({ n: 23, unit: 'working_days' })).toBe('23-\u2060working-\u2060day')
  })

  it('takes the article its number is said with', () => {
    expect(plain(aDuration({ n: 14, unit: 'days' }))).toBe('a 14-day')
    expect(plain(aDuration({ n: 90, unit: 'days' }))).toBe('a 90-day')
    expect(plain(aDuration({ n: 8, unit: 'weeks' }))).toBe('an 8-week')
    expect(plain(aDuration({ n: 11, unit: 'days' }))).toBe('an 11-day')
    expect(plain(aDuration({ n: 18, unit: 'days' }))).toBe('an 18-day')
    expect(plain(aDuration({ n: 80, unit: 'days' }))).toBe('an 80-day')
    expect(plain(aDuration({ n: 110, unit: 'days' }))).toBe('a 110-day')
    expect(plain(aDuration({ n: 180, unit: 'days' }))).toBe('a 180-day')
  })
})

describe('outside sources', () => {
  const levels = (question: string) => ask(question, owner(shipped))!.citations.map((c) => c.verified)

  it('are called “read at source” only where the research read them at source', () => {
    // Each level is the one docs/research gives the page; copilot.ts says where beside each link.
    expect(levels('What are the healthy homes standards?')).toEqual(['secondary', 'primary'])
    expect(levels('Do I need a smoke alarm?')).toEqual(['secondary'])
    expect(levels('Is mortgage interest deductible?')).toEqual(['primary', 'primary'])
    expect(levels('What expenses can I claim at tax time?')).toEqual(['secondary', 'primary'])
    expect(levels('What can I ask an applicant for?')[0]).toBe('primary')
    expect(levels('How do I apply to the Tribunal?')).toEqual(['unverified', 'primary'])
    expect(levels('What if the house tests positive for meth?')).toEqual(['primary'])
    expect(levels('What counts as a working day?')).toEqual(['primary'])
  })

  it('never show a taught answer’s link as read at source', () => {
    const taught = ask('Who pays the water bill?', { ...owner(shipped), db: seeded })!
    expect(taught.taughtBy).toBe('Mere Parata')
    expect(taught.citations.map((c) => c.verified)).toEqual(['secondary'])
  })

  it('carry a real date', () => {
    for (const question of [
      'What are the healthy homes standards?',
      'How do I apply to the Tribunal?',
      'How long do I have to lodge a bond?',
    ]) {
      for (const c of ask(question, owner(shipped))!.citations) expect(c.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('the questions the assistant offers', () => {
  // With the taught answers in place, as a person using the demo meets them.
  const live = (as: typeof owner): AskContext => ({ ...as(shipped), db: seeded })

  it('can all be answered, in both portals', () => {
    for (const ctx of [live(owner), live(renter)]) {
      for (const question of suggestedQuestions(ctx)) {
        expect(ask(question, ctx), `${ctx.portal}: ${question}`).not.toBeNull()
      }
    }
  })

  it('answers a renter asking how much notice to give with the tenant’s own period', () => {
    const answer = ask('How much notice do I give to move out?', live(renter))
    expect(answer?.intent).toBe('ending')
    expect(words(answer)).toContain('21 days from the tenant')
  })

  it('finds the ending rules by any form of the word', () => {
    for (const question of ['Can I terminate the tenancy?', 'How do I evict a tenant?', 'My tenants are moving out']) {
      expect(ask(question, live(owner))?.intent, question).toBe('ending')
    }
  })

  it('keeps a taught answer on smoking away from the smoke alarm rules', () => {
    expect(ask('Do I need a smoke alarm in the hallway?', live(owner))?.intent).toBe('smoke_alarms')
    expect(ask('Can I ban smoking?', live(owner))?.intent).toBe('kb:kb_smoking')
    expect(ask('Can the tenant smoke inside?', live(owner))?.intent).toBe('kb:kb_smoking')
  })
})

describe('a change that is published and has not commenced', () => {
  const version: RulePackVersion = {
    id: 'pv_early',
    jurisdiction: 'NZ',
    version: '2026.11.1',
    publishedAt: '2026-11-14T04:00:00.000Z',
    publishedBy: 'Mere Parata',
    note: 'Published ahead of its commencement date.',
    overrides: { 'rent_increase.notice': { n: 90, unit: 'days' } },
    commences: { 'rent_increase.notice': '2027-07-01' },
    changeIds: [],
  }
  const question = 'When can I next increase the rent?'

  it('leaves the answer on today’s law and says what is coming', () => {
    const early = said(question, resolvePack('NZ', [...db.packVersions, version], TODAY))
    expect(early).toContain('with at least 60 days of written notice')
    expect(early).toContain('This is changing. From 1 Jul 2027')
    expect(early).toContain('becomes 90 days')
  })

  it('gives the new law from the day it commences, with nothing left to announce', () => {
    const later = said(question, resolvePack('NZ', [...db.packVersions, version], '2027-07-01'))
    expect(later).toContain('with at least 90 days of written notice')
    expect(later).not.toContain('This is changing')
  })
})
