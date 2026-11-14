/**
 * Guided checks for the five healthy homes standards.
 *
 * Each check asks the few questions a landlord can answer standing in the
 * house, and returns a verdict with its reason. The numbers are from the
 * Residential Tenancies (Healthy Homes Standards) Regulations 2019, read on
 * 14 November 2026 — the working is in docs/research/nz-property-compliance.md §1.
 *
 * One thing this deliberately does not do: calculate the heating a room needs.
 * Only the official Tenancy Services heating tool carries the legal presumption
 * of being correct (reg 10), so the heating check takes that tool's result as
 * an input and links to it rather than competing with it.
 */
import type { StandardStatus } from './types'

export const HH_LINKS = {
  heatingTool: 'https://www.tenancy.govt.nz/heating-tool/',
  heatingGuide: 'https://www.tenancy.govt.nz/heating-tool/guide/',
  insulationTool: 'https://www.tenancy.govt.nz/maintenance-and-inspections/insulation-in-rental-properties/insulation-tool/',
  ventilationTool: 'https://www.tenancy.govt.nz/healthy-homes/ventilation-standard/ventilation-tool/',
  compliance: 'https://www.tenancy.govt.nz/healthy-homes/healthy-homes-compliance/',
  statement: 'https://www.tenancy.govt.nz/healthy-homes/compliance-statement/',
  regulations: 'https://www.legislation.govt.nz/secondary-legislation/pco-drafted/2019/88/en/latest/',
}

export type StandardKey = 'heating' | 'insulation' | 'ventilation' | 'moisture' | 'draught'

export interface StandardGuide {
  key: StandardKey
  title: string
  /** The standard in one sentence. */
  rule: string
  /** What the regulations actually require, as short facts. */
  facts: string[]
  /** What to keep, so compliance can be shown later. */
  evidence: string
  citation: string
  tool?: { label: string; url: string }
}

export const STANDARDS: StandardGuide[] = [
  {
    key: 'heating',
    title: 'Heating',
    rule: 'A fixed heater that can hold the main living room at 18 °C on the coldest day.',
    facts: [
      'Only the main living room needs one — including any space open to it that a door cannot close off.',
      'Each heater must be fixed in place, at least 1.5 kW, and have a thermostat if it is electric or a heat pump.',
      'A plain electric heater is not acceptable where the room needs more than 2.4 kW. Open fires and unflued gas heaters never count.',
      'A heater over 2.4 kW installed before 1 July 2019 passes at 80% of the required capacity, until it is replaced.',
    ],
    evidence: 'The official heating tool’s report, a photo of the heater’s label showing its kW, and the installer’s invoice.',
    citation: 'Healthy Homes Standards Regulations 2019, regs 8–10, Sch 1 cl 4–5',
    tool: { label: 'Official heating tool', url: HH_LINKS.heatingTool },
  },
  {
    key: 'insulation',
    title: 'Insulation',
    rule: 'Ceiling and underfloor insulation to the required R-value, in reasonable condition.',
    facts: [
      'Ceiling: R 3.3 across the South Island and the central plateau, R 2.9 elsewhere — the R-value when it was installed.',
      'Ceiling insulation put in before 1 July 2016 is acceptable if it is still at least 120 mm thick and in reasonable condition.',
      'Under a suspended floor: R 1.3. A concrete slab on the ground needs none.',
      'Foil insulation can no longer be repaired or retrofitted. Walls are not covered by the standard, but the agreement must say whether they are insulated.',
    ],
    evidence: 'The installer’s certificate or product label, the install date, and thickness photos against a ruler.',
    citation: 'Healthy Homes Standards Regulations 2019, regs 13–18, Sch 1 cl 6',
    tool: { label: 'Official insulation tool', url: HH_LINKS.insulationTool },
  },
  {
    key: 'ventilation',
    title: 'Ventilation',
    rule: 'Windows that open in every living space, and extractor fans vented outdoors in kitchens and bathrooms.',
    facts: [
      'Each bedroom, living room, dining room and kitchen needs openable windows or doors equal to at least 5% of its floor area.',
      'Kitchen fan installed since 1 July 2019: 150 mm ducting or 50 litres a second. Bathroom fan: 120 mm or 25 litres a second.',
      'An older fan only has to vent outdoors and work — but its replacement must meet the sizes.',
      'A recirculating rangehood, or a positive-pressure system such as HRV or DVS, does not satisfy the standard.',
    ],
    evidence: 'The fan and duct diameter (or flow rate) in writing from the installer, and the install date.',
    citation: 'Healthy Homes Standards Regulations 2019, regs 21–24, Sch 1 cl 8',
    tool: { label: 'Official ventilation tool', url: HH_LINKS.ventilationTool },
  },
  {
    key: 'moisture',
    title: 'Moisture and drainage',
    rule: 'Gutters, downpipes and drains that work, and a ground moisture barrier under an enclosed subfloor.',
    facts: [
      'Storm, surface and ground water must drain efficiently to an appropriate outfall.',
      'A subfloor is “enclosed” when airflow is blocked along half or more of its perimeter. Vents alone do not change that; trellis does not count as blocking.',
      'An enclosed subfloor needs a ground moisture barrier — in practice, polythene sheeting laid to the standard.',
    ],
    evidence: 'Dated photos of the gutters, downpipes and barrier; a cleaning invoice.',
    citation: 'Healthy Homes Standards Regulations 2019, regs 27–29',
  },
  {
    key: 'draught',
    title: 'Draught stopping',
    rule: 'No unreasonable gaps or holes that let draughts in, and unused fireplaces blocked.',
    facts: [
      'The legal test is whether a gap is unreasonable. As a rule of thumb from Tenancy Services: if the edge of a $2 coin fits (about 3 mm), seal it.',
      'An open fireplace must be closed off, unless the tenant asks in writing for it to stay usable and you agree.',
      'The age or condition of the house is not an excuse. Do not block intentional openings such as trickle vents or subfloor vents.',
    ],
    evidence: 'A checklist with photos at each inspection; the tenant’s written request if a fireplace stays in use.',
    citation: 'Healthy Homes Standards Regulations 2019, regs 25–26',
  },
]

