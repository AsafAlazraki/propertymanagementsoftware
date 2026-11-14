/**
 * What each console screen keeps in the address bar, and how it is read back.
 *
 * These live apart from the screens on purpose. A route needs its parser
 * before its screen is on the page, so a parser that sat in a screen's own
 * module pulled that screen, and everything it imports, into the first
 * download of every portal. Nothing here may import a component.
 */
import type { AdminTask, AdminTaskKind, Feedback, JurisdictionCode, OrgStatus, PlanTier, User } from '@/domain/types'
import { oneOf, text } from './format'

/** A list that has to name every member of a union. Leaving one out does not compile. */
const every =
  <T extends string>() =>
  <const L extends readonly T[]>(list: L & ([Exclude<T, L[number]>] extends [never] ? unknown : { missing: Exclude<T, L[number]> })): L =>
    list

/* Assistant */

export interface AssistantSearch {
  /** The turn being taught. `new` opens an empty form. */
  turn?: string
}

export function assistantSearch(s: Record<string, unknown>): AssistantSearch {
  return { turn: text(s.turn) }
}

/* Audit log */

export const SPANS = ['today', 'week', 'month', 'all'] as const
export type Span = (typeof SPANS)[number]
export const BY = ['people', 'engine'] as const

export interface AuditSearch {
  q?: string
  actor?: string
  org?: string
  span?: Span
  /** `people` is the team; `engine` is everything that acts on its own. */
  by?: (typeof BY)[number]
}

export function auditSearch(s: Record<string, unknown>): AuditSearch {
  return { q: text(s.q), actor: text(s.actor), org: text(s.org), span: oneOf(s.span, SPANS), by: oneOf(s.by, BY) }
}

/* Feedback */

export const BOXES = ['new', 'open', 'closed', 'all'] as const
export type Box = (typeof BOXES)[number]
export const FEEDBACK_KINDS = every<Feedback['kind']>()(['bug', 'idea', 'praise', 'question', 'complaint'])
export const MOODS = every<Feedback['sentiment']>()(['positive', 'neutral', 'negative'])
export const ORDERS = ['newest', 'votes'] as const

export interface FeedbackSearch {
  id?: string
  /** `open` is triaged or planned; `closed` is shipped or declined. */
  box?: Box
  kind?: Feedback['kind']
  mood?: Feedback['sentiment']
  area?: string
  order?: (typeof ORDERS)[number]
}

export function feedbackSearch(s: Record<string, unknown>): FeedbackSearch {
  return { id: text(s.id), box: oneOf(s.box, BOXES), kind: oneOf(s.kind, FEEDBACK_KINDS), mood: oneOf(s.mood, MOODS), area: text(s.area), order: oneOf(s.order, ORDERS) }
}

/* Self-healing */

export const HEALING_SHOWS = ['awaiting', 'automatic', 'decided', 'all'] as const
export type HealingShow = (typeof HEALING_SHOWS)[number]

export interface HealingSearch {
  incident?: string
  show?: HealingShow
}

export function healingSearch(s: Record<string, unknown>): HealingSearch {
  return { incident: text(s.incident), show: oneOf(s.show, HEALING_SHOWS) }
}

/* Migration */

export interface MigrationSearch {
  /** The batch to bring into view, set after an import. */
  batch?: string
}

export function migrationSearch(s: Record<string, unknown>): MigrationSearch {
  return { batch: text(s.batch) }
}

/* Field network */

export const NETWORK_SHOWS = ['all', 'vetted', 'pending', 'suspended'] as const
export type NetworkShow = (typeof NETWORK_SHOWS)[number]

export interface NetworkSearch {
  provider?: string
  show?: NetworkShow
}

export function networkSearch(s: Record<string, unknown>): NetworkSearch {
  return { provider: text(s.provider), show: oneOf(s.show, NETWORK_SHOWS) }
}

/* Organisations */

