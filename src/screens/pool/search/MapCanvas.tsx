/**
 * The map, and only the map.
 *
 * This file is the one place MapLibre is imported, and the search screen loads
 * it with `import()`, so the 300 kB of map engine is fetched when someone
 * opens search and never sits in the main bundle. MapLibre 6 is ESM-only with
 * a real worker module and needs WebGL 2; set-up follows OpenFreeMap's own
 * Vite example (docs/research/tech-stack-and-ui.md §4.9).
 *
 * Prices are HTML markers rendered by React through portals, so a pill is a
 * real button: focusable, labelled, and styled from the same tokens as the
 * rest of Pool. The list beside the map is the accessible equivalent of it.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LngLatBounds, MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useReducedMotion } from 'motion/react'
import { Heart, Minus, Plus } from '@phosphor-icons/react'
import { money } from '@/domain/rules/format'
import { cn } from '@/ui/cn'

setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
/** Nelson, where every demo home is. */
const HOME_CENTRE: [number, number] = [173.25, -41.29]

export interface Pin {
  id: string
  lng: number
  lat: number
  rent: number
  /** The address, read out with the price. */
  label: string
  saved: boolean
}

export interface MapCanvasProps {
  pins: Pin[]
  selectedId?: string
  hoveredId?: string
  onSelect: (id: string) => void
  /** The map cannot be shown; the caller falls back to the list and says why. */
  onUnavailable: (why: 'webgl' | 'tiles') => void
  /** Parts of the map covered by other things (a sheet, floating controls), in pixels. */
  inset?: { top: number; bottom: number }
  className?: string
  /** Where the zoom buttons and the attribution sit, since each layout has different free corners. */
  controlsClassName?: string
  attributionClassName?: string
}

/** Room to leave around the homes: the caller's covered areas, plus space for a pill and its neighbours. */
function paddingFor(inset: MapCanvasProps['inset']) {
  return { top: (inset?.top ?? 0) + 56, bottom: (inset?.bottom ?? 0) + 28, left: 44, right: 44 }
}

function PricePill({ pin, selected, hovered, onSelect }: { pin: Pin; selected: boolean; hovered: boolean; onSelect: (id: string) => void }) {
  return (
    <button type="button" aria-pressed={selected} aria-label={`${money(pin.rent)} a week, ${pin.label}${pin.saved ? ', saved' : ''}`} onClick={() => onSelect(pin.id)} className="group flex h-11 cursor-pointer flex-col items-center justify-end font-sans outline-none">
      <span
        className={cn(
          'num flex h-8 items-center gap-1 rounded-full px-3 text-[13px] leading-none font-bold whitespace-nowrap shadow-pop transition-[transform,background-color,color] duration-150 ease-out group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[var(--focus)]',
          selected ? 'scale-110 bg-ink text-bg' : hovered ? 'scale-105 bg-accent text-accent-ink' : 'bg-surface text-ink hoverable:group-hover:scale-105',
        )}
      >
        {pin.saved && <Heart weight="fill" className={cn('size-3', selected || hovered ? '' : 'text-accent')} aria-hidden />}
        {money(pin.rent)}
      </span>
      <span aria-hidden className={cn('-mt-1 size-2 rotate-45 rounded-[2px] transition-colors duration-150', selected ? 'bg-ink' : hovered ? 'bg-accent' : 'bg-surface')} />
    </button>
  )
}

