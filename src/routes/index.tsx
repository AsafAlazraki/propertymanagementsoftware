import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowRight, CheckCircle, Heart, MapPin, SealCheck, ShieldCheck, Wrench } from '@phosphor-icons/react'
import { PERSONAS, signInAs, type Persona } from '@/app/session'
import { useBrand, useThemeColor } from '@/app/theme'
import { LoopMark, PoolMark } from '@/ui/Brand'
import { PropertyArt } from '@/ui/PropertyArt'
import { cn } from '@/ui/cn'

export const Route = createFileRoute('/')({ component: Welcome })

/**
 * The front door. One product, two sides of the same tenancy — so the screen
 * is the two of them meeting. Each half is its own brand at full strength; on
 * a wide screen the half you point at leans in.
 */
function Welcome() {
  useBrand('neutral')
  useThemeColor('#101a2e')
  const navigate = useNavigate()
  const enter = (persona: Persona, to: '/loop' | '/pool' | '/admin') => {
    signInAs(persona)
    void navigate({ to })
  }

  return (
    <main className="flex min-h-dvh flex-col bg-nav">
      <div className="flex flex-1 flex-col md:flex-row short:flex-row">
        {/* ── Loop ── */}
        <section
          data-brand="loop"
          className="group/half relative flex min-h-[50dvh] flex-1 basis-0 flex-col overflow-hidden bg-nav px-6 pt-8 pb-10 text-nav-ink transition-[flex-grow] duration-500 ease-out sm:px-10 md:min-h-0 md:px-12 md:py-12 short:min-h-0 short:px-8 short:py-6 hoverable:md:hover:grow-[1.22] 3xl:px-20"
        >
          <div aria-hidden className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.15_168/0.16),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,oklch(1_0_0/0.035)_1px,transparent_1px),linear-gradient(to_bottom,oklch(1_0_0/0.035)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />

          <header className="relative flex items-center gap-2.5">
            <LoopMark size={34} className="rounded-[10px] ring-1 ring-nav-line" />
            <span className="display text-[21px]">Loop</span>
            <span className="eyebrow ml-1 !text-nav-ink-2">for owners</span>
          </header>

          <div className="relative mt-auto max-w-[34rem] pt-10 short:pt-4">
            <h1 className="display text-[2.35rem] leading-[1.02] text-balance sm:text-[3.1rem] lg:text-[3.6rem] short:text-[2rem]">
              Your rental,
              <br />
              on <span className="text-glow">autopilot</span>.
            </h1>
            <p className="mt-4 max-w-[30rem] text-[15px] leading-relaxed text-nav-ink-2 sm:text-[17px] short:mt-2 short:text-[14px]">
              Rent matched, deadlines watched, repairs dispatched, every notice lawful to the day. You keep the control — and the roughly $3,500 a year per rental a property manager would charge.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 short:mt-3">
              <button
                type="button"
                onClick={() => enter(PERSONAS.landlord, '/loop')}
                className="pressable inline-flex h-12 items-center gap-2 rounded-md bg-glow px-5 text-[15px] font-semibold text-nav shadow-[inset_0_1px_0_oklch(1_0_0/0.35)] hoverable:hover:brightness-105"
              >
                I own a rental
                <ArrowRight weight="bold" className="size-4 transition-transform duration-200 group-hover/half:translate-x-0.5" />
              </button>
              <span className="text-[13px] text-nav-ink-2">Opens the Nelson demo portfolio</span>
            </div>
          </div>

          {/* A live-looking slice of the product, so the promise is not just words. */}
          <ul aria-hidden className="relative mt-8 hidden h-[14.5rem] max-w-[34rem] content-end gap-2 lg:grid short:hidden">
            {[
              { icon: ShieldCheck, tone: 'text-[oklch(0.8_0.15_80)]', title: 'Lodge the bond for 5B Ngaio Street', meta: '7 working days left' },
              { icon: Wrench, tone: 'text-glow', title: 'Locksmith booked — within your $350 limit', meta: 'Handled' },
              { icon: CheckCircle, tone: 'text-glow', title: '$580 matched to 14 Tōtara Rise', meta: 'Handled' },
            ].map((row, i) => (
              <li
                key={row.title}
                className="flex items-center gap-3 rounded-lg bg-nav-2/80 px-3.5 py-3 ring-1 ring-nav-line backdrop-blur-sm"
                style={{ animation: `rise 520ms cubic-bezier(0.23,1,0.32,1) ${180 + i * 70}ms both` }}
              >
                <row.icon weight="fill" className={cn('size-5 shrink-0', row.tone)} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{row.title}</span>
                <span className="shrink-0 font-mono text-[11px] text-nav-ink-2">{row.meta}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Pool ── */}
        <section
          data-brand="pool"
          className="group/half relative flex min-h-[50dvh] flex-1 basis-0 flex-col overflow-hidden bg-bg px-6 pt-8 pb-10 text-ink transition-[flex-grow] duration-500 ease-out sm:px-10 md:min-h-0 md:px-12 md:py-12 short:min-h-0 short:px-8 short:py-6 hoverable:md:hover:grow-[1.22] 3xl:px-20"
        >
          <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 size-[30rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.88_0.15_88/0.5),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute -top-24 right-10 size-72 rounded-full bg-[radial-gradient(closest-side,oklch(0.58_0.2_30/0.14),transparent)]" />

          <header className="relative flex items-center gap-2.5">
            <PoolMark size={34} />
            <span className="display text-[22px]">Pool</span>
            <span className="eyebrow ml-1">for renters</span>
          </header>

          <div className="relative mt-auto max-w-[34rem] pt-10 short:pt-4">
            <h2 className="display text-[2.35rem] leading-[1.02] text-balance sm:text-[3.1rem] lg:text-[3.6rem] short:text-[2rem]">
              Rent like you’ve
              <br />
              <span className="text-accent-text">earned it</span>.
            </h2>
            <p className="mt-4 max-w-[30rem] text-[15px] leading-relaxed text-ink-2 sm:text-[17px] short:mt-2 short:text-[14px]">
              Homes at one fixed price — nobody outbids you. Apply in a tap with a profile you build once, and take your good record with you to the next place.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 short:mt-3">
              <button
                type="button"
                onClick={() => enter(PERSONAS.tenant, '/pool')}
                className="pressable inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink shadow-[inset_0_1px_0_oklch(1_0_0/0.25),0_6px_16px_-6px_oklch(0.58_0.2_30/0.6)] hoverable:hover:bg-accent-hover"
              >
                I rent, or I’m looking
                <ArrowRight weight="bold" className="size-4 transition-transform duration-200 group-hover/half:translate-x-0.5" />
              </button>
              <button type="button" onClick={() => enter(PERSONAS.applicant, '/pool')} className="rounded-sm text-[13px] font-medium text-ink-2 underline decoration-line-strong underline-offset-4 hoverable:hover:text-ink">
                or start with no history
              </button>
            </div>
          </div>

          <div aria-hidden className="relative mt-8 hidden h-[14.5rem] max-w-[34rem] grid-cols-[1.25fr_1fr] gap-3 lg:grid short:hidden">
            <div className="overflow-hidden rounded-lg bg-surface shadow-pop" style={{ animation: 'rise 520ms cubic-bezier(0.23,1,0.32,1) 220ms both' }}>
              <div className="relative">
                <PropertyArt kind="townhouse" art={{ style: 4, hue: 25 }} className="h-[10.25rem]" />
                <span className="absolute top-2 left-2 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink shadow-card">$590 a week · fixed</span>
                <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-surface/90 text-accent-text">
                  <Heart weight="fill" className="size-4" />
                </span>
              </div>
              <div className="px-3.5 py-3">
                <p className="text-[13px] font-semibold">Sunny two-bedroom townhouse</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                  <MapPin className="size-3.5" /> The Wood, Nelson
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg bg-surface p-4 shadow-pop" style={{ animation: 'rise 520ms cubic-bezier(0.23,1,0.32,1) 300ms both' }}>
              <p className="eyebrow">Rent Passport</p>
              <div>
                <p className="num display text-[44px] leading-none text-ink">97</p>
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-ok-text">
                  <SealCheck weight="fill" className="size-4" /> 99% paid on time
                </p>
              </div>
              <p className="text-[11px] leading-snug text-ink-3">Verified facts only. You choose who sees it.</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 border-t border-nav-line bg-nav px-6 py-3 text-[12px] text-nav-ink-2 sm:px-10 md:px-12">
        <p>
          <span className="font-medium text-nav-ink">Loop &amp; Pool</span> · a prototype with made-up people and real 2026 New Zealand tenancy rules.
        </p>
        <button type="button" onClick={() => enter(PERSONAS.admin, '/admin')} className="rounded-sm font-medium text-nav-ink underline decoration-nav-line underline-offset-4 hoverable:hover:decoration-nav-ink">
          Team console
        </button>
      </footer>
    </main>
  )
}
