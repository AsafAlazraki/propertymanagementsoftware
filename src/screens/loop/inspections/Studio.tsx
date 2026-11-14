/**
 * The inspection studio.
 *
 * What this screen does that no other does: it is the one tool held in a hand
 * inside the home. One room on screen at a time, the controls where a thumb
 * reaches, every tap saved on the phone the moment it is made — and a door
 * that stays shut, with its reason, until the tenants have had their notice.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { Toggle } from '@base-ui/react/toggle'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle,
  ClipboardText,
  DeviceMobile,
  FastForward,
  Images,
  WifiSlash,
} from '@phosphor-icons/react'
import type { ID, Inspection, InspectionRoom, ISODate, Property } from '@/domain/types'
import {
  draftSummary,
  flagLabel,
  lastCompleted,
  needsFollowUp,
  overallScore,
  ROOM_FLAGS,
  SCORE_WORDS,
  SCORES,
  studioGate,
  unscoredRooms,
  type StudioGate,
} from '@/domain/inspections'
import { dateOf, fmtDate, fmtTime } from '@/domain/rules/calendar'
import { listOf, plural } from '@/domain/rules/format'
import { useOrgRows, useStore } from '@/data/store'
import { calendarOf, usePack, useToday } from '@/data/hooks'
import { savePhoto } from '@/data/photos'
import { addRoomPhoto, completeInspection, demoStartNow, removeRoomPhoto, saveRoom } from '@/data/ops-mutations'
import { Page } from '@/shell/common'
import { Badge } from '@/ui/Badge'
import { Button, buttonClass } from '@/ui/Button'
import { Checkbox, Field, Textarea } from '@/ui/controls'
import { Bar, Callout, Empty, Fact, Facts, Num, Ring } from '@/ui/display'
import { useOnline } from '@/ui/hooks'
import { Refusal, Working } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { PhotoGrid } from './Photos'
import { FollowUps, scoreTone, TYPE_LABEL } from './shared'

const SCORE_CHIP = {
  ok: 'bg-ok-soft text-ok-text',
  warn: 'bg-warn-soft text-warn-text',
  danger: 'bg-danger-soft text-danger-text',
}

function BackToList() {
  return (
    <Link
      to="/loop/inspections"
      className="-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-sm px-1 text-[13px] font-medium text-ink-2 hoverable:hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Inspections
    </Link>
  )
}

/* ──────────────────────────────── the door ──────────────────────────────── */

function Locked({
  inspection,
  property,
  gate,
  providerName,
}: {
  inspection: Inspection
  property: Property
  gate: Extract<StudioGate, { open: false }>
  providerName?: string
}) {
  const pack = usePack()
  const canSkip =
    (gate.next === 'wait' || gate.next === 'rebook') &&
    inspection.mode === 'diy' &&
    inspection.status === 'notice_served'

  return (
    <Page>
      <BackToList />
      <div className="mx-auto mt-2 grid max-w-xl grid-cols-[minmax(0,1fr)] gap-5">
        <header>
          <p className="eyebrow mb-1.5">Inspection studio</p>
          <h1 className="display text-[26px] text-ink sm:text-[30px]">{property.address.line1}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            The studio opens when a walk-through can lawfully begin. It cannot yet, and this is why.
          </p>
        </header>

        <Refusal verdict={gate.verdict} />

        <div className="rounded-lg bg-surface px-4 py-1.5 shadow-card sm:px-5">
          <Facts>
            <Fact label="Booked for">
              {inspection.scheduledFor
                ? `${fmtDate(dateOf(inspection.scheduledFor), { year: 'always' })}, ${fmtTime(inspection.scheduledFor)}`
                : 'No day yet'}
            </Fact>
            <Fact label="Notice served">
              {inspection.noticeServedAt ? fmtDate(dateOf(inspection.noticeServedAt), { year: 'always' }) : 'Not yet'}
            </Fact>
            <Fact label="Who goes">
              {inspection.mode === 'delegated' && inspection.status !== 'proposed'
                ? (providerName ?? 'A local inspector')
                : 'You'}
            </Fact>
          </Facts>
        </div>

        {gate.window && (
          <details className="group rounded-lg bg-sunken">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[13px] font-medium text-ink">
              How the notice was counted
              <ArrowRight
                className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-90"
                aria-hidden
              />
            </summary>
            <div className="px-4 pb-4">
              <Working steps={gate.window.steps} />
            </div>
          </details>
        )}

        {gate.next === 'book' && (
          <Link
            to="/loop/inspections"
            search={{ book: inspection.id }}
            className={buttonClass({ intent: 'primary', size: 'lg', block: true })}
          >
            Book a day
          </Link>
        )}
        {gate.next === 'rebook' && (
          <Link to="/loop/inspections" className={buttonClass({ intent: 'primary', size: 'lg', block: true })}>
            Book a new day
          </Link>
        )}
        {gate.next === 'none' && (
          <Link to="/loop/inspections" className={buttonClass({ intent: 'secondary', size: 'lg', block: true })}>
            Back to inspections
          </Link>
        )}

        {canSkip && (
          <Callout
            tone="neutral"
            icon={<FastForward weight="fill" />}
            title="Demo shortcut"
            action={
              <Button intent="secondary" onClick={() => demoStartNow(inspection.id, pack)}>
                Skip the wait (demo)
              </Button>
            }
          >
            A demo cannot wait for a notice to run. This moves the booking and its notice back in time so that today is
            the named day, then opens the studio. It changes demo data only; the real studio has no such button.
          </Callout>
        )}
      </div>
    </Page>
  )
}

