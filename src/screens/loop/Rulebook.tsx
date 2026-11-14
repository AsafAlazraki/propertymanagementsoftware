/**
 * Rulebook.
 *
 * What this screen does that no other does: it lays open the law the rest of
 * Loop runs on. Every number a calculator uses is here in plain words, with
 * the page it was read from and the day a person last checked it — so a
 * landlord never has to take Loop's word for a date.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowSquareOut,
  CalendarDots,
  MagnifyingGlass,
  SealCheck,
  SealQuestion,
  SealWarning,
} from '@phosphor-icons/react'
import type { JurisdictionCode } from '@/domain/types'
import type { Duration, JurisdictionPack, RuleKey, ServiceMethod, Verification } from '@/domain/jurisdictions/types'
import { PACK_ORDER, regionalHolidaysFor, resolvePack } from '@/domain/jurisdictions'
import {
  addDays,
  addWorkingDays,
  dateOf,
  diffDays,
  fmtDate,
  isWorkingDay,
  nonWorkingReason,
} from '@/domain/rules/calendar'
import { deemedReceived, durationText } from '@/domain/rules/core'
import { money } from '@/domain/rules/format'
import { useOrgRows, useStore } from '@/data/store'
import { calendarOf, usePack, useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Badge } from '@/ui/Badge'
import { Choice, Choices, Field, Input, Select, Tabs } from '@/ui/controls'
import { Empty, PageHeader } from '@/ui/display'
import { RuleMoves, Working } from '@/ui/Law'
import { cn } from '@/ui/cn'

export type RulebookTab = 'rules' | 'dates' | 'penalties' | 'changes' | 'compare'

/* ───────────────────────────── reading a value ──────────────────────────── */

const isDuration = (v: unknown): v is Duration => typeof v === 'object' && v !== null && 'n' in v && 'unit' in v

/** A rule's value, the way a person would say it. */
function valueText(key: RuleKey, v: unknown): string {
  if (v === null || v === undefined) return 'No rule'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'number')
    return key.endsWith('_weeks') ? `${v} weeks` : key.endsWith('_months') ? `${v} months` : String(v)
  if (isDuration(v)) return durationText(v)
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('from' in o && 'to' in o) return `${o.from} am – ${Number(o.to) - 12} pm`
    if (isDuration(o.earliest) && isDuration(o.latest)) return `${o.earliest.n}–${o.latest.n} days before`
    if ('occasions' in o && isDuration(o.lateBy) && isDuration(o.within))
      return `${o.occasions} times in ${durationText(o.within)}`
  }
  return String(v)
}

const TOPICS: { key: string; label: string; prefixes: string[] }[] = [
  { key: 'bond', label: 'Bond', prefixes: ['bond'] },
  { key: 'rent', label: 'Rent and listings', prefixes: ['rent', 'listing', 'rent_increase'] },
  { key: 'entry', label: 'Entering the home', prefixes: ['entry'] },
  { key: 'ending', label: 'Ending a tenancy', prefixes: ['termination', 'fixed_term'] },
  { key: 'requests', label: 'Pets and changes', prefixes: ['pets', 'requests', 'contract'] },
  { key: 'money', label: 'Arrears and damage', prefixes: ['arrears', 'damage'] },
  { key: 'records', label: 'Privacy and records', prefixes: ['privacy', 'records'] },
]
const topicOf = (key: string) => TOPICS.find((t) => t.prefixes.includes(key.split('.')[0]))?.key ?? 'records'
/** The radio value for "no topic chosen": a radio group reads an empty value as nothing selected. */
const EVERYTHING = 'everything'

const VERIFIED: Record<Verification, { text: string; tone: 'ok' | 'warn' | 'danger'; Icon: typeof SealCheck }> = {
  primary: { text: 'Read at the source', tone: 'ok', Icon: SealCheck },
  secondary: { text: 'Confirmed second-hand', tone: 'warn', Icon: SealQuestion },
  unverified: { text: 'Not yet verified', tone: 'danger', Icon: SealWarning },
}

function SourceLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[11px] text-accent-text underline-offset-2 hoverable:hover:underline"
    >
      {children}
      <ArrowSquareOut className="size-3 shrink-0" aria-hidden />
    </a>
  )
}

/* ─────────────────────────────────── rules ──────────────────────────────── */

function Rules({ pack }: { pack: JurisdictionPack }) {
  const [topic, setTopic] = useState('')
  const [query, setQuery] = useState('')
  const all = useMemo(
    () => (Object.keys(pack.rules) as RuleKey[]).map((key) => ({ key, rule: pack.rules[key], topic: topicOf(key) })),
    [pack],
  )
  const q = query.trim().toLowerCase()
  const rows = all.filter(
    (r) =>
      (!topic || r.topic === topic) &&
      (!q || `${r.rule.label} ${r.rule.plain} ${r.rule.citation} ${r.rule.notes ?? ''}`.toLowerCase().includes(q)),
  )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:sticky lg:top-6">
        <label className="relative block">
          <span className="sr-only">Search the rules</span>
          <MagnifyingGlass
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the rules"
            className="pl-9"
          />
        </label>
        <Choices
          label="Topic"
          value={topic || EVERYTHING}
          onChange={(key) => setTopic(key === EVERYTHING ? '' : key)}
          className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0"
        >
          {[{ key: '', label: 'Everything' }, ...TOPICS].map((t) => {
            const on = topic === t.key
            const n = t.key ? all.filter((r) => r.topic === t.key).length : all.length
            return (
              <Choice
                key={t.key || EVERYTHING}
                value={t.key || EVERYTHING}
                className={cn(
                  'pressable flex h-9 shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md px-3 text-[13px] whitespace-nowrap transition-colors coarse:h-11',
                  on
                    ? 'bg-accent-soft font-semibold text-accent-text'
                    : 'bg-surface text-ink-2 shadow-card hoverable:hover:text-ink lg:bg-transparent lg:shadow-none hoverable:lg:hover:bg-sunken',
                )}
              >
                {t.label}
                <span className={cn('num text-[11px]', !on && 'text-ink-3')}>{n}</span>
              </Choice>
            )
          })}
        </Choices>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg bg-surface shadow-card">
          <Empty
            icon={<MagnifyingGlass />}
            title="No rule matches that"
            body="Try a plainer word — “bond”, “notice”, “pets” — or ask Loop from the search bar, which answers from these same rules."
          />
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
          {rows.map(({ key, rule }) => {
            const v = VERIFIED[rule.verified]
            return (
              <li
                key={key}
                className="grid grid-cols-[minmax(0,1fr)] gap-x-5 gap-y-2 rounded-lg bg-surface p-4 shadow-card sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:p-5"
              >
                <p className="display text-[22px] leading-tight text-ink sm:text-[24px]">
                  {valueText(key, rule.value)}
                </p>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <h3 className="text-[15px] font-semibold text-ink">{rule.label}</h3>
                    <Badge tone={v.tone} size="sm" icon={<v.Icon weight="fill" className="size-3" aria-hidden />}>
                      {v.text}
                    </Badge>
                  </div>
                  <RuleMoves ruleKey={key} rule={rule} className="mt-1.5" />
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{rule.plain}</p>
                  {rule.notes && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{rule.notes}</p>}
                  <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
                    <SourceLink href={rule.sourceUrl}>{rule.citation}</SourceLink>
                    <span>checked {fmtDate(rule.lastVerified, { year: 'always', weekday: false })}</span>
                    {rule.effectiveFrom && (
                      <span>in force from {fmtDate(rule.effectiveFrom, { year: 'always', weekday: false })}</span>
                    )}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* ─────────────────────────────────── dates ──────────────────────────────── */

/** The calendar's reason for a skipped day, as a countable noun. */
function skipLabel(reason: string, count: number): string {
  if (/weekend/.test(reason)) return count === 1 ? 'weekend day' : 'weekend days'
  if (/public holiday/.test(reason)) return count === 1 ? 'public holiday' : 'public holidays'
  return `${count === 1 ? 'day' : 'days'} ${reason}`
}

function Dates({ pack }: { pack: JurisdictionPack }) {
  const day = useToday()
  const properties = useOrgRows('properties')
  // The count runs on the calendar of the organisation's first home, so the note under it names that home.
  const home = properties[0]
  const cal = calendarOf(pack, home)
  const local = home ? regionalHolidaysFor(pack, home.address.city) : undefined
  const [method, setMethod] = useState<ServiceMethod['id']>('email')
  const [sentOn, setSentOn] = useState(day)
  const [hour, setHour] = useState(10)
  const bondDays = pack.rules['bond.lodgement_deadline'].value.n
  const [from, setFrom] = useState(day)
  const [count, setCount] = useState(String(bondDays))

  const served = deemedReceived(pack, cal, sentOn, method, hour)
  const n = Math.min(60, Math.max(1, Math.round(Number(count) || 0)))
  const end = addWorkingDays(from, n, cal)
  const span = Array.from({ length: diffDays(from, end) + 1 }, (_, i) => addDays(from, i))
  const skipped = span.slice(1).filter((d) => !isWorkingDay(d, cal))
  const reasons = skipped.reduce<Record<string, number>>((m, d) => {
    const r = nonWorkingReason(d, cal) ?? 'not a working day'
    return { ...m, [r]: (m[r] ?? 0) + 1 }
  }, {})

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-2">
      <section className="rounded-lg bg-surface p-5 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">When does the law say a notice arrived?</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          A notice period starts the day after it is received, and how you send it changes that day.
        </p>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
          <Field label="Sent by">
            {(p) => (
              <Select {...p} value={method} onChange={(e) => setMethod(e.target.value as ServiceMethod['id'])}>
                {pack.service.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="On">
            {(p) => (
              <Input {...p} type="date" value={sentOn} onChange={(e) => e.target.value && setSentOn(e.target.value)} />
            )}
          </Field>
          <Field label="At">
            {(p) => (
              <Select {...p} value={String(hour)} onChange={(e) => setHour(Number(e.target.value))}>
                {Array.from({ length: 15 }, (_, i) => i + 7).map((h) => (
                  <option key={h} value={h}>
                    {h % 12 || 12} {h < 12 ? 'am' : 'pm'}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-3">{pack.service.find((s) => s.id === method)?.plain}</p>
        <div className="mt-4 rounded-md bg-sunken p-4">
          <Working steps={served.steps} />
        </div>
        <p aria-live="polite" className="mt-4 text-[15px] text-ink">
          Treated as received on{' '}
          <span className="num font-semibold">{fmtDate(served.received, { year: 'always' })}</span>.
        </p>
      </section>

      <section className="rounded-lg bg-surface p-5 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Count working days</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          Some deadlines run in working days, which skip more than weekends. The bond deadline is {bondDays} of them.
        </p>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
          <Field label="Starting the day after">
            {(p) => (
              <Input {...p} type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
            )}
          </Field>
          <Field label="Working days">
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
              />
            )}
          </Field>
        </div>
        <ol aria-label="Each day in the count" className="mt-4 flex flex-wrap gap-1">
          {span.map((d, i) => {
            const working = i > 0 && isWorkingDay(d, cal)
            const last = d === end
            const why = i === 0 ? 'start' : working ? 'counts' : (nonWorkingReason(d, cal) ?? 'not a working day')
            return (
              <li
                key={d}
                title={`${fmtDate(d, { year: 'always' })} — ${why}`}
                className={cn(
                  'num grid size-7 place-items-center rounded-[5px] text-[11px]',
                  last
                    ? 'bg-accent font-semibold text-accent-ink'
                    : i === 0
                      ? 'text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)]'
                      : working
                        ? 'bg-accent-soft text-accent-text'
                        : 'bg-sunken text-ink-3 line-through',
                )}
              >
                <span aria-hidden>{Number(d.slice(8))}</span>
                <span className="sr-only">
                  {fmtDate(d)}: {why}
                </span>
              </li>
            )
          })}
        </ol>
        <p aria-live="polite" className="mt-4 text-[15px] text-ink">
          {n} working {n === 1 ? 'day' : 'days'} later is{' '}
          <span className="num font-semibold">{fmtDate(end, { year: 'always' })}</span>.
        </p>
        {skipped.length > 0 && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
            {skipped.length} {skipped.length === 1 ? 'day does' : 'days do'} not count:{' '}
            {Object.entries(reasons)
              .map(([r, c]) => `${c} ${skipLabel(r, c)}`)
              .join(', ')}
            .
          </p>
        )}
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-3">
          <CalendarDots className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {home && local
              ? `Counted on ${pack.shortName}’s calendar for ${home.address.city}, where ${home.address.line1} is, including ${local.label}.`
              : home
                ? `Counted on ${pack.shortName}’s national calendar. Loop does not hold the local anniversary day for ${home.address.city} yet, so a count that crosses that day can be a working day out.`
                : `Counted on ${pack.shortName}’s national calendar, with no local anniversary day: there is no home yet to take a region from.`}{' '}
            Holidays are loaded to the end of {cal.coveredThroughYear}.
          </span>
        </p>
      </section>
    </div>
  )
}

/* ───────────────────────────────── penalties ────────────────────────────── */

function Penalties({ pack }: { pack: JurisdictionPack }) {
  const rows = [...pack.penalties].sort((a, b) => b.max - a.max)
  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-surface shadow-card">
        <Empty
          icon={<SealQuestion />}
          title="No penalties are loaded for this place yet"
          body="They are added to a rule pack only once each has been read at its source."
        />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
        The most that can be ordered for each mistake, as the Act stands. Beside each is the part of Loop that is there
        so it does not happen.
      </p>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {rows.map((p) => (
          <li key={p.act} className="flex flex-col rounded-lg bg-surface p-5 shadow-card">
            <p className="num display text-[28px] leading-none text-danger-text">
              <span className="mr-1 align-middle text-[12px] font-medium tracking-normal text-ink-3">up to</span>
              {money(p.max)}
            </p>
            <h3 className="mt-2.5 text-[15px] leading-snug font-semibold text-ink">{p.act}</h3>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-2">
              <span className="font-medium text-ink">How Loop guards against it:</span>{' '}
              {p.preventedBy.charAt(0).toLowerCase() + p.preventedBy.slice(1)}.
            </p>
            <p className="mt-3">
              <SourceLink
                href={p.sourceUrl}
              >{`${pack.act.name.replace(/^Residential Tenancies Act/, 'RTA')}, ${p.citation}`}</SourceLink>
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ─────────────────────────────────── changes ────────────────────────────── */

function Changes({ pack }: { pack: JurisdictionPack }) {
  const sources = useStore((s) => s.db.ruleSources)
  const versions = useStore((s) => s.db.packVersions)
  const changes = useStore((s) => s.db.ruleChanges)
  const mine = sources.filter((s) => s.jurisdiction === pack.code)
  const lastChecked = mine
    .map((s) => s.lastCheckedAt)
    .filter((x) => x !== undefined)
    .sort()
    .pop()
  const inReview = changes.filter(
    (c) =>
      c.jurisdiction === pack.code &&
      (c.status === 'pending_review' || c.status === 'needs_second_review') &&
      c.origin !== 'demo',
  ).length
  const history = versions
    .filter((v) => v.jurisdiction === pack.code)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="min-w-0">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">On the horizon — none of this is law yet</h2>
        {pack.upcoming.length === 0 ? (
          <div className="rounded-lg bg-surface shadow-card">
            <Empty
              icon={<CalendarDots />}
              title="Nothing announced"
              body="When a reform is announced or passed but not yet in force, it is listed here with its date, so it never arrives as a surprise."
            />
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {pack.upcoming.map((u) => (
              <li key={u.title} className="rounded-lg bg-surface p-5 shadow-card">
                <p className="eyebrow">{u.effective}</p>
                <h3 className="mt-1 text-[15px] font-semibold text-ink">{u.title}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{u.summary}</p>
                <p className="mt-2.5">
                  <SourceLink href={u.sourceUrl}>{new URL(u.sourceUrl).hostname.replace(/^www\./, '')}</SourceLink>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <section className="rounded-lg bg-nav p-5 text-nav-ink">
          <p className="eyebrow !text-nav-ink-2">How this stays current</p>
          <p className="mt-2 text-[14px] leading-relaxed">
            Loop watches <span className="num font-semibold text-glow">{mine.length}</span> official pages for{' '}
            {pack.shortName}. When one changes, a person on the Loop team reads it, and nothing here moves until they
            approve it.
          </p>
          <dl className="mt-4 grid gap-1.5 text-[13px] text-nav-ink-2">
            <div className="flex justify-between gap-4">
              <dt>Last check that reached a page</dt>
              <dd className="num text-nav-ink">
                {lastChecked ? fmtDate(dateOf(lastChecked), { year: 'always', weekday: false }) : 'Not run yet'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Changes being read now</dt>
              <dd className="num text-nav-ink">{inReview}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Rule pack in use</dt>
              <dd className="num text-nav-ink">{pack.version}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg bg-surface p-5 shadow-card">
          <h2 className="text-[14px] font-semibold text-ink">What has changed in this pack</h2>
          {history.length === 0 ? (
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              Nothing since it was published on {fmtDate(pack.publishedOn, { year: 'always', weekday: false })}. Every
              later change will be listed here with who approved it.
            </p>
          ) : (
            <ul className="mt-3 grid gap-3">
              {history.map((v) => (
                <li key={v.id} className="text-[13px]">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="num font-semibold text-ink">{v.version}</span>
                    <span className="text-xs text-ink-3">
                      {fmtDate(dateOf(v.publishedAt), { year: 'always', weekday: false })} · approved by {v.publishedBy}
                    </span>
                  </p>
                  <p className="mt-0.5 leading-relaxed text-ink-2">{v.note}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  )
}

/* ─────────────────────────────────── compare ────────────────────────────── */

const COMPARE: RuleKey[] = [
  'bond.max_weeks',
  'bond.lodgement_deadline',
  'rent_increase.min_interval_months',
  'rent_increase.notice',
  'entry.inspection_notice_min',
  'termination.landlord_periodic_notice',
  'termination.tenant_periodic_notice',
  'pets.response_deadline',
  'listing.bidding_banned',
]
const DOT: Record<Verification, string> = { primary: 'bg-ok', secondary: 'bg-warn', unverified: 'bg-danger' }

function Compare({ home }: { home: JurisdictionCode }) {
  const versions = useStore((s) => s.db.packVersions)
  const packs = useMemo(() => PACK_ORDER.map((code) => resolvePack(code, versions)), [versions])
  const [other, setOther] = useState<JurisdictionCode>(PACK_ORDER.find((c) => c !== home) ?? home)
  const mine = packs.find((p) => p.code === home) ?? packs[0]
  const theirs = packs.find((p) => p.code === other) ?? packs[0]
  const cell = (p: JurisdictionPack, key: RuleKey) => (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', DOT[p.rules[key].verified])} />
      {valueText(key, p.rules[key].value)}
      <span className="sr-only">, {VERIFIED[p.rules[key].verified].text.toLowerCase()}</span>
    </span>
  )

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <p className="max-w-[66ch] text-[14px] leading-relaxed text-ink-2">
        A place is a data file. Each one below answers the same questions, so the same calculators work in each. Only{' '}
        {mine.shortName} is live; the others are researched previews, not yet signed off, and Loop does not run on them.
      </p>

      {/* A phone compares two places at a time. */}
      <div className="md:hidden">
        <Field label={`Compare ${mine.shortName} with`}>
          {(p) => (
            <Select {...p} value={other} onChange={(e) => setOther(e.target.value as JurisdictionCode)}>
              {packs
                .filter((x) => x.code !== home)
                .map((x) => (
                  <option key={x.code} value={x.code}>
                    {x.name}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <ul className="mt-3 overflow-hidden rounded-lg bg-surface shadow-card">
          {COMPARE.map((key) => (
            <li key={key} className="border-b border-line px-4 py-3 last:border-b-0">
              <p className="text-[13px] font-medium text-ink">{mine.rules[key].label}</p>
              <dl className="mt-1.5 grid grid-cols-2 gap-3 text-[13px]">
                <div>
                  <dt className="text-[11px] text-ink-3">{mine.shortName}</dt>
                  <dd className="num text-ink">{cell(mine, key)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ink-3">{theirs.shortName}</dt>
                  <dd className="num text-ink-2">{cell(theirs, key)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative hidden overflow-x-auto rounded-lg bg-surface shadow-card md:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-line align-bottom">
              <th scope="col" className="sticky left-0 z-10 bg-surface px-4 py-3 text-xs font-medium text-ink-3">
                The question
              </th>
              {packs.map((p) => (
                <th key={p.code} scope="col" className="px-3 py-3 text-xs font-medium whitespace-nowrap text-ink">
                  {p.shortName}
                  <span
                    className={cn(
                      'mt-0.5 block text-[11px] font-normal',
                      p.status === 'live' ? 'text-ok-text' : 'text-ink-3',
                    )}
                  >
                    {p.status === 'live' ? 'Live' : 'Preview'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((key) => (
              <tr key={key} className="border-b border-line last:border-b-0">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-surface px-4 py-3 font-normal whitespace-nowrap text-ink"
                >
                  {mine.rules[key].label}
                </th>
                {packs.map((p) => (
                  <td
                    key={p.code}
                    className={cn(
                      'num px-3 py-3 whitespace-nowrap',
                      p.code === home ? 'font-medium text-ink' : 'text-ink-2',
                    )}
                  >
                    {cell(p, key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-3">
        {(Object.keys(VERIFIED) as Verification[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn('size-1.5 rounded-full', DOT[k])} />
            {VERIFIED[k].text}
          </span>
        ))}
      </p>
    </div>
  )
}

/* ──────────────────────────────── the screen ────────────────────────────── */

export function Rulebook({ tab }: { tab: RulebookTab }) {
  const pack = usePack()
  const navigate = useNavigate()
  const keys = Object.keys(pack.rules) as RuleKey[]
  const checked =
    keys
      .map((k) => pack.rules[k].lastVerified)
      .sort()
      .pop() ?? pack.publishedOn
  const atSource = keys.filter((k) => pack.rules[k].verified === 'primary').length
  const setTab = (t: RulebookTab) =>
    void navigate({ to: '/loop/rulebook', search: t === 'rules' ? {} : { tab: t }, replace: true })

  return (
    <Page wide>
      <PageHeader
        eyebrow={`Rulebook · ${pack.name}`}
        title="The law Loop runs on"
        lede={
          <>
            Every date and limit in Loop comes from one of these {keys.length} rules.{' '}
            {atSource === keys.length ? 'All of them were' : `${atSource} of them were`} read at the source, most
            recently on {fmtDate(checked, { year: 'always', weekday: false })}. General information, not legal advice.
          </>
        }
        actions={
          <a
            href={pack.act.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-surface px-3.5 text-[13px] font-medium text-ink shadow-card hoverable:hover:text-accent-text"
          >
            {pack.act.name}
            <ArrowSquareOut className="size-4" aria-hidden />
          </a>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'rules', label: 'Rules' },
          { value: 'dates', label: 'Work out a date' },
          { value: 'penalties', label: 'Penalties' },
          { value: 'changes', label: 'Coming up' },
          { value: 'compare', label: 'Other places' },
        ]}
      />
      <div className="pt-5">
        {tab === 'rules' && <Rules pack={pack} />}
        {tab === 'dates' && <Dates pack={pack} />}
        {tab === 'penalties' && <Penalties pack={pack} />}
        {tab === 'changes' && <Changes pack={pack} />}
        {tab === 'compare' && <Compare home={pack.code} />}
      </div>
    </Page>
  )
}
