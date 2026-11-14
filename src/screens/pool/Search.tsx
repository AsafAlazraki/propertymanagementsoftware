/**
 * Pool — Search.
 *
 * What this screen does that no other does: it shows every home a renter could
 * live in as a place, at a price that is the price. On a phone the map fills
 * the screen and the results rest over it in a sheet you can pull up; with more
 * room the same results sit beside a map that stays put while they scroll.
 *
 * The list is the accessible equivalent of the map, and the fallback for it:
 * where a browser cannot draw the map at all, the list is the whole screen and
 * says why.
 */
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { CaretUp, Faders, HouseLine, MapTrifold, Tag, X } from '@phosphor-icons/react'
import { fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { Page } from '@/shell/common'
import { Button } from '@/ui/Button'
import { Why } from '@/ui/Law'
import { useViewport } from '@/ui/hooks'
import { cn } from '@/ui/cn'
import { useMyProfile } from './shared'
import { FiltersSheet } from './search/FiltersSheet'
import { ListingCard } from './search/ListingCard'
import type { Pin } from './search/MapCanvas'
import { filterCount, isLive, matches, type Filters } from './search/params'
import { ResultsSheet, sheetVisible, type Detent } from './search/ResultsSheet'

// The map engine is fetched only when search is opened.
const MapCanvas = lazy(() => import('./search/MapCanvas'))

const route = getRouteApi('/pool/search')

type MapState = 'ok' | 'webgl' | 'tiles'

const MAP_UNAVAILABLE: Record<Exclude<MapState, 'ok'>, string> = {
  webgl: 'This browser cannot draw the map — it needs WebGL 2 — so here is the same search as a list.',
  tiles: 'The map could not be loaded just now, which usually means no connection. Here is the same search as a list.',
}

function hasWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'))
  } catch {
    return false
  }
}

/** The height of an element, kept current. The ref is a setter so the measurement restarts if the element is swapped. */
function useHeight(): [(el: HTMLDivElement | null) => void, number] {
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => setHeight(el.clientHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [el])
  return [setEl, height]
}

function MapLoading() {
  return (
    <div className="grid size-full place-items-center bg-sunken">
      <p className="flex items-center gap-2 text-[13px] text-ink-3">
        <MapTrifold className="size-5 animate-pulse" aria-hidden />
        Loading the map…
      </p>
    </div>
  )
}

/** The promise that makes this search different, where the prices are. */
function FixedPriceNote({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-accent-soft px-3.5 py-3 text-[13px] leading-relaxed text-ink', className)}>
      <Tag weight="fill" className="size-4 shrink-0 text-accent-text" aria-hidden />
      <p className="min-w-0 flex-1 basis-56">Every price is one fixed weekly rent. There is no way to offer more here, so nobody is outbid.</p>
      <Why rule="listing.bidding_banned" label="No rent bidding" />
    </div>
  )
}

function NoResults({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className="rounded-xl bg-surface px-6 py-10 text-center shadow-card">
      <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-sunken text-ink-3">
        <HouseLine weight="fill" className="size-6" aria-hidden />
      </span>
      <p className="text-[16px] font-semibold text-ink">{filtered ? 'No homes match those filters' : 'No homes are listed right now'}</p>
      <p className="mx-auto mt-1 max-w-sm text-[14px] leading-relaxed text-ink-2">{filtered ? 'Loosen one of them — a higher weekly rent or a later move-in date usually brings a few back.' : 'New homes appear here the moment a landlord publishes them. Check back soon.'}</p>
      {filtered && (
        <Button intent="soft" className="mt-4 rounded-full" onClick={onClear}>
          Clear the filters
        </Button>
      )}
    </div>
  )
}

