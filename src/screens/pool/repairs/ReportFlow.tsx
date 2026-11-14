/**
 * Report a problem.
 *
 * The order matters. Most reports are something a renter can fix in a minute
 * (a tripped switch, a heat pump on the wrong mode), so the fix comes first and
 * a fixed problem never becomes a ticket. What cannot be fixed is described
 * once, sorted in front of the person who reported it — urgency, why, what
 * happens next — and only then sent.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CaretRight,
  Check,
  CheckCircle,
  CloudFog,
  CookingPot,
  DotsThreeCircle,
  Drop,
  Images,
  Lightning,
  LockKey,
  PaperPlaneTilt,
  Siren,
  ThermometerHot,
  Warning,
  X,
  type Icon,
} from '@phosphor-icons/react'
import type { ID, Urgency } from '@/domain/types'
import { dispatchMode, HAZARDS, hazardsFor, ISSUE_GROUPS, ISSUES, issueOf, providerFor, triage, URGENCY, type Hazard, type Issue, type IssueGroup, type IssueKey } from '@/domain/triage'
import { durationText } from '@/domain/rules/core'
import { money } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { deletePhoto, savePhoto, usePhotoUrl } from '@/data/photos'
import { reportProblem } from '@/data/pool-mutations'
import { Button } from '@/ui/Button'
import { Field, Select, Textarea } from '@/ui/controls'
import { Why } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { useDebounced } from '@/ui/hooks'
import { cn } from '@/ui/cn'
import { firstName, type MyHome } from '../shared'

type Step = 'pick' | 'help' | 'fixed' | 'describe' | 'review' | 'sent'

const GROUP_ICON: Record<IssueGroup, Icon> = { water: Drop, power: Lightning, heating: ThermometerHot, kitchen: CookingPot, security: LockKey, damp: CloudFog, other: DotsThreeCircle }
const MAX_PHOTOS = 6

export const URGENCY_TONE: Record<Urgency, string> = {
  emergency: 'bg-danger-soft text-danger-text',
  urgent: 'bg-warn-soft text-warn-text',
  routine: 'bg-sunken text-ink-2',
}

function roomsOf(beds: number): string[] {
  return ['Entry and hallway', 'Living room', 'Kitchen', 'Bathroom', ...Array.from({ length: beds }, (_, i) => `Bedroom ${i + 1}`), 'Laundry', 'Garage', 'Exterior and grounds']
}

/** A short title for "something else", from the renter's own first sentence. */
function titleFrom(description: string): string {
  const first = description.trim().split(/[.!?\n]/)[0].trim()
  if (!first) return 'Something needs looking at'
  return first.length > 60 ? `${first.slice(0, 57).trimEnd()}…` : first
}

function HazardCard({ hazard }: { hazard: Hazard }) {
  return (
    <div className="rounded-lg bg-danger-soft p-3.5">
      <p className="flex items-start gap-2 text-[14px] font-semibold text-danger-text">
        <Siren weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
        {hazard.title}
      </p>
      <ul className="mt-1.5 grid gap-1 pl-6 text-[14px] leading-relaxed text-ink">
        {hazard.doNow.map((line) => (
          <li key={line} className="list-disc">
            {line}
          </li>
        ))}
      </ul>
    </div>
  )
}

function PhotoThumb({ id, onRemove }: { id: ID; onRemove: () => void }) {
  const url = usePhotoUrl(id)
  return (
    <li className="relative aspect-square overflow-hidden rounded-lg bg-sunken">
      {url ? <img src={url} alt="A photo you added to this report" className="size-full object-cover" /> : <span className="skeleton block size-full" />}
      <button type="button" onClick={onRemove} aria-label="Remove this photo" className="pressable absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-ink/75 text-bg backdrop-blur-sm">
        <X weight="bold" className="size-4" />
      </button>
    </li>
  )
}

