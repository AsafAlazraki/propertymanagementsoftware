/**
 * The pack registry.
 *
 * `resolvePack` is the only way application code reads a rule. It lays the
 * overrides an admin has published through Rulewatch on top of the shipped
 * values, so a reviewed law change takes effect everywhere at once and every
 * calculator can say which pack version produced its answer.
 */
import type { JurisdictionCode, RulePackVersion } from '../types'
import type { JurisdictionPack, RuleKey } from './types'
import { dateOf } from '../rules/calendar'
import { NZ } from './nz'
import { AU_NSW, AU_QLD, AU_SA, AU_VIC, AU_WA } from './au'

export const PACKS: Record<JurisdictionCode, JurisdictionPack> = {
  NZ,
  'AU-NSW': AU_NSW,
  'AU-VIC': AU_VIC,
  'AU-QLD': AU_QLD,
  'AU-WA': AU_WA,
  'AU-SA': AU_SA,
}

export const PACK_ORDER: JurisdictionCode[] = ['NZ', 'AU-NSW', 'AU-VIC', 'AU-QLD', 'AU-WA', 'AU-SA']

/** The newest published version for a jurisdiction, if any override has ever been published. */
export function latestVersion(versions: RulePackVersion[], code: JurisdictionCode): RulePackVersion | undefined {
  return versions.filter((v) => v.jurisdiction === code).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))[0]
}

export function resolvePack(code: JurisdictionCode, versions: RulePackVersion[] = []): JurisdictionPack {
  const base = PACKS[code]
  const published = versions.filter((v) => v.jurisdiction === code).sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
  if (published.length === 0) return base
  const rules = { ...base.rules }
  for (const version of published) {
    for (const [key, value] of Object.entries(version.overrides)) {
      const k = key as RuleKey
      if (!(k in rules)) continue
      // An override changes the value only. The citation stays with the shipped rule
      // until the pack itself is revised, and the date records when a person approved it.
      ;(rules as Record<string, unknown>)[k] = { ...rules[k], value, lastVerified: dateOf(version.publishedAt) }
    }
  }
  return { ...base, rules, version: published[published.length - 1].version }
}

/** The region key a property's calendar uses. Every demo property is in Nelson province. */
export function regionOf(city: string): string | undefined {
  return /nelson|tasman|richmond|stoke|motueka/i.test(city) ? 'nelson' : undefined
}

export type { JurisdictionPack, RuleKey }