export function Search() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const vp = useViewport()
  const day = useToday()
  const reduced = useReducedMotion()
  const properties = useStore((s) => s.db.properties)
  const saved = useMyProfile().savedPropertyIds
  const [mapState, setMapState] = useState<MapState>(() => (hasWebGL2() ? 'ok' : 'webgl'))
  const [hovered, setHovered] = useState<string>()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detent, setDetent] = useState<Detent>('peek')
  const [box, height] = useHeight()

  const filters: Filters = useMemo(() => ({ beds: search.beds, max: search.max, pets: search.pets, by: search.by }), [search.beds, search.max, search.pets, search.by])
  const live = useMemo(() => properties.filter(isLive), [properties])
  const homes = useMemo(() => live.filter((h) => matches(h, filters)).sort((a, b) => a.listing.availableFrom.localeCompare(b.listing.availableFrom) || a.listing.advertisedWeeklyRent - b.listing.advertisedWeeklyRent), [live, filters])
  const pins: Pin[] = useMemo(() => homes.map((h) => ({ id: h.id, lng: h.geo.lng, lat: h.geo.lat, rent: h.listing.advertisedWeeklyRent, label: `${h.address.line1}, ${h.address.suburb}`, saved: saved.includes(h.id) })), [homes, saved])
  const selected = homes.some((h) => h.id === search.sel) ? search.sel : undefined
  const active = filterCount(filters)
  const mapOk = mapState === 'ok'

  const apply = (f: Filters) => void navigate({ search: (prev) => ({ sel: prev.sel, ...f }), replace: true })
  const clear = () => apply({})
  const select = (id: string | undefined) => void navigate({ search: (prev) => ({ ...prev, sel: id }), replace: true })

  // A pill chosen on the map brings its card into view; on a phone the sheet rises to show it.
  const fromMap = useRef(false)
  const pickOnMap = (id: string) => {
    fromMap.current = true
    if (detent === 'peek') setDetent('half')
    select(id)
  }
  useEffect(() => {
    if (!selected || !fromMap.current) return
    fromMap.current = false
    const frame = requestAnimationFrame(() => document.getElementById(`home-${selected}`)?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' }))
    return () => cancelAnimationFrame(frame)
  }, [selected, reduced])

  const chips: { key: keyof Filters; label: string }[] = [
    ...(filters.beds ? [{ key: 'beds' as const, label: `${filters.beds}+ bedrooms` }] : []),
    ...(filters.max ? [{ key: 'max' as const, label: `Up to ${money(filters.max)}` }] : []),
    ...(filters.by ? [{ key: 'by' as const, label: `By ${fmtDate(filters.by, { weekday: false })}` }] : []),
    ...(filters.pets ? [{ key: 'pets' as const, label: 'Pets considered' }] : []),
  ]

  const filterButton = (
    <button type="button" onClick={() => setFiltersOpen(true)} className="pressable inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-surface px-4 text-[14px] font-semibold text-ink shadow-pop">
      <Faders weight="bold" className="size-[18px]" aria-hidden />
      Filters
      {active > 0 && <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] leading-none text-accent-ink">{active}</span>}
    </button>
  )

  // The pin on a card: on a phone it drops the sheet out of the way so the map can show the home.
  const showOnMap = (id: string) => {
    if (vp.phone) setDetent('peek')
    select(id === selected && !vp.phone ? undefined : id)
  }
  const cards = (layout: 'tall' | 'row', withMap: boolean): ReactNode =>
    homes.map((h) => <ListingCard key={h.id} home={h} today={day} layout={layout} selected={h.id === selected} onHover={withMap ? setHovered : undefined} onShowOnMap={withMap ? showOnMap : undefined} />)

  const sheet = <FiltersSheet open={filtersOpen} applied={filters} homes={live} today={day} onApply={apply} onClose={() => setFiltersOpen(false)} />
  const countLine = `${homes.length} ${homes.length === 1 ? 'home' : 'homes'}`

  /* ── phone: the map is the screen, the results are a sheet over it ── */
  if (vp.phone && mapOk) {
    return (
      <div ref={box} className="relative isolate -mb-5 overflow-hidden bg-sunken" style={{ height: 'calc(100dvh - 7rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' }}>
        <h1 className="sr-only">Search homes to rent</h1>
        <Suspense fallback={<MapLoading />}>
          <MapCanvas
            pins={pins}
            selectedId={selected}
            hoveredId={hovered}
            onSelect={pickOnMap}
            onUnavailable={setMapState}
            inset={{ top: 60, bottom: Math.min(sheetVisible(height, detent === 'full' ? 'half' : detent), height) }}
            className="absolute inset-0"
            controlsClassName="right-3 top-[4.25rem]"
            attributionClassName="left-3 top-[4.25rem]"
          />
        </Suspense>
        <div className="absolute inset-x-3 top-3 z-30 flex items-center justify-between gap-2">
          {filterButton}
          <span className="num inline-flex h-11 items-center rounded-full bg-surface px-4 text-[13px] font-medium text-ink-2 shadow-pop">{countLine}</span>
        </div>
        <ResultsSheet
          height={height}
          detent={detent}
          onDetent={setDetent}
          header={
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[15px] font-semibold text-ink">
                {countLine} <span className="font-normal text-ink-3">· one fixed rent each</span>
              </p>
              <button type="button" onClick={() => setDetent(detent === 'full' ? 'peek' : 'full')} className="pressable inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-sunken px-4 text-[14px] font-semibold text-ink">
                {detent === 'full' ? <MapTrifold weight="fill" className="size-[18px]" aria-hidden /> : <CaretUp weight="bold" className="size-4" aria-hidden />}
                {detent === 'full' ? 'Map' : 'List'}
              </button>
            </div>
          }
        >
          <FixedPriceNote className="mb-3" />
          {homes.length === 0 ? <NoResults filtered={active > 0} onClear={clear} /> : <ul className="grid grid-cols-[minmax(0,1fr)] gap-3">{cards('tall', true)}</ul>}
        </ResultsSheet>
        {detent === 'full' && (
          <button type="button" onClick={() => setDetent('peek')} className="pressable absolute bottom-4 left-1/2 z-30 inline-flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 text-[15px] font-semibold text-bg shadow-pop">
            <MapTrifold weight="fill" className="size-5" aria-hidden />
            Map
          </button>
        )}
        <span className="sr-only" aria-live="polite">
          {countLine} match your search.
        </span>
        {sheet}
      </div>
    )
  }

  /* ── everything wider, and any screen where the map cannot be drawn ── */
  return (
    <Page wide>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 sm:mb-6">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">Nelson and Tasman</p>
          <h1 className="display text-[30px] text-ink sm:text-[38px]">{homes.length === 0 ? 'No homes match yet.' : `${countLine} to rent, each at one fixed price.`}</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={() => apply({ ...filters, [c.key]: undefined })} aria-label={`Remove the filter: ${c.label}`} className="pressable inline-flex h-11 items-center gap-1.5 rounded-full bg-accent-soft pr-3 pl-4 text-[13px] font-medium text-accent-text">
              {c.label}
              <X weight="bold" className="size-3.5" aria-hidden />
            </button>
          ))}
          {filterButton}
        </div>
      </header>

      {!mapOk && (
        <p role="status" className="mb-5 flex items-start gap-2.5 rounded-lg bg-sunken p-3.5 text-[14px] leading-relaxed text-ink-2">
          <MapTrifold className="mt-0.5 size-[18px] shrink-0 text-ink-3" aria-hidden />
          {MAP_UNAVAILABLE[mapState]}
        </p>
      )}

      <div className={cn('grid grid-cols-[minmax(0,1fr)] items-start gap-5', mapOk && 'md:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,44rem)_minmax(0,1fr)]')}>
        <div className="min-w-0">
          <FixedPriceNote className="mb-4" />
          {homes.length === 0 ? (
            <NoResults filtered={active > 0} onClear={clear} />
          ) : (
            <ul className={cn('grid grid-cols-[minmax(0,1fr)] gap-4', mapOk ? 'xl:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4')}>{cards(vp.short && mapOk ? 'row' : 'tall', mapOk)}</ul>
          )}
        </div>
        {mapOk && (
          <div className="sticky top-[4.5rem] h-[calc(100dvh-5.5rem)] overflow-hidden rounded-xl shadow-card lg:top-20 lg:h-[calc(100dvh-6rem)] short:!top-3 short:!h-[calc(100dvh-1.5rem)]">
            <Suspense fallback={<MapLoading />}>
              <MapCanvas pins={pins} selectedId={selected} hoveredId={hovered} onSelect={pickOnMap} onUnavailable={setMapState} className="size-full" controlsClassName="right-3 top-3" attributionClassName="right-3 bottom-3" />
            </Suspense>
          </div>
        )}
      </div>
      {sheet}
    </Page>
  )
}
