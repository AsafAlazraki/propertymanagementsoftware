/**
 * Changes to an agreement. Requests from tenants wait here with their
 * deadline; a clause the landlord wants to add is read by the scanner before
 * it can be sent, because a term that takes away a tenant's rights is of no
 * effect however it is worded.
 */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowRight,
  PawPrint,
  PencilSimpleLine,
  ProhibitInset,
  Signature,
  UsersThree,
  WarningDiamond,
} from '@phosphor-icons/react'
import type { Variation } from '@/domain/types'
import { dateOf, diffDays, fmtDate, fmtRelative } from '@/domain/rules/calendar'
import { scanClause } from '@/domain/rules/text'
import { useMe, useOrgRows } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { proposeClause, withdrawVariation } from '@/data/tenancy-mutations'
import { Badge, type Tone } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Field, Select, Textarea } from '@/ui/controls'
import { Empty } from '@/ui/display'
import { Refusal, Why } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { PetDecision } from '../decisions/tenancy'

const KIND: Record<Variation['type'], { label: string; Icon: typeof PawPrint }> = {
  pet_request: { label: 'Pet request', Icon: PawPrint },
  flatmate_change: { label: 'Change of tenant', Icon: UsersThree },
  term_extension: { label: 'New fixed term', Icon: Signature },
  custom_clause: { label: 'New clause', Icon: PencilSimpleLine },
  minor_change: { label: 'Minor change to the home', Icon: PencilSimpleLine },
}

const STATUS: Record<Variation['status'], { text: string; tone: Tone }> = {
  requested: { text: 'Requested', tone: 'info' },
  awaiting_landlord: { text: 'Waiting for you', tone: 'accent' },
  awaiting_tenant: { text: 'With the tenant to sign', tone: 'info' },
  signed: { text: 'Signed by both', tone: 'ok' },
  declined: { text: 'Declined', tone: 'neutral' },
  withdrawn: { text: 'Withdrawn', tone: 'neutral' },
}

