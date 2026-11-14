/**
 * Every console screen renders from the seeded demo world without throwing,
 * and shows the things it exists to show.
 *
 * This is a server render with the router stubbed out: it proves the screens
 * and the sheet bodies survive the real data in every state the seed holds. It
 * does not prove they look right — that still takes a browser.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import React, { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToString } from 'react-dom/server'

let search: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  getRouteApi: () => ({ useSearch: () => search, useNavigate: () => () => Promise.resolve() }),
  useNavigate: () => () => Promise.resolve(),
  Link: ({ children, to, className }: { children: ReactNode | ((state: { isActive: boolean }) => ReactNode); to: string; className?: string }) =>
    createElement('a', { href: to, className }, typeof children === 'function' ? children({ isActive: false }) : children),
}))

/** The store persists to localStorage; in this test it gets a throwaway one. */
function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => void items.set(k, String(v)),
    removeItem: (k) => void items.delete(k),
    clear: () => items.clear(),
    key: (i) => [...items.keys()][i] ?? null,
    get length() {
      return items.size
    },
  }
}

type Store = typeof import('@/data/store')
let store: Store
const realUseSyncExternalStore = React.useSyncExternalStore

const html = (component: ComponentType, withSearch: Record<string, unknown> = {}): string => {
  search = withSearch
  return renderToString(createElement(component))
    .replace(/<!-- -->/g, '')
    .replace(/&#x27;/g, '’')
    .replace(/&amp;/g, '&')
}

beforeAll(async () => {
  vi.stubGlobal('localStorage', memoryStorage())
  // A server render reads an external store's *server* snapshot, which for the app's store is
  // its initial state: nobody signed in, nothing changed. Here the server snapshot is the live
  // one wherever that can be read, so the render sees the session and every change a test makes.
  Object.assign(React, {
    useSyncExternalStore: <T,>(subscribe: (onChange: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T): T =>
      realUseSyncExternalStore(subscribe, getSnapshot, () => {
        try {
          return getSnapshot()
        } catch {
          return (getServerSnapshot ?? getSnapshot)()
        }
      }),
  })
  store = await import('@/data/store')
  const { PERSONAS, signInAs } = await import('@/app/session')
  signInAs(PERSONAS.admin)
  // Loading the screens pulls in the icon set and the chart library, which is most of this
  // file's running time. Doing it here keeps that cost out of any one test's time limit.
  await import('./Overview')
}, 120_000)

afterAll(() => {
  Object.assign(React, { useSyncExternalStore: realUseSyncExternalStore })
})

describe('the team console renders from the demo world', () => {
  it('Overview: the strip, the ledger and the engine', async () => {
    const { Overview } = await import('./Overview')
    const out = html(Overview)
    expect(out).toContain('waiting on a person')
    expect(out).toContain('Homes managed')
    expect(out).toContain('Monthly revenue by plan')
    expect(out).toContain('Compliance by organisation')
    expect(out).toContain('Rulewatch')
    expect(out).toContain('Hope Street Trust is suspended')
  })

  it('Action queue: grouped by priority, and filtered', async () => {
    const { Queue } = await import('./Queue')
    const out = html(Queue)
    expect(out).toContain('Hope Street Trust is suspended and has not been called')
    expect(out).toContain('Today')
    expect(html(Queue, { view: 'done' })).toContain('Identity check: Lucy Fraser')
    expect(html(Queue, { kind: 'maintenance_dispute' })).toContain('No task matches these filters')
  })

  it('every kind of task opens', async () => {
    const { TaskDetail } = await import('./queue/TaskDetail')
    const { requestConciergeCall } = await import('@/data/mutations')
    requestConciergeCall('t_kowhai')
    const tasks = store.db.get().adminTasks
    expect(new Set(tasks.map((t) => t.kind)).size).toBeGreaterThanOrEqual(6)
    for (const task of tasks) {
      const out = renderToString(createElement(TaskDetail, { task, done: () => {} }))
      expect(out.length).toBeGreaterThan(200)
    }
    const call = tasks.find((t) => t.kind === 'concierge_call')!
    expect(renderToString(createElement(TaskDetail, { task: call, done: () => {} }))).toContain('Log the call and tell the landlord')
  })

  it('every other sheet opens for every record it can be opened on', async () => {
    const state = store.db.get()
    const { OrgDetail } = await import('./Orgs')
    const { homeRows, orgRows } = await import('./stats')
    const { resolvePack } = await import('@/domain/jurisdictions')
    const day = state.seededOn
    const rows = orgRows(state, homeRows(state, resolvePack('NZ', state.packVersions), day), day)
    for (const row of rows) expect(renderToString(createElement(OrgDetail, { row }))).toContain('View as owner')
    expect(renderToString(createElement(OrgDetail, { row: rows.find((r) => r.org.status === 'suspended')! }))).toContain('Lift suspension')

    const { PersonDetail } = await import('./People')
    for (const user of state.users) expect(renderToString(createElement(PersonDetail, { user }))).toContain(user.email)

    const { ProviderDetail } = await import('./Network')
    for (const p of state.providers) expect(renderToString(createElement(ProviderDetail, { p }))).toContain('Police vetting')

    const { Reading } = await import('./Feedback')
    for (const f of state.feedback) expect(renderToString(createElement(Reading, { f, author: state.users.find((u) => u.id === f.userId) }))).toContain('Internal note')

    const { TeachForm } = await import('./Assistant')
    for (const turn of [undefined, ...state.copilotTurns.filter((t) => t.review === 'queued')]) {
      expect(renderToString(createElement(TeachForm, { turn, done: () => {}, onTaught: () => {} }))).toContain('Teach this answer')
    }
  })

  it('Organisations: every organisation, and the filters', async () => {
    const { Orgs } = await import('./Orgs')
    const out = html(Orgs)
    for (const org of store.db.get().orgs) expect(out).toContain(org.name.replace(/&/g, '&'))
    expect(html(Orgs, { status: 'attention' })).not.toContain('Whitaker Family Trust')
    expect(html(Orgs, { q: 'zzzz' })).toContain('No organisation matches')
  })

  it('People, Feedback, Self-healing, Assistant, Field network, Migration and Audit', async () => {
    const { People } = await import('./People')
    expect(html(People, { group: 'team' })).toContain('Mere Parata')
    expect(html(People, { q: 'nobody-by-this-name' })).toContain('Nobody matches')

    const { Feedback } = await import('./Feedback')
    expect(html(Feedback)).toContain('How people feel')
    expect(html(Feedback, { box: 'new', kind: 'question' })).toContain('No message matches')

    const { Healing } = await import('./Healing')
    const healing = html(Healing)
    expect(healing).toContain('Run a sweep now')
    expect(healing).toContain('What the check saw')
    expect(healing).toContain('Make this automatic?')

    const { Assistant } = await import('./Assistant')
    const assistant = html(Assistant)
    expect(assistant).toContain('Can I charge for a lost garage remote?')
    expect(assistant).toContain('Try it')

    const { Network } = await import('./Network')
    const network = html(Network)
    expect(network).toContain('Oliver Schmidt')
    expect(network).toContain('Payouts simulated')

    const { Migration } = await import('./Migration')
    const migration = html(Migration)
    expect(migration).toContain('Bring in the rent roll')
    expect(migration).toContain('Blue Penguin rent roll')
    expect(migration).toContain('Invites simulated')

    const { Audit } = await import('./Audit')
    expect(html(Audit)).toContain('Published rule pack')
    expect(html(Audit, { q: 'no such line anywhere' })).toContain('No line matches')
  })

  it('Rulewatch: each tab, and a review of every seeded change', async () => {
    const { Rulewatch } = await import('./Rulewatch')
    const changes = html(Rulewatch)
    expect(changes).toContain('Waiting for a decision')
    expect(changes).toContain('Practice drill, not real law')
    expect(html(Rulewatch, { tab: 'sources' })).toContain('Reading the scheduled watcher’s feed')
    expect(html(Rulewatch, { tab: 'packs' })).toContain('Live: drives every calculator')
    expect(html(Rulewatch, { tab: 'packs', j: 'AU-WA' })).toContain('Preview: drives no calculator')
    expect(html(Rulewatch, { tab: 'packs', view: 'compare' })).toContain('Comparable rules across jurisdictions')
    expect(html(Rulewatch, { tab: 'versions' })).toContain('What the calculators run on now')
    expect(html(Rulewatch, { change: 'not-a-change' })).toContain('That change is not on record')

    for (const change of store.db.get().ruleChanges) {
      const out = html(Rulewatch, { change: change.id })
      expect(out).toContain(change.title.replace(/&/g, '&'))
      expect(out).toContain('Guardrails')
    }
    const drill = html(Rulewatch, { change: 'rc_drill' })
    expect(drill).toContain('Practice drill, not real law')
    expect(drill).toContain('Approve: first of two')
    expect(drill).toContain('28 days')
    expect(html(Rulewatch, { change: 'rc_wa' })).toContain('is a preview pack')
  })

  it('the practice drill can be walked from review to publish to rollback', async () => {
    const { publishChange, reviewChange, rollbackVersion } = await import('@/data/admin-mutations')
    const { Rulewatch } = await import('./Rulewatch')
    const { resolvePack } = await import('@/domain/jurisdictions')
    const notice = () => resolvePack('NZ', store.db.get().packVersions).rules['termination.tenant_periodic_notice'].value.n
    const before = notice()

    expect(reviewChange('rc_drill', 'approve', 'Riley Chen').ok).toBe(true)
    expect(reviewChange('rc_drill', 'approve', 'Riley Chen').ok).toBe(false)
    // Riley is signed in and has already approved, so the page refuses a second approval from Riley.
    const second = html(Rulewatch, { change: 'rc_drill' })
    expect(second).toContain('Riley Chen has already approved this change.')
    expect(second).toContain('Review as Mere (demo)')
    expect(publishChange('rc_drill', 'Riley Chen').ok).toBe(false)
    expect(reviewChange('rc_drill', 'approve', 'Mere Parata').ok).toBe(true)
    expect(html(Rulewatch, { change: 'rc_drill' })).toContain('Publish as')

    const published = publishChange('rc_drill', 'Mere Parata')
    expect(published.ok).toBe(true)
    expect(notice()).toBe(28)
    expect(html(Rulewatch, { change: 'rc_drill' })).toContain('In force since')

    const version = store.db.get().packVersions.find((v) => v.version === published.version)!
    expect(rollbackVersion(version.id, 'Riley Chen').ok).toBe(true)
    expect(notice()).toBe(before)
    expect(store.db.get().ruleChanges.find((c) => c.id === 'rc_drill')?.status).toBe('approved')
    const audit = store.db.get().audit.map((a) => a.action)
    expect(audit).toContain('Published rule pack')
    expect(audit).toContain('Rolled back rule pack')
  })
})
