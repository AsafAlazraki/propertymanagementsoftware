/**
 * What Loop is plugged into, and how it looks on this device. In the
 * prototype nothing is plugged into anything, and each line says so.
 */
import {
  ArrowSquareOut,
  Bank,
  Megaphone,
  Monitor,
  Moon,
  SealCheck,
  Storefront,
  Sun,
  type Icon,
} from '@phosphor-icons/react'
import { fmtDate } from '@/domain/rules/calendar'
import { plural } from '@/domain/rules/format'
import { useOrgRows, useStore } from '@/data/store'
import { usePack } from '@/data/hooks'
import { setTheme } from '@/data/ops-mutations'
import { Badge, type Tone } from '@/ui/Badge'
import { Segmented } from '@/ui/controls'
import { Section } from './shared'

interface Connection {
  icon: Icon
  name: string
  state: { label: string; tone: Tone }
  body: string
  link?: { label: string; href: string }
}

const SIMULATED = { label: 'Simulated', tone: 'warn' as const }

export function ConnectionsSection() {
  const pack = usePack()
  const simulatedThrough = useStore((s) => s.db.simulatedThrough)
  const properties = useOrgRows('properties')
  const bankLines = useOrgRows('bankLines').length
  const live = properties.filter((p) => p.listing?.status === 'live')
  const marked = live.filter((p) => p.listing?.syndication.trademe || p.listing?.syndication.realestate).length

  const rows: Connection[] = [
    {
      icon: Bank,
      name: 'Bank feed',
      state: SIMULATED,
      body: `No bank is connected. A made-up feed pays each tenant’s rent on its due date so the ledger has something to match. It has run up to ${fmtDate(simulatedThrough, { year: 'always' })} and produced ${plural(bankLines, 'line')}.`,
    },
    {
      icon: SealCheck,
      name: pack.bondAuthority.name,
      state: SIMULATED,
      body: `Loop counts the working days and keeps the reference you type in. It does not lodge a bond: recording one here sends nothing to ${pack.regulator.name}. You lodge it on their site.`,
      link: { label: 'Open the real Bond Hub', href: pack.bondAuthority.url },
    },
    {
      icon: Megaphone,
      name: 'Pool listings',
      state: { label: 'Inside this demo', tone: 'info' },
      body: `A home with a live listing appears in Pool, the renter side of this prototype, and nowhere else. ${live.length === 0 ? 'None of your homes is listed right now.' : `${plural(live.length, 'home')} of yours ${live.length === 1 ? 'is' : 'are'} listed there now.`}`,
    },
    {
      icon: Storefront,
      name: 'Trade Me and realestate.co.nz',
      state: SIMULATED,
      body: `A listing can be marked to go to these sites, and the mark is all that happens: nothing is sent to either. ${marked === 0 ? 'No listing is marked right now.' : `${plural(marked, 'listing')} ${marked === 1 ? 'is' : 'are'} marked now.`}`,
    },
  ]

  return (
    <Section
      id="connections"
      title="Connections"
      lede="The outside services the real product talks to. This prototype talks to none of them, so nothing below is a live connection."
    >
      <ul className="divide-y divide-line rounded-lg bg-surface shadow-card">
        {rows.map((row) => {
          const RowIcon = row.icon
          return (
            <li key={row.name} className="flex items-start gap-3.5 p-4 sm:px-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sunken text-ink-2">
                <RowIcon weight="fill" className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="text-[14px] font-semibold text-ink">{row.name}</span>
                  <Badge tone={row.state.tone} size="sm" dot>
                    {row.state.label}
                  </Badge>
                </p>
                <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-ink-2">{row.body}</p>
                {row.link && (
                  <a
                    href={row.link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-sm text-[13px] font-medium text-accent-text underline-offset-4 hoverable:hover:underline coarse:min-h-11"
                  >
                    {row.link.label}
                    <ArrowSquareOut className="size-3.5" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

export function AppearanceSection() {
  const theme = useStore((s) => s.prefs.theme)
  return (
    <Section
      id="appearance"
      title="Appearance"
      lede="Light, dark, or whatever this device is set to. It is remembered in this browser and applies to Loop, Pool and the team console alike."
    >
      <div className="rounded-lg bg-surface p-4 shadow-card sm:p-5">
        <Segmented
          label="Colour theme"
          value={theme}
          onChange={setTheme}
          className="w-full sm:w-auto"
          options={[
            { value: 'light', label: 'Light', icon: <Sun className="size-4" aria-hidden /> },
            { value: 'dark', label: 'Dark', icon: <Moon className="size-4" aria-hidden /> },
            { value: 'system', label: 'Match device', icon: <Monitor className="size-4" aria-hidden /> },
          ]}
        />
      </div>
    </Section>
  )
}
