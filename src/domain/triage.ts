/**
 * Maintenance triage: what a renter can safely try first, and how a report is
 * sorted once they send it.
 *
 * Everything in this file is drawn from docs/research/operations-domain.md §3:
 * the self-help steps, stop-and-call triggers, likely trade, typical urgency
 * and typical cost come from table 3a (Summit Property Management's tenant
 * troubleshooting guide, Tenancy Services, EECA); the safety caveats from the
 * list under it; the urgency tiers from 3b; and who usually pays from 3d
 * (Tenancy Services: damage and repairs). Steps and costs the research marks
 * [U] are standard practice that was not confirmed against a source, so the
 * interface presents all of this as guidance, never as a diagnosis.
 *
 * The sorter is a keyword rule set, not a model: the same words always give the
 * same answer, it can be read in one sitting, and anything that sounds
 * dangerous is sorted upwards. `possibleTenantFault` is a flag for a person to
 * check — it is never a finding.
 */
import type { ISODate, Ticket, Urgency } from './types'

export type Triage = Ticket['triage']

export type IssueGroup = 'power' | 'water' | 'heating' | 'kitchen' | 'security' | 'damp' | 'other'

export type IssueKey =
  | 'no_power'
  | 'power_point'
  | 'light'
  | 'burst_pipe'
  | 'blocked_sink'
  | 'blocked_toilet'
  | 'leaking_toilet'
  | 'dripping_tap'
  | 'low_pressure'
  | 'hot_water_electric'
  | 'hot_water_gas'
  | 'heat_pump'
  | 'gas_pilot'
  | 'oven'
  | 'waste_disposal'
  | 'dishwasher'
  | 'washing_machine'
  | 'wont_lock'
  | 'locked_out'
  | 'garage_door'
  | 'smoke_alarm'
  | 'mould'
  | 'other'

export type HazardKey = 'fire' | 'gas' | 'electrical' | 'flood' | 'sewage' | 'cylinder'

export interface CostRange {
  low: number
  high: number
  /** The top of the range is a floor: "$250–$600+", or "more for a repair". */
  openEnded?: boolean
}

export interface Issue {
  key: IssueKey
  group: IssueGroup
  /** What a renter would call it. */
  title: string
  /** One line under the title in the picker. */
  hint: string
  /** Stored on the ticket. */
  category: string
  /** Safe things to try, in order. Empty when there is nothing safe to try. */
  steps: string[]
  /** Stop and report it straight away if any of these is true. */
  stopAndCall: string[]
  trade: string
  /** The usual tier for this kind of fault, before the description is read. */
  urgency: Urgency
  /** Why it usually sits in that tier, as a sentence. */
  because: string
  cost: CostRange | null
  /** Set where the cause decides who pays, with the reason. */
  causeNote?: string
  /** Safety advice to show beside the steps. */
  hazards: HazardKey[]
}

export const ISSUE_GROUPS: { key: IssueGroup; label: string }[] = [
  { key: 'water', label: 'Water and drains' },
  { key: 'power', label: 'Power and lights' },
  { key: 'heating', label: 'Heating and hot water' },
  { key: 'kitchen', label: 'Kitchen and laundry' },
  { key: 'security', label: 'Locks, doors and alarms' },
  { key: 'damp', label: 'Damp and mould' },
  { key: 'other', label: 'Something else' },
]

