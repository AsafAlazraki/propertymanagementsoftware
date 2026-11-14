import { describe, expect, it } from 'vitest'
import type { RuleChange, RulePatch } from './types'
import { buildSeed } from './seed'
import { PACKS, resolvePack } from './jurisdictions'
import { calendarFor } from './rules/core'
import { diffDays } from './rules/calendar'
import { bondCaps, planTermination } from './rules/tenancy'
import {
  applyReview,
  approversOf,
  buildRollback,
  buildVersion,
  comesIntoForce,
  canApprove,
  canPublish,
  dateAppears,
  formatRuleValue,
  guardrails,
  impactAnalysis,
  inForce,
  latestOverriding,
  mergeFeed,
  nextVersion,
  numberAppears,
  packWith,
  parseFeed,
  sourceState,
  watchSummary,
  type FeedEvent,
  type Guardrail,
  type RegwatchFeed,
} from './regwatch'

const TODAY = '2026-11-14'
const db = buildSeed(TODAY)
const nz = resolvePack('NZ', db.packVersions)
const drill = db.ruleChanges.find((c) => c.id === 'rc_drill')!
const wa = db.ruleChanges.find((c) => c.id === 'rc_wa')!
const election = db.ruleChanges.find((c) => c.id === 'rc_election')!
const sourceOf = (c: RuleChange) => db.ruleSources.find((s) => s.id === c.sourceId)

const rails = (c: RuleChange, pack = resolvePack(c.jurisdiction, db.packVersions)) => guardrails(c, { source: sourceOf(c), pack, today: TODAY })
const rail = (list: Guardrail[], id: Guardrail['id']) => list.find((g) => g.id === id)!
const withPatch = (patch: Partial<RulePatch>, extra: Partial<RuleChange> = {}): RuleChange => ({ ...drill, ...extra, patches: [{ ...drill.patches[0], ...patch }] })

describe('reading numbers and dates out of a quote', () => {
  it('finds a number only where it stands on its own', () => {
    expect(numberAppears('at least 28 days’ notice', 28)).toBe(true)
    expect(numberAppears('section 128 of the Act', 28)).toBe(false)
    expect(numberAppears('from 2028 onwards', 28)).toBe(false)
    expect(numberAppears('a fee of $28.50', 28)).toBe(false)
    expect(numberAppears('not more than 2 weeks’ rent', 2)).toBe(true)
    expect(numberAppears('not more than two weeks’ rent', 2)).toBe(true)
  })

  it('finds a date written the way legislation writes it', () => {
    expect(dateAppears('comes into force on 1 December 2025.', '2025-12-01')).toBe(true)
    expect(dateAppears('in force 2025-12-01', '2025-12-01')).toBe(true)
    expect(dateAppears('assented to on 17 December 2024', '2025-12-01')).toBe(false)
    expect(dateAppears('on 31 February 2025', '2025-02-31')).toBe(false)
  })
})