export interface Finding {
  status: StandardStatus
  /** What was found, as the sentence stored on the property record. */
  detail: string
  /** What to do next, when something is. */
  fix?: string
}

/* ───────────────────────────────── heating ──────────────────────────────── */

export type HeaterType = 'heat_pump' | 'wood_burner' | 'flued_gas' | 'electric' | 'unflued_gas' | 'open_fire' | 'none'

export interface HeatingAnswers {
  /** From the official heating tool's report. */
  requiredKw: number | null
  heater: HeaterType
  heaterKw: number | null
  fixed: boolean
  thermostat: boolean
  installedBefore2019: boolean
}

export function checkHeating(a: HeatingAnswers): Finding {
  if (a.heater === 'none') return { status: 'non_compliant', detail: 'No fixed heater in the main living room.', fix: 'Run the official heating tool for the room, then install a heater of at least that size.' }
  if (a.heater === 'open_fire' || a.heater === 'unflued_gas') {
    return { status: 'non_compliant', detail: `${a.heater === 'open_fire' ? 'An open fire' : 'An unflued gas heater'} does not count as a qualifying heater.`, fix: 'Install a heat pump, wood or pellet burner, or flued gas heater sized by the official tool.' }
  }
  if (a.requiredKw === null || a.requiredKw <= 0) {
    return { status: 'unknown', detail: 'The room’s required heating capacity has not been calculated.', fix: 'Run the official heating tool — it takes about ten minutes with a tape measure — and enter the figure from its report.' }
  }
  if (a.heaterKw === null || a.heaterKw <= 0) return { status: 'unknown', detail: 'The heater’s capacity is not recorded.', fix: 'Read the kW from the heater’s label or its spec sheet.' }
  if (!a.fixed) return { status: 'non_compliant', detail: 'The heater is not fixed in place.', fix: 'A qualifying heater must be installed as a fixture. A plug-in heater can count only once it is secured to the wall.' }
  if (a.heaterKw < 1.5) return { status: 'non_compliant', detail: `The heater is ${a.heaterKw} kW; a qualifying heater must be at least 1.5 kW.`, fix: 'Replace it with a heater sized by the official tool.' }
  if ((a.heater === 'electric' || a.heater === 'heat_pump') && !a.thermostat) return { status: 'non_compliant', detail: 'An electric heater or heat pump must have a thermostat.', fix: 'Fit a thermostat, or replace the heater with one that has it.' }
  if (a.heater === 'electric' && a.requiredKw > 2.4) {
    return { status: 'non_compliant', detail: `The room needs ${a.requiredKw} kW, and a plain electric heater is not acceptable above 2.4 kW.`, fix: 'Install a heat pump or burner of at least the required capacity.' }
  }
  const label = `${a.heaterKw} kW ${a.heater === 'heat_pump' ? 'heat pump' : a.heater === 'wood_burner' ? 'wood burner' : a.heater === 'flued_gas' ? 'flued gas heater' : 'electric heater'}; ${a.requiredKw} kW required.`
  if (a.heaterKw >= a.requiredKw) return { status: 'compliant', detail: label }
  if (a.installedBefore2019 && a.heaterKw > 2.4 && a.heaterKw >= a.requiredKw * 0.8) {
    return { status: 'compliant', detail: `${label} Passes under the 80% tolerance for heaters installed before 1 July 2019 — this must be stated in the compliance statement, and ends when the heater is replaced.` }
  }
  const short = Math.round((a.requiredKw - a.heaterKw) * 10) / 10
  if (a.installedBefore2019 && short <= 2.4) {
    return { status: 'non_compliant', detail: `${label} ${short} kW short.`, fix: `Because the existing heater predates 1 July 2019, the gap can be met with a fixed electric heater of at least ${Math.max(1.5, short)} kW with a thermostat.` }
  }
  return { status: 'non_compliant', detail: `${label} ${short} kW short.`, fix: 'Add or replace heating so the total reaches the required capacity.' }
}