/* ─────────────────────────────── when it is done ────────────────────────── */

function Finished({ inspection, property }: { inspection: Inspection; property: Property }) {
  const overall = inspection.overallScore
  const photos = inspection.rooms.reduce((a, r) => a + r.photoIds.length, 0)
  return (
    <Page>
      <BackToList />
      <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-7 pb-4">
        <header className="flex flex-col items-center pt-2 text-center">
          <Ring
            value={overall ?? 0}
            max={5}
            size={132}
            stroke={11}
            tone={scoreTone(overall)}
            label={overall === undefined ? 'No overall score' : `Overall score ${overall.toFixed(1)} out of 5`}
          >
            <span>
              {overall === undefined ? (
                <span className="text-[26px] font-semibold text-ink-3">—</span>
              ) : (
                <Num
                  value={overall}
                  decimals={1}
                  className="text-[34px] leading-none font-semibold tracking-[-0.02em] text-ink"
                />
              )}
              <span className="mt-1 block text-xs text-ink-3">out of 5</span>
            </span>
          </Ring>
          <p className="mt-5 flex items-center gap-1.5 text-[13px] font-medium text-ok-text">
            <CheckCircle weight="fill" className="size-4" aria-hidden />
            {TYPE_LABEL[inspection.type]} finished
          </p>
          <h1 className="display mt-1.5 text-[26px] text-ink sm:text-[30px]">{property.address.line1}</h1>
          <p className="mt-2 text-[14px] text-ink-2">
            {inspection.completedAt ? `${fmtDate(dateOf(inspection.completedAt), { year: 'always' })} · ` : ''}
            {plural(inspection.rooms.length, 'room')} · {plural(photos, 'photo')}
          </p>
        </header>

        {inspection.summary && (
          <p className="rounded-lg bg-sunken p-4 text-[15px] leading-relaxed text-ink">{inspection.summary}</p>
        )}

        <section aria-labelledby="done-follow">
          <h2 id="done-follow" className="mb-2.5 text-[15px] font-semibold text-ink">
            To follow up
          </h2>
          <FollowUps inspection={inspection} />
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            to="/loop/inspections"
            search={{ report: inspection.id }}
            className={buttonClass({ intent: 'primary', size: 'lg' })}
          >
            Read the full report
          </Link>
          <Link to="/loop/inspections" className={buttonClass({ intent: 'secondary', size: 'lg' })}>
            Back to inspections
          </Link>
        </div>
        <p className="text-center text-xs leading-relaxed text-ink-3">
          The report is filed with this home’s records. In this prototype it and its photos stay on this device; nothing
          is uploaded.
        </p>
      </div>
    </Page>
  )
}

