/**
 * The words of a notice.
 *
 * A notice is built from facts the landlord confirmed and from the rule pack —
 * every legal sentence in it is the pack's own plain-language text with its
 * citation. Nothing here states the law on its own account.
 */
import type { JurisdictionPack, RuleKey, ServiceMethod } from './jurisdictions/types'
import type { ISODate, NoticeType } from './types'
import type { EndGround, TerminationPlan } from './rules/tenancy'
import { fmtDateLong } from './rules/calendar'
import { money } from './rules/format'

export interface NoticeDraft {
  type: NoticeType
  title: string
  /** Paragraphs separated by blank lines. */
  body: string
  rulesUsed: RuleKey[]
}

export interface NoticeParties {
  landlord: string
  tenants: string[]
  address: string
}

const cite = (pack: JurisdictionPack, key: RuleKey) => `${pack.rules[key].plain} (${pack.rules[key].citation}.)`

function head(p: NoticeParties): string[] {
  return [`To: ${p.tenants.join(' and ')}`, `About: ${p.address}`]
}

function foot(pack: JurisdictionPack, p: NoticeParties, servedOn: ISODate, method: ServiceMethod['id']): string[] {
  const how = pack.service.find((s) => s.id === method)
  return [`${p.landlord}\n${fmtDateLong(servedOn)}${how ? `\nGiven by: ${how.label.toLowerCase()}` : ''}`]
}

export function rentIncreaseNotice(
  pack: JurisdictionPack,
  p: NoticeParties,
  d: { currentRent: number; newRent: number; effectiveOn: ISODate; servedOn: ISODate; method: ServiceMethod['id'] },
): NoticeDraft {
  return {
    type: 'rent_increase',
    title: 'Notice of rent increase',
    rulesUsed: ['rent_increase.notice', 'rent_increase.min_interval_months'],
    body: [
      ...head(p),
      `From ${fmtDateLong(d.effectiveOn)} the rent for this home will be ${money(d.newRent)} a week. It is ${money(d.currentRent)} a week now.`,
      'The first payment at the new rent is due on your usual rent day on or after that date. Nothing else in the tenancy agreement changes.',
      cite(pack, 'rent_increase.notice'),
      cite(pack, 'rent_increase.min_interval_months'),
      ...foot(pack, p, d.servedOn, d.method),
    ].join('\n\n'),
  }
}

const GROUND_TYPE: Record<Exclude<EndGround, 'tenant'>, NoticeType> = {
  no_cause: 'termination_periodic',
  owner_occupy: 'termination_owner_occupy',
  sale: 'termination_sale',
}

const GROUND_RULE: Record<Exclude<EndGround, 'tenant'>, RuleKey> = {
  no_cause: 'termination.landlord_periodic_notice',
  owner_occupy: 'termination.owner_occupy_notice',
  sale: 'termination.sale_notice',
}

export const GROUND_LABEL: Record<EndGround, string> = {
  no_cause: 'No particular reason',
  owner_occupy: 'The owner or their family is moving in',
  sale: 'The home is sold with vacant possession',
  tenant: 'The tenant has given notice',
}

export function terminationNotice(
  pack: JurisdictionPack,
  p: NoticeParties,
  d: { ground: Exclude<EndGround, 'tenant'>; plan: TerminationPlan; servedOn: ISODate; method: ServiceMethod['id'] },
): NoticeDraft {
  const rule = GROUND_RULE[d.ground]
  // For a ground that must be stated, the reason is the facts the landlord confirmed.
  const reason =
    d.ground === 'no_cause'
      ? []
      : [`The reason for this notice: ${d.plan.conditions.filter((c) => !/notice states/i.test(c)).join(' ')}`]
  return {
    type: GROUND_TYPE[d.ground],
    title: 'Notice to end the tenancy',
    rulesUsed: [rule],
    body: [
      ...head(p),
      `The tenancy of this home will end on ${fmtDateLong(d.plan.endsOn)}. That is ${d.plan.noticeDays} days of notice, counted from the day after this notice is received.`,
      ...reason,
      cite(pack, rule),
      'Rent is payable up to and including the last day. The bond is refunded after the final inspection, less anything both of us agree is owed.',
      ...foot(pack, p, d.servedOn, d.method),
    ].join('\n\n'),
  }
}
