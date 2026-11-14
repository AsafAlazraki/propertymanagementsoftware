/**
 * Pool — Me.
 *
 * What this screen does that no other does: it puts a renter in charge of what
 * is known about them. Who they are and who they live with; the pet they would
 * like to keep; exactly what a landlord may learn at each stage of applying;
 * a copy of everything Pool holds; and a line straight to the people who run it.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ChatCircleDots, Check, DownloadSimple, Eye, LockSimple, PawPrint, PencilSimple, SealCheck, UsersThree, X, type Icon } from '@phosphor-icons/react'
import type { Application, Feedback, Variation } from '@/domain/types'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { durationText } from '@/domain/rules/core'
import { money, plural } from '@/domain/rules/format'
import { db, useMe, useStore } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { sendFeedback, updateProfile, withdrawApplication, withdrawRequest } from '@/data/pool-mutations'
import { Page } from '@/shell/common'
import { Button, buttonClass } from '@/ui/Button'
import { Field, Input, Textarea } from '@/ui/controls'
import { Avatar } from '@/ui/display'
import { Why } from '@/ui/Law'
import { Modal, Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { firstName, stageLine, useMyApplications, useMyHome, useMyProfile, type MyHome, type ProfileRow } from './shared'
import { useOwnerFirstName } from './home/Applications'
import { collectMyData, downloadJson } from './me/export'
import { PetSheet } from './me/PetSheet'

/** A titled block. The icon and the display heading give each its own start; the body decides the rest. */
function Block({ id, icon: IconEl, title, lede, action, children }: { id: string; icon: Icon; title: string; lede?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0 rounded-xl bg-surface p-5 shadow-card sm:p-6">
      <div className="mb-4 flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
          <IconEl weight="fill" className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="display text-[21px] text-ink">
            {title}
          </h2>
          {lede && <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{lede}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}

/* ───────────────────────────── about and household ──────────────────────── */

function EditProfileSheet({ open, profile, looking, onClose }: { open: boolean; profile: ProfileRow; looking: boolean; onClose: () => void }) {
  const me = useMe()
  const [headline, setHeadline] = useState(profile.headline)
  const [bio, setBio] = useState(profile.bio)
  const [household, setHousehold] = useState(String(profile.householdSize))
  const [moveIn, setMoveIn] = useState(profile.moveInFrom ?? '')
  const [budget, setBudget] = useState(profile.budgetWeekly ? String(profile.budgetWeekly) : '')
  const [nudged, setNudged] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setHeadline(profile.headline)
      setBio(profile.bio)
      setHousehold(String(profile.householdSize))
      setMoveIn(profile.moveInFrom ?? '')
      setBudget(profile.budgetWeekly ? String(profile.budgetWeekly) : '')
      setNudged(false)
    }
  }
  const people = Number(household)
  const householdError = !(people >= 1 && people <= 12) ? 'Enter how many people live with you, including you.' : undefined
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      eyebrow="Your profile"
      title="How you introduce yourself"
      description="A landlord sees this only when you apply. Say as much or as little as you like."
      footer={
        <Button
          intent="primary"
          size="lg"
          className="rounded-full"
          block
          onClick={() => {
            setNudged(true)
            if (householdError) return
            updateProfile(me.id, { headline: headline.trim(), bio: bio.trim(), householdSize: people, moveInFrom: moveIn || undefined, budgetWeekly: Number(budget) || undefined })
            toast.success('Saved')
            onClose()
          }}
        >
          Save
        </Button>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <Field label="One line about you" optional>
          {(p) => <Input {...p} value={headline} maxLength={80} onChange={(e) => setHeadline(e.target.value)} placeholder="Looking for a quiet place near town" />}
        </Field>
        <Field label="A little more" optional hint="You are never required to say what you do for work, how old you are, or who is in your family — and a landlord may not choose a tenant on those.">
          {(p) => <Textarea {...p} value={bio} maxLength={400} onChange={(e) => setBio(e.target.value)} />}
        </Field>
        <Field label="People in your household" hint="Including you. A landlord may ask how many people will live in a home, and nothing more about them." error={nudged ? householdError : undefined}>
          {(p) => <Input {...p} inputMode="numeric" value={household} onChange={(e) => setHousehold(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />}
        </Field>
        {looking && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Looking to move from" optional>
              {(p) => <Input {...p} type="date" value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />}
            </Field>
            <Field label="Weekly budget" optional>
              {(p) => <Input {...p} inputMode="numeric" prefix="$" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))} />}
            </Field>
          </div>
        )}
      </div>
    </Sheet>
  )
}

