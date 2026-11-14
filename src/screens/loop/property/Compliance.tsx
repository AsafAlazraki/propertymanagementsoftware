/**
 * A property's compliance record: the score, every check behind it, and a
 * guided walk through each healthy homes standard. This is where a landlord
 * who has never read the regulations finds out, room by room, whether the
 * house passes — and what the one fix is when it does not.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowSquareOut, CheckCircle, FileText, MinusCircle, Question, WarningCircle, XCircle } from '@phosphor-icons/react'
import type { Property, StandardStatus, Tenancy } from '@/domain/types'
import type { CheckResult, ComplianceReport } from '@/domain/rules/compliance'
import {
  checkDraught,
  checkHeating,
  checkInsulation,
  checkMoisture,
  checkVentilation,
  HH_LINKS,
  STANDARDS,
  type Finding,
  type HeaterType,
  type StandardGuide,
  type StandardKey,
} from '@/domain/healthyHomes'
import { fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { useMe } from '@/data/store'
import { usePack } from '@/data/hooks'
import { addInsuranceStatement, generateHealthyHomesStatement, logSmokeAlarmTest, saveStandard } from '@/data/mutations'
import { Button, buttonClass } from '@/ui/Button'
import { Checkbox, Field, Input, Select } from '@/ui/controls'
import { Callout, Num } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'

const STATUS: Record<CheckResult['status'], { word: string; icon: typeof CheckCircle; className: string }> = {
  ok: { word: 'Passes', icon: CheckCircle, className: 'text-ok-text' },
  attention: { word: 'Needs attention', icon: WarningCircle, className: 'text-warn-text' },
  fail: { word: 'Fails', icon: XCircle, className: 'text-danger-text' },
  na: { word: 'Does not apply', icon: MinusCircle, className: 'text-ink-3' },
}

const STD: Record<StandardStatus, { word: string; icon: typeof CheckCircle; className: string; chip: string }> = {
  compliant: { word: 'Meets the standard', icon: CheckCircle, className: 'text-ok-text', chip: 'bg-ok-soft text-ok-text' },
  exempt: { word: 'Exempt', icon: MinusCircle, className: 'text-ink-2', chip: 'bg-sunken text-ink-2' },
  unknown: { word: 'Not assessed', icon: Question, className: 'text-warn-text', chip: 'bg-warn-soft text-warn-text' },
  non_compliant: { word: 'Does not meet it', icon: XCircle, className: 'text-danger-text', chip: 'bg-danger-soft text-danger-text' },
}

/* ───────────────────────────── the guided checks ────────────────────────── */