function ClauseChecker() {
  const pack = usePack()
  const me = useMe()
  const tenancies = useOrgRows('tenancies')
  const properties = useOrgRows('properties')
  const live = tenancies.filter((t) => t.status === 'active' || t.status === 'notice_given')
  const [tenancyId, setTenancyId] = useState('')
  const [text, setText] = useState('')
  const [tried, setTried] = useState(false)
  const findings = useMemo(() => (text.trim().length > 8 ? scanClause(pack, text) : []), [pack, text])
  const blocked = findings.filter((f) => f.severity === 'block')
  const clean = text.trim().length > 8 && findings.length === 0

  return (
    <section className="rounded-lg bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">Add a clause</h2>
        <Why rule="contract.contracting_out_void" />
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
        Write it the way you would say it. Loop reads it against the Act as you type and tells you what a lawful version
        would say.
      </p>

      <div className="mt-4 grid gap-4">
        <Field label="Which tenancy?" error={tried && !tenancyId ? 'Choose the tenancy the clause is for.' : undefined}>
          {(p) => (
            <Select {...p} value={tenancyId} onChange={(e) => setTenancyId(e.target.value)}>
              <option value="">Choose…</option>
              {live.map((t) => (
                <option key={t.id} value={t.id}>
                  {properties.find((x) => x.id === t.propertyId)?.address.line1}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="The clause" error={tried && text.trim().length <= 8 ? 'Write the clause first.' : undefined}>
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="For example: The tenant must have the carpets professionally cleaned when they leave."
            />
          )}
        </Field>

        <div aria-live="polite" className="grid gap-2.5">
          {findings.map((f) => (
            <div
              key={f.id}
              className={f.severity === 'block' ? 'rounded-md bg-danger-soft p-3.5' : 'rounded-md bg-warn-soft p-3.5'}
            >
              <p
                className={`flex items-start gap-2 text-[13px] font-semibold ${f.severity === 'block' ? 'text-danger-text' : 'text-warn-text'}`}
              >
                {f.severity === 'block' ? (
                  <ProhibitInset weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
                ) : (
                  <WarningDiamond weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
                )}
                {f.title}
              </p>
              <p className="mt-1 pl-6 text-[13px] leading-relaxed text-ink">{f.why}</p>
              <p className="mt-2 pl-6 text-[13px] leading-relaxed text-ink">
                <span className="font-medium">Instead:</span> {f.instead}
              </p>
              <p className="mt-1.5 pl-6 font-mono text-[11px] text-ink-2">
                “{f.match}” · {f.citation}
              </p>
            </div>
          ))}
          {clean && (
            <p className="rounded-md bg-ok-soft p-3 text-[13px] text-ok-text">
              Nothing in this matches the terms the scanner knows are of no effect. It checks for known problems; it is
              not a lawyer’s review.
            </p>
          )}
        </div>

        {tried && blocked.length > 0 && (
          <Refusal
            verdict={{
              ok: false,
              reason: 'This clause cannot be sent as written.',
              fix: 'Rewrite the part marked above. A term that takes away a right the Act gives is of no effect even if the tenant signs it.',
              rule: 'contract.contracting_out_void',
            }}
          />
        )}

        <Button
          intent="primary"
          className="justify-self-start"
          trailing={<ArrowRight className="size-4" />}
          onClick={() => {
            setTried(true)
            if (!tenancyId || text.trim().length <= 8 || blocked.length > 0) return
            proposeClause(tenancyId, text, findings, me.fullName)
            toast.success('Sent to the tenant to sign', {
              description: 'It becomes part of the agreement only when they sign it too.',
            })
            setText('')
            setTried(false)
          }}
        >
          Send it to the tenant to sign
        </Button>
      </div>
    </section>
  )
}

export function Changes() {
  const day = useToday()
  const variations = useOrgRows('variations')
  const tenancies = useOrgRows('tenancies')
  const properties = useOrgRows('properties')
  const [pet, setPet] = useState<string | null>(null)
  const rows = useMemo(
    () =>
      [...variations].sort(
        (a, b) =>
          Number(b.status === 'awaiting_landlord') - Number(a.status === 'awaiting_landlord') ||
          b.requestedAt.localeCompare(a.requestedAt),
      ),
    [variations],
  )
  const addressOf = (v: Variation) =>
    properties.find((p) => p.id === tenancies.find((t) => t.id === v.tenancyId)?.propertyId)?.address.line1 ?? ''

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
      <section className="min-w-0">
        {rows.length === 0 ? (
          <div className="rounded-lg bg-surface shadow-card">
            <Empty
              icon={<Signature />}
              title="No changes asked for"
              body="A request for a pet, a new flatmate or a new term arrives here with the date you must answer by. Anything agreed is signed by both of you and kept with the agreement."
            />
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {rows.map((v) => {
              const k = KIND[v.type]
              const s = STATUS[v.status]
              const left = v.respondBy && v.status === 'awaiting_landlord' ? diffDays(day, v.respondBy) : null
              return (
                <li
                  key={v.id}
                  className="flex flex-wrap items-start gap-x-4 gap-y-3 rounded-lg bg-surface p-4 shadow-card"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
                    <k.Icon weight="fill" className="size-[18px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-xs text-ink-3">
                      {k.label} · {addressOf(v)}
                    </p>
                    <p className="mt-0.5 text-[14px] font-semibold text-ink">{v.summary}</p>
                    <p className="mt-1 text-xs text-ink-3">
                      Asked by {v.requestedBy === 'tenant' ? 'the tenant' : 'you'}{' '}
                      {fmtRelative(dateOf(v.requestedAt), day)}
                      {v.signatures.length > 0 &&
                        ` · signed by ${v.signatures.map((x) => x.name.split(' ')[0]).join(' and ')}`}
                    </p>
                    {left !== null && v.respondBy && (
                      <p className={`mt-1.5 text-[13px] font-medium ${left <= 5 ? 'text-warn-text' : 'text-ink-2'}`}>
                        Answer in writing by {fmtDate(v.respondBy)} — {left} {left === 1 ? 'day' : 'days'} left
                      </p>
                    )}
                    {v.declineGround && (
                      <p className="mt-1.5 text-[13px] text-ink-2">Ground given: {v.declineGround}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge tone={s.tone}>{s.text}</Badge>
                    {v.type === 'pet_request' && v.status === 'awaiting_landlord' && (
                      <Button size="sm" intent="primary" onClick={() => setPet(v.id)}>
                        Answer it
                      </Button>
                    )}
                    {v.requestedBy === 'landlord' && v.status === 'awaiting_tenant' && (
                      <Button
                        size="sm"
                        intent="ghost"
                        onClick={() => {
                          withdrawVariation(v.id)
                          toast('Withdrawn', { description: 'The tenant no longer has anything to sign.' })
                        }}
                      >
                        Withdraw
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ClauseChecker />

      <Sheet
        open={pet !== null}
        onOpenChange={(o) => !o && setPet(null)}
        eyebrow="Pet request"
        title="Answer the pet request"
      >
        {pet && <PetDecision variationId={pet} done={() => setPet(null)} />}
      </Sheet>
    </div>
  )
}
