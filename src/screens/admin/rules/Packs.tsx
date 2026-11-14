/**
 * The rule packs themselves: what the product believes the law to be, rule by
 * rule, with where each value came from and when a person last checked it —
 * and the same rules laid side by side across jurisdictions, which is what
 * shows that a new state really is a data file.
 */
import { useMemo } from 'react'
import { ClockCountdown, Eye, Lightning } from '@phosphor-icons/react'
import type { JurisdictionCode } from '@/domain/types'
import type { JurisdictionPack, Rule, RuleKey } from '@/domain/jurisdictions/types'
import { PACKS, PACK_ORDER, resolvePack } from '@/domain/jurisdictions'
import { COMPARABLE_RULES, RULE_STALE_AFTER_DAYS, formatRuleValue, ruleIsStale, sameValue } from '@/domain/regwatch'
import { diffDays, fmtDate } from '@/domain/rules/calendar'
import { plural } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { Segmented } from '@/ui/controls'
import { cn } from '@/ui/cn'
import { Filter, Flag, Out, Status } from '../kit'
import { JURISDICTION_NAME, VERIFIED } from '../labels'
import { PackTag, SHORT } from './shared'

import { type PackView } from '../search'

const FAMILY: Record<string, string> = {
  bond: 'Bond',
  rent: 'Rent',
  listing: 'Listings',
  rent_increase: 'Rent increases',
  entry: 'Entry and inspections',
  termination: 'Ending a tenancy',
  fixed_term: 'Fixed terms',
  pets: 'Pets',
  arrears: 'Arrears',
  requests: 'Tenant requests',
  damage: 'Damage',
  contract: 'The agreement',
  privacy: 'Privacy',
  records: 'Records',
}

function PackFacts({ pack, shippedVersion }: { pack: JurisdictionPack; shippedVersion: string }) {
  const live = pack.status === 'live'
  return (
    <div className={cn('mb-4 rounded-lg p-4', live ? 'bg-surface shadow-card' : 'border border-dashed border-line-strong')}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-[15px] font-semibold text-ink">{pack.name}</h2>
        {live ? (
          <Flag tone="ok" icon={Lightning}>
            Live: drives every calculator
          </Flag>
        ) : (
          <Flag tone="warn" icon={Eye}>
            Preview: drives no calculator
          </Flag>
        )}
        <span className="font-mono text-[11px] text-ink-2">pack {pack.version}</span>
      </div>
      {!live && (
        <p className="mt-2 max-w-[80ch] text-[13px] leading-relaxed text-ink-2">
          A preview pack holds the headline values researched for this state so they can be compared and tracked. It has not been signed off, most values were read on regulator pages rather than the Act, and nothing in Loop or Pool reads it.
        </p>
      )}
      <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-[13px] sm:grid-cols-2 xl:grid-cols-4">
        <div className="min-w-0">
          <dt className="text-xs text-ink-3">Act</dt>
          <dd className="min-w-0">
            <Out href={pack.act.url}>{pack.act.name}</Out>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-3">Regulator</dt>
          <dd className="min-w-0">
            <Out href={pack.regulator.url}>{pack.regulator.name}</Out>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-3">Tribunal</dt>
          <dd className="truncate text-ink">{pack.tribunal.name}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-3">Shipped in the code as</dt>
          <dd className="text-ink">
            <span className="font-mono text-[12px]">{shippedVersion}</span> · {fmtDate(pack.publishedOn, { weekday: false, year: 'always' })}
          </dd>
        </div>
      </dl>
      {live && (
        <p className="mt-3 border-t border-line pt-2.5 text-xs leading-relaxed text-ink-3">
          Loop adds a margin of {plural(pack.safetyBufferDays, 'day')} to notices a landlord serves. That is product policy, not law, and every calculation shows it as its own line.
        </p>
      )}
    </div>
  )
}

