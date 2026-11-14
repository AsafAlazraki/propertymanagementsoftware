/**
 * Reviewing the rent. Two questions, in this order: is an increase worth the
 * risk, and when can it lawfully start. The arithmetic of an empty home comes
 * first because it is the part people skip.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Minus, Plus } from '@phosphor-icons/react'
import type { ID } from '@/domain/types'
import type { ServiceMethod } from '@/domain/jurisdictions/types'
import { OK, type Verdict } from '@/domain/rules/core'
import { rentIncreaseNotice } from '@/domain/notices'
import { fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { checkRentIncreaseDate, planRentIncrease } from '@/domain/rules/tenancy'
import { SUBURBS } from '@/domain/seed/world'
import { useMe, useStore } from '@/data/store'
import { calendarOf, useNameOf, usePack, useToday } from '@/data/hooks'
import { serveNotice } from '@/data/tenancy-mutations'
import { Button } from '@/ui/Button'
import { Field, Input, Select } from '@/ui/controls'
import { Fact, Facts } from '@/ui/display'
import { Refusal, Working } from '@/ui/Law'
import { NoticeDoc } from './NoticeDoc'

export function RentReview({ tenancyId, done }: { tenancyId: ID; done: () => void }) {
  const pack = usePack()
  const day = useToday()
  const me = useMe()
  const nameOf = useNameOf()
  const users = useStore((s) => s.db.users)
  const t = useStore((s) => s.db.tenancies.find((x) => x.id === tenancyId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === t?.propertyId))
  const [rent, setRent] = useState('')
  const [method, setMethod] = useState<ServiceMethod['id']>('email')
  const [start, setStart] = useState('')
  const [emptyWeeks, setEmptyWeeks] = useState(3)
  const [preview, setPreview] = useState(false)
  const [tried, setTried] = useState(false)
  if (!t || !property) return null

  const cal = calendarOf(pack, property)
  const sending = { sentOn: day, method, hour: new Date().getHours() }
  const plan = planRentIncrease(pack, cal, t, sending)
  const effective = start || plan.earliest
  const verdict = checkRentIncreaseDate(plan, effective)
  const newRent = Number(rent)
  const rise = newRent - t.weeklyRent
  const valid = newRent > t.weeklyRent
  const lost = emptyWeeks * t.weeklyRent
  const suburb = Object.values(SUBURBS).find((s) => s.name === property.address.suburb)
  const how = pack.service.find((s) => s.id === method)
  // Email only counts as service when there is an address to send it to.
  const without =
    method === 'email'
      ? t.tenantIds.flatMap((id) => {
          const u = users.find((x) => x.id === id)
          return u && !u.email ? [u.fullName.split(' ')[0]] : []
        })
      : []
  const address: Verdict = without.length ? { ok: false, reason: `There is no email address for service on file for ${without.join(' and ')}.`, fix: 'Choose another way to give the notice.' } : OK
  const draft = rentIncreaseNotice(
    pack,
    {
      landlord: me.fullName,
      tenants: t.tenantIds.map(nameOf),
      address: `${property.address.line1}, ${property.address.suburb}`,
    },
    { currentRent: t.weeklyRent, newRent, effectiveOn: effective, servedOn: day, method },
  )

  if (preview) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <Button
          intent="ghost"
          size="sm"
          className="justify-self-start"
          icon={<ArrowLeft className="size-4" />}
          onClick={() => setPreview(false)}
        >
          Back to the plan
        </Button>
        <NoticeDoc
          title={draft.title}
          body={draft.body}
          footer={`Prepared with Loop from rule pack ${pack.version}.`}
          fileName={`rent-increase-${day}.html`}
        />
        <Button
          intent="primary"
          size="lg"
          block
          onClick={() => {
            serveNotice(t.id, draft, { servedOn: day, method, receivedOn: plan.received, effectiveOn: effective }, pack)
            toast.success(method === 'email' ? 'Notice recorded as served by email' : 'Notice recorded as given', {
              description: `The rent becomes ${money(newRent)} a week on ${fmtDate(effective, { year: 'always' })}. A copy is in the property’s documents.`,
            })
            done()
          }}
        >
          {method === 'email' ? 'Serve it by email' : `Record it as given today — ${how?.label.toLowerCase()}`}
        </Button>
        {method === 'email' && (
          <p className="text-xs leading-relaxed text-ink-3">
            Email is simulated in this prototype. The notice is recorded with today’s date and shown to the tenant in Pool; nothing is actually sent.
          </p>
        )}
        {method !== 'email' && (
          <p className="text-xs text-ink-3">
            Loop cannot hand over or post a letter for you. Download the copy, deliver it today, and this record will
            match.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <Facts>
        <Fact label="Rent now">{money(t.weeklyRent)} a week</Fact>
        <Fact label={t.lastRentIncrease ? 'Last increased' : 'Tenancy began'}>
          {fmtDate(t.lastRentIncrease ?? t.startDate, { year: 'always', weekday: false })}
        </Fact>
        {suburb && (
          <Fact label={`Median, three-bedroom house in ${suburb.name}`}>
            {money(suburb.rent3)} a week
            <span className="block text-xs font-normal text-ink-3">
              Tenancy Services bond data, Apr–Sep 2026
              {property.beds !== 3 ? ` · this home has ${property.beds} bedrooms` : ''}
            </span>
          </Fact>
        )}
      </Facts>

      {plan.blocked ? (
        <Refusal verdict={plan.blocked} />
      ) : (
        <>
          <Field
            label="New weekly rent"
            error={
              tried && !valid ? `Enter a rent above the current ${money(t.weeklyRent)} to plan an increase.` : undefined
            }
          >
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                prefix="$"
                suffix="a week"
                value={rent}
                onChange={(e) => setRent(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder={String(t.weeklyRent + 20)}
              />
            )}
          </Field>

          {valid && (
            <section className="rounded-lg bg-sunken p-4">
              <h3 className="text-[13px] font-semibold text-ink">What an empty home would cost</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                A rise of <span className="num font-medium text-ink">{money(rise)}</span> a week (
                {((rise / t.weeklyRent) * 100).toFixed(1)}%) is{' '}
                <span className="num font-medium text-ink">{money(rise * 52)}</span> a year — if the tenant stays.
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface p-3">
                <span className="text-[13px] text-ink">If they leave and it sits empty for</span>
                <span className="flex items-center gap-1">
                  <Button
                    intent="secondary"
                    size="sm"
                    aria-label="One week fewer"
                    disabled={emptyWeeks <= 1}
                    onClick={() => setEmptyWeeks((n) => n - 1)}
                    icon={<Minus className="size-3.5" weight="bold" />}
                  />
                  <span aria-live="polite" className="num w-20 text-center text-[13px] font-semibold text-ink">
                    {emptyWeeks} {emptyWeeks === 1 ? 'week' : 'weeks'}
                  </span>
                  <Button
                    intent="secondary"
                    size="sm"
                    aria-label="One week more"
                    disabled={emptyWeeks >= 8}
                    onClick={() => setEmptyWeeks((n) => n + 1)}
                    icon={<Plus className="size-3.5" weight="bold" />}
                  />
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
                …that is <span className="num font-medium text-ink">{money(lost)}</span> of rent you do not collect. At
                the new rent it takes <span className="num font-semibold text-ink">{Math.ceil(lost / rise)} weeks</span>{' '}
                of the extra {money(rise)} to earn it back.
              </p>
              <p className="mt-2 text-xs text-ink-3">
                Arithmetic, not a forecast: it does not count advertising or your time, and it does not know whether
                your tenant would leave.
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-[13px] font-semibold text-ink">When it can start</h3>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Field label="How you will give the notice" hint={how?.plain}>
                {(p) => (
                  <Select {...p} value={method} onChange={(e) => setMethod(e.target.value as ServiceMethod['id'])}>
                    {pack.service.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="New rent starts on" hint={`Earliest: ${fmtDate(plan.earliest, { year: 'always' })}`}>
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    value={effective}
                    min={plan.earliest}
                    onChange={(e) => setStart(e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Working steps={plan.steps} />
            <Refusal verdict={verdict} className="mt-3" />
            <Refusal verdict={address} className="mt-3" />
          </section>

          <Button
            intent="primary"
            size="lg"
            block
            onClick={() => {
              setTried(true)
              if (valid && verdict.ok && address.ok) setPreview(true)
            }}
          >
            Read the notice before it goes
          </Button>
          {tried && valid && !verdict.ok && (
            <p className="-mt-3 text-xs text-danger-text">Choose a start date on or after the earliest date above.</p>
          )}
        </>
      )}
    </div>
  )
}
