/**
 * Who owns the homes, and how far Loop may go on its own. The two are one
 * question: an owner sets when a second person must approve a spend, and
 * autopilot is never allowed more than one owner could approve alone.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Buildings, Handshake, Minus, Plus, User, UsersThree, type Icon } from '@phosphor-icons/react'
import type { LegalEntity, Property } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { listOf, money } from '@/domain/rules/format'
import { useMe, useOrgId, useOrgRows, useStore } from '@/data/store'
import { usePack } from '@/data/hooks'
import { setAutopilotLimit, setDualApproval } from '@/data/ops-mutations'
import { Button } from '@/ui/Button'
import { Field, Input } from '@/ui/controls'
import { Callout, Empty, Money } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { Section, Truth } from './shared'

const KIND: Record<LegalEntity['type'], { label: string; icon: Icon; second: string | null }> = {
  individual: { label: 'One person', icon: User, second: null },
  partnership: { label: 'Partnership', icon: Handshake, second: 'partner' },
  family_trust: { label: 'Family trust', icon: UsersThree, second: 'trustee' },
  ltc_company: { label: 'Look-through company', icon: Buildings, second: 'director' },
}

/* ──────────────────────────────── the owners ────────────────────────────── */

function Threshold({ entity, second, approvers }: { entity: LegalEntity; second: string; approvers: string[] }) {
  const me = useMe()
  const saved = entity.dualApprovalThreshold === undefined ? '' : String(entity.dualApprovalThreshold)
  const [draft, setDraft] = useState(saved)
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const dirty = draft.trim() !== saved

  const save = () => {
    const amount = draft.trim() === '' ? undefined : Number(draft)
    const verdict = setDualApproval(entity.id, amount, me.fullName)
    setRefusal(verdict.ok ? null : verdict)
    if (verdict.ok) {
      toast.success(amount === undefined ? 'Second approval switched off' : `Second approval above ${money(amount)}`, {
        description:
          amount === undefined
            ? `One ${second} can now approve any amount for ${entity.name}.`
            : `A quote above that is flagged for a second ${second}.`,
      })
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <Field
        className="max-w-sm"
        label={`Ask a second ${second} above`}
        hint={`Leave it empty and one ${second} can approve any amount.`}
      >
        {(p) => (
          <Input
            {...p}
            inputMode="numeric"
            prefix="$"
            placeholder="No second approval"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.replace(/[^0-9]/g, ''))
              setRefusal(null)
            }}
          />
        )}
      </Field>
      {dirty && (
        <div className="mt-3 flex gap-2">
          <Button intent="primary" onClick={save}>
            Save
          </Button>
          <Button
            intent="ghost"
            onClick={() => {
              setDraft(saved)
              setRefusal(null)
            }}
          >
            Undo
          </Button>
        </div>
      )}
      {refusal && <Refusal verdict={refusal} className="mt-3" />}
      {entity.dualApprovalThreshold !== undefined &&
        (approvers.length > 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            The second approval is asked of {listOf(approvers)}.
          </p>
        ) : (
          <Callout tone="warn" className="mt-3">
            Nobody else has access to approve. Give a co-owner access under People, or the second approval has no one to
            go to.
          </Callout>
        ))}
    </div>
  )
}