/* ─────────────────────────────── one room ───────────────────────────────── */

/** Text that saves itself: half a second after the last keystroke, on blur, and when the room is left. */
function useAutosaved(stored: string, save: (text: string) => void) {
  const [text, setText] = useState(stored)
  const pending = useRef<string | null>(null)
  const saver = useRef(save)
  useEffect(() => {
    saver.current = save
  })
  const flush = () => {
    if (pending.current === null) return
    saver.current(pending.current)
    pending.current = null
  }
  useEffect(() => {
    if (pending.current === null) return
    const timer = setTimeout(() => {
      if (pending.current === null) return
      saver.current(pending.current)
      pending.current = null
    }, 500)
    return () => clearTimeout(timer)
  }, [text])
  useEffect(
    () => () => {
      if (pending.current !== null) saver.current(pending.current)
    },
    [],
  )
  return {
    text,
    change: (next: string) => {
      pending.current = next
      setText(next)
    },
    flush,
  }
}

function ScoreControl({ score, onScore }: { score: number | undefined; onScore: (score: number) => void }) {
  const labelId = useId()
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p id={labelId} className="text-[13px] font-medium text-ink">
          Condition
        </p>
        <p
          aria-live="polite"
          className={cn('text-[13px]', score === undefined ? 'text-ink-3' : 'font-semibold text-ink')}
        >
          {score === undefined ? 'Not scored yet' : `${score} · ${SCORE_WORDS[score]}`}
        </p>
      </div>
      <RadioGroup
        aria-labelledby={labelId}
        value={score === undefined ? '' : String(score)}
        onValueChange={(v) => onScore(Number(v))}
        className="grid grid-cols-5 gap-2"
      >
        {SCORES.map((n) => (
          <Radio.Root
            key={n}
            value={String(n)}
            aria-label={`${n}, ${SCORE_WORDS[n]}`}
            className={cn(
              'pressable num grid h-16 cursor-pointer place-items-center rounded-lg bg-surface text-[22px] font-semibold text-ink shadow-card select-none short:h-12',
              'transition-[background-color,color,box-shadow] duration-150 data-checked:bg-accent data-checked:text-accent-ink data-checked:shadow-none',
            )}
          >
            {n}
          </Radio.Root>
        ))}
      </RadioGroup>
      <div aria-hidden className="mt-1.5 flex justify-between text-[11px] text-ink-3">
        <span>{SCORE_WORDS[1]}</span>
        <span>{SCORE_WORDS[5]}</span>
      </div>
    </div>
  )
}

function FlagChips({ flags, onFlags }: { flags: string[]; onFlags: (flags: string[]) => void }) {
  const labelId = useId()
  return (
    <div>
      <p id={labelId} className="mb-2 text-[13px] font-medium text-ink">
        Anything to flag?
      </p>
      <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {ROOM_FLAGS.map((f) => {
          const on = flags.includes(f.key)
          return (
            <Toggle
              key={f.key}
              pressed={on}
              onPressedChange={(pressed) => onFlags(pressed ? [...flags, f.key] : flags.filter((x) => x !== f.key))}
              className="pressable inline-flex h-11 items-center gap-1.5 rounded-full bg-sunken px-4 text-[14px] font-medium text-ink-2 transition-colors duration-150 select-none data-pressed:bg-warn-soft data-pressed:text-warn-text"
            >
              {on && <Check weight="bold" className="size-3.5" aria-hidden />}
              {f.label}
            </Toggle>
          )
        })}
      </div>
    </div>
  )
}

