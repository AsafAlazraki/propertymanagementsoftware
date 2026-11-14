/**
 * The small vocabulary the inspection list, the report and the studio share:
 * what a type is called, how a score is drawn, and the rooms that need a
 * second look.
 */
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowRight, Wrench } from '@phosphor-icons/react'
import type { Inspection } from '@/domain/types'
import { flagLabel, needsFollowUp, SCORE_WORDS, SCORES } from '@/domain/inspections'
import { useMe, useOrgRows } from '@/data/store'
import { raiseRepairFromRoom } from '@/data/ops-mutations'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'

export const TYPE_LABEL: Record<Inspection['type'], string> = {
  routine: 'Routine inspection',
  entry: 'Entry report',
  exit: 'Exit report',
}

export function scoreTone(score: number | undefined): 'ok' | 'warn' | 'danger' {
  if (score === undefined || score >= 4) return 'ok'
  return score >= 3 ? 'warn' : 'danger'
}

const PIP = { ok: 'bg-ok', warn: 'bg-warn', danger: 'bg-danger' }

/** A room's score as five pips, the figure, and the word for it. */
export function ScorePips({ score, className }: { score: number | undefined; className?: string }) {
  const tone = scoreTone(score)
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span aria-hidden className="flex gap-0.5">
        {SCORES.map((n) => (
          <span
            key={n}
            className={cn('h-2 w-3.5 rounded-full', score !== undefined && n <= score ? PIP[tone] : 'bg-line')}
          />
        ))}
      </span>
      <span className="text-[13px] text-ink-2">
        {score === undefined ? (
          'Not scored'
        ) : (
          <>
            <span className="num font-semibold text-ink">{score}</span> · {SCORE_WORDS[score]}
          </>
        )}
      </span>
    </span>
  )
}

/**
 * The rooms an inspection says to come back to, each with the one thing to do
 * about it: raise a repair, or follow the one already raised.
 */
export function FollowUps({ inspection }: { inspection: Inspection }) {
  const me = useMe()
  const tickets = useOrgRows('tickets')
  const rows = inspection.rooms.map((room, index) => ({ room, index })).filter(({ room }) => needsFollowUp(room))

  if (rows.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-ink-2">
        Nothing was flagged and no room scored poorly, so there is nothing to chase.
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {rows.map(({ room, index }) => {
        const raised = tickets.find(
          (t) =>
            t.propertyId === inspection.propertyId &&
            t.room === room.name &&
            inspection.completedAt !== undefined &&
            t.createdAt >= inspection.completedAt,
        )
        return (
          <li key={room.name} className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-sunken p-3.5">
            <div className="min-w-0 flex-1 basis-56">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] font-semibold text-ink">
                {room.name}
                {room.flags.map((f) => (
                  <Badge key={f} tone="warn" size="sm">
                    {flagLabel(f)}
                  </Badge>
                ))}
                {room.flags.length === 0 && room.score !== undefined && (
                  <Badge tone="danger" size="sm">
                    Scored {room.score} · {SCORE_WORDS[room.score]}
                  </Badge>
                )}
              </p>
              {room.note && <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{room.note}</p>}
            </div>
            {raised ? (
              <Link
                to="/loop/repairs"
                search={{ job: raised.id }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-[13px] font-medium text-accent-text underline-offset-4 hoverable:hover:underline"
              >
                Repair raised — follow it
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : (
              <Button
                intent="secondary"
                icon={<Wrench className="size-4" aria-hidden />}
                onClick={() => {
                  const id = raiseRepairFromRoom(inspection.id, index, me.id)
                  if (id)
                    toast.success('Repair raised', {
                      description: 'It was sorted like any other fault. The room’s note and photos went with it.',
                    })
                  else
                    toast.error('That repair could not be raised', {
                      description: 'The home could not be found. Nothing was lost.',
                    })
                }}
              >
                Raise a repair
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
