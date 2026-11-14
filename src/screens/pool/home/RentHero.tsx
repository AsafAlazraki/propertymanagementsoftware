/**
 * The answer to the one question a renter opens the app with: am I square?
 *
 * A sentence first, because "you're all square" is the whole answer for most
 * people most weeks. Under it, the next fortnight drawn as days — the ones
 * already paid for, and the day the next rent falls due — so the date is
 * something you can see coming rather than something you have to remember.
 */
import { useMemo } from 'react'
import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import { arrearsState } from '@/domain/rules/tenancy'
import { addDays, diffDays, fmtDate, fmtRelative, weekday } from '@/domain/rules/calendar'
import { money, plural } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { calendarOf, usePack, useToday } from '@/data/hooks'
import { Money } from '@/ui/display'
import { Why } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { DemoNote, firstName, type MyHome } from '../shared'

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Fourteen days, starting a couple before today: paid for, due, or still ahead. */
function Runway({ paidTo, today, late }: { paidTo: string; today: string; late: boolean }) {
  const dueOn = addDays(paidTo, 1)
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 2))
  return (
    <div aria-hidden className="min-w-0">
      <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-[3px] sm:gap-1">
        {days.map((d) => {
          const isToday = d === today
          const covered = d <= paidTo
          const due = d === dueOn
          const owing = late && d >= dueOn && d <= today
          return (
            <div key={d} className="flex min-w-0 flex-col items-center gap-1">
              <span className={cn('text-[10px] leading-none', isToday ? 'font-semibold text-ink' : 'text-ink-3')}>{DAY_LETTER[weekday(d)]}</span>
              <span
                className={cn(
                  'num grid aspect-square w-full max-w-9 place-items-center rounded-[10px] text-[11px] font-medium transition-colors duration-300 sm:text-xs',
                  owing ? 'bg-warn-soft text-warn-text' : covered ? 'bg-ok-soft text-ok-text' : due ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink-3',
                  isToday && 'shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]',
                )}
              >
                {Number(d.slice(8))}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-ok-soft shadow-[inset_0_0_0_1px_var(--ok)]" /> Paid for
        </span>
        {late ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[4px] bg-warn-soft shadow-[inset_0_0_0_1px_var(--warn)]" /> Owing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[4px] bg-accent" /> Next rent due
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] shadow-[0_0_0_1.5px_var(--ink)]" /> Today
        </span>
      </div>
    </div>
  )
}

/** The drop's ring from the Pool mark, as a quiet corner of the card. */
function Ripples() {
  return (
    <svg aria-hidden viewBox="0 0 240 240" className="pointer-events-none absolute -top-16 -right-16 size-60 text-accent-soft sm:size-72">
      {[36, 64, 92, 118].map((r, i) => (
        <circle key={r} cx="120" cy="120" r={r} fill="none" stroke="currentColor" strokeWidth={i === 0 ? 14 : 10} opacity={1 - i * 0.2} />
      ))}
    </svg>
  )
}

export function RentHero({ home }: { home: MyHome }) {
  const pack = usePack()
  const day = useToday()
  const { tenancy: t, property } = home
  const allLedger = useStore((s) => s.db.ledger)
  const payments = useMemo(
    () =>
      allLedger
        .filter((l) => l.tenancyId === t.id && l.kind === 'rent')
        .sort((a, b) => (b.dueDate ?? b.date).localeCompare(a.dueDate ?? a.date))
        .slice(0, 12)
        .reverse(),
    [allLedger, t.id],
  )
  const a = arrearsState(pack, calendarOf(pack, property), t, day)
  const cycle = t.cadence === 'fortnightly' ? 14 : 7
  const amount = t.weeklyRent * (cycle / 7)
  const dueOn = addDays(t.rentPaidTo, 1)
  const late = a.daysLate > 0
  const dueToday = dueOn === day
  const landlord = firstName(home.landlord?.fullName)
  const onTime = payments.filter((p) => !p.dueDate || p.date <= p.dueDate).length

  const headline = late ? `Rent is ${plural(a.daysLate, 'day')} late.` : dueToday ? 'Rent is due today.' : `You’re all square with ${landlord}.`
  const sub = late
    ? `${money(a.owed)} fell due on ${fmtDate(dueOn)} and has not landed yet. If it is on its way there is nothing to do — it shows here as soon as it arrives. If something has changed, tell ${landlord} today; a message early is easier for everyone.`
    : dueToday
      ? `${money(amount)} is due today. You are paid up to ${fmtDate(t.rentPaidTo)}, so nothing is late.`
      : `Rent is paid up to ${fmtDate(t.rentPaidTo)}. Nothing is owing, and nothing is waiting to be paid.`

  return (
    <section aria-labelledby="rent-title" className="relative min-w-0 overflow-hidden rounded-xl bg-surface p-5 shadow-card sm:p-7">
      <Ripples />
      <div className="relative">
        <p className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', late ? 'bg-warn-soft text-warn-text' : 'bg-ok-soft text-ok-text')}>
          {late ? <WarningCircle weight="fill" className="size-4" aria-hidden /> : <CheckCircle weight="fill" className="size-4" aria-hidden />}
          {late ? 'Rent overdue' : 'Rent up to date'}
        </p>
        <h1 id="rent-title" className="display mt-3 max-w-[16ch] text-[34px] text-ink sm:text-[46px]">
          {headline}
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">{sub}</p>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-9">
          <div className="min-w-0">
            <p className="eyebrow">{late ? 'Owing now' : 'Next rent'}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <Money value={late ? a.owed : amount} className="display text-[42px] leading-none text-ink" />
              <span className="text-[13px] text-ink-3">{late ? '' : t.cadence === 'fortnightly' ? 'a fortnight' : 'a week'}</span>
            </p>
            <p className="mt-1.5 text-[14px] text-ink-2">
              {late ? (
                <>was due {fmtDate(dueOn)}</>
              ) : (
                <>
                  due <span className="font-semibold text-ink">{fmtDate(dueOn)}</span> · {fmtRelative(dueOn, day)}
                </>
              )}
            </p>
          </div>
          <Runway paidTo={t.rentPaidTo} today={day} late={late} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-line pt-4">
          {payments.length > 0 ? (
            <>
              <span role="img" aria-label={`${onTime} of your last ${payments.length} rent payments landed on or before the due date`} className="flex items-center gap-1">
                {payments.map((p) => {
                  const ok = !p.dueDate || p.date <= p.dueDate
                  return <span key={p.id} className={cn('h-5 w-1.5 rounded-full', ok ? 'bg-ok' : 'bg-warn')} title={`${fmtDate(p.dueDate ?? p.date)} — ${ok ? 'on time' : `${plural(diffDays(p.dueDate ?? p.date, p.date), 'day')} late`}`} />
                })}
              </span>
              <p className="min-w-0 flex-1 text-[13px] text-ink-2">
                <span className="font-semibold text-ink">
                  {onTime} of your last {payments.length}
                </span>{' '}
                payments landed on time. Each one builds your Rent Passport.
              </p>
            </>
          ) : (
            <p className="min-w-0 flex-1 text-[13px] text-ink-2">Your first payment tracked in Pool will show here, and starts your Rent Passport.</p>
          )}
          {late && <Why rule="arrears.remedy_notice" label="What a landlord can do about late rent" />}
        </div>
        <DemoNote className="mt-3">You pay {landlord} from your own bank; Pool never holds your money. In this demo the bank feed that spots a payment landing is simulated.</DemoNote>
      </div>
    </section>
  )
}
