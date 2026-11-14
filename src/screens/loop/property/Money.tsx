/**
 * One property's money: what it earns and costs, and whether the sinking fund
 * will be there when the hot water cylinder is not. The forecast is the part a
 * first-time landlord has never seen — the year the fund runs short, in time
 * to do something about it.
 */
import { useMemo } from 'react'
import { Minus, Plus, WarningCircle } from '@phosphor-icons/react'
import type { Property, Tenancy } from '@/domain/types'
import { assetOutlook, forecastFund, recommendedSkimPct, type PropertyFinance } from '@/domain/finance'
import { money } from '@/domain/rules/format'
import { setSinkingFund } from '@/data/mutations'
import { Button } from '@/ui/Button'
import { Columns } from '@/ui/charts'
import { Callout, Fact, Facts, Money as Cash, Num } from '@/ui/display'
import { cn } from '@/ui/cn'

const OUTLOOK = {
  healthy: { word: 'Years of life left', bar: 'bg-ok', text: 'text-ink-2' },
  plan: { word: 'Plan for it', bar: 'bg-accent', text: 'text-ink-2' },
  soon: { word: 'Due soon', bar: 'bg-warn', text: 'text-warn-text' },
  overdue: { word: 'Past its expected life', bar: 'bg-danger', text: 'text-danger-text' },
} as const

function Stepper({ label, value, unit, step, min, max, onChange }: { label: string; value: number; unit: 'pct' | 'money'; step: number; min: number; max: number; onChange: (v: number) => void }) {
  const shown = unit === 'pct' ? `${value}%` : money(value)
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-2">{label}</span>
      <span className="flex items-center gap-1">
        <Button size="iconSm" intent="secondary" aria-label={`Lower ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
          <Minus weight="bold" className="size-3.5" />
        </Button>
        <span className="num w-16 text-center text-[15px] font-semibold text-ink" aria-live="polite">
          {shown}
        </span>
        <Button size="iconSm" intent="secondary" aria-label={`Raise ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
          <Plus weight="bold" className="size-3.5" />
        </Button>
      </span>
    </div>
  )
}