function YesNo({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div>
      <Checkbox checked={value} onCheckedChange={onChange}>
        {label}
      </Checkbox>
      {hint && <p className="mt-1 pl-7 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

function num(v: string): number | null {
  const n = Number(v)
  return v.trim() === '' || !Number.isFinite(n) ? null : n
}

function StandardCheck({ guide, property, onDone }: { guide: StandardGuide; property: Property; onDone: () => void }) {
  // Heating
  const [requiredKw, setRequiredKw] = useState('')
  const [heater, setHeater] = useState<HeaterType>('heat_pump')
  const [heaterKw, setHeaterKw] = useState('')
  const [fixed, setFixed] = useState(true)
  const [thermostat, setThermostat] = useState(true)
  const [before2019, setBefore2019] = useState(false)
  // Insulation
  const [ceiling, setCeiling] = useState<'new' | 'pre_2016' | 'none' | 'another_home_above'>('new')
  const [ceilingR, setCeilingR] = useState('')
  const [ceilingMm, setCeilingMm] = useState('')
  const [floor, setFloor] = useState<'suspended' | 'slab' | 'another_home_below'>('suspended')
  const [floorR, setFloorR] = useState('')
  const [good, setGood] = useState(true)
  // Ventilation
  const [windows, setWindows] = useState(true)
  const [kitchenFan, setKitchenFan] = useState<'outside' | 'recirculating' | 'none'>('outside')
  const [kNew, setKNew] = useState(false)
  const [kBig, setKBig] = useState(true)
  const [bathFan, setBathFan] = useState<'outside' | 'roof_space' | 'none'>('outside')
  const [bNew, setBNew] = useState(false)
  const [bBig, setBBig] = useState(true)
  // Moisture
  const [drains, setDrains] = useState(true)
  const [subfloor, setSubfloor] = useState<'none' | 'open' | 'enclosed'>('enclosed')
  const [barrier, setBarrier] = useState(true)
  // Draught
  const [gaps, setGaps] = useState(false)
  const [fireplace, setFireplace] = useState<'none' | 'blocked' | 'open' | 'tenant_request'>('none')

  // Nelson and Tasman are in the South Island: the R 3.3 ceiling zone.
  const coldZone = true
  const finding: Finding =
    guide.key === 'heating'
      ? checkHeating({ requiredKw: num(requiredKw), heater, heaterKw: num(heaterKw), fixed, thermostat, installedBefore2019: before2019 })
      : guide.key === 'insulation'
        ? checkInsulation({ coldZone, ceiling, ceilingR: num(ceilingR), ceilingMm: num(ceilingMm), floor, floorR: num(floorR), goodCondition: good })
        : guide.key === 'ventilation'
          ? checkVentilation({ windowsOpen: windows, kitchenFan, kitchenFanNew: kNew, kitchenFanBigEnough: kBig, bathroomFan: bathFan, bathroomFanNew: bNew, bathroomFanBigEnough: bBig })
          : guide.key === 'moisture'
            ? checkMoisture({ drainsWork: drains, subfloor, barrier })
            : checkDraught({ gaps, fireplace })
  const s = STD[finding.status]

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div>
        <p className="text-[15px] leading-relaxed text-ink">{guide.rule}</p>
        <ul className="mt-3 grid gap-2">
          {guide.facts.map((f) => (
            <li key={f} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
              <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-mono text-[11px] text-ink-3">{guide.citation}</p>
      </div>

      <div className="grid gap-4 rounded-lg bg-sunken p-4">
        <p className="eyebrow">Check {property.address.line1}</p>

        {guide.key === 'heating' && (
          <>
            <Callout tone="info">
              Only the official heating tool’s figure is presumed correct in law, so start there: it asks for the room’s size, walls, windows and insulation.
              <a href={HH_LINKS.heatingTool} target="_blank" rel="noreferrer" className={cn(buttonClass({ intent: 'secondary', size: 'sm' }), 'mt-2')}>
                Open the heating tool <ArrowSquareOut className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Callout>
            <Field label="Required heating capacity, from the tool’s report" hint="In kilowatts, to one decimal place.">
              {(p) => <Input {...p} inputMode="decimal" suffix="kW" value={requiredKw} onChange={(e) => setRequiredKw(e.target.value)} placeholder="4.8" />}
            </Field>
            <Field label="The heater in the main living room">
              {(p) => (
                <Select {...p} value={heater} onChange={(e) => setHeater(e.target.value as HeaterType)}>
                  <option value="heat_pump">Heat pump</option>
                  <option value="wood_burner">Wood or pellet burner</option>
                  <option value="flued_gas">Flued gas heater</option>
                  <option value="electric">Electric panel or wall heater</option>
                  <option value="unflued_gas">Unflued gas heater</option>
                  <option value="open_fire">Open fire</option>
                  <option value="none">No fixed heater</option>
                </Select>
              )}
            </Field>
            {!['none', 'open_fire', 'unflued_gas'].includes(heater) && (
              <>
                <Field label="Its heating capacity" hint="On the unit’s label or spec sheet. For a wood burner use the average output, not the peak.">
                  {(p) => <Input {...p} inputMode="decimal" suffix="kW" value={heaterKw} onChange={(e) => setHeaterKw(e.target.value)} placeholder="6.0" />}
                </Field>
                <YesNo label="It is fixed in place" value={fixed} onChange={setFixed} />
                <YesNo label="It has a thermostat" value={thermostat} onChange={setThermostat} hint="Required for electric heaters and heat pumps." />
                <YesNo label="It was installed before 1 July 2019" value={before2019} onChange={setBefore2019} />
              </>
            )}
          </>
        )}

        {guide.key === 'insulation' && (
          <>
            <Field label="Ceiling insulation">
              {(p) => (
                <Select {...p} value={ceiling} onChange={(e) => setCeiling(e.target.value as typeof ceiling)}>
                  <option value="new">Installed since July 2016</option>
                  <option value="pre_2016">Installed before July 2016</option>
                  <option value="none">None</option>
                  <option value="another_home_above">Another home is directly above</option>
                </Select>
              )}
            </Field>
            {ceiling === 'new' && (
              <Field label="Its R-value when installed" hint="On the product label or the installer’s certificate. R 3.3 is required here.">
                {(p) => <Input {...p} inputMode="decimal" prefix="R" value={ceilingR} onChange={(e) => setCeilingR(e.target.value)} placeholder="3.6" />}
              </Field>
            )}
            {ceiling === 'pre_2016' && (
              <Field label="Its thickness at the thinnest point" hint="Older insulation passes at 120 mm or more.">
                {(p) => <Input {...p} inputMode="numeric" suffix="mm" value={ceilingMm} onChange={(e) => setCeilingMm(e.target.value)} placeholder="130" />}
              </Field>
            )}
            <Field label="The floor">
              {(p) => (
                <Select {...p} value={floor} onChange={(e) => setFloor(e.target.value as typeof floor)}>
                  <option value="suspended">Suspended timber floor</option>
                  <option value="slab">Concrete slab on the ground</option>
                  <option value="another_home_below">Another home is directly below</option>
                </Select>
              )}
            </Field>
            {floor === 'suspended' && (
              <Field label="Underfloor insulation R-value" hint="R 1.3 is required.">
                {(p) => <Input {...p} inputMode="decimal" prefix="R" value={floorR} onChange={(e) => setFloorR(e.target.value)} placeholder="1.4" />}
              </Field>
            )}
            <YesNo label="It is dry, undamaged and has no gaps" value={good} onChange={setGood} />
          </>
        )}

        {guide.key === 'ventilation' && (
          <>
            <YesNo label="Every bedroom, living room and kitchen has windows or doors that open" value={windows} onChange={setWindows} hint="To at least 5% of the room’s floor area, and able to stay open." />
            <Field label="Kitchen extractor">
              {(p) => (
                <Select {...p} value={kitchenFan} onChange={(e) => setKitchenFan(e.target.value as typeof kitchenFan)}>
                  <option value="outside">Rangehood or fan ducted outdoors</option>
                  <option value="recirculating">Recirculating rangehood</option>
                  <option value="none">None</option>
                </Select>
              )}
            </Field>
            {kitchenFan === 'outside' && (
              <>
                <YesNo label="It was installed after 1 July 2019" value={kNew} onChange={setKNew} />
                {kNew && <YesNo label="Its ducting is 150 mm, or it moves 50 litres a second" value={kBig} onChange={setKBig} />}
              </>
            )}
            <Field label="Bathroom extractor">
              {(p) => (
                <Select {...p} value={bathFan} onChange={(e) => setBathFan(e.target.value as typeof bathFan)}>
                  <option value="outside">Fan ducted outdoors</option>
                  <option value="roof_space">Fan that vents into the roof space</option>
                  <option value="none">None</option>
                </Select>
              )}
            </Field>
            {bathFan === 'outside' && (
              <>
                <YesNo label="It was installed after 1 July 2019" value={bNew} onChange={setBNew} />
                {bNew && <YesNo label="Its ducting is 120 mm, or it moves 25 litres a second" value={bBig} onChange={setBBig} />}
              </>
            )}
          </>
        )}

        {guide.key === 'moisture' && (
          <>
            <YesNo label="Gutters, downpipes and drains are intact and clear" value={drains} onChange={setDrains} />
            <Field label="Under the house">
              {(p) => (
                <Select {...p} value={subfloor} onChange={(e) => setSubfloor(e.target.value as typeof subfloor)}>
                  <option value="enclosed">An enclosed subfloor (blocked along half or more of its edge)</option>
                  <option value="open">An open subfloor</option>
                  <option value="none">A concrete slab — no subfloor</option>
                </Select>
              )}
            </Field>
            {subfloor === 'enclosed' && <YesNo label="There is a ground moisture barrier" value={barrier} onChange={setBarrier} hint="Usually polythene sheeting laid over the ground." />}
          </>
        )}

        {guide.key === 'draught' && (
          <>
            <YesNo label="There are gaps the edge of a $2 coin would fit into" value={gaps} onChange={setGaps} hint="Around windows, doors, floors, walls and ceilings. About 3 mm." />
            <Field label="Open fireplace">
              {(p) => (
                <Select {...p} value={fireplace} onChange={(e) => setFireplace(e.target.value as typeof fireplace)}>
                  <option value="none">There is none</option>
                  <option value="blocked">Closed off or chimney blocked</option>
                  <option value="open">Open and usable</option>
                  <option value="tenant_request">Kept usable at the tenant’s written request</option>
                </Select>
              )}
            </Field>
          </>
        )}
      </div>

      <div aria-live="polite" className={cn('rounded-lg p-4', s.chip)}>
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <s.icon weight="fill" className="size-5" aria-hidden />
          {s.word}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{finding.detail}</p>
        {finding.fix && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
            <span className="font-semibold">What to do: </span>
            {finding.fix}
          </p>
        )}
      </div>

      <p className="text-xs leading-relaxed text-ink-3">
        <span className="font-medium text-ink-2">Keep as evidence: </span>
        {guide.evidence}
      </p>

      <Button
        intent="primary"
        size="lg"
        block
        onClick={() => {
          saveStandard(property.id, guide.key, finding)
          toast.success(`${guide.title} recorded`, { description: `${s.word}. The compliance score has been updated.` })
          onDone()
        }}
      >
        Save this to the property’s record
      </Button>
    </div>
  )
}

/* ───────────────────────────────── the tab ──────────────────────────────── */

export function Compliance({ property, tenancy, report, onLodgeBond }: { property: Property; tenancy: Tenancy | undefined; report: ComplianceReport; onLodgeBond: () => void }) {
  const pack = usePack()
  const me = useMe()
  const [checking, setChecking] = useState<StandardKey | null>(null)
  const guide = STANDARDS.find((g) => g.key === checking)
  const hh = property.healthyHomes
  const unassessed = STANDARDS.filter((g) => hh[g.key].status === 'unknown' || hh[g.key].status === 'non_compliant')
  const others = report.checks.filter((c) => !c.def.key.startsWith('hh_') || c.def.key === 'hh_statement')
  const tone = report.score >= 90 ? 'var(--ok)' : report.score >= 75 ? 'var(--accent)' : 'var(--warn)'

  const act = (c: CheckResult) => {
    if (c.def.key === 'bond_lodged') {
      onLodgeBond()
    } else if (c.def.key === 'smoke_alarms') {
      logSmokeAlarmTest(property.id)
      toast.success('Smoke alarm test logged', { description: `Recorded today against ${property.address.line1}.` })
    } else if (c.def.key === 'insurance_statement') {
      addInsuranceStatement(property.id, tenancy?.id, me.fullName)
      toast.success('Insurance statement added', { description: tenancy ? 'Sent to the tenant to sign as a variation.' : 'It will be part of the next agreement.' })
    } else if (c.def.key === 'hh_statement') {
      generateHealthyHomesStatement(property.id, tenancy?.id)
      toast.success('Healthy homes statement generated', { description: 'Filed under Documents and sent to the tenant.' })
    }
  }
  const actionLabel: Record<string, string> = { bond_lodged: 'Lodge it', smoke_alarms: 'Log a test today', insurance_statement: 'Add the statement', hh_statement: 'Generate the statement' }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="grid gap-4 xl:sticky xl:top-6">
        <div className="rounded-lg bg-surface p-5 text-center shadow-card">
          <p className="eyebrow">Sleep-at-night score</p>
          <div className="relative mx-auto mt-2 grid place-items-center" style={{ width: 168, height: 168 }} role="img" aria-label={`Compliance score ${report.score} out of 100`}>
            <svg width="168" height="168" viewBox="0 0 168 168" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="84" cy="84" r="72" fill="none" stroke="var(--line)" strokeWidth="11" />
              <circle cx="84" cy="84" r="72" fill="none" stroke={tone} strokeWidth="11" strokeLinecap="round" strokeDasharray={2 * Math.PI * 72} strokeDashoffset={2 * Math.PI * 72 * (1 - report.score / 100)} style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.23,1,0.32,1)' }} />
            </svg>
            <div className="relative">
              <Num value={report.score} className="display text-[52px] leading-none text-ink" />
              <p className="text-[11px] text-ink-3">out of 100</p>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            {report.failing + report.attention === 0 ? 'Every check passes. If a tenant, an insurer or the Tribunal asked today, you could show your working.' : `${report.failing} ${report.failing === 1 ? 'check fails' : 'checks fail'} and ${report.attention} ${report.attention === 1 ? 'needs' : 'need'} attention. Each one below says exactly what to do.`}
          </p>
        </div>

        <div className="rounded-lg bg-surface p-5 shadow-card">
          <p className="eyebrow">What it can cost</p>
          <ul className="mt-2.5 grid gap-2.5">
            {pack.penalties.slice(0, 4).map((p) => (
              <li key={p.act} className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 text-ink-2">{p.act}</span>
                <span className="num shrink-0 font-semibold text-ink">up to {money(p.max)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-ink-3">Maximum exemplary damages under Schedule 1A of the Act, on top of putting it right.</p>
        </div>
      </aside>

      <div className="grid min-w-0 gap-6">
        <section aria-labelledby="hh-title">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Healthy homes standards</p>
              <h2 id="hh-title" className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                Five standards, checked one room at a time
              </h2>
            </div>
            <a href={HH_LINKS.compliance} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-accent-text underline-offset-4 hover:underline">
              Tenancy Services guidance <ArrowSquareOut className="size-3.5" aria-hidden />
            </a>
          </div>
          <ul className="grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
            {STANDARDS.map((g) => {
              const st = hh[g.key]
              const s = STD[st.status]
              return (
                <li key={g.key} className="flex flex-col rounded-lg bg-surface p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-semibold text-ink">{g.title}</h3>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11px] font-semibold', s.chip)}>
                      <s.icon weight="fill" className="size-3.5" aria-hidden />
                      {s.word}
                    </span>
                  </div>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-2">{st.detail ?? g.rule}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="num text-[11px] text-ink-3">{st.checkedAt ? `Checked ${fmtDate(st.checkedAt, { weekday: false, year: 'always' })}` : 'Never checked'}</span>
                    <Button size="sm" intent={st.status === 'compliant' || st.status === 'exempt' ? 'ghost' : 'primary'} onClick={() => setChecking(g.key)}>
                      {st.status === 'compliant' || st.status === 'exempt' ? 'Re-check' : 'Check it now'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          {unassessed.length > 0 && !hh.statementSignedAt && (
            <Refusal
              className="mt-3"
              verdict={{
                ok: false,
                reason: 'The healthy homes statement cannot be generated yet.',
                fix: `It is a signed declaration, so it needs ${unassessed.map((g) => g.title.toLowerCase()).join(' and ')} assessed as meeting the standard first.`,
              }}
            />
          )}
        </section>

        <section aria-labelledby="checks-title">
          <p className="eyebrow">Everything else</p>
          <h2 id="checks-title" className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">
            Agreement, bond, alarms and cover
          </h2>
          <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
            {others.map((c) => {
              const s = STATUS[c.status]
              const canAct = c.status !== 'ok' && c.status !== 'na' && actionLabel[c.def.key] && (c.def.key !== 'hh_statement' || unassessed.length === 0)
              return (
                <li key={c.def.key} className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0">
                  <s.icon weight="fill" className={cn('mt-0.5 size-5 shrink-0', s.className)} aria-hidden />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="text-[14px] font-medium text-ink">
                      {c.def.label} <span className={cn('ml-1 text-xs font-normal', s.className)}>· {s.word}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{c.finding}</p>
                    {c.fix && c.status !== 'ok' && <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{c.fix}</p>}
                    <a href={c.def.sourceUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] text-ink-3 underline-offset-4 hover:text-accent-text hover:underline">
                      <FileText className="size-3" aria-hidden />
                      {c.def.citation}
                    </a>
                  </div>
                  {canAct && (
                    <Button size="sm" intent="secondary" onClick={() => act(c)}>
                      {actionLabel[c.def.key]}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <Sheet open={guide !== undefined} onOpenChange={(o) => !o && setChecking(null)} size="lg" eyebrow="Healthy homes check" title={guide?.title ?? ''}>
        {guide && <StandardCheck key={guide.key} guide={guide} property={property} onDone={() => setChecking(null)} />}
      </Sheet>
    </div>
  )
}
