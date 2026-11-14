/**
 * Your data: take a copy of everything, or put the demo back to how it began.
 */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowCounterClockwise, DownloadSimple } from '@phosphor-icons/react'
import { useMe, useOrgId, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { noteExport, resetDemoData } from '@/data/ops-mutations'
import { Button } from '@/ui/Button'
import { Num } from '@/ui/display'
import { Modal } from '@/ui/Sheet'
import { collectOrgData, downloadJson, exportContents } from './export'
import { Section, Truth } from './shared'

export function DataSection() {
  const me = useMe()
  const day = useToday()
  const orgId = useOrgId()
  const db = useStore((s) => s.db)
  const [confirming, setConfirming] = useState(false)

  const contents = useMemo(() => exportContents(collectOrgData(db, orgId, '')), [db, orgId])
  const total = contents.reduce((a, c) => a + c.rows, 0)
  const orgName = db.orgs.find((o) => o.id === orgId)?.name ?? 'organisation'

  const download = () => {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    downloadJson(`loop-${slug}-${day}.json`, collectOrgData(db, orgId, new Date().toISOString()))
    noteExport(orgId, me.fullName, total)
    toast.success('Your data is downloading', {
      description: `${total} rows in one JSON file, readable in any text editor.`,
    })
  }

  return (
    <Section
      id="data"
      title="Your data"
      lede="It is yours. Take a copy of every record Loop holds for this organisation whenever you like."
    >
      <div className="rounded-lg bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="min-w-0 flex-1 basis-56 text-[14px] leading-relaxed text-ink">
            One file with <Num value={total} className="font-semibold" /> rows: everything listed below, exactly as it
            is stored.
          </p>
          <Button
            intent="primary"
            icon={<DownloadSimple weight="bold" className="size-4" aria-hidden />}
            onClick={download}
          >
            Download everything
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 border-t border-line pt-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
          {contents.map((c) => (
            <div key={c.label} className="flex min-w-0 items-baseline justify-between gap-3 py-1.5 text-[13px]">
              <dt className="min-w-0 truncate text-ink-2">{c.label}</dt>
              <dd className="num shrink-0 font-medium text-ink">{c.rows}</dd>
            </div>
          ))}
        </dl>
        <Truth>
          Photos are not in the file. In this prototype they are kept in this browser’s own storage and never leave the
          device.
        </Truth>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-line p-5">
        <div className="min-w-0 flex-1 basis-64">
          <p className="text-[14px] font-semibold text-ink">Reset the demo</p>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-ink-2">
            Everything you see is demo data kept in this browser, under the key{' '}
            <code className="rounded-sm bg-sunken px-1 py-0.5 font-mono text-xs text-ink">loop-pool:store</code>.
            Resetting puts every record back to how it started, dated from today.
          </p>
        </div>
        <Button
          intent="dangerSoft"
          icon={<ArrowCounterClockwise weight="bold" className="size-4" aria-hidden />}
          onClick={() => setConfirming(true)}
        >
          Reset the demo data
        </Button>
      </div>

      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        size="sm"
        title="Reset the demo data?"
        description="Every change made in this browser is undone, in Loop, Pool and the team console alike: bookings, repairs, notices, inspections and their photos, feedback and settings. Your colour theme stays. This cannot be undone."
        footer={
          <>
            <Button intent="ghost" onClick={() => setConfirming(false)}>
              Keep everything
            </Button>
            <Button
              intent="danger"
              onClick={() => {
                resetDemoData()
                setConfirming(false)
                toast.success('Demo reset', {
                  description: 'Every record is back to how it started, dated from today.',
                })
              }}
            >
              Reset the demo
            </Button>
          </>
        }
      />
    </Section>
  )
}