export function PropertyMoney({ property, tenancy, finance }: { property: Property; tenancy: Tenancy | undefined; finance: PropertyFinance }) {
  const year = new Date().getFullYear()
  // A vacant home is forecast at its advertised rent, so the fund's future is still visible.
  const rent = tenancy?.weeklyRent ?? property.listing?.advertisedWeeklyRent ?? 0
  const forecast = useMemo(() => forecastFund(property, rent, year), [property, rent, year])
  const recommended = useMemo(() => recommendedSkimPct(property, rent, year), [property, rent, year])
  const shortYear = forecast.find((y) => y.balance < 0)
  const outlooks = useMemo(() => property.assets.map((a) => assetOutlook(a, year)).sort((a, b) => a.yearsLeft - b.yearsLeft), [property.assets, year])
  const weeklySkim = (rent * property.sinkingFund.ratePct) / 100

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 gap-6">
        <section className="rounded-lg bg-surface p-5 shadow-card">
          <Columns
            title="Sinking fund, year by year"
            subtitle={
              shortYear
                ? `At ${property.sinkingFund.ratePct}% of rent the fund runs short in ${shortYear.year}, when ${shortYear.items.join(' and ').toLowerCase()} fall due.`
                : `At ${property.sinkingFund.ratePct}% of rent the fund covers every replacement due in the next ten years.`
            }
            data={forecast.map((y) => ({ label: String(y.year), balance: y.balance }))}
            series={[{ key: 'balance', label: 'Balance at year end', color: 'var(--accent)' }]}
            format={(n) => money(n)}
            height={230}
          />
          {shortYear && (
            <Callout tone="warn" icon={<WarningCircle weight="fill" />} className="mt-4" title={`${shortYear.year} is ${money(-shortYear.balance)} short`}>
              {recommended !== null && recommended > property.sinkingFund.ratePct ? (
                <>
                  Setting aside <span className="num font-semibold">{recommended}%</span> of rent instead of {property.sinkingFund.ratePct}% — about <span className="num font-semibold">{money(((rent * recommended) / 100) * 52 - weeklySkim * 52)}</span> more a year — keeps the fund above zero for the whole ten years.
                  <div className="mt-2">
                    <Button size="sm" intent="secondary" onClick={() => setSinkingFund(property.id, { ratePct: recommended })}>
                      Set it to {recommended}%
                    </Button>
                  </div>
                </>
              ) : (
                'No skim rate up to 25% of rent covers it on its own. This one needs savings set aside outside the fund, or the work staged over two years.'
              )}
            </Callout>
          )}
        </section>

        <section aria-labelledby="assets-title">
          <p className="eyebrow">What will need replacing</p>
          <h2 id="assets-title" className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">
            The big-ticket items, by how soon
          </h2>
          {outlooks.length === 0 ? (
            <p className="rounded-lg bg-surface p-5 text-[13px] text-ink-2 shadow-card">No assets recorded for this property yet. Add the hot water cylinder, heat pump, roof and floor coverings, with the year each was installed, and the forecast above fills in.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
              {outlooks.map((o) => {
                const s = OUTLOOK[o.status]
                return (
                  <li key={o.asset.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-line px-4 py-3.5 last:border-b-0">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-ink">{o.asset.label}</p>
                      <p className={cn('text-xs', s.text)}>
                        Installed <span className="num">{o.asset.installedYear}</span> · {o.yearsLeft < 0 ? `${-o.yearsLeft} ${o.yearsLeft === -1 ? 'year' : 'years'} past a typical ${o.asset.lifespanYears}-year life` : o.yearsLeft === 0 ? 'due this year' : `about ${o.yearsLeft} ${o.yearsLeft === 1 ? 'year' : 'years'} left`}
                      </p>
                    </div>
                    <p className="num text-right text-[14px] font-semibold text-ink">{money(o.asset.replaceCost)}</p>
                    <div aria-hidden className="col-span-2 h-1.5 overflow-hidden rounded-full bg-sunken">
                      <div className={cn('h-full rounded-full', s.bar)} style={{ width: `${Math.min(100, Math.max(4, o.lifeUsed * 100))}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-2 text-xs leading-relaxed text-ink-3">Lifespans and costs are typical New Zealand figures, not quotes. An asset past its expected life has not failed — it has simply stopped being a surprise.</p>
        </section>
      </div>

      <aside className="grid gap-4 xl:sticky xl:top-6">
        <section className="rounded-lg bg-surface p-5 shadow-card">
          <p className="eyebrow">Sinking fund</p>
          <Cash value={property.sinkingFund.balance} className="display mt-1 block text-[34px] leading-none text-ink" />
          <p className="mt-1.5 text-xs text-ink-3">
            {rent > 0 ? (
              <>
                Growing by about <span className="num">{money(weeklySkim, { cents: true })}</span> a week from rent. It stays in your own account — Loop only keeps count.
              </>
            ) : (
              'Not growing while the home is vacant.'
            )}
          </p>
          <div className="mt-4 grid gap-3 border-t border-line pt-4">
            <Stepper label="Set aside from rent" value={property.sinkingFund.ratePct} unit="pct" step={1} min={0} max={25} onChange={(v) => setSinkingFund(property.id, { ratePct: v })} />
            <Stepper label="Approve repairs without asking, up to" value={property.sinkingFund.autoApproveLimit} unit="money" step={50} min={0} max={2000} onChange={(v) => setSinkingFund(property.id, { autoApproveLimit: v })} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-3">Urgent repairs under the limit are booked straight away and you are told. Anything over it waits for a quote and your approval.</p>
        </section>

        <section className="rounded-lg bg-surface p-5 shadow-card">
          <p className="eyebrow">This year</p>
          <Facts className="mt-1">
            <Fact label="Rent">{finance.annualRent ? money(finance.annualRent) : 'Vacant'}</Fact>
            <Fact label="Rates, insurance, repairs">−{money(finance.operatingCosts)}</Fact>
            <Fact label="Mortgage interest">−{money(finance.interest)}</Fact>
            <Fact label="Cash flow">
              <span className={cn(finance.cashflow < 0 && 'text-danger-text')}>{finance.cashflow < 0 ? `−${money(-finance.cashflow)}` : money(finance.cashflow)}</span>
            </Fact>
          </Facts>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
            <div>
              <dt className="eyebrow">Gross</dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-ink">
                <Num value={finance.grossYieldPct} decimals={1} suffix="%" />
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Net</dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-ink">
                <Num value={finance.netYieldPct} decimals={1} suffix="%" />
              </dd>
            </div>
            <div>
              <dt className="eyebrow">LVR</dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-ink">
                <Num value={finance.lvrPct} decimals={0} suffix="%" />
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-ink-3">
            Value <span className="num">{money(property.currentValue)}</span> (your estimate), owing <span className="num">{money(property.mortgageBalance)}</span> at <span className="num">{property.mortgageRatePct}%</span>. Yields are before tax.
          </p>
        </section>
      </aside>
    </div>
  )
}
