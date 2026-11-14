/**
 * The results sheet on a phone: a panel that rests over the map at three
 * heights — a peek that shows the count, half, and the full list.
 *
 * It is deliberately not a dialog. The map behind it stays live, focus is never
 * trapped, and nothing dismisses it; it is a region of the page that can be
 * dragged by its handle or stepped through with a tap on the same handle, so
 * there is always a way to move it without dragging. The list inside scrolls on
 * its own, sized to whatever part of the sheet is on screen.
 */
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from 'motion/react'
import { cn } from '@/ui/cn'

export type Detent = 'peek' | 'half' | 'full'

/** Space kept clear above the sheet at full height, so the search controls stay reachable. */
export const SHEET_TOP_GAP = 68
/** How much of the sheet shows when it is resting at the bottom. */
export const SHEET_PEEK = 84
const HEADER = 84
const ORDER: Detent[] = ['full', 'half', 'peek']
const NEXT: Record<Detent, Detent> = { peek: 'half', half: 'full', full: 'peek' }
const SAY: Record<Detent, string> = { peek: 'tucked away', half: 'half open', full: 'fully open' }

/** The part of the sheet that is on screen at each resting height. */
export function sheetVisible(height: number, detent: Detent): number {
  return detent === 'peek'
    ? SHEET_PEEK
    : detent === 'half'
      ? Math.round(height * 0.52)
      : Math.max(0, height - SHEET_TOP_GAP)
}

export function ResultsSheet({
  height,
  detent,
  onDetent,
  header,
  children,
  className,
}: {
  height: number
  detent: Detent
  onDetent: (d: Detent) => void
  header: ReactNode
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  const controls = useDragControls()
  const sheetHeight = Math.max(0, height - SHEET_TOP_GAP)
  const offsets = useMemo(
    () => ({
      full: 0,
      half: Math.max(0, sheetHeight - sheetVisible(height, 'half')),
      peek: Math.max(0, sheetHeight - SHEET_PEEK),
    }),
    [height, sheetHeight],
  )
  const y = useMotionValue(offsets[detent])
  const listHeight = useTransform(y, (v) => Math.max(0, sheetHeight - v - HEADER))
  const placed = useRef(false)

  useEffect(() => {
    if (height === 0) return
    // The first placement, once the container has been measured, is not a movement.
    if (!placed.current || reduced) {
      y.set(offsets[detent])
      placed.current = true
      return
    }
    const running = animate(y, offsets[detent], { type: 'spring', duration: 0.45, bounce: 0 })
    return () => running.stop()
  }, [detent, offsets, height, reduced, y])

  const settle = (_: unknown, info: PanInfo) => {
    // Where the sheet would come to rest if it kept going: a flick counts as well as a drag.
    const landing = y.get() + info.velocity.y * 0.18
    const next = ORDER.reduce(
      (best, d) => (Math.abs(offsets[d] - landing) < Math.abs(offsets[best] - landing) ? d : best),
      detent,
    )
    if (next === detent)
      animate(y, offsets[next], reduced ? { duration: 0 } : { type: 'spring', duration: 0.4, bounce: 0 })
    else onDetent(next)
  }

  if (height === 0) return null
  return (
    <motion.section
      aria-label="Homes that match"
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: offsets.peek }}
      dragElastic={0.04}
      dragMomentum={false}
      onDragEnd={settle}
      style={{ y, height: sheetHeight, top: SHEET_TOP_GAP }}
      className={cn('absolute inset-x-0 z-20 flex flex-col rounded-t-xl bg-surface shadow-sheet', className)}
    >
      <div
        onPointerDown={(e) => controls.start(e)}
        className="shrink-0 cursor-grab touch-none px-4 pb-3 select-none active:cursor-grabbing"
        style={{ height: HEADER }}
      >
        <button
          type="button"
          onClick={() => onDetent(NEXT[detent])}
          aria-label={`The list of homes is ${SAY[detent]}. Tap to make it ${SAY[NEXT[detent]]}.`}
          className="mx-auto flex h-7 w-24 items-center justify-center rounded-full"
        >
          <span aria-hidden className="h-1.5 w-11 rounded-full bg-line-strong" />
        </button>
        {header}
      </div>
      <motion.div
        style={{ height: listHeight }}
        className="min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-6"
      >
        {/* At the peek the list is 0px tall. Without `inert` its cards would still take focus where nobody can see them. */}
        <div inert={detent === 'peek'}>{children}</div>
      </motion.div>
    </motion.section>
  )
}