describe('the guardrail checklist', () => {
  it('passes the practice drill on its quote and figure, and holds it for a second reviewer', () => {
    const list = rails(drill)
    expect(rail(list, 'quote').status).toBe('pass')
    expect(rail(list, 'known_rules').status).toBe('pass')
    expect(rail(list, 'value_in_quote').status).toBe('pass')
    expect(rail(list, 'before_matches').status).toBe('pass')
    expect(rail(list, 'pack_live').status).toBe('pass')
    expect(rail(list, 'evidence').status).toBe('pass')
    // The practice quote states no commencement date, so the date has to be confirmed by a person.
    expect(rail(list, 'effective_date').status).toBe('warn')
    expect(rail(list, 'two_reviewers').status).toBe('warn')
    expect(canApprove(drill, list, 'Riley Chen').ok).toBe(true)
    expect(canPublish(drill, list).ok).toBe(false)
  })

  it('refuses a proposed number that is not in the quoted text', () => {
    const invented = withPatch({ to: { n: 35, unit: 'days' } })
    const list = rails(invented)
    expect(rail(list, 'value_in_quote').status).toBe('fail')
    const verdict = canApprove(invented, list, 'Riley Chen')
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toContain('35')
  })

  it('warns when the number is quoted but the unit is not', () => {
    const list = rails(withPatch({ to: { n: 28, unit: 'working_days' } }))
    expect(rail(list, 'value_in_quote').status).toBe('warn')
  })

  it('refuses a patch with no quote behind it', () => {
    const bare = { ...drill, evidenceQuote: '  ' }
    const list = rails(bare)
    expect(rail(list, 'quote').status).toBe('fail')
    expect(canApprove(bare, list, 'Riley Chen').ok).toBe(false)
  })

  it('refuses a patch with no usable commencement date', () => {
    const list = rails(withPatch({ effectiveFrom: 'when appointed by Order in Council' }))
    expect(rail(list, 'effective_date').status).toBe('fail')
    expect(canApprove(withPatch({ effectiveFrom: '2027-02-30' }), rails(withPatch({ effectiveFrom: '2027-02-30' })), 'Riley Chen').ok).toBe(false)
  })

  it('refuses a patch aimed at a rule the pack does not have', () => {
    const list = rails(withPatch({ ruleKey: 'termination.made_up_rule' }))
    expect(rail(list, 'known_rules').status).toBe('fail')
  })

  it('says so when the proposal was drafted against an older pack', () => {
    const list = rails(withPatch({ from: { n: 14, unit: 'days' } }))
    expect(rail(list, 'before_matches').status).toBe('warn')
    expect(rail(list, 'before_matches').detail).toContain('21 days')
  })

  it('lets a preview-pack change be approved but never published', () => {
    const list = rails(wa)
    expect(rail(list, 'pack_live').status).toBe('warn')
    expect(rail(list, 'evidence').status).toBe('warn')
    const approved: RuleChange = { ...wa, status: 'approved', reviews: [{ by: 'Riley Chen', at: '2026-11-14T00:00:00.000Z', verdict: 'approve' }, { by: 'Mere Parata', at: '2026-11-14T01:00:00.000Z', verdict: 'approve' }] }
    expect(canPublish(approved, rails(approved)).ok).toBe(false)
  })

  it('flags an unreachable source without pretending the law changed', () => {
    const source = { ...sourceOf(drill)!, health: 'unreachable' as const }
    const list = guardrails(drill, { source, pack: nz, today: TODAY })
    expect(rail(list, 'source').status).toBe('warn')
    expect(canApprove(drill, list, 'Riley Chen').ok).toBe(true)
  })

  it('has nothing to approve when a change carries no patch', () => {
    const list = rails(election)
    expect(rail(list, 'value_in_quote').status).toBe('na')
    expect(canApprove(election, list, 'Riley Chen').ok).toBe(false)
  })
})

describe('the review path', () => {
  const at = '2026-11-14T03:00:00.000Z'

  it('needs two different people for a high-impact rule', () => {
    const first = applyReview(drill, rails(drill), 'approve', 'Riley Chen', at)
    if (!('change' in first)) throw new Error('first approval was refused')
    expect(first.change.status).toBe('needs_second_review')

    const again = applyReview(first.change, rails(first.change), 'approve', 'Riley Chen', at)
    expect('refused' in again && again.refused.reason).toContain('already approved')

    const second = applyReview(first.change, rails(first.change), 'approve', 'Mere Parata', at)
    if (!('change' in second)) throw new Error('second approval was refused')
    expect(second.change.status).toBe('approved')
    expect(approversOf(second.change)).toEqual(['Riley Chen', 'Mere Parata'])
    expect(canPublish(second.change, rails(second.change)).ok).toBe(true)
  })

  it('approves a lower-impact change with one reviewer', () => {
    const minor: RuleChange = { ...drill, impact: 'low', evidenceQuote: 'records must be kept for 24 months after the tenancy ends', patches: [{ ruleKey: 'records.retention_after_tenancy', from: { n: 12, unit: 'months' }, to: { n: 24, unit: 'months' }, effectiveFrom: '2027-01-01' }] }
    const result = applyReview(minor, rails(minor), 'approve', 'Riley Chen', at)
    expect('change' in result && result.change.status).toBe('approved')
  })

  it('will not take a rejection without its reason', () => {
    expect('refused' in applyReview(drill, rails(drill), 'reject', 'Riley Chen', at, '   ')).toBe(true)
    const rejected = applyReview(drill, rails(drill), 'reject', 'Riley Chen', at, 'Practice item.')
    expect('change' in rejected && rejected.change.status).toBe('rejected')
  })

  it('records “no action” on a change with nothing to patch', () => {
    const result = applyReview(election, rails(election), 'no_action', 'Mere Parata', at)
    expect('change' in result && result.change.status).toBe('no_action')
  })
})