function RuleRow({ ruleKey, rule, shipped }: { ruleKey: RuleKey; rule: Rule<unknown>; shipped: Rule<unknown> }) {
  const day = useToday()
  const verified = VERIFIED[rule.verified]
  const stale = ruleIsStale(rule, day)
  const overridden = !sameValue(rule.value, shipped.value)
  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-2 px-4 py-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_minmax(0,4fr)]">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{rule.label}</p>
        <p className="truncate font-mono text-[11px] text-ink-3">{ruleKey}</p>
        <p className="mt-1.5 font-mono text-[13px] font-semibold text-ink">{formatRuleValue(ruleKey, rule.value)}</p>
        {overridden && (
          <p className="mt-1 text-xs text-accent-text">
            Overridden by a published version. The shipped pack holds {formatRuleValue(ruleKey, shipped.value)}, and the words alongside were written for it.
          </p>
        )}
        {rule.upcoming && (
          <p className="mt-1 text-xs text-warn-text">
            Published in {rule.upcoming.version} and held: becomes {formatRuleValue(ruleKey, rule.upcoming.value)} on {fmtDate(rule.upcoming.from, { weekday: false, year: 'always' })}.
          </p>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] leading-relaxed text-ink-2">{rule.plain}</p>
        {rule.notes && <p className="mt-1 text-xs leading-relaxed text-ink-3">{rule.notes}</p>}
      </div>
      <div className="min-w-0 text-xs">
        <Out href={rule.sourceUrl} className="font-mono text-[11px]">
          {rule.citation}
        </Out>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Status tone={verified.tone} icon={verified.icon} strong={rule.verified !== 'primary'}>
            {verified.label}
          </Status>
          <span className="num text-ink-3">{fmtDate(rule.lastVerified, { weekday: false, year: 'always' })}</span>
        </p>
        {stale && (
          <Flag tone="warn" icon={ClockCountdown} className="mt-1.5">
            Stale: checked {diffDays(rule.lastVerified, day)} days ago
          </Flag>
        )}
        {rule.effectiveFrom && <p className="mt-1 text-ink-3">In force since {fmtDate(rule.effectiveFrom, { weekday: false, year: 'always' })}</p>}
      </div>
    </li>
  )
}

