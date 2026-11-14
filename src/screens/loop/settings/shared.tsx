import type { ReactNode } from 'react'

/** One part of Settings: what it is, a sentence on what it is for, then the controls. */
export function Section({
  id,
  title,
  lede,
  action,
  children,
}: {
  id: string
  title: string
  lede: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-20 lg:scroll-mt-8">
      <header className="mb-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-64">
          <h2 id={`${id}-title`} className="text-[18px] font-semibold tracking-[-0.015em] text-ink">
            {title}
          </h2>
          <p className="mt-1 max-w-[64ch] text-[13px] leading-relaxed text-ink-2">{lede}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  )
}

/** A quiet sentence under a control that says what the prototype really does. */
export function Truth({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs leading-relaxed text-ink-3">{children}</p>
}