describe('publishing through the pack registry', () => {
  const cal = calendarFor(nz)
  const send = { sentOn: TODAY, method: 'email' as const, hour: 10 }
  const tenantNotice = (pack = nz) => planTermination(pack, cal, { type: 'periodic' }, 'tenant', send).endsOn

  it('changes what the notice calculator returns, and rolling back restores it', () => {
    const before = tenantNotice()
    const version = buildVersion(drill, db.packVersions, 'Mere Parata', '2026-11-14T04:00:00.000Z', TODAY)
    expect(version.version).toBe('2026.11.1')
    expect(version.overrides).toEqual({ 'termination.tenant_periodic_notice': { n: 28, unit: 'days' } })

    const published = [...db.packVersions, version]
    const after = resolvePack('NZ', published, TODAY)
    expect(after.version).toBe('2026.11.1')
    expect(after.rules['termination.tenant_periodic_notice'].value).toEqual({ n: 28, unit: 'days' })
    expect(diffDays(before, tenantNotice(after))).toBe(7)
    expect(inForce(drill, after)).toBe(true)
    // The citation stays with the shipped rule; only the value and the verified date move.
    expect(after.rules['termination.tenant_periodic_notice'].citation).toBe(nz.rules['termination.tenant_periodic_notice'].citation)

    expect(latestOverriding(published, 'NZ')?.id).toBe(version.id)
    const rollback = buildRollback(version, published, 'Riley Chen', '2026-11-14T05:00:00.000Z', TODAY)!
    expect(rollback.version).toBe('2026.11.2')
    const restored = resolvePack('NZ', [...published, rollback], TODAY)
    expect(restored.rules['termination.tenant_periodic_notice'].value).toEqual({ n: 21, unit: 'days' })
    expect(tenantNotice(restored)).toBe(before)
    expect(inForce(drill, restored)).toBe(false)
  })

  it('has nothing to roll back in a version that changed no value', () => {
    expect(buildRollback(db.packVersions[0], db.packVersions, 'Riley Chen', '2026-11-14T05:00:00.000Z', TODAY)).toBeNull()
    expect(latestOverriding(db.packVersions, 'NZ')).toBeUndefined()
  })

  it('numbers versions by month and never reuses one', () => {
    expect(nextVersion(db.packVersions, 'NZ', '2026-11-14')).toBe('2026.11.1')
    expect(nextVersion(db.packVersions, 'NZ', '2026-12-02')).toBe('2026.12.0')
    expect(nextVersion([], 'AU-WA', '2027-01-09')).toBe('2027.01.0')
  })

  it('holds a value published ahead of its commencement date, and says what is coming', () => {
    const key = 'termination.tenant_periodic_notice'
    const early = withPatch({ effectiveFrom: '2027-07-01' }, { id: 'rc_early' })
    const version = buildVersion(early, db.packVersions, 'Mere Parata', '2026-11-14T04:00:00.000Z', TODAY)
    expect(version.commences).toEqual({ [key]: '2027-07-01' })
    const published = [...db.packVersions, version]

    // The day before: the law is what it was, and the rule knows what is coming.
    const before = resolvePack('NZ', published, '2027-06-30')
    expect(before.rules[key].value).toEqual({ n: 21, unit: 'days' })
    expect(before.rules[key].upcoming).toEqual({ value: { n: 28, unit: 'days' }, from: '2027-07-01', version: version.version })
    expect(before.rules[key].revised).toBeUndefined()
    expect(tenantNotice(before)).toBe(tenantNotice())
    expect(inForce(early, before)).toBe(false)
    expect(comesIntoForce(early, before)).toBe('2027-07-01')

    // The day itself: the calculators move, with no second publish.
    const onTheDay = resolvePack('NZ', published, '2027-07-01')
    expect(onTheDay.rules[key].value).toEqual({ n: 28, unit: 'days' })
    expect(onTheDay.rules[key].upcoming).toBeUndefined()
    expect(onTheDay.rules[key].effectiveFrom).toBe('2027-07-01')
    expect(diffDays(tenantNotice(), tenantNotice(onTheDay))).toBe(7)
    expect(inForce(early, onTheDay)).toBe(true)
    expect(comesIntoForce(early, onTheDay)).toBeUndefined()
    // The plain words were written for 21 days, so the rule carries what it replaced.
    expect(onTheDay.rules[key].revised).toEqual({ was: { n: 21, unit: 'days' }, on: '2026-11-14', version: version.version })
  })

  it('withdraws what was coming when a version is rolled back before it commences', () => {
    const key = 'termination.tenant_periodic_notice'
    const early = withPatch({ effectiveFrom: '2027-07-01' }, { id: 'rc_early' })
    const version = buildVersion(early, db.packVersions, 'Mere Parata', '2026-11-14T04:00:00.000Z', TODAY)
    const published = [...db.packVersions, version]
    const rollback = buildRollback(version, published, 'Riley Chen', '2026-11-15T05:00:00.000Z', '2026-11-15')!
    for (const day of ['2026-11-16', '2027-08-01']) {
      const pack = resolvePack('NZ', [...published, rollback], day)
      // Not a copy with a new date on it: the shipped rule itself, as if nothing had been published.
      expect(pack.rules[key]).toBe(PACKS.NZ.rules[key])
    }
  })

  it('applies a draft through the same path as a publish', () => {
    const draft = packWith('NZ', db.packVersions, { 'bond.max_weeks': 6 })
    expect(bondCaps(draft, 500).general).toBe(3000)
    expect(bondCaps(nz, 500).general).toBe(2000)
  })
})