function RoomPhotos({ inspectionId, index, room }: { inspectionId: ID; index: number; room: InspectionRoom }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  const add = async (files: FileList | null) => {
    if (!files?.length) return
    setSaving(true)
    for (const file of Array.from(files)) {
      try {
        addRoomPhoto(inspectionId, index, await savePhoto(file, room.name))
      } catch (e) {
        toast.error('That photo was not added', {
          description: e instanceof Error ? e.message : 'Try taking it again.',
        })
      }
    }
    setSaving(false)
  }

  return (
    <div>
      <p className="mb-2 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
        <span>Photos</span>
        <span className="text-xs font-normal text-ink-3">
          {room.photoIds.length ? plural(room.photoIds.length, 'photo') : 'Optional'}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          size="lg"
          loading={saving}
          icon={<Camera weight="fill" className="size-5 text-accent-text" aria-hidden />}
          onClick={() => cameraRef.current?.click()}
        >
          Take a photo
        </Button>
        <Button
          size="lg"
          loading={saving}
          icon={<Images weight="fill" className="size-5 text-accent-text" aria-hidden />}
          onClick={() => libraryRef.current?.click()}
        >
          Choose
        </Button>
      </div>
      <PhotoGrid
        ids={room.photoIds}
        room={room.name}
        onRemove={(photoId) => removeRoomPhoto(inspectionId, index, photoId)}
        className="mt-2.5"
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void add(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void add(e.target.files)
          e.target.value = ''
        }}
      />
      <p className="mt-2 text-xs leading-relaxed text-ink-3">
        Each photo is shrunk and saved on this device the moment it is taken.
      </p>
    </div>
  )
}

interface LastTime {
  on: ISODate
  room: InspectionRoom
}

function RoomStep({ inspection, index, lastTime }: { inspection: Inspection; index: number; lastTime?: LastTime }) {
  const room = inspection.rooms[index]
  const note = useAutosaved(room.note ?? '', (text) => saveRoom(inspection.id, index, { note: text }))

  return (
    <section
      aria-labelledby="studio-room"
      className="grid grid-cols-[minmax(0,1fr)] content-start gap-x-8 gap-y-6 md:grid-cols-2"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        <div>
          <p className="eyebrow">
            Room {index + 1} of {inspection.rooms.length}
          </p>
          <h1 id="studio-room" className="display mt-1 text-[28px] text-ink short:text-[24px] sm:text-[32px]">
            {room.name}
          </h1>
          {lastTime && lastTime.room.score !== undefined && (
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              Last time, {fmtDate(lastTime.on, { weekday: false, year: 'always' })}:{' '}
              <span className="font-medium text-ink">
                {lastTime.room.score} · {SCORE_WORDS[lastTime.room.score]}
              </span>
              {lastTime.room.note ? `. “${lastTime.room.note}”` : '.'}
            </p>
          )}
        </div>
        <ScoreControl score={room.score} onScore={(score) => saveRoom(inspection.id, index, { score })} />
        <FlagChips flags={room.flags} onFlags={(flags) => saveRoom(inspection.id, index, { flags })} />
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        <Field label="Note" optional hint="What you saw, in your own words. It goes into the report as written.">
          {(p) => (
            <Textarea
              {...p}
              rows={3}
              value={note.text}
              onChange={(e) => note.change(e.target.value)}
              onBlur={note.flush}
              placeholder={
                needsFollowUp(room)
                  ? 'What needs doing, and where exactly?'
                  : 'For example: clean and tidy, no marks on the walls.'
              }
            />
          )}
        </Field>
        <RoomPhotos inspectionId={inspection.id} index={index} room={room} />
      </div>
    </section>
  )
}

/* ──────────────────────────────── wrapping up ───────────────────────────── */

