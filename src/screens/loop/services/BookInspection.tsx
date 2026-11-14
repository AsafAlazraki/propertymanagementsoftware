/**
 * Booking a routine inspection from the marketplace. An inspection carries a
 * notice, so it is not booked like the other jobs: the landlord picks the home
 * and the same decision the Inspections screen uses works out the lawful days.
 */
import { useRef, useState } from 'react'
import { ArrowLeft, CaretRight, HouseLine } from '@phosphor-icons/react'
import { lastCompleted } from '@/domain/inspections'
import { dateOf, fmtDate, fmtRelative } from '@/domain/rules/calendar'
import { listOf } from '@/domain/rules/format'
import { useOrgRows } from '@/data/store'
import { activeTenancy, useNameOf, useToday } from '@/data/hooks'
import { proposeInspection, withdrawProposal } from '@/data/ops-mutations'
import { Empty } from '@/ui/display'
import { Sheet } from '@/ui/Sheet'
import { InspectionDecision } from '../decisions/tenancy'

export function BookInspectionSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const day = useToday()
  const nameOf = useNameOf()
  const properties = useOrgRows('properties')
  const tenancies = useOrgRows('tenancies')
  const inspections = useOrgRows('inspections')
  const [inspectionId, setInspectionId] = useState<string | null>(null)
  // A proposal opened here is a draft: if no day is booked, it is dropped again.
  const drafted = useRef<string | null>(null)

  const booking = inspections.find((i) => i.id === inspectionId && i.status === 'proposed')
  const home = properties.find((p) => p.id === booking?.propertyId)
  const lived = properties.filter((p) => activeTenancy(tenancies, p.id))

  const drop = () => {
    if (inspectionId && drafted.current === inspectionId) withdrawProposal(inspectionId)
    drafted.current = null
    setInspectionId(null)
  }
  const close = () => {
    drop()
    onClose()
  }
  const pick = (propertyId: string) => {
    const waiting = inspections.find((i) => i.propertyId === propertyId && i.status === 'proposed')
    const id = waiting?.id ?? proposeInspection(propertyId)
    if (!id) return
    drafted.current = waiting ? null : id
    setInspectionId(id)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && close()}
      eyebrow={home ? `Routine inspection · ${home.address.line1}` : 'Routine inspection'}
      title={booking ? 'Choose the day, and who goes' : 'Which home?'}
      description={
        booking
          ? 'The notice is served to the tenants the moment you book.'
          : 'A routine inspection is for a home someone lives in.'
      }
    >
      {booking ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <button
            type="button"
            onClick={drop}
            className="-ml-1 inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-sm px-1 text-[13px] font-medium text-ink-2 hoverable:hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden />A different home
          </button>
          <InspectionDecision inspectionId={booking.id} done={close} />
        </div>
      ) : lived.length === 0 ? (
        <Empty
          icon={<HouseLine />}
          title="No home has tenants right now"
          body="A routine inspection is a walk through a home while someone lives there. When a tenancy starts, the home appears here."
        />
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {lived.map((p) => {
            const tenancy = activeTenancy(tenancies, p.id)
            const mine = inspections.filter((i) => i.propertyId === p.id)
            const held = mine.find((i) => i.status === 'notice_served' || i.status === 'in_progress')
            const last = lastCompleted(mine, p.id)
            const who = tenancy ? listOf(tenancy.tenantIds.map((id) => nameOf(id).split(' ')[0])) : ''
            const sub = held
              ? held.status === 'in_progress'
                ? 'A walk-through is already under way here.'
                : `Already booked${held.scheduledFor ? ` for ${fmtDate(dateOf(held.scheduledFor))}` : ''}. Cancel that one from Inspections to book another.`
              : last?.completedAt
                ? `${who} · last inspected ${fmtRelative(dateOf(last.completedAt), day)}`
                : `${who} · no inspection on record`
            return (
              <li key={p.id}>
                {held ? (
                  <div className="rounded-lg bg-sunken p-3.5">
                    <p className="text-[14px] font-semibold text-ink">{p.address.line1}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{sub}</p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pick(p.id)}
                    className="pressable flex min-h-14 w-full items-center gap-3 rounded-lg bg-surface p-3.5 text-left shadow-card transition-shadow hoverable:hover:shadow-pop"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{p.address.line1}</span>
                      <span className="block truncate text-[13px] text-ink-2">{sub}</span>
                    </span>
                    <CaretRight weight="bold" className="size-4 shrink-0 text-ink-3" aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
