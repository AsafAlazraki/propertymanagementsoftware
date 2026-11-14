import { cn } from './cn'

/**
 * The marks. Loop is a closed circuit with one bright point travelling it —
 * work that comes back round without being pushed. Pool is a drop landing and
 * the ring it leaves. Side by side, the ring of one is the ripple of the other.
 */
export function LoopMark({ size = 28, className, title = 'Loop' }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title} className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="9" fill="oklch(0.205 0.04 260)" />
      <circle cx="16" cy="16" r="8.25" fill="none" stroke="oklch(0.82 0.15 168)" strokeWidth="3" strokeLinecap="round" strokeDasharray="42 10" transform="rotate(-58 16 16)" />
      <circle cx="22.9" cy="11.5" r="2.6" fill="oklch(0.97 0.03 168)" />
    </svg>
  )
}

export function PoolMark({ size = 28, className, title = 'Pool' }: { size?: number; className?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={title} className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="9" fill="oklch(0.58 0.2 30)" />
      <path d="M16 6.5c3.1 3.6 4.9 6.2 4.9 8.7a4.9 4.9 0 0 1-9.8 0c0-2.5 1.8-5.1 4.9-8.7Z" fill="oklch(0.995 0.01 60)" />
      <path d="M7.5 23.2c2.3 1.9 5.2 2.9 8.5 2.9s6.2-1 8.5-2.9" fill="none" stroke="oklch(0.92 0.09 70)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function AdminMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Loop & Pool team console" className={cn('shrink-0', className)}>
      <rect width="32" height="32" rx="9" fill="oklch(0.175 0.012 285)" />
      <circle cx="12.5" cy="16" r="5.6" fill="none" stroke="oklch(0.78 0.16 290)" strokeWidth="2.6" />
      <circle cx="19.5" cy="16" r="5.6" fill="none" stroke="oklch(0.95 0.01 285)" strokeWidth="2.6" opacity="0.85" />
    </svg>
  )
}

/** Both brands as one lockup, for the places that belong to neither. */
export function Lockup({ className, size = 30 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="inline-flex -space-x-1.5">
        <LoopMark size={size} className="relative z-10 rounded-[9px] ring-2 ring-[var(--lockup-ring,transparent)]" />
        <PoolMark size={size} />
      </span>
      <span className="display text-[17px] tracking-[-0.02em]">
        Loop <span className="font-normal opacity-55">&amp;</span> Pool
      </span>
    </span>
  )
}