function WrapUp({
  inspection,
  summary,
  onSummary,
  alarms,
  onAlarms,
  onJump,
}: {
  inspection: Inspection
  summary: string
  onSummary: (text: string) => void
  alarms: boolean
  onAlarms: (tested: boolean) => void
  onJump: (index: number) => void
}) {
  const pack = usePack()
  const rooms = inspection.rooms
  const missing = unscoredRooms(rooms)
  const overall = overallScore(rooms)
  const alarmRule = pack.complianceChecks.find((c) => c.key === 'smoke_alarms')
  const alarmRooms = rooms.filter((r) => r.flags.includes('smoke_alarm')).map((r) => r.name.toLowerCase())

  return (
    <section
      aria-labelledby="studio-wrap"
      className="grid grid-cols-[minmax(0,1fr)] content-start gap-x-8 gap-y-6 md:grid-cols-2"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Ring
            value={overall ?? 0}
            max={5}
            size={84}
            stroke={8}
            tone={scoreTone(overall)}
            label={overall === undefined ? 'No rooms scored yet' : `Overall so far, ${overall.toFixed(1)} out of 5`}
          >
            {overall === undefined ? (
              <span className="text-[20px] font-semibold text-ink-3">—</span>
            ) : (
              <Num value={overall} decimals={1} className="text-[22px] leading-none font-semibold text-ink" />
            )}
          </Ring>
          <div className="min-w-0 flex-1 basis-40">
            <p className="eyebrow">Wrap up</p>
            <h1 id="studio-wrap" className="display mt-1 text-[28px] text-ink sm:text-[32px]">
              Before you leave
            </h1>
          </div>
        </div>

        {missing.length > 0 && (
          <Refusal
            verdict={{
              ok: false,
              reason: `${plural(missing.length, 'room')} ${missing.length === 1 ? 'has' : 'have'} no score yet: ${listOf(missing)}.`,
              fix: 'A report needs a score for every room. Tap a room below to go back to it.',
            }}
          />
        )}

        <ol className="grid grid-cols-[minmax(0,1fr)] gap-1" aria-label="Rooms and their scores">
          {rooms.map((r, n) => (
            <li key={r.name}>
              <button
                type="button"
                onClick={() => onJump(n)}
                className="pressable flex min-h-12 w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hoverable:hover:bg-sunken"
              >
                <span
                  className={cn(
                    'num grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-semibold',
                    r.score === undefined ? 'bg-sunken text-ink-3' : SCORE_CHIP[scoreTone(r.score)],
                  )}
                >
                  {r.score ?? '–'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink">{r.name}</span>
                  {(r.flags.length > 0 || r.photoIds.length > 0) && (
                    <span className="block truncate text-xs text-ink-3">
                      {[...r.flags.map(flagLabel), r.photoIds.length ? plural(r.photoIds.length, 'photo') : '']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-3" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        {alarmRule && (
          <div className="rounded-lg bg-sunken p-4">
            <p className="text-[13px] font-semibold text-ink">Smoke alarms</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              {alarmRule.why}{' '}
              <a
                href={alarmRule.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent-text underline-offset-2 hoverable:hover:underline"
              >
                {alarmRule.citation}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
            <div className="mt-2.5">
              {alarmRooms.length > 0 ? (
                <p className="text-[13px] leading-relaxed text-ink">
                  You flagged a smoke alarm in the {listOf(alarmRooms)}, so no test is recorded today. Raise a repair
                  for it when you finish.
                </p>
              ) : (
                <Checkbox checked={alarms} onCheckedChange={onAlarms}>
                  I pressed the test button on every alarm, and every one sounded
                </Checkbox>
              )}
            </div>
            {alarmRooms.length === 0 && (
              <p className="mt-1.5 text-xs leading-relaxed text-ink-3">
                Ticking this records today as the last smoke alarm test for this home.
              </p>
            )}
          </div>
        )}

        <Field label="Summary for the report" hint="Drafted from your scores and flags. Change it to say what you saw.">
          {(p) => <Textarea {...p} rows={4} value={summary} onChange={(e) => onSummary(e.target.value)} />}
        </Field>
      </div>
    </section>
  )
}

/* ─────────────────────────────── the walk-through ───────────────────────── */

function Walk({
  inspection,
  property,
  lastReport,
}: {
  inspection: Inspection
  property: Property
  lastReport: Inspection | undefined
}) {
  const online = useOnline()
  const reduced = useReducedMotion()
  const rooms = inspection.rooms
  const wrap = rooms.length
  const [step, setStep] = useState(() => {
    const firstOpen = rooms.findIndex((r) => r.score === undefined)
    return firstOpen === -1 ? wrap : firstOpen
  })
  const [dir, setDir] = useState(1)
  const [edited, setEdited] = useState<string | null>(null)
  const [alarms, setAlarms] = useState(false)
  const current = useRef<HTMLButtonElement>(null)

  const scored = rooms.filter((r) => r.score !== undefined).length
  const missing = unscoredRooms(rooms)
  const summary = edited ?? draftSummary(rooms)
  const alarmFlagged = rooms.some((r) => r.flags.includes('smoke_alarm'))

  useEffect(() => {
    current.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [step])

  const go = (to: number) => {
    setDir(to >= step ? 1 : -1)
    setStep(Math.max(0, Math.min(wrap, to)))
    window.scrollTo({ top: 0 })
  }

  const finish = () => {
    const verdict = completeInspection(inspection.id, summary, alarms && !alarmFlagged)
    if (verdict.ok)
      toast.success('Inspection finished', { description: 'The report is filed with this home’s records.' })
    else toast.error(verdict.reason ?? 'That could not be finished', { description: verdict.fix })
  }

  const lastTime = (name: string): LastTime | undefined => {
    const room = lastReport?.rooms.find((r) => r.name === name)
    return room && lastReport?.completedAt ? { on: dateOf(lastReport.completedAt), room } : undefined
  }

  let forward: { label: ReactNode; act: () => void }
  if (step < wrap - 1)
    forward = {
      label: `${rooms[step].score === undefined ? 'Skip to' : 'Next:'} ${rooms[step + 1].name}`,
      act: () => go(step + 1),
    }
  else if (step === wrap - 1) forward = { label: 'Wrap up', act: () => go(wrap) }
  else if (missing.length > 0)
    forward = {
      label: `Score the ${missing[0].toLowerCase()}`,
      act: () => go(rooms.findIndex((r) => r.score === undefined)),
    }
  else forward = { label: 'Finish the inspection', act: finish }

  const stops = [...rooms.map((r) => r.name), 'Wrap up']

  return (
    <Page className="flex min-h-[calc(100dvh-8.25rem)] flex-col pb-0 short:pt-3 md:min-h-dvh lg:pb-0">
      <header className="flex items-center gap-2">
        <Link
          to="/loop/inspections"
          aria-label="Leave the studio and go back to inspections"
          className="pressable -ml-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hoverable:hover:bg-sunken hoverable:hover:text-ink"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{property.address.line1}</p>
          <p className="num truncate text-xs text-ink-3">
            {TYPE_LABEL[inspection.type]} · {scored} of {rooms.length} rooms scored
          </p>
        </div>
        <Badge
          tone={online ? 'ok' : 'warn'}
          icon={
            online ? (
              <DeviceMobile weight="fill" className="size-3.5" aria-hidden />
            ) : (
              <WifiSlash weight="bold" className="size-3.5" aria-hidden />
            )
          }
        >
          {online ? 'Saved on this device' : 'Offline'}
        </Badge>
      </header>

      <Bar
        value={scored}
        max={rooms.length}
        label={`${scored} of ${rooms.length} rooms scored`}
        className="mt-2.5 h-1.5 shrink-0 short:hidden"
      />

      {!online && (
        <Callout tone="warn" icon={<WifiSlash weight="bold" />} title="You are offline" className="mt-3">
          Nothing is lost. Every score, note and photo is saved on this device as you go, and the studio keeps working
          without a signal.
        </Callout>
      )}

      <nav
        aria-label="Rooms"
        className="no-scrollbar relative -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
      >
        {stops.map((name, n) => {
          const on = n === step
          const room = rooms[n]
          return (
            <button
              key={name}
              ref={on ? current : undefined}
              type="button"
              aria-current={on ? 'step' : undefined}
              onClick={() => go(n)}
              className={cn(
                'pressable flex h-11 shrink-0 items-center gap-2 rounded-full pr-4 pl-2 text-[13px] font-medium transition-colors duration-150',
                on ? 'bg-ink text-bg' : 'bg-sunken text-ink-2',
              )}
            >
              <span
                className={cn(
                  'num grid size-7 place-items-center rounded-full text-xs font-semibold',
                  on ? 'bg-bg/20' : room?.score !== undefined ? 'bg-ok-soft text-ok-text' : 'bg-surface text-ink-3',
                )}
              >
                {room ? (room.score ?? n + 1) : <ClipboardText className="size-3.5" aria-hidden />}
              </span>
              {name}
              {room && (
                <span className="sr-only">{room.score === undefined ? ', not scored' : `, scored ${room.score}`}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-5 grid flex-1 grid-cols-[minmax(0,1fr)] content-start gap-8 lg:mt-7 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-label="Rooms" className="hidden lg:block">
          <ol className="sticky top-8 grid gap-0.5">
            {stops.map((name, n) => {
              const on = n === step
              const room = rooms[n]
              return (
                <li key={name}>
                  <button
                    type="button"
                    aria-current={on ? 'step' : undefined}
                    onClick={() => go(n)}
                    className={cn(
                      'pressable flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] font-medium transition-colors duration-150',
                      on
                        ? 'bg-surface text-ink shadow-card'
                        : 'text-ink-2 hoverable:hover:bg-sunken hoverable:hover:text-ink',
                    )}
                  >
                    <span
                      className={cn(
                        'num grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                        room?.score !== undefined ? SCORE_CHIP[scoreTone(room.score)] : 'bg-sunken text-ink-3',
                      )}
                    >
                      {room ? (room.score ?? n + 1) : <ClipboardText className="size-3.5" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    {room && room.flags.length > 0 && (
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warn" />
                    )}
                    {room && (
                      <span className="sr-only">
                        {room.score === undefined ? ', not scored' : `, scored ${room.score}`}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: reduced ? 0 : dir * 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.09 } }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="min-w-0"
          >
            {step < wrap ? (
              <RoomStep inspection={inspection} index={step} lastTime={lastTime(rooms[step].name)} />
            ) : (
              <WrapUp
                inspection={inspection}
                summary={summary}
                onSummary={setEdited}
                alarms={alarms}
                onAlarms={setAlarms}
                onJump={go}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-20 -mx-4 mt-6 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur-xl short:py-2 sm:-mx-6 sm:px-6 md:bottom-0 lg:-mx-8 lg:px-8">
        <div className="flex items-center gap-2 lg:justify-end">
          {step > 0 && (
            <Button
              size="lg"
              className="h-14 px-4 short:h-12"
              aria-label={`Back to ${stops[step - 1]}`}
              onClick={() => go(step - 1)}
            >
              <ArrowLeft weight="bold" className="size-5" aria-hidden />
            </Button>
          )}
          <Button
            intent="primary"
            size="lg"
            className="h-14 min-w-0 flex-1 short:h-12 lg:max-w-sm"
            onClick={forward.act}
            trailing={step < wrap ? <ArrowRight weight="bold" className="size-4 shrink-0" aria-hidden /> : undefined}
          >
            <span className="truncate">{forward.label}</span>
          </Button>
        </div>
      </div>
    </Page>
  )
}

/* ──────────────────────────────── the screen ────────────────────────────── */

export function InspectionStudio({ id }: { id: string }) {
  const pack = usePack()
  const day = useToday()
  const inspections = useOrgRows('inspections')
  const inspection = inspections.find((i) => i.id === id)
  const property = useStore((s) => s.db.properties.find((p) => p.id === inspection?.propertyId))
  const provider = useStore((s) => s.db.providers.find((p) => p.id === inspection?.providerId))

  if (!inspection || !property) {
    return (
      <Page>
        <Empty
          className="py-20"
          icon={<ClipboardText />}
          title="That inspection is not here"
          body="It may have been cancelled, or the link is from another organisation. Every inspection you can open is on the list."
          action={
            <Link to="/loop/inspections" className={buttonClass({ intent: 'primary' })}>
              Go to inspections
            </Link>
          }
        />
      </Page>
    )
  }

  if (inspection.status === 'completed') return <Finished inspection={inspection} property={property} />

  const lastRoutine = lastCompleted(inspections, property.id, { routineOnly: true, excludeId: id })
  const gate = studioGate(pack, calendarOf(pack, property), inspection, {
    today: day,
    hour: new Date().getHours(),
    lastRoutine: lastRoutine?.completedAt ? dateOf(lastRoutine.completedAt) : undefined,
    providerName: provider?.name,
  })
  if (!gate.open)
    return <Locked inspection={inspection} property={property} gate={gate} providerName={provider?.name} />

  return (
    <Walk
      key={inspection.id}
      inspection={inspection}
      property={property}
      lastReport={lastCompleted(inspections, property.id, { excludeId: id })}
    />
  )
}