describe('impact analysis', () => {
  it('runs the calculators on both packs and counts what the rule governs', () => {
    const impact = impactAnalysis(db, drill, TODAY)
    const periodic = db.tenancies.filter((t) => t.status === 'active' && t.type === 'periodic')
    expect(impact.drivesCalculators).toBe(true)
    expect(impact.patches).toHaveLength(1)
    const p = impact.patches[0]
    expect(p.reads).toBe('Tenant’s notice to end a periodic tenancy')
    expect(p.records).toBe(periodic.length)
    expect(p.orgs).toBe(new Set(periodic.map((t) => t.orgId)).size)
    expect(p.scenarios.length).toBeGreaterThanOrEqual(4)
    expect(p.scenarios.every((s) => s.changed)).toBe(true)
    expect(impact.changed).toBe(impact.scenarios)

    // 14 November 2026 is a Saturday, so the email counts from Monday the 16th: 21 days on is 7 December.
    const today = p.scenarios.find((s) => s.id === 'email_morning')!
    expect(today.before).toBe('Tenancy ends Mon 7 Dec 2026')
    expect(today.after).toBe('Tenancy ends Mon 14 Dec 2026')
  })

  it('shows a ground being withdrawn as a refusal', () => {
    const impact = impactAnalysis(db, wa, TODAY)
    expect(impact.drivesCalculators).toBe(false)
    expect(impact.records).toBe(0)
    const s = impact.patches[0].scenarios[0]
    expect(s.before).toMatch(/^Tenancy ends/)
    expect(s.after).toMatch(/^Refused/)
  })

  it('keeps a published change readable by putting its old values back as the “before”', () => {
    const pets = db.ruleChanges.find((c) => c.id === 'rc_pets')!
    const impact = impactAnalysis(db, pets, TODAY)
    const bond = impact.patches.find((p) => p.ruleKey === 'bond.pet_max_weeks')!
    expect(bond.scenarios[0].before).toBe('No pet bond can be taken')
    expect(bond.scenarios[0].after).toMatch(/^Pet bond capped at \$/)
    expect(impact.changed).toBeGreaterThan(0)
  })

  it('has no scenarios for a change with no patch', () => {
    expect(impactAnalysis(db, election, TODAY)).toMatchObject({ patches: [], scenarios: 0, changed: 0 })
  })
})

