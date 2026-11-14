import { describe, expect, it } from 'vitest'
import { buildSeed } from './seed'
import { dispatchMode, HAZARDS, hazardsFor, ISSUE_GROUPS, ISSUES, issueOf, providerFor, triage } from './triage'

const NOVEMBER = '2026-11-14'
const JULY = '2026-07-14'

describe('anything that sounds dangerous is sorted upwards', () => {
  const emergencies: [string, string, string][] = [
    ['a gas smell', 'There is a strong smell of gas in the kitchen near the hob.', 'other'],
    ['a gas smell, on a card that is usually only urgent', 'No hot water and I can smell gas by the califont.', 'hot_water_gas'],
    ['a burning smell', 'Burning smell coming from the power point behind the TV.', 'power_point'],
    ['smoke', 'Smoke is coming out of the heat pump.', 'heat_pump'],
    ['no power, with sparks', 'The whole house lost power and the switchboard was sparking when I reset it.', 'no_power'],
    ['flooding', 'The laundry is flooding and water is all over the floor.', 'other'],
    ['a burst pipe', 'A pipe has burst under the kitchen sink.', 'dripping_tap'],
    ['water through the ceiling', 'Water is coming through the ceiling in the hallway.', 'other'],
    ['sewage', 'Sewage is coming up through the shower drain.', 'blocked_sink'],
    ['an overflowing toilet', 'The toilet is overflowing onto the bathroom floor.', 'blocked_toilet'],
    ['water near electrics', 'Water is dripping onto the switchboard in the garage.', 'other'],
    ['a break-in', 'We had a break-in last night and the back door frame is split.', 'wont_lock'],
    ['the only toilet being blocked', 'It is the only toilet in the house and it will not flush.', 'blocked_toilet'],
  ]
  for (const [name, description, issue] of emergencies) {
    it(`sorts ${name} as an emergency`, () => {
      expect(triage(description, issue, NOVEMBER).urgency).toBe('emergency')
    })
  }

  it('never sorts a home that cannot be locked as routine', () => {
    const phrases = [
      'The front door deadlock takes several tries and this morning I could not lock it when I left.',
      'The ranch slider won’t lock at all.',
      'Back door will not close properly so the house cannot be secured.',
      'The lock on the front door is broken.',
    ]
    for (const p of phrases) expect(['urgent', 'emergency']).toContain(triage(p, 'other', NOVEMBER).urgency)
    expect(triage('', 'wont_lock', NOVEMBER).urgency).toBe('urgent')
  })

  it('treats a burst pipe as an emergency whatever the description says', () => {
    expect(triage('', 'burst_pipe').urgency).toBe('emergency')
    expect(triage('It is not too bad.', 'burst_pipe').urgency).toBe('emergency')
  })

  it('does not raise the alarm when the danger is ruled out in so many words', () => {
    expect(triage('The heat pump is blowing cold. There is no burning smell.', 'heat_pump', NOVEMBER).urgency).toBe('routine')
    expect(triage('Pilot light went out. I can’t smell gas.', 'gas_pilot', NOVEMBER).urgency).toBe('urgent')
  })

  it('gives the safety advice that fits the danger described', () => {
    expect(hazardsFor('I can smell gas in the hallway', 'other').map((h) => h.key)).toContain('gas')
    expect(hazardsFor('burning smell from the socket', 'power_point')[0]).toBe(HAZARDS.fire)
    expect(hazardsFor('the laundry is flooding', 'other').map((h) => h.key)).toEqual(['flood'])
    expect(hazardsFor('', 'dripping_tap')).toEqual([])
    // A standing caveat on a card is not a danger someone has described.
    expect(hazardsFor('The basin drains slowly.', 'blocked_sink')).toEqual([])
    expect(hazardsFor('', 'burst_pipe').map((h) => h.key)).toEqual(['flood', 'electrical'])
  })
})

describe('ordinary faults land in the tier the research gives them', () => {
  it('uses the usual tier for the kind of fault', () => {
    expect(triage('Tap in the bathroom drips all night.', 'dripping_tap', NOVEMBER).urgency).toBe('routine')
    expect(triage('No hot water since this morning.', 'hot_water_electric', NOVEMBER).urgency).toBe('urgent')
    expect(triage('Oven will not heat after the power cut.', 'oven', NOVEMBER).urgency).toBe('urgent')
    expect(triage('Hallway alarm chirps every minute.', 'smoke_alarm', NOVEMBER).urgency).toBe('urgent')
  })

  it('treats a failed heat pump as urgent in winter and routine otherwise', () => {
    const words = 'The lounge heat pump runs but only blows cool air on heat mode.'
    expect(triage(words, 'heat_pump', NOVEMBER).urgency).toBe('routine')
    expect(triage(words, 'heat_pump', JULY).urgency).toBe('urgent')
    expect(triage(words, 'heat_pump').urgency).toBe('routine')
  })

  it('reads the description for things that change the tier', () => {
    expect(triage('It is the only sink in the flat.', 'blocked_sink', NOVEMBER).urgency).toBe('urgent')
    expect(triage('The neighbours are out too, the whole street is dark.', 'no_power', NOVEMBER).urgency).toBe('routine')
    expect(triage('Mould keeps coming back on the ceiling after rain.', 'mould', NOVEMBER).urgency).toBe('urgent')
  })

  it('makes a best guess for "something else", and says so with a lower confidence', () => {
    const roof = triage('There is a leak in the roof above bedroom two.', 'other', NOVEMBER)
    expect(roof.urgency).toBe('urgent')
    expect(roof.suggestedTrade).toBe('Roofer')
    const hinge = triage('The pantry cupboard hinge has come away.', 'other', NOVEMBER)
    expect(hinge.urgency).toBe('routine')
    expect(hinge.suggestedTrade).toBe('Handyman')
    const vague = triage('Something is not right in the hallway.', 'other', NOVEMBER)
    expect(vague.urgency).toBe('routine')
    expect(vague.confidence).toBeLessThan(hinge.confidence)
    expect(hinge.confidence).toBeLessThan(triage('Tap drips.', 'dripping_tap').confidence)
  })
})