export const ISSUES: Issue[] = [
  {
    key: 'burst_pipe',
    group: 'water',
    title: 'Burst pipe or a big leak',
    hint: 'Water is escaping and will not stop',
    category: 'Plumbing',
    steps: ['Turn the water off at the toby — the tap by the road-side meter.', 'Open taps to drain the pipes.', 'Switch off power to the wet area, if it is safe to.', 'Move your belongings and take photos.'],
    stopAndCall: ['Always report this one straight away.'],
    trade: 'Plumber',
    urgency: 'emergency',
    because: 'Water escaping from a pipe damages the home by the minute, so this is an emergency.',
    cost: { low: 250, high: 600, openEnded: true },
    hazards: ['flood', 'electrical'],
  },
  {
    key: 'blocked_sink',
    group: 'water',
    title: 'Blocked sink or basin',
    hint: 'Slow to drain, or not draining at all',
    category: 'Plumbing',
    steps: ['Take out the plug and clean it and the strainer under it.', 'Use a plunger.', 'Flush with hot (not boiling) water and dishwashing liquid.'],
    stopAndCall: ['Water is backing up in more than one sink, shower or toilet.', 'There is a sewage smell.', 'Do not pour in caustic drain cleaner before a plumber comes.'],
    trade: 'Plumber',
    urgency: 'routine',
    because: 'One sink is out of use and the rest of the home still works, so this is routine.',
    cost: { low: 150, high: 350 },
    causeNote: 'A blockage from grease or something dropped down the drain may be charged to the tenant; a fault in the pipes is the landlord’s.',
    hazards: ['sewage'],
  },
  {
    key: 'blocked_toilet',
    group: 'water',
    title: 'Blocked toilet',
    hint: 'Will not flush away, or the bowl is filling',
    category: 'Plumbing',
    steps: ['Stop flushing.', 'Use a toilet plunger.', 'If the bowl is about to overflow, lift the cistern lid and close the flap, or turn off the valve beside the toilet.'],
    stopAndCall: ['The toilet is overflowing.', 'Sewage is coming up outside, or in the shower.'],
    trade: 'Plumber',
    urgency: 'urgent',
    because: 'A toilet is an essential, and there is no immediate danger, so this is urgent.',
    cost: { low: 150, high: 520 },
    causeNote: 'A blockage from something that should not have been flushed may be charged to the tenant; a fault in the drain is the landlord’s.',
    hazards: ['sewage'],
  },
  {
    key: 'leaking_toilet',
    group: 'water',
    title: 'Toilet keeps running or leaks',
    hint: 'Water trickling into the bowl, or the cistern will not fill',
    category: 'Plumbing',
    steps: ['Jiggle the flush button.', 'Lift the cistern lid and check the flap or float is sitting properly.', 'Turn off the valve beside the toilet between uses.'],
    stopAndCall: ['There is water on the floor.', 'The cistern is overflowing constantly.'],
    trade: 'Plumber',
    urgency: 'routine',
    because: 'The toilet still works and nothing is being damaged, so this is routine — though the water does add up.',
    cost: { low: 150, high: 400 },
    hazards: [],
  },
  {
    key: 'dripping_tap',
    group: 'water',
    title: 'Dripping tap',
    hint: 'A tap that will not turn fully off',
    category: 'Plumbing',
    steps: ['Note which tap it is, and whether it is the hot or the cold.', 'Put a container under it. There is nothing you need to take apart.'],
    stopAndCall: ['The leak is inside a cupboard or a wall.'],
    trade: 'Plumber',
    urgency: 'routine',
    because: 'A dripping tap is a worn washer or cartridge: inconvenient, not essential, so this is routine.',
    cost: { low: 120, high: 250 },
    hazards: [],
  },
  {
    key: 'low_pressure',
    group: 'water',
    title: 'Low water pressure',
    hint: 'Taps or the shower running weak',
    category: 'Plumbing',
    steps: ['Check whether it is every tap or just one.', 'Unscrew the tip of the tap and rinse the little filter inside.', 'Check the toby by the road-side meter is fully open.', 'Ask a neighbour, or check the council’s notices, in case it is the street.'],
    stopAndCall: ['A sudden drop, with damp ground outside or the water meter spinning — that points to a hidden leak.', 'Only the hot water is weak.'],
    trade: 'Plumber',
    urgency: 'routine',
    because: 'The water still runs and nothing points to a leak, so this is routine.',
    cost: { low: 150, high: 400 },
    hazards: [],
  },
  {
    key: 'no_power',
    group: 'power',
    title: 'No power anywhere',
    hint: 'The whole home is out',
    category: 'Electrical',
    steps: ['Ask a neighbour, or check your lines company’s outage page.', 'Check the power account is paid.', 'Look at the switchboard for a tripped main switch or safety switch, and reset it once.'],
    stopAndCall: ['It trips again straight away.', 'There is a burning smell, or scorch marks.', 'The switchboard is buzzing.'],
    trade: 'Electrician',
    urgency: 'urgent',
    because: 'Power is an essential. If the fault is in the home rather than the street it needs an electrician quickly, so this is urgent.',
    cost: { low: 150, high: 350 },
    hazards: ['electrical'],
  },
  {
    key: 'power_point',
    group: 'power',
    title: 'A power point or circuit is dead',
    hint: 'One socket, or one part of the home, keeps tripping',
    category: 'Electrical',
    steps: ['Try the appliance in a different socket.', 'Unplug everything on that circuit and reset the breaker once.', 'Plug things back in one at a time to find the one that trips it.'],
    stopAndCall: ['It trips with nothing plugged in.', 'The socket is warm, cracked or wet.', 'Never open or repair a socket yourself.'],
    trade: 'Electrician',
    urgency: 'urgent',
    because: 'A circuit that will not stay on is a fault an electrician should see soon, so this is urgent.',
    cost: { low: 150, high: 300 },
    hazards: ['electrical'],
  },
  {
    key: 'light',
    group: 'power',
    title: 'A light is not working',
    hint: 'One fitting, after trying a new bulb',
    category: 'Electrical',
    steps: ['Replace the bulb.', 'Check the breaker at the switchboard.'],
    stopAndCall: ['Several lights are flickering.', 'The fitting is hot or buzzing.'],
    trade: 'Electrician',
    urgency: 'routine',
    because: 'One light is out and the rest of the home is lit, so this is routine.',
    cost: { low: 120, high: 250 },
    hazards: ['electrical'],
  },
  {
    key: 'hot_water_electric',
    group: 'heating',
    title: 'No hot water — electric cylinder',
    hint: 'Taps run cold',
    category: 'Hot water',
    steps: ['Check the hot water switch at the switchboard, and the switch beside the cylinder.', 'Check for a tripped breaker.', 'Check the power account is paid.', 'If a lot of hot water has just been used, the tank may simply be empty — give it two to three hours.'],
    stopAndCall: ['Water is leaking from the cylinder or its valves.', 'There is water near wiring.', 'The taps are running scalding hot, or steaming.'],
    trade: 'Plumber',
    urgency: 'urgent',
    because: 'Hot water is an essential, and there is no immediate danger, so this is urgent.',
    cost: { low: 200, high: 400 },
    hazards: ['cylinder', 'electrical'],
  },
  {
    key: 'hot_water_gas',
    group: 'heating',
    title: 'No hot water — gas',
    hint: 'A gas water heater that will not fire',
    category: 'Hot water',
    steps: ['Check the gas bottle is not empty, and switch to the full one.', 'Check the unit has power.', 'Check the gas and power accounts are paid.'],
    stopAndCall: ['You can smell gas — at all.'],
    trade: 'Gasfitter',
    urgency: 'urgent',
    because: 'Hot water is an essential, and there is no immediate danger, so this is urgent.',
    cost: { low: 150, high: 350 },
    hazards: ['gas'],
  },
  {
    key: 'heat_pump',
    group: 'heating',
    title: 'Heat pump is not heating',
    hint: 'Runs, but blows cool air — or will not start',
    category: 'Heating',
    steps: ['Check the mode is Heat — not Auto, Cool or Fan — and set it between 18 and 21 °C.', 'Put fresh batteries in the remote.', 'Clean the filters, and clear leaves away from the outdoor unit.', 'On a frosty morning give it 10 to 15 minutes to defrost.', 'Switch it off at the wall for five minutes, then start it again.'],
    stopAndCall: ['An error code or flashing light will not clear.', 'Water is dripping indoors.', 'Ice on the outdoor unit does not clear.', 'There is a burning smell.'],
    trade: 'Heat pump technician',
    urgency: 'routine',
    because: 'Heating has failed, but it is not winter, so this is routine.',
    cost: { low: 100, high: 200, openEnded: true },
    hazards: ['electrical'],
  },
  {
    key: 'gas_pilot',
    group: 'heating',
    title: 'Gas pilot light is out',
    hint: 'A gas heater or water heater that has gone out',
    category: 'Gas',
    steps: ['Follow the relighting instructions on the appliance — once only.', 'Check the gas bottle is not empty.'],
    stopAndCall: ['You can smell gas.', 'The pilot will not stay lit.', 'There is soot, or the flame is yellow.'],
    trade: 'Gasfitter',
    urgency: 'urgent',
    because: 'A gas appliance that will not stay lit needs a gasfitter soon, so this is urgent.',
    cost: { low: 150, high: 300 },
    hazards: ['gas'],
  },
  {
    key: 'oven',
    group: 'kitchen',
    title: 'Oven is not working',
    hint: 'Often after a power cut',
    category: 'Appliances',
    steps: ['Set the clock — many ovens will not heat until it is set.', 'Turn the timer to Manual.', 'Check the oven’s switch on the wall, and the breaker.'],
    stopAndCall: ['It is sparking.', 'An element is visibly broken.', 'The breaker trips when the oven is switched on.'],
    trade: 'Electrician',
    urgency: 'urgent',
    because: 'Cooking is an essential, and there is no immediate danger, so this is urgent.',
    cost: { low: 150, high: 350 },
    hazards: ['electrical'],
  },
  {
    key: 'waste_disposal',
    group: 'kitchen',
    title: 'Waste disposal is jammed',
    hint: 'Hums but will not turn',
    category: 'Appliances',
    steps: ['Switch it off at the wall.', 'Press the red reset button underneath.', 'Free the plate with the hex key in the centre underneath.', 'Run cold water and try again.'],
    stopAndCall: ['Never put a hand inside.', 'It hums and trips again.', 'It is leaking.'],
    trade: 'Plumber',
    urgency: 'routine',
    because: 'The sink still works without it, so this is routine.',
    cost: { low: 150, high: 450 },
    hazards: [],
  },
  {
    key: 'dishwasher',
    group: 'kitchen',
    title: 'Dishwasher will not drain or start',
    hint: 'One that came with the home',
    category: 'Appliances',
    steps: ['Clean the filter.', 'Check the door latch clicks shut.', 'Check the tap under the sink is on, and the breaker.'],
    stopAndCall: ['It is leaking onto the floor.', 'It trips the breaker.'],
    trade: 'Appliance technician',
    urgency: 'routine',
    because: 'Dishes can be washed by hand in the meantime, so this is routine.',
    cost: { low: 150, high: 300 },
    hazards: [],
  },
  {
    key: 'washing_machine',
    group: 'kitchen',
    title: 'Washing machine will not drain',
    hint: 'Water left in the drum',
    category: 'Appliances',
    steps: ['If it is your own machine, clean its pump filter.', 'Check the drain hose is not kinked, or pushed too far down the pipe.', 'Check the tub outlet is clear.'],
    stopAndCall: ['Water is coming back up the standpipe or the tub — that is a blocked drain, which is the landlord’s side.'],
    trade: 'Plumber',
    urgency: 'routine',
    because: 'This is usually the machine rather than the home’s drain, so it starts as routine.',
    cost: { low: 150, high: 350 },
    causeNote: 'Your own machine is yours to repair. A blocked drain behind it is the landlord’s.',
    hazards: [],
  },
  {
    key: 'wont_lock',
    group: 'security',
    title: 'A door or window will not lock',
    hint: 'The home cannot be secured',
    category: 'Locks and security',
    steps: [],
    stopAndCall: ['There is nothing safe to try here. Report it now.'],
    trade: 'Locksmith',
    urgency: 'urgent',
    because: 'A home that cannot be locked is not secure, so this is urgent: a same-day job.',
    cost: { low: 150, high: 300 },
    hazards: [],
  },
  {
    key: 'locked_out',
    group: 'security',
    title: 'Locked out, or lost keys',
    hint: 'You cannot get in',
    category: 'Locks and security',
    steps: ['During the day, ask your landlord for the spare. Have photo ID ready.'],
    stopAndCall: ['After hours, a locksmith is usually at your own cost.'],
    trade: 'Locksmith',
    urgency: 'urgent',
    because: 'You cannot get into your home, so this is urgent.',
    cost: { low: 150, high: 350 },
    causeNote: 'Lost keys and lock-outs are usually charged to the tenant.',
    hazards: [],
  },
  {
    key: 'garage_door',
    group: 'security',
    title: 'Garage door will not open',
    hint: 'Remote or opener not responding',
    category: 'Doors and windows',
    steps: ['Put a fresh battery in the remote.', 'Check the opener has power.', 'Use the manual release cord.'],
    stopAndCall: ['A spring or cable is broken.', 'The door is off its tracks — do not force it.'],
    trade: 'Garage door technician',
    urgency: 'routine',
    because: 'The door can be opened by hand in the meantime, so this is routine.',
    cost: { low: 150, high: 400 },
    hazards: [],
  },
  {
    key: 'smoke_alarm',
    group: 'security',
    title: 'Smoke alarm chirping',
    hint: 'A chirp every 30 to 60 seconds',
    category: 'Smoke alarms',
    steps: ['A regular chirp means a low battery or an alarm at the end of its life. Press the test or hush button.', 'Vacuum the dust off its vents.', 'Replace the battery only if it is a replaceable type.', 'Check the expiry date printed on the alarm.'],
    stopAndCall: ['A sealed long-life alarm is chirping, or it is past its expiry date — your landlord must replace it.', 'Never remove or disconnect an alarm.'],
    trade: 'Handyman',
    urgency: 'urgent',
    because: 'Working smoke alarms are your landlord’s job to keep working, so this is urgent.',
    cost: { low: 25, high: 60 },
    hazards: ['fire'],
  },
  {
    key: 'mould',
    group: 'damp',
    title: 'Mould or condensation',
    hint: 'Black spots, damp patches, wet windows',
    category: 'Mould and damp',
    steps: ['Wipe condensation off windows and walls.', 'Clean mould with white vinegar, half and half with water on paint — or one part bleach to three of water. Wear gloves, eye protection and a mask.', 'Open windows for a while every day, and run the extractor fans.', 'Keep furniture a little off the walls, and dry washing outside.'],
    stopAndCall: ['It comes back quickly even though you are airing and heating the home.', 'It is on a ceiling under the roof, or around a window after rain — that is a leak.', 'There is a musty smell from under the floor.'],
    trade: 'Builder',
    urgency: 'routine',
    because: 'Mould that cleans off and stays away is routine. If it keeps coming back, something in the building is letting water in.',
    cost: null,
    hazards: [],
  },
  {
    key: 'other',
    group: 'other',
    title: 'Something else',
    hint: 'Tell us in your own words',
    category: 'General',
    steps: [],
    stopAndCall: [],
    trade: 'Handyman',
    urgency: 'routine',
    because: 'Nothing in the description points to danger or a lost essential, so this starts as routine. Your landlord can raise it when they read it.',
    cost: null,
    hazards: [],
  },
]

