/**
 * A finished inspection, read back: the overall score and who gave it, what
 * needs following up, then every room with its score, note, flags and photos.
 */
import { DeviceMobile, UserFocus } from '@phosphor-icons/react'
import type { Inspection } from '@/domain/types'
import { flagLabel, needsFollowUp } from '@/domain/inspections'
import { dateOf, fmtDate, fmtTime } from '@/domain/rules/calendar'
import { plural } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { Badge } from '@/ui/Badge'
import { Fact, Facts, Num, Ring } from '@/ui/display'
import { Why } from '@/ui/Law'
import { PhotoGrid } from './Photos'
import { FollowUps, ScorePips, scoreTone, TYPE_LABEL } from './shared'

export function InspectionReport({ inspection }: { inspection: Inspection }) {
  const provider = useStore((s) => s.db.providers.find((p) => p.id === inspection.providerId))
  const photos = inspection.rooms.reduce((a, r) => a + r.photoIds.length, 0)
  const flagged = inspection.rooms.filter(needsFollowUp).length
  const overall = inspection.overallScore
  const delegated = inspection.mode === 'delegated'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <Ring
          value={overall ?? 0}
          max={5}
          size={104}
          stroke={9}
          tone={scoreTone(overall)}
          label={overall === undefined ? 'No overall score' : `Overall score ${overall.toFixed(1)} out of 5`}
        >
          <span>
            {overall === undefined ? (
              <span className="text-[22px] font-semibold text-ink-3">—</span>
            ) : (
              <Num
                value={overall}
                decimals={1}
                className="text-[26px] leading-none font-semibold tracking-[-0.02em] text-ink"
              />
            )}
            <span className="mt-0.5 block text-[11px] text-ink-3">out of 5</span>
          </span>
        </Ring>
        <div className="min-w-0 flex-1 basis-56">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            {delegated ? (
              <UserFocus className="size-[18px] shrink-0 text-ink-3" aria-hidden />
            ) : (
              <DeviceMobile className="size-[18px] shrink-0 text-ink-3" aria-hidden />
            )}
            {delegated ? `Done by ${provider?.name ?? 'a local inspector'}` : 'You walked through it yourself'}
          </p>
          {inspection.summary && <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{inspection.summary}</p>}
        </div>
      </div>

      <Facts>
        <Fact label="Kind">{TYPE_LABEL[inspection.type]}</Fact>
        {inspection.completedAt && (
          <Fact label="Finished">
            {fmtDate(dateOf(inspection.completedAt), { year: 'always' })}, {fmtTime(inspection.completedAt)}
          </Fact>
        )}
        {inspection.noticeServedAt && (
          <Fact label="Notice served">
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {fmtDate(dateOf(inspection.noticeServedAt), { year: 'always' })}
              <Why rule="entry.inspection_notice_min" />
            </span>
          </Fact>
        )}
        <Fact label="Rooms">
          {inspection.rooms.length}, {flagged === 0 ? 'none to follow up' : `${flagged} to follow up`}
        </Fact>
      </Facts>

      <section aria-labelledby="report-follow">
        <h3 id="report-follow" className="mb-2.5 text-[14px] font-semibold text-ink">
          To follow up
        </h3>
        <FollowUps inspection={inspection} />
      </section>

      <section aria-labelledby="report-rooms">
        <h3 id="report-rooms" className="mb-1 text-[14px] font-semibold text-ink">
          Room by room
        </h3>
        <ol className="divide-y divide-line">
          {inspection.rooms.map((room) => (
            <li key={room.name} className="grid grid-cols-[minmax(0,1fr)] gap-2 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
                <p className="text-[14px] font-medium text-ink">{room.name}</p>
                <ScorePips score={room.score} />
              </div>
              {room.flags.length > 0 && (
                <p className="flex flex-wrap gap-1.5">
                  {room.flags.map((f) => (
                    <Badge key={f} tone="warn" size="sm">
                      {flagLabel(f)}
                    </Badge>
                  ))}
                </p>
              )}
              {room.note && <p className="text-[13px] leading-relaxed text-ink-2">{room.note}</p>}
              <PhotoGrid ids={room.photoIds} room={room.name} />
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs leading-relaxed text-ink-3">
        {photos > 0
          ? `${plural(photos, 'photo')} with this report. In this prototype photos stay on the device that took them and are not uploaded anywhere.`
          : delegated
            ? 'No photos are shown. In this prototype photos stay on the device that took them, so an inspector’s photos never reach this screen.'
            : 'No photos were taken. In this prototype photos stay on the device that took them and are not uploaded anywhere.'}
      </p>
    </div>
  )
}