export default function MapCanvas({ pins, selectedId, hoveredId, onSelect, onUnavailable, inset, className, controlsClassName, attributionClassName }: MapCanvasProps) {
  const holder = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [mounts, setMounts] = useState<{ id: string; el: HTMLDivElement }[]>([])
  const reduced = useReducedMotion()

  // The latest callbacks and insets, readable from effects that must not re-run when they change.
  const latest = useRef({ onUnavailable, inset, pins, reduced })
  useEffect(() => {
    latest.current = { onUnavailable, inset, pins, reduced }
  })

  useEffect(() => {
    const container = holder.current
    if (!container) return
    let instance: MapLibreMap
    try {
      instance = new MapLibreMap({
        container,
        style: STYLE_URL,
        center: HOME_CENTRE,
        zoom: 10.6,
        minZoom: 7,
        maxZoom: 17,
        // Attribution is drawn below as plain, always-visible text rather than a collapsing control.
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      })
    } catch {
      latest.current.onUnavailable('webgl')
      return
    }
    instance.touchZoomRotate.disableRotation()
    instance.keyboard.disableRotation()
    let styleReady = false
    instance.on('styledata', () => {
      styleReady = true
    })
    // Before the style arrives an error means no map at all: no WebGL 2, or no network. After it, a missed tile is not fatal.
    instance.on('error', (e) => {
      if (styleReady) return
      latest.current.onUnavailable(/webgl/i.test(e.error?.message ?? '') ? 'webgl' : 'tiles')
    })
    setMap(instance)
    return () => {
      instance.remove()
      setMap(null)
    }
  }, [])

  // One marker per home. Rebuilt only when the set of homes changes, not when one is saved or selected.
  const pinKey = pins.map((p) => `${p.id}:${p.lng}:${p.lat}`).join('|')
  const fitted = useRef(false)
  useEffect(() => {
    if (!map) return
    const current = latest.current.pins
    const made = current.map((p) => {
      const el = document.createElement('div')
      const marker = new Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map)
      return { id: p.id, el, marker }
    })
    setMounts(made.map(({ id, el }) => ({ id, el })))
    // Homes close together would put one pill on top of another, and the one underneath could not be pressed.
    // Each is lifted clear of the ones already placed; zooming in brings them back down onto their own spot.
    const spread = () => {
      const placed: { x: number; y: number }[] = []
      const byRow = made.map((m) => ({ m, at: map.project(m.marker.getLngLat()) })).sort((a, b) => b.at.y - a.at.y)
      for (const { m, at } of byRow) {
        let lift = 0
        while (lift < 204 && placed.some((q) => Math.abs(q.x - at.x) < 64 && Math.abs(q.y - (at.y - lift)) < 34)) lift += 34
        m.marker.setOffset([0, -lift])
        placed.push({ x: at.x, y: at.y - lift })
      }
    }
    map.on('moveend', spread)
    if (current.length > 0) {
      const bounds = new LngLatBounds()
      for (const p of current) bounds.extend([p.lng, p.lat])
      map.fitBounds(bounds, { padding: paddingFor(latest.current.inset), maxZoom: 14, duration: fitted.current && !latest.current.reduced ? 500 : 0 })
      fitted.current = true
    }
    spread()
    return () => {
      map.off('moveend', spread)
      for (const m of made) m.marker.remove()
      setMounts([])
    }
  }, [map, pinKey])

  // Bring the selected home into the part of the map that is not covered.
  useEffect(() => {
    if (!map || !selectedId) return
    const pin = latest.current.pins.find((p) => p.id === selectedId)
    if (!pin) return
    const pad = paddingFor(latest.current.inset)
    const at = map.project([pin.lng, pin.lat])
    const box = map.getContainer()
    const visible = at.x > pad.left && at.x < box.clientWidth - pad.right && at.y > pad.top && at.y < box.clientHeight - pad.bottom
    if (!visible) map.easeTo({ center: [pin.lng, pin.lat], padding: pad, duration: latest.current.reduced ? 0 : 450 })
  }, [map, selectedId])

  // The selected pill sits above its neighbours.
  useEffect(() => {
    for (const m of mounts) m.el.style.zIndex = m.id === selectedId ? '3' : m.id === hoveredId ? '2' : '1'
  }, [mounts, selectedId, hoveredId])

  return (
    <div className={cn('relative isolate overflow-hidden bg-sunken', className)}>
      {/* MapLibre's own stylesheet makes this element `position: relative`, and being unlayered it beats any
          Tailwind position utility — so the holder is sized by width and height, never by `absolute inset-0`. */}
      <div ref={holder} className="size-full" />
      {mounts.map(({ id, el }) => {
        const pin = pins.find((p) => p.id === id)
        return pin ? createPortal(<PricePill pin={pin} selected={id === selectedId} hovered={id === hoveredId} onSelect={onSelect} />, el, id) : null
      })}
      {map && (
        <div className={cn('absolute z-10 flex flex-col overflow-hidden rounded-full bg-surface shadow-pop', controlsClassName)}>
          <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn({ duration: reduced ? 0 : 250 })} className="pressable grid size-11 place-items-center text-ink hoverable:hover:bg-sunken">
            <Plus weight="bold" className="size-[18px]" aria-hidden />
          </button>
          <span aria-hidden className="mx-2 h-px bg-line" />
          <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut({ duration: reduced ? 0 : 250 })} className="pressable grid size-11 place-items-center text-ink hoverable:hover:bg-sunken">
            <Minus weight="bold" className="size-[18px]" aria-hidden />
          </button>
        </div>
      )}
      <p className={cn('absolute z-10 max-w-[calc(100%-1.5rem)] rounded-full bg-surface/88 px-2.5 py-1 font-sans text-[10px] leading-tight text-ink-2 backdrop-blur-sm [&_a]:underline [&_a]:underline-offset-2', attributionClassName)}>
        <a href="https://openfreemap.org" target="_blank" rel="noreferrer">
          OpenFreeMap
        </a>{' '}
        <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">
          © OpenMapTiles
        </a>{' '}
        Data from{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap
        </a>
      </p>
    </div>
  )
}