export function issueOf(key: string): Issue {
  return ISSUES.find((i) => i.key === key) ?? ISSUES[ISSUES.length - 1]
}

/* ───────────────────────────────── hazards ──────────────────────────────── */

export interface Hazard {
  key: HazardKey
  title: string
  doNow: string[]
}

/** The safety caveats from the research, in the order a person should read them. */
export const HAZARDS: Record<HazardKey, Hazard> = {
  fire: { key: 'fire', title: 'Fire, or anyone in immediate danger', doNow: ['Call 111 first. Tell your landlord second.'] },
  gas: {
    key: 'gas',
    title: 'If you can smell gas',
    doNow: ['Turn the gas off at the bottle or meter, if it is safe to.', 'Open doors and windows.', 'No flames, and do not touch light switches.', 'Leave the house, then call your gas supplier’s emergency line or 111.'],
  },
  electrical: {
    key: 'electrical',
    title: 'A burning smell, scorch marks, a tingle from a tap, or water near electrics',
    doNow: ['Switch off at the main switch, if it is safe to.', 'Keep clear of it.', 'Reset a tripped breaker once only. If it trips again, leave it off.'],
  },
  flood: {
    key: 'flood',
    title: 'A burst pipe or water pouring in',
    doNow: ['Turn the water off at the toby — the tap by the road-side meter.', 'Open taps to drain the pipes.', 'Switch off power to the wet area, if it is safe to.', 'Move your belongings and take photos.'],
  },
  sewage: { key: 'sewage', title: 'Sewage coming up', doNow: ['Stop using water.', 'Keep children and pets away.'] },
  cylinder: { key: 'cylinder', title: 'A leaking hot water cylinder', doNow: ['Turn off its power.', 'Turn off its water supply valve.'] },
}

