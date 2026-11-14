import type { Property } from '@/domain/types'
import { cn } from './cn'

/**
 * A drawn picture of a property.
 *
 * The prototype has no photographs and does not pretend to: every home gets
 * an illustration generated from its own record — the building type decides
 * the silhouette, the seed decides the light, the hills and the planting — so
 * a list of properties reads as a list of different places. Decorative: the
 * address beside it is the accessible name.
 */
export function PropertyArt({
  kind,
  art,
  className,
  label,
}: {
  kind: Property['kind']
  art: Property['art']
  className?: string
  /** Small caption burned into the corner, e.g. "Illustration". */
  label?: string
}) {
  const { hue, style } = art
  const light = style % 3 // 0 morning, 1 midday, 2 evening
  const sky = [
    [`oklch(0.9 0.07 ${hue + 40})`, `oklch(0.96 0.05 ${hue + 70})`],
    [`oklch(0.84 0.09 ${hue})`, `oklch(0.95 0.04 ${hue + 20})`],
    [`oklch(0.78 0.1 ${hue - 30})`, `oklch(0.93 0.08 ${hue + 50})`],
  ][light]
  const sunX = [70, 236, 258][light]
  const sunY = [58, 44, 70][light]
  const hillA = `oklch(0.74 0.07 ${hue + 150})`
  const hillB = `oklch(0.66 0.08 ${hue + 160})`
  const ground = `oklch(0.8 0.1 ${hue + 140})`
  const groundDark = `oklch(0.7 0.11 ${hue + 145})`
  const wall = [`oklch(0.97 0.012 ${hue + 60})`, `oklch(0.9 0.035 ${hue + 40})`, `oklch(0.94 0.02 ${hue})`][(style >> 1) % 3]
  const wallShade = `oklch(0.84 0.03 ${hue + 40})`
  const roof = [`oklch(0.42 0.07 ${hue})`, `oklch(0.5 0.12 ${hue - 60})`, `oklch(0.36 0.04 ${hue + 20})`][style % 3]
  const door = `oklch(0.58 0.16 ${hue - 40})`
  const glass = `oklch(0.83 0.06 ${hue - 10})`
  const tree = `oklch(0.56 0.12 ${hue + 150})`
  const treeLight = `oklch(0.68 0.13 ${hue + 140})`
  const id = `pa-${kind}-${hue}-${style}`
  const flip = style % 2 === 1

  return (
    <div className={cn('relative overflow-hidden bg-sunken', className)} aria-hidden>
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky[0]} />
            <stop offset="1" stopColor={sky[1]} />
          </linearGradient>
        </defs>
        <rect width="320" height="200" fill={`url(#${id}-sky)`} />
        <circle cx={sunX} cy={sunY} r="34" fill="white" opacity="0.28" />
        <circle cx={sunX} cy={sunY} r="18" fill="white" opacity="0.75" />
        {/* far range, near hills — Nelson always has hills behind it */}
        <path d="M0 132 C40 96 76 104 112 118 C150 88 196 80 236 108 C268 94 300 100 320 112 L320 200 L0 200Z" fill={hillA} opacity="0.75" />
        <path d="M0 150 C52 126 96 138 140 142 C190 122 250 126 320 146 L320 200 L0 200Z" fill={hillB} opacity="0.85" />
        <rect y="156" width="320" height="44" fill={ground} />
        <path d="M0 172 C80 164 200 180 320 168 L320 200 L0 200Z" fill={groundDark} opacity="0.55" />

        <g transform={flip ? 'translate(320 0) scale(-1 1)' : undefined}>
          {kind === 'house' && (
            <g>
              <rect x="94" y="104" width="132" height="62" fill={wall} />
              <rect x="94" y="104" width="46" height="62" fill={wallShade} opacity="0.55" />
              <path d="M82 108 L160 60 L238 108Z" fill={roof} />
              <rect x="196" y="66" width="12" height="24" fill={roof} />
              <rect x="150" y="128" width="22" height="38" rx="2" fill={door} />
              <rect x="106" y="120" width="28" height="24" rx="2" fill={glass} />
              <rect x="186" y="120" width="28" height="24" rx="2" fill={glass} />
              <path d="M120 120V144M200 120V144" stroke={wall} strokeWidth="2" />
            </g>
          )}
          {kind === 'townhouse' && (
            <g>
              <rect x="104" y="72" width="62" height="94" fill={wall} />
              <rect x="166" y="92" width="56" height="74" fill={wallShade} />
              <path d="M98 76 L172 56 L172 76Z" fill={roof} />
              <rect x="160" y="88" width="68" height="8" fill={roof} />
              <rect x="116" y="88" width="38" height="22" rx="2" fill={glass} />
              <rect x="116" y="126" width="18" height="40" rx="2" fill={door} />
              <rect x="140" y="126" width="16" height="20" rx="2" fill={glass} />
              <rect x="178" y="108" width="34" height="20" rx="2" fill={glass} />
              <rect x="178" y="138" width="34" height="28" rx="2" fill={`oklch(0.72 0.02 ${hue})`} />
            </g>
          )}
          {kind === 'unit' && (
            <g>
              <rect x="56" y="112" width="208" height="54" fill={wall} />
              <path d="M48 116 L272 100 L272 116Z" fill={roof} />
              <rect x="48" y="112" width="224" height="6" fill={roof} />
              {[70, 140, 210].map((x) => (
                <g key={x}>
                  <rect x={x} y="130" width="16" height="36" rx="2" fill={door} />
                  <rect x={x + 24} y="130" width="26" height="20" rx="2" fill={glass} />
                </g>
              ))}
              <path d="M126 112V166M196 112V166" stroke={wallShade} strokeWidth="2" />
            </g>
          )}
          {kind === 'apartment' && (
            <g>
              <rect x="108" y="46" width="104" height="120" fill={wall} />
              <rect x="108" y="46" width="30" height="120" fill={wallShade} opacity="0.6" />
              <rect x="102" y="40" width="116" height="8" fill={roof} />
              {[60, 86, 112].map((y) =>
                [120, 148, 176].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="20" height="16" rx="1.5" fill={glass} />),
              )}
              <rect x="150" y="138" width="20" height="28" rx="2" fill={door} />
              <rect x="116" y="132" width="88" height="4" fill={roof} opacity="0.5" />
            </g>
          )}
          {/* planting */}
          <g>
            <rect x="262" y="128" width="5" height="38" fill={`oklch(0.45 0.05 ${hue + 60})`} />
            <circle cx="264" cy="118" r="22" fill={tree} />
            <circle cx="254" cy="110" r="12" fill={treeLight} opacity="0.8" />
            <ellipse cx="52" cy="160" rx="24" ry="13" fill={tree} />
            <ellipse cx="42" cy="156" rx="12" ry="8" fill={treeLight} opacity="0.8" />
          </g>
        </g>
        {/* path to the door */}
        <path d="M150 166 C150 180 140 190 124 200 L196 200 C180 190 172 180 172 166Z" fill="white" opacity="0.5" />
      </svg>
      {label && (
        <span className="absolute right-1.5 bottom-1.5 rounded-[5px] bg-black/35 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-white uppercase backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  )
}