describe('the watcher feed', () => {
  const empty: RegwatchFeed = { generatedAt: null, runs: [], sources: {}, events: [] }
  const event = (over: Partial<FeedEvent> = {}): FeedEvent => ({
    id: 'ev_1',
    sourceId: 'nz-legislation-rta-1986-xml',
    detectedAt: '2026-11-15T17:30:00.000Z',
    title: 'Residential Tenancies Act 1986: section 51 changed',
    url: 'https://www.legislation.govt.nz/act/public/1986/120/en/latest/',
    summary: null,
    addedLines: ['the tenant shall give at least 28 days’ notice'],
    removedLines: ['the tenant shall give at least 21 days’ notice'],
    ai: null,
    ...over,
  })
  const feed = (over: Partial<RegwatchFeed> = {}): RegwatchFeed => ({ generatedAt: '2026-11-15T17:31:00.000Z', runs: [{ at: '2026-11-15T17:31:00.000Z', checked: 59, changed: 1, failed: 6 }], sources: {}, events: [], ...over })

  it('reads the shape the scheduled job writes, and nothing else', () => {
    expect(parseFeed({ generatedAt: null, runs: [], sources: {}, events: [] })).toEqual(empty)
    expect(parseFeed('<html>Just a moment...</html>')).toBeNull()
    expect(parseFeed({ runs: [] })).toBeNull()
  })

  it('changes nothing until the watcher has reported', () => {
    const merged = mergeFeed(db, empty)
    expect(merged.ruleSources).toBe(db.ruleSources)
    expect(merged.ruleChanges).toBe(db.ruleChanges)
    expect(merged.added).toHaveLength(0)
  })

  it('turns an event with no draft into a change a person must read', () => {
    const merged = mergeFeed(db, feed({ events: [event()] }))
    expect(merged.added).toHaveLength(1)
    const change = merged.added[0]
    expect(change).toMatchObject({ id: 'ev_1', origin: 'watcher', jurisdiction: 'NZ', status: 'pending_review', patches: [], evidenceQuote: '', confidence: 'low' })
    expect(merged.ruleChanges[0].id).toBe('ev_1')
    // Merging the same feed again finds nothing new.
    expect(mergeFeed({ ruleSources: merged.ruleSources, ruleChanges: merged.ruleChanges }, feed({ events: [event()] })).added).toHaveLength(0)
  })

  it('keeps a drafted patch only when it comes with a quote, and never trusts the model’s own confidence', () => {
    const patches: RulePatch[] = [{ ruleKey: 'termination.tenant_periodic_notice', from: { n: 21, unit: 'days' }, to: { n: 28, unit: 'days' }, effectiveFrom: '2027-03-01' }]
    const quoted = mergeFeed(db, feed({ events: [event({ ai: { summary: 'Tenant notice rises to 28 days.', patches, confidence: 'high', quote: 'at least 28 days’ notice' } })] })).added[0]
    expect(quoted.patches).toHaveLength(1)
    expect(quoted.impact).toBe('high')
    expect(quoted.confidence).toBe('medium')

    const unquoted = mergeFeed(db, feed({ events: [event({ ai: { summary: 'Tenant notice rises to 28 days.', patches, confidence: 'high', quote: '' } })] })).added[0]
    expect(unquoted.patches).toHaveLength(0)
    expect(unquoted.confidence).toBe('low')
  })

  it('treats a bot-challenge page as a failed fetch, never as a change', () => {
    const id = 'nz-legislation-rta-1986-xml'
    const checked = db.ruleSources.find((s) => s.id === id)!.lastCheckedAt
    const merged = mergeFeed(
      db,
      feed({
        sources: { [id]: { lastCheckedAt: '2026-11-15T17:30:00.000Z', lastChangedAt: '2026-11-15T17:30:00.000Z', status: 'changed', hash: 'abc', httpStatus: 200 } },
        events: [event({ addedLines: ['<script src="/_Incapsula_Resource?SWJIYLWA=719d34d31c8e3a6e6fffd425f7e032f3"></script>'] })],
      }),
    )
    expect(merged.added).toHaveLength(0)
    expect(merged.skipped[0].reason).toContain('bot challenge')
    const source = merged.ruleSources.find((s) => s.id === id)!
    expect(source.health).toBe('unreachable')
    expect(source.lastCheckedAt).toBe(checked)
  })

  it('overlays source health from the feed', () => {
    const id = 'nz-tenancy-services-law-changes'
    const merged = mergeFeed(db, feed({ sources: { [id]: { lastCheckedAt: '2026-11-15T17:30:00.000Z', lastChangedAt: null, status: 'ok', hash: 'abc', httpStatus: 200 } } }))
    expect(merged.sourcesUpdated).toBe(1)
    expect(merged.ruleSources.find((s) => s.id === id)).toMatchObject({ health: 'ok', lastCheckedAt: '2026-11-15T17:30:00.000Z' })
  })

  it('skips an event from a source nobody registered', () => {
    const merged = mergeFeed(db, feed({ events: [event({ sourceId: 'somewhere-else' })] }))
    expect(merged.added).toHaveLength(0)
    expect(merged.skipped).toHaveLength(1)
  })
})