/** What each urgency tier means, in the words of the test that defines it. */
export const URGENCY: Record<Urgency, { label: string; test: string }> = {
  emergency: { label: 'Emergency', test: 'An immediate risk to people or the home, or an essential service is out.' },
  urgent: { label: 'Urgent', test: 'An essential is out, with no immediate danger.' },
  routine: { label: 'Routine', test: 'Inconvenient, not essential.' },
}

/**
 * Examples of who usually pays, from Tenancy Services and Tribunal practice.
 * Examples, not rulings: each case turns on its own facts.
 */
export const LIABILITY_EXAMPLES = {
  wearAndTear: ['Carpet worn thin where people walk', 'Taps and washers wearing out', 'A stove element failing from normal cooking', 'A genuine accident that was neither careless nor intentional'],
  tenant: ['A drain blocked by grease or something dropped down it', 'Burn marks or drink stains on carpet', 'Lost keys or remotes', 'Damage caused by a pet'],
}

/* ───────────────────────────────── sorting ──────────────────────────────── */

interface DangerRule {
  id: string
  test: RegExp
  urgency: Urgency
  trade: string | null
  hazard: HazardKey | null
  why: string
}

/** Read in order; the first that matches (and is not negated) wins. */
const DANGER: DangerRule[] = [
  {
    id: 'gas',
    test: /\bsmell\w*\s+(of\s+|like\s+)?gas\b|\bgas\s+(smell|leak|is\s+leaking|hissing)|\bleaking\s+gas\b|\brotten\s+eggs?\b/,
    urgency: 'emergency',
    trade: 'Gasfitter',
    hazard: 'gas',
    why: 'A gas smell is an immediate risk to everyone in the home, so this is an emergency however small it seems.',
  },
  {
    id: 'fire',
    test: /\bburning\s+smell|\bsmell\w*\s+(of\s+|like\s+)?(burning|smoke|melting)|\bscorch|\bspark(s|ing|ed)?\b|\bsmok(e|ing)\s+(is\s+)?(coming|from|out)|\bmelt(ed|ing)\b|\bon\s+fire\b|\bcaught\s+fire\b|\bflames?\b/,
    urgency: 'emergency',
    trade: 'Electrician',
    hazard: 'electrical',
    why: 'Sparks, smoke or a burning smell is a fire risk, so this is an emergency.',
  },
  {
    id: 'shock',
    test: /\belectric\w*\s+shock|\b(got|get|gets|gave|gives)\s+(me\s+|us\s+)?(a\s+|an\s+)?(electric\s+)?shock|\bshock\s+(from|off)\b|\btingl(e|es|ing)\b|\bexposed\s+wir|\blive\s+wire|\bwater\b[^.]{0,40}\b(switchboard|fuse\s*box|power\s*point|socket|light\s+fitting|wiring|electrics?)\b|\b(switchboard|fuse\s*box|power\s*point|socket|light\s+fitting|wiring)\b[^.]{0,40}\b(is\s+|are\s+|got\s+)?(wet|dripping|under\s+water)\b/,
    urgency: 'emergency',
    trade: 'Electrician',
    hazard: 'electrical',
    why: 'Water or bare wiring near electricity can make a home live, so this is an emergency.',
  },
  {
    id: 'sewage',
    test: /\bsewage\b|\bsewer(age)?\b|\beffluent\b|\btoilet\b[^.]{0,30}\boverflow|\boverflowing\s+toilet|\bgully\s+trap\b[^.]{0,30}\boverflow/,
    urgency: 'emergency',
    trade: 'Plumber',
    hazard: 'sewage',
    why: 'Sewage in or around the home is a health risk, so this is an emergency.',
  },
  {
    id: 'flood',
    test: /\bflood(s|ed|ing)?\b|\bburst\b|\bgushing\b|\bpouring\b|\bwater\b[^.]{0,30}\b(everywhere|through\s+the\s+ceiling|coming\s+through)|\bceiling\b[^.]{0,30}\b(bulging|sagging|collaps)/,
    urgency: 'emergency',
    trade: 'Plumber',
    hazard: 'flood',
    why: 'Water escaping at this rate damages the home by the minute, so this is an emergency.',
  },
  {
    id: 'no_water',
    test: /\bno\s+(running\s+)?water\s+(at\s+all|anywhere|in\s+the\s+(whole\s+)?(house|home|flat|unit|place)|to\s+the\s+(house|home|flat|unit|property))|\bno\s+(running\s+)?water\s*[.!]?$|\bwater\s+(is\s+|has\s+been\s+)?(off|cut\s+off)\b/,
    urgency: 'emergency',
    trade: 'Plumber',
    hazard: null,
    why: 'The home has lost its water, which is an essential service, so this is an emergency.',
  },
  {
    id: 'only_toilet',
    test: /\bonly\s+(toilet|loo)\b/,
    urgency: 'emergency',
    trade: 'Plumber',
    hazard: null,
    why: 'The only toilet in the home is out of use, so this is an emergency.',
  },
  {
    id: 'break_in',
    test: /\bbreak[- ]?in\b|\bbroken\s+into\b|\bburgl|\bforced\s+(the\s+)?(door|window|lock)|\bkicked\s+in\b/,
    urgency: 'emergency',
    trade: 'Locksmith',
    hazard: null,
    why: 'The home cannot be secured after a break-in, so this is an emergency.',
  },
  {
    id: 'insecure',
    test: /\b(can\s?not|can'?t|cannot|could\s?n'?t|could\s+not|won'?t|will\s+not|does\s?n'?t|does\s+not|unable\s+to|no\s+way\s+to)\s+(be\s+)?(lock|secure|latch|close|shut)\w*|\b(lock|deadlock|latch)\b[^.]{0,30}\b(broken|snapped|jammed|fell\s+off)|\bunlockable\b|\bnot\s+secure\b|\binsecure\b|\bsmashed\s+(window|door|glass)/,
    urgency: 'urgent',
    trade: 'Locksmith',
    hazard: null,
    why: 'A home that cannot be locked is not secure, so this is urgent: a same-day job.',
  },
]