/* ─────────────────────────────────── pets ───────────────────────────────── */

function PetRequestRow({ v, landlord }: { v: Variation; landlord: string }) {
  const line =
    v.status === 'awaiting_landlord' || v.status === 'requested'
      ? v.respondBy
        ? `With ${landlord}. An answer is due by ${fmtDate(v.respondBy)}.`
        : `With ${landlord}.`
      : v.status === 'awaiting_tenant'
        ? `${landlord} said yes${v.conditions.length ? ` with ${plural(v.conditions.length, 'condition')}` : ''}. It is waiting for your signature.`
        : v.status === 'signed'
          ? 'Agreed and signed. Part of your tenancy.'
          : v.status === 'declined'
            ? `Declined${v.declineGround ? `: ${v.declineGround}` : '.'}`
            : 'You withdrew this request.'
  const done = v.status === 'signed'
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
      <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', done ? 'bg-ok-soft text-ok-text' : 'bg-sunken text-ink-2')}>
        <PawPrint weight="fill" className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-[15px] font-semibold text-ink">{v.summary}</p>
        <p className="text-[13px] leading-relaxed text-ink-2">{line}</p>
      </div>
      {(v.status === 'awaiting_landlord' || v.status === 'requested') && (
        <Button
          size="sm"
          intent="ghost"
          className="rounded-full"
          onClick={() => {
            withdrawRequest(v.id)
            toast('Request withdrawn', { description: `${landlord} no longer needs to answer it.` })
          }}
        >
          Withdraw
        </Button>
      )}
      {v.status === 'awaiting_tenant' && (
        <Link to="/pool" className={cn(buttonClass({ intent: 'primary', size: 'sm' }), 'rounded-full')}>
          Sign on Home
        </Link>
      )}
    </li>
  )
}

