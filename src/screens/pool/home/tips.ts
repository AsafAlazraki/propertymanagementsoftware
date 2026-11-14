/**
 * One home-care tip for the season.
 *
 * Every tip is a tenant-side nudge from docs/research/operations-domain.md §7,
 * with the source the research names for it. New Zealand seasons: spring is
 * September to November, summer December to February, autumn March to May,
 * winter June to August.
 */
import type { ISODate } from '@/domain/types'

export interface Tip {
  season: 'Spring' | 'Summer' | 'Autumn' | 'Winter'
  title: string
  body: string
  source: string
}

const TIPS: Record<Tip['season'], Tip> = {
  Spring: {
    season: 'Spring',
    title: 'Give the heat pump filters a rinse',
    body: 'Every couple of weeks when it is working hard, or about once a month: vacuum or rinse the filters, let them dry, and clear leaves away from the outdoor unit. It heats and cools better, and costs less to run.',
    source: 'EECA and Tenancy Services',
  },
  Summer: {
    season: 'Summer',
    title: 'Cool the house without the bill',
    body: 'Set the heat pump to 24 °C or higher by day and skip Auto mode. On a breezy day try fan-only with the windows open; on a muggy one, dehumidify mode does more than cooling.',
    source: 'EECA',
  },
  Autumn: {
    season: 'Autumn',
    title: 'Get ahead of mould before winter',
    body: 'Clean off any mould now, and look in wardrobes, cupboards and behind curtains. Check the extractor fans are working — if one is not, report it and your landlord fixes it.',
    source: 'Tenancy Services',
  },
  Winter: {
    season: 'Winter',
    title: 'Warm and dry, every day',
    body: 'Heat the living area to at least 18 °C, and open windows and doors for a while each day, even when it is cold. Run the extractor fans, keep lids on pots, and wipe condensation off the windows.',
    source: 'EECA and Tenancy Services',
  },
}

export function seasonOf(day: ISODate): Tip['season'] {
  const month = Number(day.slice(5, 7))
  return month >= 9 && month <= 11 ? 'Spring' : month === 12 || month <= 2 ? 'Summer' : month <= 5 ? 'Autumn' : 'Winter'
}

export function seasonalTip(day: ISODate): Tip {
  return TIPS[seasonOf(day)]
}