/** For "Something else": the best guess at a tier and a trade from the words alone. */
const GUESS: { test: RegExp; urgency: Urgency; trade: string; why: string }[] = [
  { test: /\b(roof|ceiling)\b[^.]{0,40}\bleak|\bleak\w*\b[^.]{0,40}\b(roof|ceiling)\b/, urgency: 'urgent', trade: 'Roofer', why: 'A leak through the roof or ceiling gets worse with every shower of rain, so this is urgent.' },
  { test: /\bhot\s+water\b/, urgency: 'urgent', trade: 'Plumber', why: 'Hot water is an essential, and there is no immediate danger, so this is urgent.' },
  { test: /\b(oven|cooktop|stove|hob)\b/, urgency: 'urgent', trade: 'Electrician', why: 'Cooking is an essential, and there is no immediate danger, so this is urgent.' },
  { test: /\bsmoke\s+alarm/, urgency: 'urgent', trade: 'Handyman', why: 'Working smoke alarms are your landlord’s job to keep working, so this is urgent.' },
  { test: /\b(broken|cracked)\s+(window|glass|pane)|\b(window|pane)\b[^.]{0,20}\b(broken|cracked)/, urgency: 'urgent', trade: 'Glazier', why: 'A broken window leaves the home less secure and open to the weather, so this is urgent.' },
  { test: /\b(heat\s?pump|heater|heating)\b/, urgency: 'routine', trade: 'Heat pump technician', why: 'Heating has a fault but nothing points to danger, so this starts as routine.' },
  { test: /\b(tap|pipe|drain|toilet|cistern|shower|leak\w*|plumbing)\b/, urgency: 'routine', trade: 'Plumber', why: 'This sounds like plumbing with no water escaping fast, so it starts as routine.' },
  { test: /\b(power|socket|switch|light|electric\w*|fuse|breaker)\b/, urgency: 'routine', trade: 'Electrician', why: 'This sounds electrical with nothing pointing to danger, so it starts as routine.' },
  { test: /\b(gutter|downpipe|spouting)\b/, urgency: 'routine', trade: 'Handyman', why: 'Gutters and downpipes are worth fixing before the next heavy rain, but nothing is at risk today, so this is routine.' },
  { test: /\b(door|hinge|handle|cupboard|drawer|window|latch)\b/, urgency: 'routine', trade: 'Handyman', why: 'This is a fitting that has worn or come loose: inconvenient, not essential, so it is routine.' },
]

