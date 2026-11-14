/**
 * The plan: what it is, how this month's price is worked out from the number
 * of homes, and what the other plans would cost for the same portfolio.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle } from '@phosphor-icons/react'
import type { PlanTier } from '@/domain/types'
import { PLAN, planMonthly } from '@/domain/finance'
import { money, plural } from '@/domain/rules/format'
import { useMe, useOrgId, useOrgRows, useStore } from '@/data/store'
import { checkPlan, choosePlan } from '@/data/ops-mutations'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Money } from '@/ui/display'
import { Modal } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { Section } from './shared'

const TIERS: PlanTier[] = ['ledger_free', 'autopilot_pro', 'portfolio_trust']

export function PlanSection() {
  const me = useMe()
  const orgId = useOrgId()
  const org = useStore((s) => s.db.orgs.find((o) => o.id === orgId))
  const homes = useOrgRows('properties').length
  const [switching, setSwitching] = useState<PlanTier | null>(null)
  if (!org) return null

  const plan = PLAN[org.plan]
  const extra = Math.max(0, homes - plan.includes)
  const monthly = planMonthly(org.plan, homes)
  const target = switching ? PLAN[switching] : undefined

  return (
    <Section
      id="plan"
      title="Plan and price"
      lede="One flat price a month, worked out from how many homes you have. No percentage of the rent."
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-5 rounded-lg bg-surface p-5 shadow-card md:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <p className="eyebrow">Your plan</p>
          <p className="display mt-1 text-[26px] text-ink">{plan.name}</p>
          <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-ink-2">{plan.blurb}</p>
          <div className="mt-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <Badge tone="warn" dot>
              Billing is simulated
            </Badge>
            <span className="text-xs text-ink-3">No card is on file and nothing is charged in this prototype.</span>
          </div>
        </div>
        <dl className="grid content-start gap-2 rounded-md bg-sunken p-4 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">
              {plan.name}, covers {plural(plan.includes, 'home')}
            </dt>
            <dd className="num text-ink">{money(plan.price)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-2">
              {extra === 0
                ? `No extra homes: you have ${homes}`
                : `${plural(extra, 'extra home')} at ${money(plan.extraProperty)} each`}
            </dt>
            <dd className="num text-ink">{money(extra * plan.extraProperty)}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-2.5">
            <dt className="font-semibold text-ink">Each month</dt>
            <dd>
              <Money value={monthly} className="text-[20px] font-semibold tracking-[-0.02em] text-ink" />
            </dd>
          </div>
        </dl>
      </div>

      <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-3">
        {TIERS.map((tier) => {
          const p = PLAN[tier]
          const current = tier === org.plan
          const fits = checkPlan(tier, homes)
          return (
            <li
              key={tier}
              className={cn(
                'flex min-w-0 flex-col rounded-lg p-4',
                current ? 'bg-accent-soft' : 'bg-surface shadow-card',
              )}
            >
              <p className="text-[14px] font-semibold text-ink">{p.name}</p>
              <p className="mt-1 text-ink-2">
                <Money
                  value={fits.ok ? planMonthly(tier, homes) : p.price}
                  className="text-[22px] font-semibold tracking-[-0.02em] text-ink"
                />{' '}
                <span className="text-xs">
                  {fits.ok ? `a month for your ${plural(homes, 'home')}` : `a month for ${plural(p.includes, 'home')}`}
                </span>
              </p>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-2">{p.blurb}</p>
              <div className="mt-3.5">
                {current ? (
                  <p className="flex min-h-10 items-center gap-1.5 text-[13px] font-medium text-accent-text">
                    <CheckCircle weight="fill" className="size-4" aria-hidden />
                    This is your plan
                  </p>
                ) : fits.ok ? (
                  <Button intent="secondary" onClick={() => setSwitching(tier)}>
                    Switch to this
                  </Button>
                ) : (
                  <p className="rounded-md bg-sunken px-3 py-2 text-[13px] leading-relaxed text-ink-2">
                    {fits.reason} It cannot be chosen for this portfolio.
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <Modal
        open={switching !== null}
        onOpenChange={(o) => !o && setSwitching(null)}
        size="sm"
        title={target ? `Switch to ${target.name}?` : 'Switch plan?'}
        description={
          switching
            ? `Your ${plural(homes, 'home')} would cost ${money(planMonthly(switching, homes))} a month instead of ${money(monthly)}. Billing is simulated: nothing is charged either way.`
            : undefined
        }
        footer={
          <>
            <Button intent="ghost" onClick={() => setSwitching(null)}>
              Stay on {plan.name}
            </Button>
            <Button
              intent="primary"
              onClick={() => {
                if (!switching) return
                const verdict = choosePlan(orgId, switching, me.fullName)
                if (verdict.ok)
                  toast.success(`You are on ${PLAN[switching].name}`, {
                    description: 'Billing is simulated: nothing was charged.',
                  })
                else toast.error(verdict.reason ?? 'That plan could not be chosen', { description: verdict.fix })
                setSwitching(null)
              }}
            >
              Switch
            </Button>
          </>
        }
      >
        {org.plan === 'portfolio_trust' && (
          <p className="text-[13px] leading-relaxed text-ink-2">
            {plan.name} is the plan described as: {plan.blurb.charAt(0).toLowerCase() + plan.blurb.slice(1)} This
            prototype does not switch any of that off when you leave it, so the rest of Settings will look the same.
          </p>
        )}
      </Modal>
    </Section>
  )
}
