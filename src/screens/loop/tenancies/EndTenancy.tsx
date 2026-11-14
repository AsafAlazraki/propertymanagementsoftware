/**
 * Ending a periodic tenancy. The ground comes first because it sets the notice
 * period and what must be true; the date is then worked out, never typed.
 * A fixed term is a different decision and has its own sheet.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft } from '@phosphor-icons/react'
import type { ID } from '@/domain/types'
import type { RuleKey, ServiceMethod } from '@/domain/jurisdictions/types'
import { OK, type Verdict } from '@/domain/rules/core'
import { GROUND_LABEL, terminationNotice } from '@/domain/notices'
import { fmtDate } from '@/domain/rules/calendar'
import { planTermination, type EndGround } from '@/domain/rules/tenancy'
import { useMe, useStore } from '@/data/store'
import { calendarOf, useNameOf, usePack, useToday } from '@/data/hooks'
import { recordTermination, serveNotice } from '@/data/tenancy-mutations'
import { Button } from '@/ui/Button'
import { Checkbox, Field, Input, Select } from '@/ui/controls'
import { Callout } from '@/ui/display'
import { Refusal, Why, Working } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { NoticeDoc } from './NoticeDoc'

const GROUND_RULE = {
  no_cause: 'termination.landlord_periodic_notice',
  owner_occupy: 'termination.owner_occupy_notice',
  sale: 'termination.sale_notice',
  tenant: 'termination.tenant_periodic_notice',
} as const satisfies Record<EndGround, RuleKey>
const ORDER: EndGround[] = ['tenant', 'no_cause', 'owner_occupy', 'sale']

export function EndTenancy({ tenancyId, done }: { tenancyId: ID; done: () => void }) {
  const pack = usePack()
  const day = useToday()
  const me = useMe()
  const nameOf = useNameOf()
  const users = useStore((s) => s.db.users)
  const t = useStore((s) => s.db.tenancies.find((x) => x.id === tenancyId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === t?.propertyId))
  const [ground, setGround] = useState<EndGround | null>(null)
  const [method, setMethod] = useState<ServiceMethod['id']>('email')
  const [receivedOn, setReceivedOn] = useState(day)
  const [confirmed, setConfirmed] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [tried, setTried] = useState(false)
  if (!t || !property) return null

  const cal = calendarOf(pack, property)
  const first = nameOf(t.tenantIds[0]).split(' ')[0]
  const plan = ground
    ? planTermination(
        pack,
        cal,
        t,
        ground,
        ground === 'tenant'
          ? { sentOn: receivedOn, method: 'hand' }
          : { sentOn: day, method, hour: new Date().getHours() },
      )
    : null
  const how = pack.service.find((s) => s.id === method)
  // Email only counts as service when there is an address to send it to.
  const without =
    ground !== 'tenant' && method === 'email'
      ? t.tenantIds.flatMap((id) => {
          const u = users.find((x) => x.id === id)
          return u && !u.email ? [u.fullName.split(' ')[0]] : []
        })
      : []
  const address: Verdict = without.length ? { ok: false, reason: `There is no email address for service on file for ${without.join(' and ')}.`, fix: 'Choose another way to give the notice.' } : OK
  const facts = plan ? plan.conditions.filter((c) => !/notice states/i.test(c)) : []
  const allTrue = facts.every((c) => confirmed.includes(c))
  const draft =
    ground && ground !== 'tenant' && plan
      ? terminationNotice(
          pack,
          {
            landlord: me.fullName,
            tenants: t.tenantIds.map(nameOf),
            address: `${property.address.line1}, ${property.address.suburb}`,
          },
          { ground, plan, servedOn: day, method },
        )
      : null

  if (preview && draft && plan && ground) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <Button
          intent="ghost"
          size="sm"
          className="justify-self-start"
          icon={<ArrowLeft className="size-4" />}
          onClick={() => setPreview(false)}
        >
          Back
        </Button>
        <NoticeDoc
          title={draft.title}
          body={draft.body}
          footer={`Prepared with Loop from rule pack ${pack.version}.`}
          fileName={`notice-to-end-tenancy-${day}.html`}
        />
        <Button
          intent="danger"
          size="lg"
          block
          onClick={() => {
            serveNotice(
              t.id,
              draft,
              { servedOn: day, method, receivedOn: plan.received, effectiveOn: plan.endsOn },
              pack,
            )
            recordTermination(t.id, 'landlord', GROUND_LABEL[ground], plan.endsOn, plan.received)
            toast.success(method === 'email' ? 'Notice recorded as served by email' : 'Notice recorded as given', {
              description: `The tenancy ends on ${fmtDate(plan.endsOn, { year: 'always' })}. ${first} can see the notice in Pool.`,
            })
            done()
          }}
        >
          {method === 'email' ? 'Serve this notice by email' : `Record it as given today — ${how?.label.toLowerCase()}`}
        </Button>
        <p className="text-xs leading-relaxed text-ink-3">
          Once served, a notice can only be withdrawn if {first} agrees.
          {method === 'email' && ' Email is simulated in this prototype: the notice is recorded with today’s date and shown to the tenant in Pool; nothing is actually sent.'}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div role="radiogroup" aria-label="Why the tenancy is ending" className="grid gap-2">
        {ORDER.map((g) => {
          const rule = pack.rules[GROUND_RULE[g]].value
          const on = ground === g
          return (
            <button
              key={g}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setGround(g)
                setConfirmed([])
                setTried(false)
              }}
              className={cn(
                'pressable flex items-start gap-3 rounded-lg p-3.5 text-left transition-shadow',
                on ? 'bg-accent-soft shadow-[inset_0_0_0_2px_var(--accent)]' : 'bg-surface shadow-card',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full',
                  on ? 'bg-accent' : 'shadow-[inset_0_0_0_1.5px_var(--line-strong)]',
                )}
              >
                {on && <span className="size-1.5 rounded-full bg-accent-ink" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink">{GROUND_LABEL[g]}</span>
                <span className="mt-0.5 block text-[13px] text-ink-2">
                  {rule
                    ? `${rule.n} days of notice${g === 'tenant' ? ' from them' : ' from you'}`
                    : 'Not available here'}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {plan && ground && (
        <>
          {plan.blocked ? (
            <Refusal verdict={plan.blocked} />
          ) : (
            <>
              {ground === 'tenant' ? (
                <Field
                  label={`When did you receive ${first}’s notice?`}
                  hint="In writing, with the date they intend to leave. The period runs from the day after you received it."
                >
                  {(p) => (
                    <Input
                      {...p}
                      type="date"
                      value={receivedOn}
                      max={day}
                      onChange={(e) => e.target.value && setReceivedOn(e.target.value)}
                    />
                  )}
                </Field>
              ) : (
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
              )}

              <section>
                <h3 className="mb-3 text-[13px] font-semibold text-ink">The date, worked out</h3>
                <Working steps={plan.steps} />
                <Refusal verdict={address} className="mt-3" />
              </section>

              {facts.length > 0 && (
                <section className="rounded-lg bg-sunken p-4">
                  <h3 className="text-[13px] font-semibold text-ink">Each of these has to be true</h3>
                  <p className="mt-1 mb-3 text-xs leading-relaxed text-ink-2">
                    Loop writes the reason into the notice for you. Tick each one only if it is true.
                  </p>
                  <div className="grid gap-2.5">
                    {facts.map((c) => (
                      <Checkbox
                        key={c}
                        checked={confirmed.includes(c)}
                        onCheckedChange={(v) =>
                          setConfirmed((list) => (v ? [...list, c] : list.filter((x) => x !== c)))
                        }
                      >
                        {c}
                      </Checkbox>
                    ))}
                  </div>
                  {tried && !allTrue && (
                    <p role="alert" className="mt-3 text-[13px] font-medium text-danger-text">
                      Confirm each one, or choose a different reason. Loop will not prepare a notice on a ground you
                      have not confirmed.
                    </p>
                  )}
                </section>
              )}

              {ground === 'tenant' ? (
                <Button
                  intent="primary"
                  size="lg"
                  block
                  onClick={() => {
                    recordTermination(t.id, 'tenant', GROUND_LABEL.tenant, plan.endsOn, plan.received)
                    toast.success('Notice recorded', {
                      description: `The tenancy ends on ${fmtDate(plan.endsOn, { year: 'always' })}. The final inspection and bond refund come next.`,
                    })
                    done()
                  }}
                >
                  Record it — ends {fmtDate(plan.endsOn, { year: 'always' })}
                </Button>
              ) : (
                <Button
                  intent="primary"
                  size="lg"
                  block
                  onClick={() => {
                    setTried(true)
                    if (allTrue && address.ok) setPreview(true)
                  }}
                >
                  Read the notice before it goes
                </Button>
              )}
            </>
          )}
        </>
      )}

      {!ground && (
        <Callout tone="neutral" title="Not sure it should end?">
          A problem with rent is usually dealt with by a notice to put it right first, not by ending the tenancy.
          <span className="mt-2 block">
            <Why rule="arrears.remedy_notice" />
          </span>
        </Callout>
      )}
    </div>
  )
}
