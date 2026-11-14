/**
 * The pack registry.
 *
 * `resolvePack` is the only way application code reads a rule. It lays the
 * overrides an admin has published through Rulewatch on top of the shipped
 * values, so a reviewed law change reaches every screen together and every
 * calculator can say which pack version produced its answer.
 *
 * Publishing is not commencement. A value published ahead of the date it comes
 * into force is held until that date: the calculators keep the law as it is
 * today, and the rule carries the value that is coming so every screen can say so.
 */
import type { ISODate, JurisdictionCode, RulePackVersion } from '../types'
import type { JurisdictionPack, Rule, RuleKey } from './types'
import { dateOf, today } from '../rules/calendar'
import { sameValue } from '../rules/core'
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

/**
 * The pack as the law stands on `on`. Callers leave `on` out to get today;
 * a test, or a screen showing another day, passes the date.
 */
export function resolvePack(code: JurisdictionCode, versions: RulePackVersion[] = [], on: ISODate = today()): JurisdictionPack {
  const base = PACKS[code]
  const published = versions
    .filter((v) => v.jurisdiction === code)
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt))
  if (published.length === 0) return base
  const rules = { ...base.rules } as Record<string, Rule<unknown>>
  for (const version of published) {
    for (const [key, value] of Object.entries(version.overrides)) {
      if (!(key in rules)) continue
      const shipped = (base.rules as Record<string, Rule<unknown>>)[key]
      const from = version.commences?.[key]
      if (from && from > on) {
        // Published, not yet law. Saying it is coming is the whole effect.
        rules[key] = sameValue(rules[key].value, value) ? { ...rules[key], upcoming: undefined } : { ...rules[key], upcoming: { value, from, version: version.version } }
        continue
      }
      // Putting the shipped value back (a rollback) is the shipped rule again, nothing more.
      if (sameValue(value, shipped.value)) {
        rules[key] = shipped
        continue
      }
      // An override changes the value only. The citation stays with the shipped rule until
      // the pack itself is revised, and the date records when a person approved it. The
      // plain words were written for the shipped value, so the rule says what it replaced.
      rules[key] = {
        ...shipped,
        value,
        lastVerified: dateOf(version.publishedAt),
        effectiveFrom: from,
        revised: { was: shipped.value, on: dateOf(version.publishedAt), version: version.version },
      }
    }
  }
  return { ...base, rules: rules as unknown as JurisdictionPack['rules'], version: published[published.length - 1].version }
}

/** The region key a property's calendar uses. Every demo property is in Nelson province. */
export function regionOf(city: string): string | undefined {
  return /nelson|tasman|richmond|stoke|motueka/i.test(city) ? 'nelson' : undefined
}

/**
 * The local non-working days (the provincial anniversary day) the pack holds
 * for a town, or `undefined` when none are loaded for it. Only one region is
 * loaded so far, and a date for another is never guessed: a town outside it
 * gets the national calendar, and the screens that count working days say so.
 */
export function regionalHolidaysFor(
  pack: Pick<JurisdictionPack, 'regionalHolidays'>,
  city: string,
): JurisdictionPack['regionalHolidays'][string] | undefined {
  const region = regionOf(city)
  const local = region ? pack.regionalHolidays[region] : undefined
  return local && local.dates.length > 0 ? local : undefined
}

/** Whether a working-day count for this town leaves out its local anniversary day as well as the national holidays. */
export function regionalHolidaysLoaded(pack: Pick<JurisdictionPack, 'regionalHolidays'>, city: string): boolean {
  return regionalHolidaysFor(pack, city) !== undefined
}

export type { JurisdictionPack, RuleKey }