/* ──────────────────────────────── insulation ────────────────────────────── */

export interface InsulationAnswers {
  /** True across the South Island and the central North Island plateau. */
  coldZone: boolean
  ceiling: 'new' | 'pre_2016' | 'none' | 'another_home_above'
  /** For insulation installed since July 2016. */
  ceilingR: number | null
  /** For older insulation, measured thickness in millimetres. */
  ceilingMm: number | null
  floor: 'suspended' | 'slab' | 'another_home_below'
  floorR: number | null
  goodCondition: boolean
}

export function checkInsulation(a: InsulationAnswers): Finding {
  const need = a.coldZone ? 3.3 : 2.9
  const parts: string[] = []
  if (a.ceiling === 'none') return { status: 'non_compliant', detail: 'No ceiling insulation.', fix: `Install ceiling insulation of at least R ${need}.` }
  if (a.ceiling === 'another_home_above') parts.push('Another home is directly above, so no ceiling insulation is needed.')
  else if (a.ceiling === 'new') {
    if (a.ceilingR === null) return { status: 'unknown', detail: 'The ceiling insulation’s R-value is not recorded.', fix: 'Find it on the product label or the installer’s certificate.' }
    if (a.ceilingR < need) return { status: 'non_compliant', detail: `Ceiling insulation is R ${a.ceilingR}; R ${need} is required here.`, fix: `Top it up — layers add together — to at least R ${need}.` }
    parts.push(`Ceiling R ${a.ceilingR} (R ${need} required).`)
  } else {
    if (a.ceilingMm === null) return { status: 'unknown', detail: 'The thickness of the older ceiling insulation has not been measured.', fix: 'Measure it at its thinnest point.' }
    if (a.ceilingMm < 120) return { status: 'non_compliant', detail: `The ceiling insulation is ${a.ceilingMm} mm thick; older insulation must be at least 120 mm.`, fix: `Top it up to at least R ${need}.` }
    parts.push(`Ceiling insulation predates July 2016 and is ${a.ceilingMm} mm thick (120 mm required).`)
  }
  if (a.floor === 'slab') parts.push('Concrete slab — no underfloor insulation needed.')
  else if (a.floor === 'another_home_below') parts.push('Another home is directly below, so no underfloor insulation is needed.')
  else {
    if (a.floorR === null) return { status: 'unknown', detail: `${parts.join(' ')} The underfloor insulation’s R-value is not recorded.`, fix: 'Find it on the product label or the installer’s certificate. If there is none, install R 1.3.' }
    if (a.floorR < 1.3) return { status: 'non_compliant', detail: `Underfloor insulation is R ${a.floorR}; R 1.3 is required.`, fix: 'Replace it with non-foil insulation of at least R 1.3.' }
    parts.push(`Underfloor R ${a.floorR}.`)
  }
  if (!a.goodCondition) return { status: 'non_compliant', detail: `${parts.join(' ')} But it is damp, damaged or has gaps.`, fix: 'Repair or replace the damaged sections; insulation must be in reasonable condition.' }
  return { status: 'compliant', detail: parts.join(' ') }
}

