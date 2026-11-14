/**
 * The field marketplace, as data.
 *
 * Four jobs a landlord can hand to a local person, who in the network is able
 * to do each one, and what the jobs have added up to. Prices are product
 * policy and live with the mutations that charge them; nothing here is law.
 */
import type { FieldTask, Provider } from './types'
import { sum } from './rules/format'

export type FieldService = FieldTask['type']

export interface ServiceDef {
  type: FieldService
  name: string
  /** What happens, in one sentence. */
  what: string
  /** What comes back to the landlord when it is done. */
  result: string
  /** The kind of person who does it, as a landlord would say it. */
  doneBy: string
}

export const SERVICES: ServiceDef[] = [
  {
    type: 'routine_inspection',
    name: 'Routine inspection',
    what: 'A local inspector walks through the home room by room while it is tenanted.',
    result: 'A scored report with notes on every room.',
    doneBy: 'an inspector',
  },
  {
    type: 'viewing',
    name: 'Viewing',
    what: 'A host opens the home and shows people through at the time you choose.',
    result: 'A note on how many came and who wants to apply.',
    doneBy: 'a viewing host',
  },
  {
    type: 'entry_exit_report',
    name: 'Entry or exit report',
    what: 'An inspector records the condition of every room when tenants move in or out.',
    result: 'A room-by-room condition report to keep with the tenancy.',
    doneBy: 'an inspector',
  },
  {
    type: 'tribunal_representation',
    name: 'Tribunal representation',
    what: 'A local property manager represents you at the hearing.',
    result: 'A note on what was decided.',
    doneBy: 'a property manager',
  },
]

export function serviceOf(type: FieldService): ServiceDef {
  return SERVICES.find((s) => s.type === type) ?? SERVICES[0]
}

/** Whether this provider does this kind of job at all, whatever their vetting status. */
export function canDo(provider: Pick<Provider, 'kind' | 'trade'>, type: FieldService): boolean {
  if (type === 'tribunal_representation') return provider.kind === 'agent'
  if (provider.kind !== 'inspector') return false
  return type === 'viewing' ? /viewing/i.test(provider.trade) : true
}

/** What to call a provider in a sentence: a person by their first name, a firm by its whole name. */
export function shortName(provider: Pick<Provider, 'kind' | 'name'>): string {
  return provider.kind === 'agent' ? provider.name : provider.name.split(' ')[0]
}

/** The people who could be booked for a job today: vetted, able, best record first. */
export function providersFor(type: FieldService, providers: Provider[]): Provider[] {
  return providers
    .filter((p) => p.vetting === 'vetted' && canDo(p, type))
    .sort((a, b) => b.rating - a.rating || b.jobs - a.jobs)
}

export type TaskPhase = 'ahead' | 'done' | 'cancelled'

export function phaseOf(status: FieldTask['status']): TaskPhase {
  if (status === 'cancelled') return 'cancelled'
  return status === 'completed' || status === 'paid_out' ? 'done' : 'ahead'
}

export interface FieldSpend {
  /** Jobs that were done: what the landlord has paid. */
  spent: number
  /** Jobs still ahead: what is committed but not yet done. */
  booked: number
  doneCount: number
  aheadCount: number
  /** Money spent, one entry per kind of job that has been done at least once. */
  byService: { type: FieldService; name: string; amount: number; jobs: number }[]
}

export function fieldSpend(tasks: FieldTask[]): FieldSpend {
  const done = tasks.filter((t) => phaseOf(t.status) === 'done')
  const ahead = tasks.filter((t) => phaseOf(t.status) === 'ahead')
  return {
    spent: sum(done.map((t) => t.price)),
    booked: sum(ahead.map((t) => t.price)),
    doneCount: done.length,
    aheadCount: ahead.length,
    byService: SERVICES.map((s) => {
      const mine = done.filter((t) => t.type === s.type)
      return { type: s.type, name: s.name, amount: sum(mine.map((t) => t.price)), jobs: mine.length }
    }).filter((s) => s.jobs > 0),
  }
}
