/**
 * Search state that lives in the address bar, so a search can be bookmarked,
 * shared, and survives the back button: the four filters and the home that is
 * selected on the map.
 */
import type { ISODate, Property } from '@/domain/types'

export interface HomeSearch {
  /** At least this many bedrooms. */
  beds?: number
  /** Weekly rent no higher than this. */
  max?: number
  /** Only listings that say a pet will be considered. */
  pets?: boolean
  /** Available on or before this date. */
  by?: ISODate
  /** The selected home. */
  sel?: string
}

export type Filters = Pick<HomeSearch, 'beds' | 'max' | 'pets' | 'by'>

export function parseHomeSearch(search: Record<string, unknown>): HomeSearch {
  const beds = Number(search.beds)
  const max = Number(search.max)
  return {
    beds: Number.isInteger(beds) && beds >= 1 && beds <= 6 ? beds : undefined,
    max: Number.isFinite(max) && max > 0 ? Math.round(max) : undefined,
    pets: search.pets === true || search.pets === 'true' ? true : undefined,
    by: typeof search.by === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(search.by) ? search.by : undefined,
    sel: typeof search.sel === 'string' && search.sel ? search.sel : undefined,
  }
}

export type LiveListing = Property & { listing: NonNullable<Property['listing']> }

export function isLive(p: Property): p is LiveListing {
  return p.listing?.status === 'live'
}

export function matches(p: LiveListing, f: Filters): boolean {
  if (f.beds && p.beds < f.beds) return false
  if (f.max && p.listing.advertisedWeeklyRent > f.max) return false
  if (f.pets && !p.listing.petsConsidered) return false
  if (f.by && p.listing.availableFrom > f.by) return false
  return true
}

export function filterCount(f: Filters): number {
  return [f.beds, f.max, f.pets, f.by].filter(Boolean).length
}

export const RENT_STEPS = [400, 450, 500, 550, 600, 650, 700, 800, 900]