export function OwnersSection() {
  const pack = usePack()
  const orgId = useOrgId()
  const entities = useOrgRows('entities')
  const properties = useOrgRows('properties')
  const users = useStore((s) => s.db.users)
  const approvers = users
    .filter((u) => u.orgId === orgId && u.role === 'co_owner' && u.status === 'active')
    .map((u) => u.fullName)
  const tax = pack.salesTax.name

  return (
    <Section
      id="owners"
      title="Who owns the homes"
      lede="Each home is held by a legal owner: a person, a trust, a partnership or a company. Where more than one person stands behind an owner, you can ask for a second approval on larger spends."
    >
      {entities.length === 0 ? (
        <div className="rounded-lg bg-surface shadow-card">
          <Empty
            icon={<UsersThree />}
            title="No owner is recorded yet"
            body="A legal owner is the person, trust or company on the title. One is recorded here when a home is added."
          />
        </div>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {entities.map((e) => {
            const kind = KIND[e.type]
            const KindIcon = kind.icon
            const homes = properties.filter((p) => p.entityId === e.id).map((p) => p.address.line1)
            return (
              <li key={e.id} className="rounded-lg bg-surface p-5 shadow-card">
                <div className="flex items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-sunken text-ink-2">
                    <KindIcon weight="fill" className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{e.name}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
                      {kind.label} · tax number <span className="num">{e.taxIdMasked}</span> ·{' '}
                      {e.gstRegistered ? `registered for ${tax}` : `not registered for ${tax}`}
                    </p>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                      {homes.length === 0 ? (
                        'Owns no homes yet.'
                      ) : (
                        <>
                          Owns <span className="text-ink">{listOf(homes)}</span>.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                {kind.second ? (
                  <Threshold
                    key={`${e.id}:${e.dualApprovalThreshold ?? ''}`}
                    entity={e}
                    second={kind.second}
                    approvers={approvers}
                  />
                ) : (
                  <p className="mt-4 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-2">
                    One owner, so nothing here needs a second approval.
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <Truth>
        A quote above the amount waits for two owners: the first yes is recorded and nobody is booked until a different
        owner approves. This prototype has no sign-in, so the second owner’s yes is given from the same screen, and the
        button says so.
      </Truth>
    </Section>
  )
}

/* ─────────────────────────────── autopilot limits ───────────────────────── */

const STEP = 50

function Limit({ property, entity }: { property: Property; entity: LegalEntity | undefined }) {
  const me = useMe()
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const limit = property.sinkingFund.autoApproveLimit

  const move = (by: number) => {
    if (limit + by < 0) {
      setRefusal({
        ok: false,
        reason: 'The limit is already zero.',
        fix: 'At zero, Loop asks you before every routine repair at this home.',
      })
      return
    }
    const verdict = setAutopilotLimit(property.id, limit + by, me.fullName)
    setRefusal(verdict.ok ? null : verdict)
  }

  return (
    <li className="grid grid-cols-[minmax(0,1fr)] items-center gap-x-6 gap-y-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
      <div className="min-w-0">
        <p className="truncate text-[14px] font-semibold text-ink">{property.address.line1}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
          {entity?.name ?? 'No owner recorded'} · sinking fund holds{' '}
          <span className="num text-ink-2">{money(property.sinkingFund.balance)}</span>
        </p>
      </div>
      <div
        role="group"
        aria-label={`What Loop may spend without asking at ${property.address.line1}`}
        className="flex items-center gap-2"
      >
        <Button size="icon" aria-label={`Lower by ${money(STEP)}`} onClick={() => move(-STEP)}>
          <Minus weight="bold" className="size-4" aria-hidden />
        </Button>
        <p className="w-28 text-center" aria-live="polite">
          <Money value={limit} className="text-[19px] font-semibold tracking-[-0.02em] text-ink" />
          <span className="block text-[11px] text-ink-3">{limit === 0 ? 'always asks first' : 'without asking'}</span>
        </p>
        <Button size="icon" aria-label={`Raise by ${money(STEP)}`} onClick={() => move(STEP)}>
          <Plus weight="bold" className="size-4" aria-hidden />
        </Button>
      </div>
      {refusal && <Refusal verdict={refusal} className="sm:col-span-2" />}
    </li>
  )
}

export function AutopilotSection() {
  const properties = useOrgRows('properties')
  const entities = useOrgRows('entities')
  return (
    <Section
      id="autopilot"
      title="What Loop may spend without asking"
      lede="An urgent repair is always sent straight away. A routine one is sent without asking only when its usual cost is inside the home’s limit; anything dearer waits for a quote and your yes."
    >
      {properties.length === 0 ? (
        <div className="rounded-lg bg-surface shadow-card">
          <Empty
            icon={<Buildings />}
            title="No homes yet"
            body="Each home gets its own limit for routine repairs. When a home is added, its limit appears here."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-lg bg-surface shadow-card">
          {properties.map((p) => (
            <Limit key={p.id} property={p} entity={entities.find((e) => e.id === p.entityId)} />
          ))}
        </ul>
      )}
      <Truth>
        These limits are yours to set, not law. A limit can never be higher than the amount that needs a second approval
        for that home’s owner.
      </Truth>
    </Section>
  )
}