function Pets({ home }: { home: MyHome | undefined }) {
  const variations = useStore((s) => s.db.variations)
  const [asking, setAsking] = useState(false)
  const landlord = firstName(home?.landlord?.fullName)
  const requests = useMemo(() => (home ? variations.filter((v) => v.tenancyId === home.tenancy.id && v.type === 'pet_request').sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)) : []), [variations, home])
  const pets = home?.tenancy.pets ?? []
  return (
    <Block
      id="me-pets"
      icon={PawPrint}
      title="Pets"
      lede={home ? `You can ask ${landlord} for a pet at any time, and they have to answer.` : 'A pet request goes to your landlord through your tenancy.'}
      action={
        home && (
          <Button intent="soft" className="rounded-full" onClick={() => setAsking(true)}>
            Ask to keep a pet
          </Button>
        )
      }
    >
      {!home ? (
        <div className="rounded-lg bg-sunken p-4 text-[14px] leading-relaxed text-ink-2">
          <p>
            <strong className="font-semibold text-ink">There is nothing to ask yet</strong> — you do not have a tenancy on Pool. When you search, switch on “Pets considered” to see homes whose listing says a pet will be looked at.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Why rule="pets.refusal_needs_grounds" label="When a landlord can say no" />
            <Why rule="bond.pet_max_weeks" label="Pet bond" />
          </div>
        </div>
      ) : (
        <>
          {pets.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2">
              {pets.map((p) => (
                <li key={p.name} className="inline-flex items-center gap-2 rounded-full bg-ok-soft py-1.5 pr-3.5 pl-2.5 text-[13px] font-medium text-ok-text">
                  <SealCheck weight="fill" className="size-4" aria-hidden />
                  {p.name}, {p.kind.toLowerCase()}
                  {p.approvedAt && <span className="font-normal opacity-80">· on the tenancy since {fmtDate(p.approvedAt, { weekday: false, year: 'always' })}</span>}
                </li>
              ))}
            </ul>
          )}
          {requests.length === 0 ? (
            <p className="rounded-lg bg-sunken p-4 text-[14px] leading-relaxed text-ink-2">{pets.length > 0 ? 'No requests in progress.' : 'No pets on your tenancy, and nothing asked for. A request takes a minute, and the reply has a legal deadline.'}</p>
          ) : (
            <ul className="divide-y divide-line">
              {requests.map((v) => (
                <PetRequestRow key={v.id} v={v} landlord={landlord} />
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Why rule="pets.response_deadline" label="How long they have to answer" />
            <Why rule="pets.refusal_needs_grounds" label="When they can say no" />
          </div>
          <PetSheet open={asking} home={home} onClose={() => setAsking(false)} />
        </>
      )}
    </Block>
  )
}

/* ───────────────────────── what is shared, and when ─────────────────────── */

const WHEN_FOR_RENTERS = ['When you book a time to see a home', 'When you apply', 'Only if the landlord wants to offer you the home']

function Shared() {
  const pack = usePack()
  const keep = durationText(pack.rules['privacy.unsuccessful_applicant_retention'].value)
  return (
    <Block id="me-shared" icon={Eye} title="What a landlord can learn, and when" lede="Three stages, in order. A landlord on Loop cannot ask for more, or ask sooner — the form simply does not have the fields.">
      <ol className="grid gap-3">
        {pack.privacyStages.map((s, i) => (
          <li key={s.stage} className="relative rounded-lg bg-sunken p-4 pl-14">
            <span className="display num absolute top-4 left-4 grid size-7 place-items-center rounded-full bg-accent text-[13px] text-accent-ink">{i + 1}</span>
            <p className="text-[15px] font-semibold text-ink">{s.stage}</p>
            <p className="text-[13px] text-ink-2">{WHEN_FOR_RENTERS[i] ?? s.when}</p>
            <ul className="mt-3 grid gap-1.5">
              {s.mayCollect.map((m) => (
                <li key={m} className="flex gap-2 text-[14px] leading-snug text-ink">
                  <Check weight="bold" className="mt-0.5 size-4 shrink-0 text-ok-text" aria-hidden />
                  {m}
                </li>
              ))}
              {s.mustNotCollect.map((m) => (
                <li key={m} className="flex gap-2 text-[14px] leading-snug text-ink-3">
                  <X weight="bold" className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    <span className="sr-only">Not allowed: </span>
                    {m}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] leading-relaxed text-ink-2">
        <LockSimple weight="fill" className="size-4 shrink-0 text-ink-3" aria-hidden />
        <span className="min-w-0 flex-1 basis-56">If you miss out on a home, your details are deleted from that landlord’s records after {keep}.</span>
        <Why rule="privacy.unsuccessful_applicant_retention" label="Why that long" />
      </div>
    </Block>
  )
}

/* ─────────────────────────────────── my data ────────────────────────────── */

function MyData({ applications }: { applications: Application[] }) {
  const me = useMe()
  const day = useToday()
  const ownerOf = useOwnerFirstName()
  const properties = useStore((s) => s.db.properties)
  const [withdrawing, setWithdrawing] = useState<Application | null>(null)
  const open = applications.filter((a) => a.stage !== 'withdrawn' && a.stage !== 'declined')
  const target = withdrawing ? properties.find((p) => p.id === withdrawing.propertyId) : undefined

  return (
    <Block id="me-data" icon={DownloadSimple} title="Your data" lede="It is yours. Take a copy whenever you like, and pull an application back whenever you change your mind.">
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-sunken p-4">
        <p className="min-w-0 flex-1 basis-56 text-[14px] leading-relaxed text-ink-2">One file with everything Pool holds about you: your profile, Passport history, applications, repairs, requests and feedback.</p>
        <Button
          className="rounded-full"
          icon={<DownloadSimple weight="bold" className="size-4" />}
          onClick={() => {
            downloadJson(`pool-my-data-${day}.json`, collectMyData(db.get(), me.id, new Date().toISOString()))
            toast.success('Your data is downloading', { description: 'A JSON file, readable in any text editor.' })
          }}
        >
          Download my data
        </Button>
      </div>

      <h3 className="mt-5 mb-1 text-[14px] font-semibold text-ink">Applications you can withdraw</h3>
      {open.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-ink-2">None open. When you apply for a home it appears here, and withdrawing it removes your details from that landlord’s view straight away.</p>
      ) : (
        <ul className="divide-y divide-line">
          {open.map((a) => {
            const p = properties.find((x) => x.id === a.propertyId)
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate text-[15px] font-semibold text-ink">{p?.address.line1 ?? 'A home'}</p>
                  <p className="text-[13px] text-ink-2">
                    {stageLine(a, p ? ownerOf(p.orgId) : 'the landlord')} · {money(a.offeredWeeklyRent)} a week
                  </p>
                </div>
                <Button size="sm" intent="ghost" className="rounded-full" onClick={() => setWithdrawing(a)}>
                  Withdraw
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={withdrawing !== null}
        onOpenChange={(o) => !o && setWithdrawing(null)}
        size="sm"
        title={`Withdraw from ${target?.address.line1 ?? 'this home'}?`}
        description="Your application, your note and any booked viewing are removed from the landlord’s view straight away. You can apply again later if the home is still listed."
        footer={
          <>
            <Button intent="ghost" onClick={() => setWithdrawing(null)}>
              Keep it
            </Button>
            <Button
              intent="danger"
              className="rounded-full"
              onClick={() => {
                if (withdrawing) withdrawApplication(withdrawing.id)
                toast('Application withdrawn', { description: 'Your details are gone from their records.' })
                setWithdrawing(null)
              }}
            >
              Withdraw
            </Button>
          </>
        }
      />
    </Block>
  )
}

/* ────────────────────────────────── feedback ────────────────────────────── */

const KINDS: { value: Feedback['kind']; label: string }[] = [
  { value: 'idea', label: 'An idea' },
  { value: 'bug', label: 'Something is broken' },
  { value: 'question', label: 'A question' },
  { value: 'praise', label: 'Something good' },
  { value: 'complaint', label: 'A complaint' },
]

const STATUS: Record<Feedback['status'], string> = { new: 'Received', triaged: 'Being looked at', planned: 'Planned', shipped: 'Done', declined: 'Not going ahead' }

function FeedbackBlock() {
  const me = useMe()
  const all = useStore((s) => s.db.feedback)
  const mine = useMemo(() => all.filter((f) => f.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [all, me.id])
  const [kind, setKind] = useState<Feedback['kind']>('idea')
  const [text, setText] = useState('')
  const [nudged, setNudged] = useState(false)
  const tooShort = text.trim().length < 8
  return (
    <Block id="me-feedback" icon={ChatCircleDots} title="Tell us what you think" lede="A person on the Pool team reads every message. Replies come back here.">
      <div role="radiogroup" aria-label="What kind of message" className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} onClick={() => setKind(k.value)} className={cn('pressable h-11 rounded-full px-4 text-[14px] font-medium transition-colors', kind === k.value ? 'bg-ink text-bg' : 'bg-sunken text-ink-2 hoverable:hover:text-ink')}>
            {k.label}
          </button>
        ))}
      </div>
      <Field className="mt-3" label="Your message" error={nudged && tooShort ? 'Write a sentence, so we know what you mean.' : undefined}>
        {(p) => <Textarea {...p} value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'bug' ? 'What were you doing, and what happened instead?' : kind === 'praise' ? 'What worked well?' : 'What is on your mind?'} />}
      </Field>
      <Button
        intent="primary"
        size="lg"
        className="mt-3 rounded-full"
        onClick={() => {
          setNudged(true)
          if (tooShort) return
          sendFeedback(me.id, kind, text, '/pool/me')
          toast.success('Sent — thank you', { description: 'It is with the Pool team now.' })
          setText('')
          setNudged(false)
        }}
      >
        Send it
      </Button>

      <h3 className="mt-6 mb-1 text-[14px] font-semibold text-ink">What you have sent</h3>
      {mine.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-ink-2">Nothing yet. Anything you send, or flag as wrong on your Passport, is listed here with what happened to it.</p>
      ) : (
        <ul className="divide-y divide-line">
          {mine.map((f) => (
            <li key={f.id} className="py-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                <span className="rounded-full bg-sunken px-2 py-0.5 font-medium text-ink-2">{STATUS[f.status]}</span>
                {KINDS.find((k) => k.value === f.kind)?.label} · {fmtDate(dateOf(f.createdAt))}
              </p>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink">{f.text}</p>
              {f.adminReply && (
                <p className="mt-2 rounded-lg bg-accent-soft p-3 text-[14px] leading-relaxed text-ink">
                  <span className="mb-0.5 block text-xs font-semibold text-accent-text">Reply from the Pool team</span>
                  {f.adminReply}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Block>
  )
}

/* ─────────────────────────────────── view ───────────────────────────────── */

export function Me() {
  const me = useMe()
  const profile = useMyProfile()
  const home = useMyHome()
  const applications = useMyApplications()
  const [editing, setEditing] = useState(false)
  const everyone = home ? [me, ...home.housemates] : [me]

  return (
    <Page>
      <header className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-4 sm:mb-8">
        <Avatar name={me.fullName} hue={me.hue} size={76} className="ring-4 ring-surface" />
        <div className="min-w-0 flex-1 basis-60">
          <p className="eyebrow">{home ? `Renting ${home.property.address.line1}` : 'Looking for a home'} · demo persona</p>
          <h1 className="display mt-1 text-[32px] text-ink sm:text-[42px]">{me.fullName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-ink-2">
            <span>{me.email}</span>
            <span>{me.phone}</span>
            <span className={cn('inline-flex items-center gap-1 font-medium', me.identityVerified ? 'text-ok-text' : 'text-ink-3')}>
              {me.identityVerified && <SealCheck weight="fill" className="size-4" aria-hidden />}
              {me.identityVerified ? 'Identity verified' : 'Identity not verified yet'}
            </span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:gap-6">
          <Block
            id="me-about"
            icon={UsersThree}
            title="You and your household"
            action={
              <Button intent="soft" className="rounded-full" icon={<PencilSimple weight="bold" className="size-4" />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            }
          >
            {profile.headline ? <p className="text-[17px] leading-snug font-medium text-ink text-pretty">{profile.headline}</p> : <p className="text-[15px] text-ink-3">No introduction yet. A line or two helps a landlord picture who is applying.</p>}
            {profile.bio && <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{profile.bio}</p>}
            <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
              <span className="flex -space-x-2">
                {everyone.map((u) => (
                  <Avatar key={u.id} name={u.fullName} hue={u.hue} size={34} className="ring-2 ring-surface" />
                ))}
              </span>
              <p className="min-w-0 flex-1 text-[14px] text-ink-2">
                <span className="font-semibold text-ink">{plural(Math.max(profile.householdSize, everyone.length), 'person', 'people')}</span> in the household
                {home && home.housemates.length > 0 ? ` — you and ${home.housemates.map((u) => firstName(u.fullName)).join(' and ')} are on the agreement` : ''}.
              </p>
            </div>
            {!home && (profile.moveInFrom || profile.budgetWeekly) && (
              <p className="mt-3 text-[13px] text-ink-2">
                {profile.moveInFrom ? `Looking to move from ${fmtDate(profile.moveInFrom)}` : 'Looking'}
                {profile.budgetWeekly ? `, up to ${money(profile.budgetWeekly)} a week` : ''}.
              </p>
            )}
            <p className="mt-3 text-xs leading-relaxed text-ink-3">A landlord sees this only when you apply to them. Your job, age and family are never asked for.</p>
          </Block>
          <Pets home={home} />
          <FeedbackBlock />
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:gap-6">
          <Shared />
          <MyData applications={applications} />
        </div>
      </div>

      <EditProfileSheet open={editing} profile={profile} looking={!home} onClose={() => setEditing(false)} />
    </Page>
  )
}