export function ReportFlow({ open, home, onClose, onSent }: { open: boolean; home: MyHome; onClose: () => void; onSent: (ticketId: ID) => void }) {
  const me = useMe()
  const pack = usePack()
  const day = useToday()
  const reduced = useReducedMotion()
  const landlord = firstName(home.landlord?.fullName)
  const limit = home.property.sinkingFund.autoApproveLimit
  const providers = useStore((s) => s.db.providers)

  const [step, setStep] = useState<Step>('pick')
  const [issueKey, setIssueKey] = useState<IssueKey>('other')
  const [tried, setTried] = useState<string[]>([])
  const [unsafe, setUnsafe] = useState(false)
  const [description, setDescription] = useState('')
  const [room, setRoom] = useState('')
  const [photoIds, setPhotoIds] = useState<ID[]>([])
  const [saving, setSaving] = useState(false)
  const [nudged, setNudged] = useState(false)
  const [sentId, setSentId] = useState<ID | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)

  // A fresh report every time the sheet opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep('pick')
      setIssueKey('other')
      setTried([])
      setUnsafe(false)
      setDescription('')
      setRoom('')
      setPhotoIds([])
      setNudged(false)
      setSentId(null)
    }
  }

  const issue = issueOf(issueKey)
  const sorted = useMemo(() => triage(description, issueKey, day), [description, issueKey, day])
  const hazards = useMemo(() => hazardsFor(description, issueKey), [description, issueKey])
  const liveDescription = useDebounced(description, 350)
  const liveDanger = useMemo(() => (triage(liveDescription, issueKey, day).urgency === 'emergency' ? hazardsFor(liveDescription, issueKey) : []), [liveDescription, issueKey, day])
  const mode = dispatchMode(sorted.urgency, issue.cost, limit)
  const provider = useMemo(() => providerFor(providers, sorted.suggestedTrade), [providers, sorted.suggestedTrade])
  const trade = sorted.suggestedTrade.toLowerCase()
  const tooShort = description.trim().length < 10
  const repairsNotice = durationText(pack.rules['entry.repairs_notice_min'].value)

  const close = () => {
    // Photos taken for a report that was never sent have no reason to stay on the device.
    if (step !== 'sent') for (const id of photoIds) void deletePhoto(id)
    onClose()
  }

  const pick = (i: Issue) => {
    setIssueKey(i.key)
    setTried([])
    setUnsafe(false)
    setStep(i.steps.length > 0 ? 'help' : 'describe')
  }

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setSaving(true)
    const space = MAX_PHOTOS - photoIds.length
    const added: ID[] = []
    for (const file of Array.from(files).slice(0, space)) {
      try {
        added.push(await savePhoto(file, issue.title))
      } catch (e) {
        toast.error('That photo was not added', { description: e instanceof Error ? e.message : 'Try taking it again.' })
      }
    }
    setPhotoIds((ids) => [...ids, ...added])
    setSaving(false)
    if (files.length > space) toast(`Up to ${MAX_PHOTOS} photos`, { description: 'The first ones were added. That is plenty for a tradesperson to see what is going on.' })
  }

  const send = () => {
    const selfHelpTried = tried.length ? tried.join(' ') : unsafe ? 'Did not try the self-help steps: reported as not safe to.' : undefined
    const id = reportProblem({
      reporterId: me.id,
      tenancyId: home.tenancy.id,
      title: issue.key === 'other' ? titleFrom(description) : issue.title,
      description,
      category: issue.category,
      room: room || undefined,
      photoIds,
      triage: { ...sorted, selfHelpTried },
      likelyCost: issue.cost,
    })
    if (!id) {
      toast.error('That did not send', { description: 'Your tenancy could not be found. Nothing was lost — try again.' })
      return
    }
    setSentId(id)
    setStep('sent')
  }

  const header: Record<Step, { eyebrow: string; title: string; description?: string }> = {
    pick: { eyebrow: `Report a problem · ${home.property.address.line1}`, title: 'What is wrong?' },
    help: { eyebrow: issue.urgency === 'emergency' ? 'Do this now' : 'Try this first · about a minute', title: issue.title },
    fixed: { eyebrow: 'All done', title: 'Sorted — no report needed' },
    describe: { eyebrow: issue.title, title: 'Tell us what is happening' },
    review: { eyebrow: 'Before it is sent', title: 'Here is how this will be handled' },
    sent: { eyebrow: 'Reported', title: !provider ? `It is with ${landlord}` : mode === 'auto_dispatch' ? `It is on its way to ${provider.name}` : `It is with ${landlord} and ${provider.name}` },
  }

  const footer: ReactNode =
    step === 'help' ? (
      issue.urgency === 'emergency' ? (
        <Button intent="primary" size="lg" className="rounded-full" block onClick={() => setStep('describe')} trailing={<ArrowRight weight="bold" className="size-4" />}>
          Report it now
        </Button>
      ) : (
        <>
          <Button size="lg" className="flex-1 rounded-full" onClick={() => setStep('fixed')} icon={<Check weight="bold" className="size-4" />}>
            That fixed it
          </Button>
          <Button intent="primary" size="lg" className="flex-1 rounded-full" onClick={() => setStep('describe')}>
            Still not right
          </Button>
        </>
      )
    ) : step === 'fixed' ? (
      <Button intent="primary" size="lg" className="rounded-full" block onClick={close}>
        Done
      </Button>
    ) : step === 'describe' ? (
      <>
        <Button intent="ghost" size="lg" onClick={() => setStep(issue.steps.length > 0 ? 'help' : 'pick')} icon={<ArrowLeft className="size-4" />}>
          Back
        </Button>
        <Button
          intent="primary"
          size="lg"
          className="flex-1 rounded-full"
          loading={saving}
          onClick={() => {
            setNudged(true)
            if (!tooShort) setStep('review')
          }}
          trailing={<ArrowRight weight="bold" className="size-4" />}
        >
          See how it is sorted
        </Button>
      </>
    ) : step === 'review' ? (
      <>
        <Button intent="ghost" size="lg" onClick={() => setStep('describe')} icon={<ArrowLeft className="size-4" />}>
          Change it
        </Button>
        <Button intent="primary" size="lg" className="flex-1 rounded-full" onClick={send} icon={<PaperPlaneTilt weight="fill" className="size-4" />}>
          Send the report
        </Button>
      </>
    ) : step === 'sent' ? (
      <Button
        intent="primary"
        size="lg"
        className="rounded-full"
        block
        onClick={() => {
          if (sentId) onSent(sentId)
        }}
      >
        Follow it in Repairs
      </Button>
    ) : undefined

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()} size="lg" eyebrow={header[step].eyebrow} title={header[step].title} description={header[step].description} footer={footer}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, x: reduced ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: reduced ? 0 : -8, transition: { duration: 0.12 } }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="grid grid-cols-[minmax(0,1fr)] gap-5">
          {step === 'pick' && (
            <>
              <p className="flex items-start gap-2.5 rounded-lg bg-danger-soft p-3.5 text-[14px] leading-relaxed text-ink">
                <Siren weight="fill" className="mt-0.5 size-[18px] shrink-0 text-danger-text" aria-hidden />
                <span>
                  <strong className="font-semibold text-danger-text">Fire, a gas smell, or anyone in danger?</strong> Call {pack.emergencyNumber} first, then report it here.
                </span>
              </p>
              {ISSUE_GROUPS.map((g) => {
                const GroupIcon = GROUP_ICON[g.key]
                return (
                  <section key={g.key} aria-label={g.label}>
                    <h3 className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink">
                      <GroupIcon weight="fill" className="size-4 text-accent-text" aria-hidden />
                      {g.label}
                    </h3>
                    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {ISSUES.filter((i) => i.group === g.key).map((i) => (
                        <li key={i.key} className="min-w-0">
                          <button type="button" onClick={() => pick(i)} className="pressable group flex min-h-14 w-full items-center gap-3 rounded-lg bg-surface px-3.5 py-2.5 text-left shadow-card transition-shadow hoverable:hover:shadow-pop">
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] leading-snug font-medium text-ink">{i.title}</span>
                              <span className="block truncate text-[13px] text-ink-3">{i.hint}</span>
                            </span>
                            <CaretRight weight="bold" className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </>
          )}

          {step === 'help' && (
            <>
              {issue.urgency !== 'emergency' && <p className="text-[15px] leading-relaxed text-ink-2">Plenty of these fix themselves with one of the steps below. Tap each one as you try it — if it works, you are done and nobody needs to come out.</p>}
              <ol className="grid gap-2">
                {issue.steps.map((s, i) => {
                  const on = tried.includes(s)
                  return (
                    <li key={s}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setTried((t) => (on ? t.filter((x) => x !== s) : [...t, s]))}
                        className={cn('pressable flex min-h-14 w-full items-start gap-3 rounded-lg p-3.5 text-left transition-[background-color,box-shadow] duration-200', on ? 'bg-ok-soft' : 'bg-surface shadow-card')}
                      >
                        <span className={cn('num mt-px grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold transition-colors duration-200', on ? 'bg-surface text-ok-text' : 'bg-sunken text-ink-2')}>{on ? <Check weight="bold" className="size-4" aria-hidden /> : i + 1}</span>
                        <span className={cn('min-w-0 pt-0.5 text-[15px] leading-snug', on ? 'text-ink-2' : 'text-ink')}>{s}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>

              <div className="rounded-lg bg-warn-soft p-3.5">
                <p className="flex items-start gap-2 text-[14px] font-semibold text-warn-text">
                  <Warning weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Stop, and report it straight away, if:
                </p>
                <ul className="mt-1.5 grid gap-1 pl-6 text-[14px] leading-relaxed text-ink">
                  {issue.stopAndCall.map((line) => (
                    <li key={line} className="list-disc">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              {issue.hazards.map((h) => (
                <HazardCard key={h} hazard={HAZARDS[h]} />
              ))}

              <div className="grid gap-1.5 text-[13px] leading-relaxed text-ink-3">
                {issue.causeNote && <p>{issue.causeNote}</p>}
                <p>General guidance from New Zealand property managers, Tenancy Services and EECA. If you are not sure it is safe, do not try it.</p>
              </div>
              {issue.urgency !== 'emergency' && (
                <button
                  type="button"
                  onClick={() => {
                    setUnsafe(true)
                    setStep('describe')
                  }}
                  className="min-h-11 justify-self-start rounded-sm text-[14px] font-medium text-accent-text underline decoration-accent-line underline-offset-4"
                >
                  It is not safe to try these — report it now
                </button>
              )}
            </>
          )}

          {step === 'fixed' && (
            <div className="flex flex-col items-center py-8 text-center">
              <span className="mb-4 grid size-16 place-items-center rounded-full bg-ok-soft text-ok-text">
                <CheckCircle weight="fill" className="size-9" aria-hidden />
              </span>
              <p className="display text-[26px] text-ink">Nice work.</p>
              <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-2">Nothing has been sent to {landlord} and nobody is coming out. If it happens again, report it and say what you tried — a fault that keeps coming back is worth a proper look.</p>
            </div>
          )}

          {step === 'describe' && (
            <>
              {liveDanger.length > 0 && (
                <div role="alert" className="grid gap-2">
                  <p className="text-[14px] font-semibold text-danger-text">This sounds like an emergency. Before you finish typing:</p>
                  {liveDanger.map((h) => (
                    <HazardCard key={h.key} hazard={h} />
                  ))}
                </div>
              )}
              <Field label="What is happening?" hint="What you can see, hear or smell, and since when. A tradesperson reads this before they come." error={nudged && tooShort ? 'Add a sentence or two, so the tradesperson knows what they are walking into.' : undefined}>
                {(p) => <Textarea {...p} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={issue.key === 'other' ? 'For example: the pantry door has come off its top hinge and will not close.' : `For example: ${issue.hint.toLowerCase()} since Tuesday evening.`} />}
              </Field>
              <Field label="Where in the home?" optional>
                {(p) => (
                  <Select {...p} value={room} onChange={(e) => setRoom(e.target.value)}>
                    <option value="">Choose a room…</option>
                    {roomsOf(home.property.beds).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div>
                <p className="mb-1.5 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
                  <span>Photos</span>
                  <span className="text-xs font-normal text-ink-3">Optional · up to {MAX_PHOTOS}</span>
                </p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photoIds.map((id) => (
                    <PhotoThumb
                      key={id}
                      id={id}
                      onRemove={() => {
                        setPhotoIds((ids) => ids.filter((x) => x !== id))
                        void deletePhoto(id)
                      }}
                    />
                  ))}
                  {photoIds.length < MAX_PHOTOS && (
                    <>
                      <li>
                        <button type="button" disabled={saving} onClick={() => cameraRef.current?.click()} className="pressable flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-[13px] font-medium text-ink-2 hoverable:hover:bg-surface hoverable:hover:text-ink">
                          <Camera weight="fill" className="size-6 text-accent-text" aria-hidden />
                          Take a photo
                        </button>
                      </li>
                      <li>
                        <button type="button" disabled={saving} onClick={() => libraryRef.current?.click()} className="pressable flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-[13px] font-medium text-ink-2 hoverable:hover:bg-surface hoverable:hover:text-ink">
                          <Images weight="fill" className="size-6 text-accent-text" aria-hidden />
                          Choose
                        </button>
                      </li>
                    </>
                  )}
                </ul>
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(e) => {
                    void addPhotos(e.target.files)
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
                    void addPhotos(e.target.files)
                    e.target.value = ''
                  }}
                />
                <p className="mt-2 text-xs leading-relaxed text-ink-3">Photos are shrunk and kept on this device. In this demo they are not uploaded anywhere.</p>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <div className={cn('rounded-xl p-4 sm:p-5', URGENCY_TONE[sorted.urgency])}>
                <p className="font-mono text-[11px] tracking-[0.08em] uppercase opacity-80">Sorted as</p>
                <p className="display mt-1 text-[28px]">{URGENCY[sorted.urgency].label}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink">{URGENCY[sorted.urgency].test}</p>
              </div>

              <section>
                <h3 className="eyebrow mb-1.5">Why</h3>
                <p className="text-[15px] leading-relaxed text-ink">{sorted.reasoning}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-3">Sorted by a fixed set of rules reading your words, not by a person. {landlord} sees the same reasoning and can raise it.</p>
              </section>

              {(sorted.urgency === 'emergency' || hazards.length > 0) && (
                <section className="grid gap-2">
                  <h3 className="eyebrow">Right now, while you wait</h3>
                  {hazards.length > 0 ? hazards.map((h) => <HazardCard key={h.key} hazard={h} />) : <p className="text-[14px] leading-relaxed text-ink">Keep clear of anything that looks unsafe. If anyone is in danger, call 111.</p>}
                </section>
              )}

              <section>
                <h3 className="eyebrow mb-1.5">What happens next</h3>
                <p className="text-[15px] leading-relaxed text-ink">
                  {!provider
                    ? `It goes to ${landlord}, marked ${URGENCY[sorted.urgency].label.toLowerCase()}, to arrange a ${trade}. There is no vetted ${trade} in the network for this home yet, so Pool cannot send one itself.`
                    : mode === 'quote_first'
                      ? `${landlord} sees a quote before anyone is booked. ${issue.cost ? `A job like this can run past the ${money(limit)} that is pre-approved for your home` : `There is no usual price for a job like this, and ${money(limit)} is what is pre-approved for your home`}, so ${provider.name} quotes first and ${landlord} says yes or no.`
                      : sorted.urgency === 'routine'
                        ? `It goes straight to ${provider.name}. Jobs like this usually cost less than the ${money(limit)} ${landlord} has pre-approved for your home, so nobody waits for a yes.`
                        : `It goes straight to ${provider.name}. ${landlord} is told at the same moment, and nobody waits for a yes.`}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-2">Unless you agree a time or it is an emergency, a tradesperson has to give you at least {repairsNotice} of notice before coming in.</p>
                <div className="mt-2">
                  <Why rule="entry.repairs_notice_min" label="Notice before they come in" />
                </div>
              </section>

              <section>
                <h3 className="eyebrow mb-1.5">Who pays</h3>
                <p className="text-[15px] leading-relaxed text-ink">
                  {sorted.possibleTenantFault
                    ? `That depends on the cause, and nobody has decided it. If the tradesperson finds wear and tear, it is ${landlord}’s cost. If they record damage, you read their report and say whether it is fair before anything is billed — and careless damage has a legal ceiling.`
                    : `Things wearing out is ${landlord}’s cost, never yours. You are only ever asked to pay for damage, and you see the tradesperson’s report first.`}
                </p>
                {issue.cost && (
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
                    For scale, a job like this typically runs {money(issue.cost.low)} to {money(issue.cost.high)}
                    {issue.cost.openEnded ? ' or more' : ''}. That is an estimate from published trade prices, not a quote.
                  </p>
                )}
                <div className="mt-2">
                  <Why rule="damage.careless_cap_weeks" label="The ceiling on careless damage" />
                </div>
              </section>
            </>
          )}

          {step === 'sent' && (
            <div className="flex flex-col items-center py-6 text-center">
              <span className="mb-4 grid size-16 place-items-center rounded-full bg-accent-soft text-accent-text">
                <PaperPlaneTilt weight="fill" className="size-8" aria-hidden />
              </span>
              <span className={cn('inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold', URGENCY_TONE[sorted.urgency])}>{URGENCY[sorted.urgency].label}</span>
              <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-2">
                {!provider
                  ? `${landlord} has it, and needs to arrange a ${trade}.`
                  : mode === 'auto_dispatch'
                    ? `${provider.name} has it now, and ${landlord} has been told.`
                    : `${provider.name} has been asked to quote, and ${landlord} will approve it before anyone is booked.`}{' '}
                Every step shows in Repairs as it happens.
              </p>
              {sorted.urgency === 'emergency' && <p className="mt-3 max-w-sm rounded-lg bg-danger-soft p-3 text-[14px] leading-relaxed text-ink">If anyone is in danger, do not wait for a reply here. Call 111.</p>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  )
}
