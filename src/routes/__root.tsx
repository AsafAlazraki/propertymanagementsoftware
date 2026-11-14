import { useEffect } from 'react'
import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { TipProvider } from '@/ui/overlays'
import { useThemeBinding } from '@/app/theme'
import { UpdatePrompt } from '@/app/updates'
import { Lockup } from '@/ui/Brand'
import { buttonClass } from '@/ui/Button'

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFound,
  errorComponent: Broke,
})

const TITLES: [RegExp, string][] = [
  [/^\/loop\/properties\/.+/, 'A home · Loop'],
  [/^\/loop\/properties/, 'Properties · Loop'],
  [/^\/loop\/money/, 'Money · Loop'],
  [/^\/loop\/repairs/, 'Repairs · Loop'],
  [/^\/loop\/inspections\/.+/, 'Inspection studio · Loop'],
  [/^\/loop\/inspections/, 'Inspections · Loop'],
  [/^\/loop\/tenancies/, 'Tenancies · Loop'],
  [/^\/loop\/services/, 'Services · Loop'],
  [/^\/loop\/rulebook/, 'Rulebook · Loop'],
  [/^\/loop\/settings/, 'Settings · Loop'],
  [/^\/loop/, 'Command centre · Loop'],
  [/^\/pool\/search/, 'Find a home · Pool'],
  [/^\/pool\/listing/, 'A home to rent · Pool'],
  [/^\/pool\/repairs/, 'Repairs · Pool'],
  [/^\/pool\/passport/, 'Rent Passport · Pool'],
  [/^\/pool\/me/, 'Me · Pool'],
  [/^\/pool/, 'Home · Pool'],
  [/^\/admin\/queue/, 'Action queue · Team console'],
  [/^\/admin\/orgs/, 'Organisations · Team console'],
  [/^\/admin\/people/, 'People · Team console'],
  [/^\/admin\/feedback/, 'Feedback · Team console'],
  [/^\/admin\/rules/, 'Rulewatch · Team console'],
  [/^\/admin\/healing/, 'Self-healing · Team console'],
  [/^\/admin\/assistant/, 'Assistant · Team console'],
  [/^\/admin\/network/, 'Field network · Team console'],
  [/^\/admin\/migration/, 'Migration · Team console'],
  [/^\/admin\/audit/, 'Audit log · Team console'],
  [/^\/admin/, 'Overview · Team console'],
]

function Root() {
  useThemeBinding()
  const path = useRouterState({ select: (s) => s.location.pathname })
  useEffect(() => {
    const at = path.replace(/^\/propertymanagementsoftware/, '')
    document.title = TITLES.find(([re]) => re.test(at))?.[1] ?? 'Loop & Pool'
  }, [path])
  return (
    <TipProvider delay={350} closeDelay={0}>
      <Outlet />
      <Toaster
        position="bottom-center"
        offset={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        mobileOffset={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '0',
            boxShadow: 'var(--sh-pop)',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--ff-sans)',
          },
        }}
      />
      <UpdatePrompt />
    </TipProvider>
  )
}

function Shell({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-6 py-16 text-ink">
      <div className="max-w-md text-center">
        <Lockup className="mb-8 justify-center" />
        <h1 className="display text-3xl">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{body}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">{children}</div>
      </div>
    </main>
  )
}

function NotFound() {
  return (
    <Shell title="That page is not here" body="The address may be mistyped, or the page may have moved while the prototype is being built.">
      <Link to="/" className={buttonClass({ intent: 'primary' })}>
        Back to the start
      </Link>
    </Shell>
  )
}

function Broke({ error, reset }: { error: unknown; reset: () => void }) {
  return (
    <Shell title="Something broke on this screen" body={error instanceof Error ? error.message : 'An unexpected error stopped this screen from loading. Your data on this device is untouched.'}>
      <button type="button" onClick={reset} className={buttonClass({ intent: 'primary' })}>
        Try again
      </button>
      <Link to="/" className={buttonClass({ intent: 'secondary' })}>
        Back to the start
      </Link>
    </Shell>
  )
}