/** Words that suggest the people living there may have caused it. A prompt to check, nothing more. */
const CAUSE_WORDS = /\b(dropped|knocked|spil(t|led)|we\s+broke|i\s+broke|accident\w*|slammed|kicked|punched|party|the\s+kids?|my\s+(son|daughter|child)|toy|hair\s*ties?|cotton\s+buds?|wipes|napp(y|ies)|grease|fat|food\s+scraps|lost\s+(my|the|our)\s+keys?|locked\s+(myself|ourselves)\s+out|chew(ed)?|scratch(ed)?|our\s+(dog|cat)|my\s+(dog|cat))\b/

const NEGATION = /\b(no|not|without|never|isn'?t|aren'?t|wasn'?t|don'?t|doesn'?t|didn'?t|can'?t|cannot)\s+(any\s+|a\s+|the\s+|sign\s+of\s+)?$/

function firstDanger(text: string): DangerRule | undefined {
  for (const rule of DANGER) {
    const m = rule.test.exec(text)
    if (!m) continue
    // "There is no gas smell" should not be sorted as a gas leak.
    if (rule.id !== 'insecure' && rule.id !== 'no_water' && NEGATION.test(text.slice(Math.max(0, m.index - 24), m.index))) continue
    return rule
  }
  return undefined
}

function isWinter(today: ISODate | undefined): boolean {
  if (!today) return false
  const month = Number(today.slice(5, 7))
  return month >= 6 && month <= 8
}

const CAUSE_SENTENCE = ' What caused it decides who pays, so the tradesperson will record what they find.'

/**
 * Sorts a report. `issueKey` is the kind of problem the renter picked;
 * `today` matters only for heating, which is urgent in winter.
 */
export function triage(description: string, issueKey: string, today?: ISODate): Triage {
  const issue = issueOf(issueKey)
  const text = description.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim()
  const causeFlag = Boolean(issue.causeNote) || CAUSE_WORDS.test(text)
  const finish = (urgency: Urgency, confidence: number, reasoning: string, trade: string): Triage => ({
    urgency,
    confidence,
    reasoning: causeFlag ? reasoning + CAUSE_SENTENCE : reasoning,
    possibleTenantFault: causeFlag,
    suggestedTrade: trade,
  })

  const danger = firstDanger(text)
  if (danger) return finish(danger.urgency, 0.95, danger.why, danger.trade ?? issue.trade)

  // A fault that is always an emergency whatever the description says.
  if (issue.urgency === 'emergency') return finish('emergency', 0.9, issue.because, issue.trade)

  if (issue.key === 'other') {
    const guess = GUESS.find((g) => g.test.test(text))
    if (guess) return finish(guess.urgency, 0.7, guess.why, guess.trade)
    return finish('routine', text.length > 0 ? 0.5 : 0.4, issue.because, issue.trade)
  }

  if (issue.key === 'heat_pump' && isWinter(today)) {
    return finish('urgent', 0.88, 'The heat pump is this home’s heater and it is winter, so this is urgent.', issue.trade)
  }
  if (issue.key === 'no_power' && /\b(neighbou?rs?|street|whole\s+road|outage|lines\s+company)\b/.test(text)) {
    return finish('routine', 0.8, 'The power is out along the street, which is the lines company’s to fix rather than a fault in the home, so this is routine.', issue.trade)
  }
  if (issue.key === 'blocked_sink' && /\bonly\s+(sink|basin)\b/.test(text)) {
    return finish('urgent', 0.88, 'It is the only sink in the home, so this is urgent.', issue.trade)
  }
  if (issue.key === 'mould' && /\b(leak\w*|after\s+rain|ceiling|asthma|breathing|unwell|sick)\b/.test(text)) {
    return finish('urgent', 0.8, 'Mould with a leak behind it, or that is affecting someone’s health, is urgent.', issue.trade)
  }
  if (issue.key === 'low_pressure' && /\b(damp\s+ground|meter\s+(is\s+)?spinning|hidden\s+leak|leak\w*)\b/.test(text)) {
    return finish('urgent', 0.8, 'A sudden drop in pressure with signs of a leak is urgent: water is going somewhere it should not.', issue.trade)
  }
  if (issue.key === 'garage_door' && /\b(car\s+(is\s+)?(stuck|trapped)|can'?t\s+get\s+(the\s+|my\s+)?car)\b/.test(text)) {
    return finish('urgent', 0.8, 'The car is trapped inside, so this is urgent.', issue.trade)
  }
  return finish(issue.urgency, 0.85, issue.because, issue.trade)
}

/** The safety advice that applies to a report: the issue's own, plus anything the description raises. */
export function hazardsFor(description: string, issueKey: string): Hazard[] {
  const issue = issueOf(issueKey)
  const text = description.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim()
  const danger = firstDanger(text)
  const keys: HazardKey[] = []
  if (danger?.hazard) keys.push(danger.hazard)
  if (danger?.id === 'fire') keys.unshift('fire')
  for (const k of issue.hazards) if (!keys.includes(k)) keys.push(k)
  // Only the advice that fits: a described danger shows first; an issue's standing caveats follow.
  return keys.map((k) => HAZARDS[k])
}

/**
 * Whether a tradesperson is sent straight away or a quote is asked for first.
 * Anything urgent goes; anything routine goes only if its usual cost sits
 * inside the limit the landlord set for this home.
 */
export function dispatchMode(urgency: Urgency, cost: CostRange | null, autoApproveLimit: number): Ticket['mode'] {
  if (urgency !== 'routine') return 'auto_dispatch'
  if (cost && !cost.openEnded && cost.high <= autoApproveLimit) return 'auto_dispatch'
  return 'quote_first'
}
