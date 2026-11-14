/**
 * Booking a viewing, a condition report or Tribunal representation: which
 * home, when, who goes, and what it costs — with the one thing only the
 * landlord can know (that the tenants agreed to a viewing) asked plainly.
 */
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { Star } from '@phosphor-icons/react'
import type { FieldTask } from '@/domain/types'
import { providersFor, serviceOf, shortName } from '@/domain/fieldServices'
import { addDays, fmtDate } from '@/domain/rules/calendar'
import { listOf, money } from '@/domain/rules/format'
import { useOrgId, useOrgRows, useStore } from '@/data/store'
import { activeTenancy, useNameOf, usePack, useToday } from '@/data/hooks'
import { FIELD_PRICES, PLATFORM_FEE_PCT } from '@/data/mutations'
import { bookFieldTask, checkFieldBooking, hueFor } from '@/data/ops-mutations'
import { Button } from '@/ui/Button'
import { Checkbox, Field, Input, Select } from '@/ui/controls'
import { Avatar, Callout } from '@/ui/display'
import { Refusal, Why } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'

export type BookableTask = Exclude<FieldTask['type'], 'routine_inspection'>

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const hourLabel = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'pm' : 'am'}`

function Form({ type, onDone }: { type: BookableTask; onDone: () => void }) {
  const pack = usePack()
  const day = useToday()
  const orgId = useOrgId()
  const nameOf = useNameOf()
  const properties = useOrgRows('properties')
  const tenancies = useOrgRows('tenancies')
  const allProviders = useStore((s) => s.db.providers)
  const whoId = useId()

  const service = serviceOf(type)
  const people = providersFor(type, allProviders)
  const price = FIELD_PRICES[type]
  const fee = Math.round((price * PLATFORM_FEE_PCT) / 100)
  const tomorrow = addDays(day, 1)

  const [propertyId, setPropertyId] = useState(properties.length === 1 ? properties[0].id : '')
  const [date, setDate] = useState('')
  const [hour, setHour] = useState(type === 'viewing' ? 17 : 10)
  const [picked, setPicked] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [tried, setTried] = useState(false)

  const providerId = picked || people[0]?.id || ''
  const provider = people.find((p) => p.id === providerId)
  const tenancy = activeTenancy(tenancies, propertyId)
  const tenants = tenancy ? listOf(tenancy.tenantIds.map((id) => nameOf(id).split(' ')[0])) : ''
  const needsConsent = type === 'viewing' && Boolean(tenancy)
  const consentNote = pack.rules['entry.repairs_notice_min'].notes
  const verdict = checkFieldBooking({ type, propertyId, providerId, date, hour, tenantsAgreed: agreed })
  const failed = tried && !verdict.ok ? verdict : undefined

  const submit = () => {
    setTried(true)
    const result = bookFieldTask(orgId, { type, propertyId, providerId, date, hour, tenantsAgreed: agreed })
    if (!result.ok) return
    toast.success(`${service.name} booked`, {
      description: `${provider?.name ?? 'Someone local'}, ${fmtDate(date)} at ${hourLabel(hour)}. Nothing was charged: payments are simulated.`,
    })
    onDone()
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <p className="text-[14px] leading-relaxed text-ink-2">
        {service.what} {service.result}
      </p>

      <Field
        label="Which home?"
        hint={
          propertyId
            ? tenancy
              ? `${tenants} ${tenancy.tenantIds.length === 1 ? 'lives' : 'live'} here.`
              : 'Nobody lives here at the moment.'
            : undefined
        }
        error={failed?.field === 'property' ? failed.reason : undefined}
      >
        {(p) => (
          <Select {...p} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">Choose a home…</option>
            {properties.map((x) => (
              <option key={x.id} value={x.id}>
                {x.address.line1}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {needsConsent && (
        <div className="grid gap-3">
          {consentNote && (
            <Callout
              tone="info"
              title="A viewing is not like a repair"
              action={<Why rule="entry.repairs_notice_min" label="Where this comes from" />}
            >
              {consentNote}
            </Callout>
          )}
          <Checkbox checked={agreed} onCheckedChange={setAgreed}>
            {tenants || 'The tenants'} {tenancy && tenancy.tenantIds.length === 1 ? 'has' : 'have'} agreed to this
            viewing, at this time
          </Checkbox>
          {failed?.field === 'consent' && <Refusal verdict={failed} />}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <Field
          label={type === 'tribunal_representation' ? 'Hearing day' : 'Day'}
          error={failed?.field === 'date' ? `${failed.reason} ${failed.fix ?? ''}` : undefined}
        >
          {(p) => <Input {...p} type="date" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label={type === 'tribunal_representation' ? 'Hearing time' : 'Time'}>
          {(p) => (
            <Select {...p} value={String(hour)} onChange={(e) => setHour(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {hourLabel(h)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div>
        <p id={whoId} className="mb-2 text-[13px] font-medium text-ink">
          Who goes
        </p>
        {people.length === 0 ? (
          <Refusal
            verdict={{
              ok: false,
              reason: `Nobody vetted for this is in the network right now, so a ${service.name.toLowerCase()} cannot be booked.`,
              fix: 'The Loop team adds people once their checks are finished.',
            }}
          />
        ) : (
          <RadioGroup
            aria-labelledby={whoId}
            value={providerId}
            onValueChange={(v) => setPicked(String(v))}
            className="grid gap-2"
          >
            {people.map((p) => (
              <Radio.Root
                key={p.id}
                value={p.id}
                className="pressable flex cursor-pointer items-center gap-3 rounded-lg bg-surface p-3.5 text-left shadow-card transition-[background-color,box-shadow] duration-150 data-checked:bg-accent-soft data-checked:shadow-[inset_0_0_0_2px_var(--accent)]"
              >
                <Avatar name={p.name} hue={hueFor(p.name)} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{p.name}</span>
                  <span className="block truncate text-xs text-ink-2">
                    {p.trade} · {p.region}
                  </span>
                </span>
                {p.jobs > 0 && (
                  <span className="num flex shrink-0 items-center gap-1 text-[13px] font-medium text-ink">
                    <Star weight="fill" className="size-3.5 text-warn" aria-hidden />
                    {p.rating.toFixed(1)}
                    <span className="sr-only"> out of 5, from {p.jobs} jobs</span>
                  </span>
                )}
              </Radio.Root>
            ))}
          </RadioGroup>
        )}
        {failed?.field === 'provider' && people.length > 0 && <Refusal verdict={failed} className="mt-2" />}
      </div>

      <div className="rounded-lg bg-sunken p-4">
        <dl className="grid gap-1.5 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-ink">{service.name}, fixed price</dt>
            <dd className="num font-semibold text-ink">{money(price)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">Goes to {provider?.name ?? 'the person who does it'}</dt>
            <dd className="num text-ink-2">{money(price - fee)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">Loop keeps {PLATFORM_FEE_PCT}%</dt>
            <dd className="num text-ink-2">{money(fee)}</dd>
          </div>
        </dl>
        <p className="mt-2.5 text-xs leading-relaxed text-ink-3">
          Payment is simulated in this prototype: no card is charged, and nobody is really sent.
        </p>
      </div>

      {people.length > 0 && (
        <Button intent="primary" size="lg" block onClick={submit}>
          Book {provider ? shortName(provider) : 'it'} for {money(price)}
        </Button>
      )}
    </div>
  )
}

export function BookTaskSheet({ type, onClose }: { type: BookableTask | null; onClose: () => void }) {
  return (
    <Sheet
      open={type !== null}
      onOpenChange={(o) => !o && onClose()}
      eyebrow="Book someone local"
      title={type ? serviceOf(type).name : ''}
    >
      {type && <Form key={type} type={type} onDone={onClose} />}
    </Sheet>
  )
}