/* ──────────────────────────────── ventilation ───────────────────────────── */

export interface VentilationAnswers {
  windowsOpen: boolean
  kitchenFan: 'outside' | 'recirculating' | 'none'
  kitchenFanNew: boolean
  kitchenFanBigEnough: boolean
  bathroomFan: 'outside' | 'roof_space' | 'none'
  bathroomFanNew: boolean
  bathroomFanBigEnough: boolean
}

export function checkVentilation(a: VentilationAnswers): Finding {
  if (!a.windowsOpen) return { status: 'non_compliant', detail: 'Not every bedroom, living room and kitchen has windows or doors that open to at least 5% of its floor area.', fix: 'Free up painted-shut or broken windows, or fit openers. A room lawfully built without them may be exempt.' }
  if (a.kitchenFan === 'none') return { status: 'non_compliant', detail: 'No extractor fan in the kitchen.', fix: 'Fit a rangehood ducted to the outside: 150 mm ducting or 50 litres a second.' }
  if (a.kitchenFan === 'recirculating') return { status: 'non_compliant', detail: 'The rangehood recirculates rather than venting outdoors.', fix: 'Duct it to the outside. A recirculating rangehood does not satisfy the standard.' }
  if (a.kitchenFanNew && !a.kitchenFanBigEnough) return { status: 'non_compliant', detail: 'The kitchen fan was installed after 1 July 2019 and is under 150 mm or 50 litres a second.', fix: 'Replace the fan or ducting to meet the size.' }
  if (a.bathroomFan === 'none') return { status: 'non_compliant', detail: 'No extractor fan in a bathroom.', fix: 'Fit a fan ducted to the outside: 120 mm ducting or 25 litres a second.' }
  if (a.bathroomFan === 'roof_space') return { status: 'non_compliant', detail: 'A bathroom fan vents into the roof space, not outdoors.', fix: 'Extend the duct to an outside vent. An electrician or roofer can usually do this in an hour.' }
  if (a.bathroomFanNew && !a.bathroomFanBigEnough) return { status: 'non_compliant', detail: 'A bathroom fan was installed after 1 July 2019 and is under 120 mm or 25 litres a second.', fix: 'Replace the fan or ducting to meet the size.' }
  return { status: 'compliant', detail: 'Opening windows in every living space; kitchen and bathroom fans ducted outdoors.' }
}

/* ────────────────────────── moisture and draughts ───────────────────────── */

export interface MoistureAnswers {
  drainsWork: boolean
  subfloor: 'none' | 'open' | 'enclosed'
  barrier: boolean
}

export function checkMoisture(a: MoistureAnswers): Finding {
  if (!a.drainsWork) return { status: 'non_compliant', detail: 'Gutters, downpipes or drains are blocked, broken or missing.', fix: 'Clear and repair them so water runs to a proper outfall.' }
  if (a.subfloor === 'enclosed' && !a.barrier) return { status: 'non_compliant', detail: 'The subfloor is enclosed and has no ground moisture barrier.', fix: 'Have polythene sheeting laid over the ground under the house.' }
  return { status: 'compliant', detail: a.subfloor === 'enclosed' ? 'Drainage in order; ground moisture barrier in place.' : a.subfloor === 'open' ? 'Drainage in order; the subfloor is open, so no barrier is needed.' : 'Drainage in order; no suspended floor.' }
}

export interface DraughtAnswers {
  gaps: boolean
  fireplace: 'none' | 'blocked' | 'open' | 'tenant_request'
}

export function checkDraught(a: DraughtAnswers): Finding {
  if (a.gaps) return { status: 'non_compliant', detail: 'There are gaps or holes wide enough for the edge of a $2 coin.', fix: 'Seal them durably: fitted door and window seals, filler, or repair. A loose draught-stopper does not count.' }
  if (a.fireplace === 'open') return { status: 'non_compliant', detail: 'An open fireplace has not been closed off.', fix: 'Block the chimney — and make it obvious, so nobody lights a fire.' }
  return { status: 'compliant', detail: a.fireplace === 'tenant_request' ? 'No unreasonable gaps; the fireplace stays usable at the tenant’s written request.' : a.fireplace === 'blocked' ? 'No unreasonable gaps; fireplace blocked.' : 'No unreasonable gaps; no open fireplace.' }
}