describe('source health', () => {
  it('calls a priority-1 source stale after three days without a read', () => {
    const source = db.ruleSources.find((s) => s.priority === 1 && s.health === 'ok')!
    expect(sourceState({ ...source, lastCheckedAt: '2026-11-13T05:30:00.000Z' }, TODAY).state).toBe('ok')
    expect(sourceState({ ...source, lastCheckedAt: '2026-11-09T05:30:00.000Z' }, TODAY).state).toBe('stale')
    expect(sourceState({ ...source, health: 'unreachable' }, TODAY).state).toBe('unreachable')
    expect(sourceState({ ...source, lastCheckedAt: undefined }, TODAY).state).toBe('never_checked')
  })

  it('counts every source exactly once', () => {
    const s = watchSummary(db.ruleSources, TODAY)
    expect(s.total).toBe(db.ruleSources.length)
    expect(s.healthy + s.changed + s.stale + s.unreachable + s.neverChecked).toBe(s.total)
    expect(s.unreachable).toBe(db.ruleSources.filter((x) => x.health === 'unreachable').length)
  })
})

describe('rule values as words', () => {
  it('formats every shape a rule can hold', () => {
    expect(formatRuleValue('termination.tenant_periodic_notice', { n: 21, unit: 'days' })).toBe('21 days')
    expect(formatRuleValue('bond.lodgement_deadline', { n: 23, unit: 'working_days' })).toBe('23 working days')
    expect(formatRuleValue('bond.max_weeks', 4)).toBe('4 weeks of rent')
    expect(formatRuleValue('rent_increase.min_interval_months', 12)).toBe('12 months')
    expect(formatRuleValue('termination.no_cause_allowed', false)).toBe('No')
    expect(formatRuleValue('bond.pet_max_weeks', null)).toBe('No rule')
    expect(formatRuleValue('entry.hours', { from: 8, to: 19 })).toBe('08:00 to 19:00')
    expect(formatRuleValue('fixed_term.notice_window', nz.rules['fixed_term.notice_window'].value)).toBe('90 days to 21 days before the end')
    expect(formatRuleValue('arrears.repeat_rule', nz.rules['arrears.repeat_rule'].value)).toBe('3 times, each 5 working days late, within 90 days')
  })
})