function Compare({ packs }: { packs: Record<JurisdictionCode, JurisdictionPack> }) {
  const base = packs.NZ
  return (
    <div>
      <p className="mb-3 max-w-[90ch] text-[13px] leading-relaxed text-ink-2">
        The headline rules, one row each. A cell is marked where it differs from New Zealand. Only the New Zealand column drives calculators; the rest are preview packs, and a dotted cell is a value that has not been verified at all.
      </p>

      <div className="hidden min-w-0 overflow-x-auto rounded-lg bg-surface shadow-card sm:block">
        <table className="w-full min-w-[58rem] border-separate border-spacing-0 text-left text-[13px]">
          <caption className="sr-only">Comparable rules across jurisdictions</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-56 border-b border-line bg-surface-2 px-3 py-2 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-3 uppercase">
                Rule
              </th>
              {PACK_ORDER.map((code) => (
                <th key={code} scope="col" className="border-b border-line bg-surface-2 px-3 py-2 align-bottom">
                  <PackTag code={code} />
                  <span className="mt-1 block text-[11px] font-normal text-ink-3">{JURISDICTION_NAME[code]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>*]:border-b-0">
            {COMPARABLE_RULES.map((key) => (
              <tr key={key}>
                <th scope="row" className="sticky left-0 z-10 border-b border-line bg-surface px-3 py-2 text-left align-top font-normal">
                  <span className="block text-ink">{base.rules[key].label}</span>
                  <span className="block truncate font-mono text-[10.5px] text-ink-3">{key}</span>
                </th>
                {PACK_ORDER.map((code) => {
                  const rule = packs[code].rules[key] as Rule<unknown>
                  const differs = code !== 'NZ' && !sameValue(rule.value, base.rules[key].value)
                  const unverified = rule.verified === 'unverified'
                  return (
                    <td key={code} className={cn('border-b border-line px-3 py-2 align-top', differs && 'bg-accent-soft/50')}>
                      <span className={cn('font-mono text-[12px]', code === 'NZ' ? 'font-semibold text-ink' : differs ? 'font-medium text-ink' : 'text-ink-2', unverified && 'underline decoration-warn decoration-dotted underline-offset-4')}>{formatRuleValue(key, rule.value)}</span>
                      {differs && <span className="sr-only"> (differs from New Zealand)</span>}
                      {unverified && <span className="mt-0.5 block text-[11px] text-warn-text">Not verified</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2.5 sm:hidden">
        {COMPARABLE_RULES.map((key) => (
          <li key={key} className="rounded-lg bg-surface p-3.5 shadow-card">
            <p className="text-[13px] font-medium text-ink">{base.rules[key].label}</p>
            <p className="truncate font-mono text-[10.5px] text-ink-3">{key}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
              {PACK_ORDER.map((code) => {
                const rule = packs[code].rules[key] as Rule<unknown>
                const differs = code !== 'NZ' && !sameValue(rule.value, base.rules[key].value)
                return (
                  <div key={code} className={cn('min-w-0 rounded-sm px-1.5 py-1', differs && 'bg-accent-soft/60')}>
                    <dt className="font-mono text-[10.5px] text-ink-3">
                      {SHORT[code]}
                      {packs[code].status === 'preview' && ' · preview'}
                    </dt>
                    <dd className={cn('font-mono text-[12px]', code === 'NZ' ? 'font-semibold text-ink' : 'text-ink-2')}>
                      {formatRuleValue(key, rule.value)}
                      {rule.verified === 'unverified' && <span className="block font-sans text-[11px] text-warn-text">Not verified</span>}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Packs({ view, code, onChange }: { view: PackView; code: JurisdictionCode; onChange: (patch: { view?: PackView; j?: JurisdictionCode }) => void }) {
  const day = useToday()
  const versions = useStore((s) => s.db.packVersions)
  const packs = useMemo(() => Object.fromEntries(PACK_ORDER.map((c) => [c, resolvePack(c, versions)])) as Record<JurisdictionCode, JurisdictionPack>, [versions])
  const pack = packs[code]
  const shipped = PACKS[code]
  const keys = Object.keys(pack.rules) as RuleKey[]
  const families = useMemo(() => {
    const out: { family: string; keys: RuleKey[] }[] = []
    for (const key of Object.keys(PACKS[code].rules) as RuleKey[]) {
      const family = key.split('.')[0]
      const group = out.find((g) => g.family === family)
      if (group) group.keys.push(key)
      else out.push({ family, keys: [key] })
    }
    return out
  }, [code])
  const stale = keys.filter((k) => ruleIsStale(pack.rules[k], day)).length
  const unverified = keys.filter((k) => pack.rules[k].verified === 'unverified').length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Segmented
          label="How to look at the packs"
          size="sm"
          value={view}
          onChange={(v) => onChange({ view: v === 'rules' ? undefined : v })}
          options={[
            { value: 'rules', label: 'Rule by rule' },
            { value: 'compare', label: 'Across jurisdictions' },
          ]}
        />
        {view === 'rules' && (
          <Filter
            label="Pack"
            value={code}
            onChange={(v) => onChange({ j: v === 'NZ' ? undefined : v })}
            options={PACK_ORDER.map((c) => ({ value: c, label: `${JURISDICTION_NAME[c]}${PACKS[c].status === 'preview' ? ' (preview)' : ' (live)'}` }))}
          />
        )}
      </div>

      {view === 'compare' ? (
        <Compare packs={packs} />
      ) : (
        <>
          <PackFacts pack={pack} shippedVersion={shipped.version} />
          <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
            <span>
              <span className="num font-semibold text-ink">{keys.length}</span> rules
            </span>
            <span>
              <span className={cn('num font-semibold', unverified ? 'text-warn-text' : 'text-ink')}>{unverified}</span> not verified
            </span>
            <span>
              <span className={cn('num font-semibold', stale ? 'text-warn-text' : 'text-ink')}>{stale}</span> stale, not re-read in {RULE_STALE_AFTER_DAYS} days
            </span>
          </p>
          <div className="grid gap-4">
            {families.map((group) => (
              <section key={group.family} aria-labelledby={`family-${group.family}`} className="overflow-clip rounded-lg bg-surface shadow-card">
                <h3 id={`family-${group.family}`} className="sticky top-13 z-10 flex h-9 items-center justify-between border-b border-line bg-surface-2 px-4 font-mono text-[10.5px] font-medium tracking-[0.06em] text-ink-3 uppercase md:top-0">
                  <span className="text-ink">{FAMILY[group.family] ?? group.family}</span>
                  <span className="num">{group.keys.length}</span>
                </h3>
                <ul className="divide-y divide-line">
                  {group.keys.map((key) => (
                    <RuleRow key={key} ruleKey={key} rule={pack.rules[key]} shipped={shipped.rules[key]} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
