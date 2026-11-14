import { describe, expect, it } from 'vitest'
import { checkDraught, checkHeating, checkInsulation, checkMoisture, checkVentilation, STANDARDS } from './healthyHomes'

const heater = { requiredKw: 4.8, heater: 'heat_pump' as const, heaterKw: 6, fixed: true, thermostat: true, installedBefore2019: false }

describe('heating (regs 8–10)', () => {
  it('passes a fixed heat pump at or above the required capacity', () => {
    expect(checkHeating(heater).status).toBe('compliant')
  })

  it('refuses a plain electric heater where the room needs more than 2.4 kW', () => {
    const f = checkHeating({ ...heater, heater: 'electric', heaterKw: 2.4, requiredKw: 3.1 })
    expect(f.status).toBe('non_compliant')
    expect(f.detail).toMatch(/2\.4 kW/)
  })

  it('accepts a plain electric heater for a small room', () => {
    expect(checkHeating({ ...heater, heater: 'electric', heaterKw: 2.4, requiredKw: 2.2 }).status).toBe('compliant')
  })

  it('needs 1.5 kW, a fixture, and a thermostat on electric heat', () => {
    expect(checkHeating({ ...heater, heaterKw: 1.2, requiredKw: 1 }).status).toBe('non_compliant')
    expect(checkHeating({ ...heater, fixed: false }).status).toBe('non_compliant')
    expect(checkHeating({ ...heater, thermostat: false }).status).toBe('non_compliant')
    expect(checkHeating({ ...heater, heater: 'wood_burner', thermostat: false }).status).toBe('compliant')
  })

  it('applies the 80% tolerance only to large heaters installed before 1 July 2019', () => {
    expect(checkHeating({ ...heater, heaterKw: 4, requiredKw: 4.8, installedBefore2019: true }).status).toBe('compliant')
    expect(checkHeating({ ...heater, heaterKw: 4, requiredKw: 4.8, installedBefore2019: false }).status).toBe('non_compliant')
    expect(checkHeating({ ...heater, heaterKw: 3.5, requiredKw: 4.8, installedBefore2019: true }).status).toBe('non_compliant')
  })

  it('offers the electric top-up when an old heater falls short by 2.4 kW or less', () => {
    const f = checkHeating({ ...heater, heaterKw: 3.3, requiredKw: 5.7, installedBefore2019: true })
    expect(f.status).toBe('non_compliant')
    expect(f.fix).toMatch(/2\.4 kW/)
  })

  it('does not guess: no tool result, no verdict', () => {
    expect(checkHeating({ ...heater, requiredKw: null }).status).toBe('unknown')
  })

  it('never counts an open fire or unflued gas', () => {
    expect(checkHeating({ ...heater, heater: 'open_fire' }).status).toBe('non_compliant')
    expect(checkHeating({ ...heater, heater: 'unflued_gas' }).status).toBe('non_compliant')
  })
})

describe('insulation (regs 13–18)', () => {
  const base = { coldZone: true, ceiling: 'new' as const, ceilingR: 3.6, ceilingMm: null, floor: 'suspended' as const, floorR: 1.4, goodCondition: true }

  it('needs R 3.3 in the cold zone and R 2.9 elsewhere', () => {
    expect(checkInsulation({ ...base, ceilingR: 3.2 }).status).toBe('non_compliant')
    expect(checkInsulation({ ...base, ceilingR: 3.2, coldZone: false }).status).toBe('compliant')
    expect(checkInsulation(base).status).toBe('compliant')
  })

  it('accepts older insulation at 120 mm and refuses it below', () => {
    expect(checkInsulation({ ...base, ceiling: 'pre_2016', ceilingR: null, ceilingMm: 130 }).status).toBe('compliant')
    expect(checkInsulation({ ...base, ceiling: 'pre_2016', ceilingR: null, ceilingMm: 90 }).status).toBe('non_compliant')
  })

  it('needs R 1.3 under a suspended floor and nothing under a slab', () => {
    expect(checkInsulation({ ...base, floorR: 1.0 }).status).toBe('non_compliant')
    expect(checkInsulation({ ...base, floor: 'slab', floorR: null }).status).toBe('compliant')
  })

  it('fails insulation in poor condition whatever its rating', () => {
    expect(checkInsulation({ ...base, goodCondition: false }).status).toBe('non_compliant')
  })
})

describe('ventilation, moisture and draughts', () => {
  const vent = { windowsOpen: true, kitchenFan: 'outside' as const, kitchenFanNew: false, kitchenFanBigEnough: false, bathroomFan: 'outside' as const, bathroomFanNew: false, bathroomFanBigEnough: false }

  it('lets an older fan pass on venting outdoors, but holds a new one to the sizes', () => {
    expect(checkVentilation(vent).status).toBe('compliant')
    expect(checkVentilation({ ...vent, bathroomFanNew: true }).status).toBe('non_compliant')
    expect(checkVentilation({ ...vent, bathroomFanNew: true, bathroomFanBigEnough: true }).status).toBe('compliant')
  })

  it('refuses a recirculating rangehood and a fan that vents into the roof', () => {
    expect(checkVentilation({ ...vent, kitchenFan: 'recirculating' }).status).toBe('non_compliant')
    expect(checkVentilation({ ...vent, bathroomFan: 'roof_space' }).status).toBe('non_compliant')
  })

  it('needs a ground moisture barrier only under an enclosed subfloor', () => {
    expect(checkMoisture({ drainsWork: true, subfloor: 'enclosed', barrier: false }).status).toBe('non_compliant')
    expect(checkMoisture({ drainsWork: true, subfloor: 'open', barrier: false }).status).toBe('compliant')
    expect(checkMoisture({ drainsWork: false, subfloor: 'none', barrier: false }).status).toBe('non_compliant')
  })

  it('keeps a fireplace usable only on a written request from the tenant', () => {
    expect(checkDraught({ gaps: false, fireplace: 'open' }).status).toBe('non_compliant')
    expect(checkDraught({ gaps: false, fireplace: 'tenant_request' }).status).toBe('compliant')
    expect(checkDraught({ gaps: true, fireplace: 'none' }).status).toBe('non_compliant')
  })

  it('has a guide for each of the five standards', () => {
    expect(STANDARDS.map((s) => s.key)).toEqual(['heating', 'insulation', 'ventilation', 'moisture', 'draught'])
  })
})