describe('who caused it is a question, never a finding', () => {
  it('flags a blocked drain to be checked, because the cause decides who pays', () => {
    const t = triage('Bathroom basin was slow for a week and now will not drain at all.', 'blocked_sink', NOVEMBER)
    expect(t.possibleTenantFault).toBe(true)
    expect(t.reasoning).toMatch(/what caused it decides who pays/i)
    expect(t.reasoning).not.toMatch(/tenant (did|caused|is at fault|damage)/i)
  })

  it('flags words that suggest a cause, on any kind of fault', () => {
    expect(triage('The kids knocked the towel rail off the wall.', 'other').possibleTenantFault).toBe(true)
    expect(triage('I lost my keys at the beach.', 'locked_out').possibleTenantFault).toBe(true)
  })

  it('does not flag wear', () => {
    expect(triage('Tap in the bathroom drips all night.', 'dripping_tap').possibleTenantFault).toBe(false)
    expect(triage('No hot water since this morning.', 'hot_water_electric').possibleTenantFault).toBe(false)
  })
})

describe('the sorter is deterministic and complete', () => {
  it('gives the same answer for the same words', () => {
    const words = 'The toilet keeps running after every flush.'
    expect(triage(words, 'leaking_toilet', NOVEMBER)).toEqual(triage(words, 'leaking_toilet', NOVEMBER))
  })

  it('returns the whole ticket shape for every kind of fault, with a plain sentence of reasoning', () => {
    for (const issue of ISSUES) {
      const t = triage('', issue.key, NOVEMBER)
      expect(['emergency', 'urgent', 'routine']).toContain(t.urgency)
      expect(t.confidence).toBeGreaterThan(0)
      expect(t.confidence).toBeLessThanOrEqual(1)
      expect(t.reasoning.length).toBeGreaterThan(20)
      expect(t.reasoning.trim().endsWith('.')).toBe(true)
      expect(t.suggestedTrade.length).toBeGreaterThan(2)
      expect(typeof t.possibleTenantFault).toBe('boolean')
    }
  })

  it('falls back to "something else" for a kind it does not know', () => {
    expect(issueOf('not-a-key').key).toBe('other')
    expect(triage('Tap drips.', 'not-a-key').urgency).toBe('routine')
  })

  it('has a card for every group, a unique key for every card, and safe steps or a reason there are none', () => {
    const keys = ISSUES.map((i) => i.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const g of ISSUE_GROUPS) expect(ISSUES.some((i) => i.group === g.key)).toBe(true)
    for (const issue of ISSUES) {
      if (issue.key === 'other') continue
      expect(issue.stopAndCall.length).toBeGreaterThan(0)
      if (issue.cost) expect(issue.cost.low).toBeLessThanOrEqual(issue.cost.high)
    }
  })
})

describe('sending someone, or asking for a quote first', () => {
  it('sends a tradesperson straight away for anything urgent, whatever it may cost', () => {
    expect(dispatchMode('emergency', { low: 250, high: 600, openEnded: true }, 350)).toBe('auto_dispatch')
    expect(dispatchMode('urgent', null, 350)).toBe('auto_dispatch')
  })

  it('sends a tradesperson for a routine job only when its usual cost is inside the landlord’s limit', () => {
    expect(dispatchMode('routine', { low: 150, high: 350 }, 350)).toBe('auto_dispatch')
    expect(dispatchMode('routine', { low: 150, high: 400 }, 350)).toBe('quote_first')
    expect(dispatchMode('routine', { low: 120, high: 250 }, 250)).toBe('auto_dispatch')
  })

  it('asks for a quote when the cost is open-ended or unknown', () => {
    expect(dispatchMode('routine', { low: 100, high: 200, openEnded: true }, 350)).toBe('quote_first')
    expect(dispatchMode('routine', null, 350)).toBe('quote_first')
  })

  it('only ever matches a vetted tradesperson for the trade', () => {
    const { providers } = buildSeed('2026-11-14')
    expect(providerFor(providers, 'Plumber')?.name).toBe('Tūī Plumbing & Gas')
    expect(providerFor(providers, 'Gasfitter')?.name).toBe('Tūī Plumbing & Gas')
    expect(providerFor(providers, 'Heat pump technician')?.name).toBe('Korimako Heat Pumps')
    // Clearpane Glass is still being vetted, and nobody in the demo network is a roofer.
    expect(providerFor(providers, 'Glazier')).toBeUndefined()
    expect(providerFor(providers, 'Roofer')).toBeUndefined()
    // An inspector is not a tradesperson, whatever their title says.
    expect(providerFor(providers, 'Property inspector')).toBeUndefined()
  })
})
