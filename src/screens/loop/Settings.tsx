/**
 * Settings.
 *
 * What this screen does that no other does: it is where the landlord draws
 * the edges of the machine. What it costs, who owns what, how far it may act
 * without asking, who else can look in — and the door out, with everything
 * under one arm. Every other screen works inside the lines set here.
 */
import {
  ChatCircleDots,
  CreditCard,
  DownloadSimple,
  Palette,
  PlugsConnected,
  Robot,
  UsersThree,
  Buildings,
  type Icon,
} from '@phosphor-icons/react'
import { useOrgId, useStore } from '@/data/store'
import { Page } from '@/shell/common'
import { PageHeader } from '@/ui/display'
import { useMediaQuery } from '@/ui/hooks'
import { DataSection } from './settings/Data'
import { AppearanceSection, ConnectionsSection } from './settings/Device'
import { FeedbackSection } from './settings/Feedback'
import { AutopilotSection, OwnersSection } from './settings/Owners'
import { PeopleSection } from './settings/People'
import { PlanSection } from './settings/Plan'

const SECTIONS: { id: string; label: string; icon: Icon }[] = [
  { id: 'plan', label: 'Plan and price', icon: CreditCard },
  { id: 'owners', label: 'Owners', icon: Buildings },
  { id: 'autopilot', label: 'Autopilot limits', icon: Robot },
  { id: 'people', label: 'People', icon: UsersThree },
  { id: 'connections', label: 'Connections', icon: PlugsConnected },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Your data', icon: DownloadSimple },
  { id: 'feedback', label: 'Feedback', icon: ChatCircleDots },
]

export function Settings() {
  const orgId = useOrgId()
  const org = useStore((s) => s.db.orgs.find((o) => o.id === orgId))
  const still = useMediaQuery('(prefers-reduced-motion: reduce)')

  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })

  return (
    <Page>
      <PageHeader
        eyebrow="Settings"
        title={org?.name ?? 'Your organisation'}
        lede="What Loop costs, who owns what, how far it may act without asking, who else can look in, and how to take everything with you."
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-10 gap-y-6 lg:grid-cols-[12.5rem_minmax(0,1fr)]">
        <nav aria-label="Parts of settings" className="min-w-0 lg:sticky lg:top-8">
          <ul className="no-scrollbar relative -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {SECTIONS.map((s) => {
              const SectionIcon = s.icon
              return (
                <li key={s.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => jump(s.id)}
                    className="pressable flex h-10 items-center gap-2.5 rounded-full bg-sunken px-3.5 text-[13px] font-medium whitespace-nowrap text-ink-2 transition-colors duration-150 hoverable:hover:text-ink coarse:h-11 lg:w-full lg:rounded-md lg:bg-transparent lg:px-2.5 lg:hoverable:hover:bg-sunken"
                  >
                    <SectionIcon className="size-[18px] shrink-0 text-ink-3" aria-hidden />
                    {s.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-12">
          <PlanSection />
          <OwnersSection />
          <AutopilotSection />
          <PeopleSection />
          <ConnectionsSection />
          <AppearanceSection />
          <DataSection />
          <FeedbackSection />
        </div>
      </div>
    </Page>
  )
}
