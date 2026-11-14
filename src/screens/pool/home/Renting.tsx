/**
 * Home, for someone who is renting: what needs you, what is moving without
 * you, what is coming, and the standing facts of the tenancy.
 */
import { useMemo, useState, type ReactNode, type Ref } from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { ArrowRight, CalendarBlank, ClipboardText, HandWaving, Leaf, PawPrint, PenNib, Scales, ShieldCheck, Snowflake, Sun, Wrench, type Icon } from '@phosphor-icons/react'
import type { Inspection, Notice, Ticket, Variation } from '@/domain/types'
import { bondLodgement } from '@/domain/rules/tenancy'
import { dateOf, diffDays, fmtDate } from '@/domain/rules/calendar'
import { durationText } from '@/domain/rules/core'
import { money, plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { calendarOf, usePack, useToday } from '@/data/hooks'
import { declineVariation, signVariation } from '@/data/pool-mutations'
import { Button, buttonClass } from '@/ui/Button'
import { Avatar, Money } from '@/ui/display'
import { DayTrack, Why } from '@/ui/Law'
import { PropertyArt } from '@/ui/PropertyArt'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { firstName, fmtTime, fmtWhen, Heading, REPAIR_STEPS, repairLine, repairStep, useLast, type MyHome } from '../shared'
import { seasonalTip } from './tips'
import { RentHero } from './RentHero'

const hour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? 'pm' : 'am'}`

/* ───────────────────────────── waiting on you ───────────────────────────── */

function NeedsYou({ icon: IconEl, title, body, children, ref }: { icon: Icon; title: string; body: string; children: ReactNode; ref?: Ref<HTMLLIElement> }) {
  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.16 } }}
      transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
      className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-accent-text shadow-card">
        <IconEl weight="fill" className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] leading-snug font-semibold tracking-[-0.01em] text-ink text-balance">{title}</h3>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2 text-pretty">{body}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </motion.li>
  )
}

function SignSheet({ variation, landlord, onClose }: { variation: Variation | null; landlord: string; onClose: () => void }) {
  const me = useMe()
  const pack = usePack()
  const v = useLast(variation)
  const pet = v?.type === 'pet_request'
  const refusalGround = pack.petRefusalGrounds.find((g) => g.key === 'condition_refused')?.label
  return (
    <Sheet
      open={variation !== null}
      onOpenChange={(open) => !open && onClose()}
      eyebrow={pet ? 'Pet request' : 'Change to your tenancy'}
      title={pet ? `${landlord} said yes — here is what you would be agreeing to` : (v?.summary ?? '')}
      footer={
        v && (
          <>
            <Button
              intent="ghost"
              onClick={() => {
                declineVariation(v.id)
                toast('Not signed', { description: `${landlord} has been told you did not agree.` })
                onClose()
              }}
            >
              I don’t agree
            </Button>
            <Button
              intent="primary"
              size="lg"
              className="rounded-full"
              icon={<PenNib weight="fill" className="size-4" />}
              onClick={() => {
                signVariation(v.id, me.fullName)
                toast.success('Signed', { description: pet ? 'It is part of your tenancy now. Enjoy the company.' : `It is part of your tenancy now, and ${landlord} has a copy.` })
                onClose()
              }}
            >
              Sign as {me.fullName}
            </Button>
          </>
        )
      }
    >
      {v && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
          <div className="flex items-center gap-3 rounded-lg bg-sunken p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent-text shadow-card">{pet ? <PawPrint weight="fill" className="size-5" /> : <PenNib weight="fill" className="size-5" />}</span>
            <p className="min-w-0 text-[15px] font-semibold text-ink">{v.summary}</p>
          </div>
          {v.conditions.length > 0 ? (
            <div>
              <p className="eyebrow mb-2">{pet ? 'The conditions' : 'What changes'}</p>
              <ul className="grid gap-2">
                {v.conditions.map((c) => (
                  <li key={c} className="flex gap-2.5 rounded-lg bg-surface p-3 text-[14px] leading-snug text-ink shadow-card">
                    <ShieldCheck weight="fill" className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[14px] leading-relaxed text-ink-2">{pet ? `${landlord} agreed with no conditions.` : 'Nothing else about your tenancy changes.'}</p>
          )}
          {pet && (
            <div className="grid gap-2 text-[13px] leading-relaxed text-ink-2">
              <p>A landlord can only attach conditions that are reasonable, and a pet bond has a ceiling.</p>
              <div className="flex flex-wrap gap-2">
                <Why rule="bond.pet_max_weeks" label="The most a pet bond can be" />
                <Why rule="pets.refusal_needs_grounds" label="When a landlord can say no" />
              </div>
              {refusalGround && <p className="rounded-lg bg-sunken p-3 text-xs">If you do not agree to a reasonable condition, that is one of the grounds the Act gives a landlord for refusing: “{refusalGround}.”</p>}
            </div>
          )}
          <p className="text-xs text-ink-3">
            {landlord} signed on {fmtDate(dateOf(v.signatures.find((s) => s.by === 'landlord')?.at ?? v.requestedAt))}. In this demo a signature is a tap; there is no identity check behind it.
          </p>
        </div>
      )}
    </Sheet>
  )
}

/* ───────────────────────────────── in motion ────────────────────────────── */

function Steps({ at }: { at: number }) {
  return (
    <div role="img" aria-label={`Step ${at + 1} of ${REPAIR_STEPS.length}: ${REPAIR_STEPS[at]}`} className="mt-3 flex items-center gap-1">
      {REPAIR_STEPS.map((s, i) => (
        <span key={s} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-500', i <= at ? 'bg-accent' : 'bg-line')} style={{ opacity: i < at ? 0.45 : 1 }} />
      ))}
    </div>
  )
}

function RepairLane({ ticket, landlord }: { ticket: Ticket; landlord: string }) {
  const provider = useStore((s) => s.db.providers.find((p) => p.id === ticket.providerId)?.name)
  const at = repairStep(ticket)
  return (
    <li>
      <Link to="/pool/repairs" search={{ ticket: ticket.id }} className="pressable group block rounded-xl bg-surface p-4 shadow-card transition-shadow hoverable:hover:shadow-pop sm:p-5">
        <div className="flex items-start gap-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">{ticket.status === 'disputed' ? <Scales weight="fill" className="size-5" aria-hidden /> : <Wrench weight="fill" className="size-5" aria-hidden />}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-ink-3">{ticket.title}</p>
            <p className="mt-0.5 text-[16px] leading-snug font-semibold tracking-[-0.01em] text-ink text-balance">{repairLine(ticket, { landlord, provider })}.</p>
            <Steps at={at} />
            <p className="mt-1.5 text-xs text-ink-3">{REPAIR_STEPS[at]}</p>
          </div>
          <ArrowRight className="mt-1 size-4 shrink-0 text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </div>
      </Link>
    </li>
  )
}

function RequestLane({ variation, landlord }: { variation: Variation; landlord: string }) {
  const pack = usePack()
  const day = useToday()
  const total = pack.rules['pets.response_deadline'].value?.n
  const left = variation.respondBy ? diffDays(day, variation.respondBy) : null
  const pet = variation.type === 'pet_request'
  const title =
    left === null
      ? `${landlord} has it and needs to answer in writing`
      : left >= 0
        ? `${landlord} has until ${fmtDate(variation.respondBy!)} to answer`
        : `${landlord} was due to answer by ${fmtDate(variation.respondBy!)}`
  return (
    <li className="rounded-xl bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">{pet ? <PawPrint weight="fill" className="size-5" aria-hidden /> : <PenNib weight="fill" className="size-5" aria-hidden />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-ink-3">
            {pet ? 'Pet request' : 'Your request'} · {variation.summary}
          </p>
          <p className="mt-0.5 text-[16px] leading-snug font-semibold tracking-[-0.01em] text-ink text-balance">{title}.</p>
          {pet && total && left !== null && (
            <div className="mt-3 max-w-sm">
              <DayTrack total={total} used={total - Math.max(0, left)} tone={left < 0 ? 'danger' : left <= 3 ? 'warn' : 'accent'} />
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-3">
            {left !== null && <span>{left >= 0 ? `${plural(left, 'day')} left. They can say yes, yes with conditions, or no with a reason.` : 'The deadline has passed. Not answering in time is an unlawful act.'}</span>}
            {pet && <Why rule="pets.response_deadline" label="Why there is a deadline" />}
            {!pet && variation.respondBy && <Why rule="requests.minor_change_response" />}
          </div>
        </div>
      </div>
    </li>
  )
}

/* ───────────────────────────────── coming up ────────────────────────────── */

function InspectionRow({ inspection, landlord }: { inspection: Inspection; landlord: string }) {
  const pack = usePack()
  const inspector = useStore((s) => s.db.providers.find((p) => p.id === inspection.providerId)?.name)
  const hours = pack.rules['entry.hours'].value
  const notice = durationText(pack.rules['entry.inspection_notice_min'].value)
  const interval = durationText(pack.rules['entry.inspection_min_interval'].value)
  const booked = inspection.status === 'notice_served' && inspection.scheduledFor
  return (
    <li className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
        <ClipboardText weight="fill" className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-semibold text-ink">{booked ? `Routine inspection, ${fmtWhen(inspection.scheduledFor!)}` : 'A routine inspection is about to be scheduled'}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          {booked ? `${inspector ?? landlord} will walk through. You are welcome to be there, and you do not have to be.` : `${landlord} has not picked a day yet. You will hear in writing first.`} Your rights: at least {notice} of notice
          {hours ? `, between ${hour(hours.from)} and ${hour(hours.to)}` : ''}, and no more than one in any {interval}.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Why rule="entry.inspection_notice_min" label="Notice you must get" />
          <Why rule="entry.hours" label="Hours" />
          <Why rule="entry.inspection_min_interval" label="How often" />
        </div>
      </div>
    </li>
  )
}

function VisitRow({ ticket }: { ticket: Ticket }) {
  const provider = useStore((s) => s.db.providers.find((p) => p.id === ticket.providerId)?.name)
  return (
    <li className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
        <Wrench weight="fill" className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-semibold text-ink">
          {provider ?? 'A tradesperson'}, {fmtWhen(ticket.scheduledFor!)}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          For: {ticket.title.toLowerCase()}. {ticket.entryNoticeServedAt ? 'You were given notice in writing.' : 'They arrange the time with you directly.'}
          {ticket.keyCode ? ` If you are out, they have a one-time key code that only works from ${fmtTime(ticket.keyCode.validFrom)} to ${fmtTime(ticket.keyCode.validTo)}.` : ''}
        </p>
        <div className="mt-2">
          <Why rule="entry.repairs_notice_min" label="Notice for repairs" />
        </div>
      </div>
    </li>
  )
}

function NoticeRow({ notice }: { notice: Notice }) {
  return (
    <li className="flex gap-3.5 py-4 first:pt-0 last:pb-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
        <CalendarBlank weight="fill" className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug font-semibold text-ink">{notice.title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          {notice.body} Takes effect {fmtDate(notice.effectiveOn, { year: 'always' })}.
        </p>
        {notice.type === 'rent_increase' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Why rule="rent_increase.notice" label="Notice you must get" />
            <Why rule="rent_increase.min_interval_months" label="How often rent can rise" />
          </div>
        )}
      </div>
    </li>
  )
}

/* ─────────────────────────── the standing facts ─────────────────────────── */

function HomeCard({ home }: { home: MyHome }) {
  const me = useMe()
  const { tenancy: t, property: p } = home
  const people = [me, ...home.housemates]
  return (
    <section aria-label="Your home" className="min-w-0 overflow-hidden rounded-xl bg-surface shadow-card">
      <PropertyArt kind={p.kind} art={p.art} label="Illustration" className="aspect-[16/9] w-full" />
      <div className="p-5">
        <p className="eyebrow">Your home</p>
        <h2 className="display mt-1 text-[22px] text-ink">{p.address.line1}</h2>
        <p className="text-[14px] text-ink-2">
          {p.address.suburb}, {p.address.city}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
          <div>
            <dt className="text-ink-3">Rent</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              <Money value={t.weeklyRent} /> a week
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">Tenancy</dt>
            <dd className="mt-0.5 font-semibold text-ink">{t.type === 'fixed' && t.endDate ? `Fixed to ${fmtDate(t.endDate)}` : 'Periodic'}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Since</dt>
            <dd className="mt-0.5 font-semibold text-ink">{fmtDate(t.startDate, { weekday: false, year: 'always' })}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Landlord</dt>
            <dd className="mt-0.5 truncate font-semibold text-ink">{home.landlord?.fullName ?? 'On Loop'}</dd>
          </div>
        </dl>
        <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
          <span className="flex -space-x-2">
            {people.map((u) => (
              <Avatar key={u.id} name={u.fullName} hue={u.hue} size={30} className="ring-2 ring-surface" />
            ))}
          </span>
          <p className="min-w-0 flex-1 truncate text-[13px] text-ink-2">
            {people.length === 1 ? 'Just you on the agreement' : `You and ${home.housemates.map((u) => firstName(u.fullName)).join(' and ')}`}
            {t.pets.length > 0 && ` · ${t.pets.map((x) => x.name).join(', ')}`}
          </p>
        </div>
        <Link to="/pool/repairs" search={{ report: true }} className={cn(buttonClass({ intent: 'soft', size: 'lg', block: true }), 'mt-4 rounded-full')}>
          <Wrench weight="fill" className="size-4" aria-hidden />
          Report a problem
        </Link>
      </div>
    </section>
  )
}

function BondCard({ home }: { home: MyHome }) {
  const pack = usePack()
  const day = useToday()
  const { bond } = home.tenancy
  const landlord = firstName(home.landlord?.fullName)
  const total = bond.amount + bond.petBond
  const b = bond.receivedOn ? bondLodgement(pack, calendarOf(pack, home.property), bond.receivedOn, bond.lodgedOn, day) : null
  const overdue = b?.status === 'overdue'
  return (
    <section aria-label="Your bond" className="min-w-0 rounded-xl bg-surface p-5 shadow-card">
      <div className="flex items-start gap-3.5">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', bond.lodgedOn ? 'bg-ok-soft text-ok-text' : overdue ? 'bg-danger-soft text-danger-text' : 'bg-warn-soft text-warn-text')}>
          <ShieldCheck weight="fill" className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Your bond</p>
          <p className="mt-0.5 text-[16px] leading-snug font-semibold tracking-[-0.01em] text-ink text-balance">
            {bond.lodgedOn ? (
              <>
                <Money value={total} /> is lodged, safe and in your name
              </>
            ) : !b ? (
              'No bond is recorded as paid yet'
            ) : overdue ? (
              <>
                <Money value={total} /> has not been lodged, and it should have been
              </>
            ) : (
              <>
                <Money value={total} /> is not lodged yet — {landlord} has {plural(b.workingDaysLeft, 'working day')}
              </>
            )}
          </p>
        </div>
      </div>
      {bond.lodgedOn ? (
        <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-[13px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-3">Held by</dt>
            <dd className="font-medium text-ink">Tenancy Services</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-3">Reference</dt>
            <dd className="num font-mono font-medium text-ink">{bond.bondRef ?? 'Not recorded yet'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-3">Lodged</dt>
            <dd className="font-medium text-ink">{fmtDate(bond.lodgedOn, { weekday: false, year: 'always' })}</dd>
          </div>
          {bond.petBond > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">Of which pet bond</dt>
              <dd className="font-medium text-ink">{money(bond.petBond)}</dd>
            </div>
          )}
        </dl>
      ) : b ? (
        <div className="mt-4 border-t border-line pt-4">
          <DayTrack total={b.totalWorkingDays} used={b.workingDaysUsed} tone={overdue ? 'danger' : b.status === 'urgent' ? 'warn' : 'accent'} />
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
            {landlord} received it on {fmtDate(bond.receivedOn!)}. {overdue ? `The deadline to lodge it with Tenancy Services was ${fmtDate(b.deadline)}.` : `It has to reach Tenancy Services by ${fmtDate(b.deadline)}; you will see the reference here when it does.`}
          </p>
        </div>
      ) : null}
      <div className="mt-3">
        <Why rule="bond.lodgement_deadline" label="The lodging deadline" />
      </div>
    </section>
  )
}

function TipCard() {
  const day = useToday()
  const tip = seasonalTip(day)
  const SeasonIcon = { Spring: Leaf, Summer: Sun, Autumn: Leaf, Winter: Snowflake }[tip.season]
  return (
    <section aria-label="A home-care tip for the season" className="min-w-0 rounded-xl border border-dashed border-line-strong p-5">
      <p className="eyebrow flex items-center gap-1.5">
        <SeasonIcon weight="fill" className="size-3.5 text-accent-text" aria-hidden /> {tip.season} at home
      </p>
      <p className="display mt-2 text-[19px] text-ink">{tip.title}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{tip.body}</p>
      <p className="mt-3 text-xs text-ink-3">From {tip.source}.</p>
    </section>
  )
}

/* ─────────────────────────────────── view ───────────────────────────────── */

export function Renting({ home }: { home: MyHome }) {
  const day = useToday()
  const landlord = firstName(home.landlord?.fullName)
  const allTickets = useStore((s) => s.db.tickets)
  const allVariations = useStore((s) => s.db.variations)
  const allInspections = useStore((s) => s.db.inspections)
  const allNotices = useStore((s) => s.db.notices)
  const [signing, setSigning] = useState<Variation | null>(null)
  const tid = home.tenancy.id

  const { toCheck, moving, visits } = useMemo(() => {
    const mine = allTickets.filter((t) => t.tenancyId === tid)
    return {
      toCheck: mine.filter((t) => t.status === 'tenant_verifying'),
      moving: mine.filter((t) => t.status !== 'closed' && t.status !== 'tenant_verifying'),
      visits: mine.filter((t) => (t.status === 'scheduled' || t.status === 'approved') && t.scheduledFor && dateOf(t.scheduledFor) >= day),
    }
  }, [allTickets, tid, day])
  const { toSign, asked } = useMemo(() => {
    const mine = allVariations.filter((v) => v.tenancyId === tid)
    return { toSign: mine.filter((v) => v.status === 'awaiting_tenant'), asked: mine.filter((v) => v.status === 'awaiting_landlord' || v.status === 'requested') }
  }, [allVariations, tid])
  const inspections = useMemo(() => allInspections.filter((i) => i.tenancyId === tid && (i.status === 'proposed' || i.status === 'notice_served')), [allInspections, tid])
  const notices = useMemo(() => allNotices.filter((n) => n.tenancyId === tid && n.status === 'served' && n.effectiveOn >= day && n.type !== 'entry_inspection' && n.type !== 'entry_repairs'), [allNotices, tid, day])

  const needs = toCheck.length + toSign.length
  const inMotion = moving.length + asked.length
  const coming = inspections.length + visits.length + notices.length

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-8">
        <RentHero home={home} />

        <section aria-labelledby="needs-you">
          <Heading id="needs-you" count={needs}>
            Waiting on you
          </Heading>
          {needs === 0 ? (
            <p className="flex items-center gap-3 rounded-xl bg-surface px-4 py-4 text-[14px] text-ink-2 shadow-card sm:px-5">
              <HandWaving weight="fill" className="size-5 shrink-0 text-accent-text" aria-hidden />
              Nothing. If {landlord} or a tradesperson needs an answer from you, it lands here.
            </p>
          ) : (
            <ul className="grid gap-3">
              <AnimatePresence initial={false} mode="popLayout">
                {toCheck.map((t) => (
                  <NeedsYou
                    key={t.id}
                    icon={Scales}
                    title={`Check the report on “${t.title.toLowerCase()}”`}
                    body={`The tradesperson says the cause was damage rather than wear${t.invoice ? `, and the bill is ${money(t.invoice.amount)}` : ''}. Read what they found, then tell us if that is fair. Nothing is billed until you do.`}
                  >
                    <Link to="/pool/repairs" search={{ ticket: t.id }} className={cn(buttonClass({ intent: 'primary', size: 'lg' }), 'rounded-full')}>
                      Read the report
                      <ArrowRight weight="bold" className="size-4" aria-hidden />
                    </Link>
                  </NeedsYou>
                ))}
                {toSign.map((v) => (
                  <NeedsYou
                    key={v.id}
                    icon={v.type === 'pet_request' ? PawPrint : PenNib}
                    title={v.type === 'pet_request' ? `${landlord} said yes to your pet request` : `${landlord} has offered: ${v.summary.toLowerCase()}`}
                    body={v.type === 'pet_request' ? (v.conditions.length ? `With ${plural(v.conditions.length, 'condition')}. Read them, then sign to make it part of your tenancy.` : 'With no conditions. Sign to make it part of your tenancy.') : 'Read it, then sign if you are happy. Nothing changes until you do.'}
                  >
                    <Button intent="primary" size="lg" className="rounded-full" onClick={() => setSigning(v)} trailing={<ArrowRight weight="bold" className="size-4" />}>
                      Read and sign
                    </Button>
                  </NeedsYou>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </section>

        <section aria-labelledby="in-motion">
          <Heading id="in-motion" action={<Link to="/pool/repairs" className="rounded-sm text-[13px] font-medium text-accent-text underline-offset-4 hoverable:hover:underline">All repairs</Link>}>
            In motion
          </Heading>
          {inMotion === 0 ? (
            <div className="rounded-xl bg-surface px-5 py-8 text-center shadow-card">
              <p className="text-[15px] font-semibold text-ink">Nothing in the works</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-ink-2">Repairs you report and requests you make to {landlord} show here, with who has them and what happens next.</p>
              <Link to="/pool/repairs" search={{ report: true }} className={cn(buttonClass({ intent: 'soft' }), 'mt-4 rounded-full')}>
                Report a problem
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3">
              {moving.map((t) => (
                <RepairLane key={t.id} ticket={t} landlord={landlord} />
              ))}
              {asked.map((v) => (
                <RequestLane key={v.id} variation={v} landlord={landlord} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="coming-up">
          <Heading id="coming-up">Coming up</Heading>
          {coming === 0 ? (
            <p className="rounded-xl bg-surface px-4 py-4 text-[14px] text-ink-2 shadow-card sm:px-5">Nobody is due at your door. Inspections and tradespeople show here with the notice you were given.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl bg-surface p-4 shadow-card sm:p-5">
              {visits.map((t) => (
                <VisitRow key={t.id} ticket={t} />
              ))}
              {inspections.map((i) => (
                <InspectionRow key={i.id} inspection={i} landlord={landlord} />
              ))}
              {notices.map((n) => (
                <NoticeRow key={n.id} notice={n} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:sticky lg:top-24 lg:grid-cols-1 short:lg:static">
        <HomeCard home={home} />
        <div className="grid min-w-0 content-start gap-4">
          <BondCard home={home} />
          <TipCard />
        </div>
      </aside>

      <SignSheet variation={signing} landlord={landlord} onClose={() => setSigning(null)} />
    </div>
  )
}
