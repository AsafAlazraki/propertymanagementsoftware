import { Link } from '@tanstack/react-router'
import { Bathtub, Bed, Car, MapPin, PawPrint } from '@phosphor-icons/react'
import { fmtDate } from '@/domain/rules/calendar'
import { Money } from '@/ui/display'
import { PropertyArt } from '@/ui/PropertyArt'
import { cn } from '@/ui/cn'
import { SaveHeart } from '../shared'
import type { LiveListing } from './params'

/**
 * One home in the results. The whole card opens the listing; the heart saves
 * it; the pin shows it on the map. `row` is the compact form for a phone held
 * sideways, where a tall card would fill the screen.
 */
export function ListingCard({
  home,
  today,
  selected,
  layout = 'tall',
  onHover,
  onShowOnMap,
}: {
  home: LiveListing
  today: string
  selected: boolean
  layout?: 'tall' | 'row'
  onHover?: (id: string | undefined) => void
  onShowOnMap?: (id: string) => void
}) {
  const { listing, address } = home
  const row = layout === 'row'
  const availableNow = listing.availableFrom <= today
  return (
    <li
      id={`home-${home.id}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onHover?.(home.id)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onHover?.(undefined)}
      onFocus={() => onHover?.(home.id)}
      onBlur={() => onHover?.(undefined)}
      className={cn(
        'relative min-w-0 scroll-mt-24 overflow-hidden rounded-xl bg-surface transition-shadow duration-200',
        selected ? 'shadow-[0_0_0_2.5px_var(--accent),var(--sh-pop)]' : 'shadow-card hoverable:hover:shadow-pop',
      )}
    >
      <Link to="/pool/listing/$id" params={{ id: home.id }} className={cn('pressable block', row && 'flex')} aria-current={selected ? 'true' : undefined}>
        <PropertyArt kind={home.kind} art={home.art} label="Illustration" className={cn(row ? 'w-32 shrink-0 self-stretch' : 'aspect-[16/10] w-full')} />
        <div className={cn('min-w-0 flex-1', row ? 'p-3 pr-12' : 'p-4')}>
          <p className="flex items-baseline gap-1.5">
            <Money value={listing.advertisedWeeklyRent} className={cn('display text-ink', row ? 'text-[20px]' : 'text-[26px]')} />
            <span className="text-[13px] text-ink-3">a week, fixed</span>
          </p>
          <h3 className={cn('mt-1 font-medium text-ink text-pretty', row ? 'truncate text-[14px]' : 'line-clamp-2 text-[15px] leading-snug')}>{listing.headline}</h3>
          <p className="mt-0.5 truncate text-[13px] text-ink-2">
            {address.line1}, {address.suburb}
          </p>
          <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-2', row ? 'mt-1.5' : 'mt-3', !row && onShowOnMap && 'pr-12')}>
            <li className="inline-flex items-center gap-1">
              <Bed weight="fill" className="size-4 text-ink-3" aria-hidden />
              <span className="num font-medium text-ink">{home.beds}</span>
              <span className="sr-only">bedrooms</span>
            </li>
            <li className="inline-flex items-center gap-1">
              <Bathtub weight="fill" className="size-4 text-ink-3" aria-hidden />
              <span className="num font-medium text-ink">{home.baths}</span>
              <span className="sr-only">bathrooms</span>
            </li>
            <li className="inline-flex items-center gap-1">
              <Car weight="fill" className="size-4 text-ink-3" aria-hidden />
              <span className="num font-medium text-ink">{home.parking}</span>
              <span className="sr-only">car parks</span>
            </li>
            <li className="text-ink-3">{availableNow ? 'Available now' : `From ${fmtDate(listing.availableFrom, { weekday: false })}`}</li>
            {listing.petsConsidered && !row && (
              <li className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-text">
                <PawPrint weight="fill" className="size-3" aria-hidden />
                Pets considered
              </li>
            )}
          </ul>
        </div>
      </Link>
      <SaveHeart propertyId={home.id} label={address.line1} className={cn('absolute', row ? 'top-1.5 right-1.5 size-10 shadow-none' : 'top-2.5 right-2.5')} />
      {onShowOnMap && (
        <button
          type="button"
          aria-label={`Show ${address.line1} on the map`}
          aria-pressed={selected}
          onClick={() => onShowOnMap(home.id)}
          className={cn('pressable absolute grid place-items-center rounded-full transition-colors', row ? 'right-1.5 bottom-1.5 size-10' : 'right-2.5 bottom-2.5 size-11', selected ? 'bg-accent text-accent-ink' : 'bg-sunken text-ink-2 hoverable:hover:text-ink')}
        >
          <MapPin weight="fill" className="size-5" aria-hidden />
        </button>
      )}
    </li>
  )
}