export const SORTS = ['name', 'properties', 'rentRoll', 'mrr', 'compliance', 'arrears', 'idle'] as const
export type SortKey = (typeof SORTS)[number]
export const PLANS = every<PlanTier>()(['ledger_free', 'autopilot_pro', 'portfolio_trust'])
/** In the order the team reads them: healthy first, gone last. */
export const ORG_STATUS_ORDER = every<OrgStatus>()(['active', 'trialing', 'past_due', 'suspended', 'churned'])

export interface OrgsSearch {
  org?: string
  q?: string
  /** `attention` is past due or suspended: the accounts someone has to chase. */
  status?: OrgStatus | 'attention'
  plan?: PlanTier
  sort?: SortKey
  dir?: 'asc' | 'desc'
}

export function orgsSearch(s: Record<string, unknown>): OrgsSearch {
  return { org: text(s.org), q: text(s.q), status: oneOf(s.status, [...ORG_STATUS_ORDER, 'attention'] as const), plan: oneOf(s.plan, PLANS), sort: oneOf(s.sort, SORTS), dir: oneOf(s.dir, ['asc', 'desc'] as const) }
}

/* People */

export const GROUP_IDS = ['owners', 'renters', 'providers', 'team'] as const
export type GroupId = (typeof GROUP_IDS)[number]
export const STATUSES = every<User['status']>()(['active', 'invited', 'deactivated'])
export const IDENTITIES = ['verified', 'unverified'] as const

export interface PeopleSearch {
  user?: string
  q?: string
  group?: GroupId
  status?: User['status']
  identity?: (typeof IDENTITIES)[number]
}

export function peopleSearch(s: Record<string, unknown>): PeopleSearch {
  return { user: text(s.user), q: text(s.q), group: oneOf(s.group, GROUP_IDS), status: oneOf(s.status, STATUSES), identity: oneOf(s.identity, IDENTITIES) }
}

/* Action queue */

export const VIEWS = ['active', 'done', 'all'] as const
export type View = (typeof VIEWS)[number]
export const PRIORITIES = every<AdminTask['priority']>()(['p1', 'p2', 'p3'])
/** In the order the filter lists them. */
export const TASK_KINDS = every<AdminTaskKind>()([
  'concierge_call',
  'identity_review',
  'provider_vetting',
  'maintenance_dispute',
  'rule_change_review',
  'healing_approval',
  'copilot_gap',
  'feedback_followup',
  'billing_issue',
])

export interface QueueSearch {
  task?: string
  kind?: AdminTaskKind
  priority?: AdminTask['priority']
  /** `active` is open or in progress: the default, because that is the work. */
  view?: View
  mine?: boolean
}

export function queueSearch(s: Record<string, unknown>): QueueSearch {
  return { task: text(s.task), kind: oneOf(s.kind, TASK_KINDS), priority: oneOf(s.priority, PRIORITIES), view: oneOf(s.view, VIEWS), mine: s.mine === true || s.mine === 'true' ? true : undefined }
}

/* Rulewatch */

export const TABS = ['changes', 'sources', 'packs', 'versions'] as const
export type Tab = (typeof TABS)[number]
export const PACK_VIEWS = ['rules', 'compare'] as const
export type PackView = (typeof PACK_VIEWS)[number]
export const SOURCE_STATES = ['attention', 'unreachable', 'stale', 'ok'] as const
export type SourceFilter = (typeof SOURCE_STATES)[number]
/** Every jurisdiction the product knows, home market first. */
export const JURISDICTIONS = every<JurisdictionCode>()(['NZ', 'AU-NSW', 'AU-VIC', 'AU-QLD', 'AU-WA', 'AU-SA'])

export interface RulesSearch {
  tab?: Tab
  /** The change under review. While set, the review replaces the tabs. */
  change?: string
  /** A jurisdiction: the pack being browsed, or the filter on the sources. */
  j?: JurisdictionCode
  view?: PackView
  src?: SourceFilter
  q?: string
}

export function rulesSearch(s: Record<string, unknown>): RulesSearch {
  return { tab: oneOf(s.tab, TABS), change: text(s.change), j: oneOf(s.j, JURISDICTIONS), view: oneOf(s.view, PACK_VIEWS), src: oneOf(s.src, SOURCE_STATES), q: text(s.q) }
}
