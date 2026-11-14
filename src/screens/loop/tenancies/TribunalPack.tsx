/**
 * The Tribunal pack. Everything a claim needs from this tenancy, in the order
 * an adjudicator reads it, with personal details that have nothing to do with
 * the claim taken out before it leaves — because whatever is filed is handed
 * to the other side.
 */
import { useMemo, useState } from 'react'
import { ArrowSquareOut, DownloadSimple, EyeSlash } from '@phosphor-icons/react'
import type { ID } from '@/domain/types'
import { dateOf, fmtDate, fmtDateLong } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { arrearsState } from '@/domain/rules/tenancy'
import { redact, type Redaction } from '@/domain/rules/text'
import { useStore } from '@/data/store'
import { calendarOf, useNameOf, usePack, useToday } from '@/data/hooks'
import { Button } from '@/ui/Button'
import { Switch } from '@/ui/controls'
import { Callout } from '@/ui/display'
import { downloadDocument } from './NoticeDoc'

export function TribunalPack({ tenancyId }: { tenancyId: ID }) {
  const pack = usePack()
  const day = useToday()
  const nameOf = useNameOf()
  const t = useStore((s) => s.db.tenancies.find((x) => x.id === tenancyId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === t?.propertyId))
  const entity = useStore((s) => s.db.entities.find((e) => e.id === property?.entityId))
  const users = useStore((s) => s.db.users)
  const allLedger = useStore((s) => s.db.ledger)
  const allEvents = useStore((s) => s.db.arrearsEvents)
  const allNotices = useStore((s) => s.db.notices)
  const [hide, setHide] = useState(true)

  const built = useMemo(() => {
    if (!t || !property) return null
    const cal = calendarOf(pack, property)
    const owing = arrearsState(pack, cal, t, day)
    const tenants = t.tenantIds.map((id) => users.find((u) => u.id === id)).filter((u) => u !== undefined)
    const rent = allLedger
      .filter((l) => l.tenancyId === t.id && l.kind === 'rent')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12)
    const events = allEvents.filter((e) => e.tenancyId === t.id).sort((a, b) => a.at.localeCompare(b.at))
    const notices = allNotices.filter((n) => n.tenancyId === t.id).sort((a, b) => a.servedOn.localeCompare(b.servedOn))

    const sections = [
      `1. The tenancy\n${property.address.line1}, ${property.address.suburb}, ${property.address.city} ${property.address.postcode}\nLandlord: ${entity?.name ?? 'The owner'}\nTenants: ${tenants.map((u) => u.fullName).join(', ')}\nBegan: ${fmtDateLong(t.startDate)}${t.endDate ? `\nFixed term ends: ${fmtDateLong(t.endDate)}` : '\nPeriodic tenancy'}\nRent: ${money(t.weeklyRent)} a week, paid ${t.cadence}\nBond: ${money(t.bond.amount)}${t.bond.bondRef ? `, lodged under ${t.bond.bondRef}` : ', not yet lodged'}`,
      `2. Rent as at ${fmtDateLong(day)}\nPaid up to and including: ${fmtDateLong(t.rentPaidTo)}\n${owing.owed > 0 ? `Owing: ${money(owing.owed)}, ${owing.daysLate} ${owing.daysLate === 1 ? 'day' : 'days'} overdue` : 'Nothing is owing.'}`,
      `3. The last ${rent.length} rent payments\n${rent.map((l) => `${fmtDate(l.date, { year: 'always', weekday: false }).padEnd(11)}   ${money(l.amount).padStart(7)}   ${l.description}${l.bankRef ? `   ref ${l.bankRef}` : ''}`).join('\n') || 'No payments recorded.'}`,
      `4. What was said and done\n${events.map((e) => `${fmtDate(dateOf(e.at), { year: 'always', weekday: false })}   ${e.note}`).join('\n') || 'Nothing recorded.'}`,
      `5. Notices given\n${notices.map((n) => `${fmtDate(n.servedOn, { year: 'always', weekday: false })}   ${n.title} — received ${fmtDate(n.deemedReceivedOn, { year: 'always', weekday: false })}, effective ${fmtDate(n.effectiveOn, { year: 'always', weekday: false })}`).join('\n') || 'None.'}`,
      `6. Contact details for service\n${tenants.map((u) => `${u.fullName}: ${u.email}, ${u.phone}`).join('\n')}`,
    ]
    const raw = sections.join('\n\n')
    // Contact details in section 6 are required for service, so they stay; the same details are removed wherever else they appear.
    const body = sections.slice(0, 5).join('\n\n')
    const cleaned = redact(body)
    return {
      raw,
      redactedText: `${cleaned.text}\n\n${sections[5]}`,
      redactions: cleaned.redactions,
      address: property.address.line1,
    }
  }, [t, property, entity, users, allLedger, allEvents, allNotices, pack, day])

  if (!built || !t) return null
  const text = hide ? built.redactedText : built.raw
  const counts = built.redactions.reduce<Partial<Record<Redaction['kind'], number>>>(
    (m, r) => ({ ...m, [r.kind]: (m[r.kind] ?? 0) + 1 }),
    {},
  )
  const filing = pack.tribunal.filing
  const first = nameOf(t.tenantIds[0]).split(' ')[0]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      {filing && (
        <Callout
          tone="warn"
          icon={<EyeSlash weight="fill" />}
          title={`${first} will be given a copy of everything you file`}
        >
          {filing.disclosed} {filing.redaction}
          <a
            href={filing.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 flex items-center gap-1 text-xs font-medium text-accent-text underline-offset-2 hoverable:hover:underline"
          >
            {filing.citation}
            <ArrowSquareOut className="size-3.5 shrink-0" aria-hidden />
          </a>
        </Callout>
      )}

      <div className="rounded-lg bg-sunken p-4">
        <Switch
          checked={hide}
          onCheckedChange={setHide}
          label="Take out details that are not relevant"
          description={
            built.redactions.length === 0
              ? 'Nothing in this record looked like a bank account, tax number, date of birth, phone number or email address outside the contact section.'
              : `${built.redactions.length} found: ${Object.entries(counts)
                  .map(([k, n]) => `${n} ${k}${n === 1 ? '' : 's'}`)
                  .join(', ')}. Contact details for service stay, because an application needs them.`
          }
        />
      </div>

      <article className="rounded-md border border-line bg-surface p-5 shadow-card sm:p-7">
        <h3 className="display text-[18px] text-ink">Tenancy record for the {pack.tribunal.name}</h3>
        <p className="mt-1 mb-4 text-xs text-ink-3">
          {built.address} · prepared {fmtDate(day, { year: 'always', weekday: false })} from Loop’s records
        </p>
        <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink">{text}</pre>
      </article>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          intent="primary"
          icon={<DownloadSimple className="size-4" />}
          onClick={() =>
            downloadDocument(
              `tribunal-record-${day}.html`,
              `Tenancy record for the ${pack.tribunal.name}`,
              text,
              `Prepared ${fmtDateLong(day)} from Loop’s records, rule pack ${pack.version}.`,
            )
          }
        >
          Download the record
        </Button>
        <a
          href={pack.tribunal.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-text underline-offset-2 hoverable:hover:underline"
        >
          Apply at the {pack.tribunal.name}
          <ArrowSquareOut className="size-3.5" aria-hidden />
        </a>
      </div>
      <p className="text-xs leading-relaxed text-ink-3">
        This is your record, set out for a claim. Loop does not file it and does not give legal advice: what you ask the
        Tribunal for, and why, is yours to write.
        {pack.tribunal.maxClaim ? ` The Tribunal can hear claims up to ${money(pack.tribunal.maxClaim)}.` : ''}
      </p>
    </div>
  )
}
