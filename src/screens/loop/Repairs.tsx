/**
 * Repairs.
 *
 * What this screen does that no other does: it follows one fault from the
 * tenant's first message to the last dollar, and at every stop says who is
 * holding it — the tradesperson, the tenant, or you. The two things only a
 * landlord can decide (is this quote worth it, and who caused the damage) are
 * asked here with the law beside them.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ArrowSquareOut,
  Check,
  CheckCircle,
  Clock,
  Drop,
  Key,
  Lightning,
  LockKey,
  Plus,
  Quotes,
  ShieldCheck,
  Star,
  ThermometerSimple,
  Warning,
  Wrench,
} from '@phosphor-icons/react'
import type { Provider, Ticket, TicketStatus, Urgency } from '@/domain/types'
import { dateOf, fmtDate, fmtRelative, fmtTime } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { checkTenantInvoice, tenantLiabilityCap } from '@/domain/rules/tenancy'
import { dispatchMode, ISSUE_GROUPS, ISSUES, issueOf, LIABILITY_EXAMPLES, triage, URGENCY } from '@/domain/triage'
import { useMe, useOrgRows, useStore } from '@/data/store'
import { activeTenancy, useNameOf, usePack, useToday } from '@/data/hooks'
import { arrangeOwnTrade, logRepair, resolveFault } from '@/data/mutations'
import { Page } from '@/shell/common'
import { Badge, type Tone } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Field, Input, Segmented, Select, Textarea } from '@/ui/controls'
import { Empty, Fact, Facts, PageHeader, Timeline } from '@/ui/display'
import { useLast, useMediaQuery } from '@/ui/hooks'
import { Why } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'
import { QuoteOffer } from './decisions/money'

/* ─────────────────────────────── vocabulary ─────────────────────────────── */

const NEEDS_YOU: TicketStatus[] = ['submitted', 'quote_ready', 'disputed']
const URGENCY_RANK: Record<Urgency, number> = { emergency: 0, urgent: 1, routine: 2 }
const URGENCY_TONE: Record<Urgency, Tone> = { emergency: 'danger', urgent: 'warn', routine: 'neutral' }
const STAGES = ['Reported', 'Sorted', 'Booked', 'Fixed', 'Settled']

/** How many of the five stages a job has passed. */
function reached(status: TicketStatus): number {
  switch (status) {
    case 'submitted':
      return 1
    case 'quote_requested':
    case 'quote_ready':
      return 2
    case 'approved':
    case 'scheduled':
    case 'in_progress':
      return 3
    case 'awaiting_invoice':
    case 'tenant_verifying':
    case 'disputed':
      return 4
    case 'closed':
      return 5
  }
}

const whenText = (instant: string) => `${fmtDate(dateOf(instant))}, ${fmtTime(instant)}`

/** Where a job stands, in a phrase. */
function standing(tk: Ticket): { text: string; tone: Tone } {
  switch (tk.status) {
    case 'submitted':
      return { text: 'Yours to arrange', tone: 'accent' }
    case 'quote_requested':
      return { text: 'Waiting for a quote', tone: 'neutral' }
    case 'quote_ready':
      return { text: 'Quote waiting for you', tone: 'accent' }
    case 'approved':
    case 'scheduled':
      return {
        text: tk.scheduledFor ? `Booked for ${whenText(tk.scheduledFor)}` : 'Sent to the tradesperson',
        tone: 'info',
      }
    case 'in_progress':
      return { text: 'Tradesperson on site', tone: 'info' }
    case 'awaiting_invoice':
      return { text: 'Fixed — invoice to come', tone: 'neutral' }
    case 'tenant_verifying':
      return { text: 'Tenant is checking the cause', tone: 'neutral' }
    case 'disputed':
      return { text: 'Tenant disputes the cause', tone: 'warn' }
    case 'closed':
      return { text: 'Finished', tone: 'ok' }
  }
}

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const Icon = /plumb|water|drain/i.test(category)
    ? Drop
    : /heat/i.test(category)
      ? ThermometerSimple
      : /electr|power/i.test(category)
        ? Lightning
        : /lock|secur/i.test(category)
          ? LockKey
          : Wrench
  return <Icon weight="fill" className={className} aria-hidden />
}

/* ──────────────────────────────── the track ─────────────────────────────── */

function Track({ status }: { status: TicketStatus }) {
  const at = reached(status)
  return (
    <ol className="grid grid-cols-5" aria-label="Progress of this repair">
      {STAGES.map((label, i) => {
        const done = i < at
        const next = i === at
        return (
          <li
            key={label}
            aria-current={next ? 'step' : undefined}
            className="relative flex flex-col items-center gap-1.5 text-center"
          >
            {i > 0 && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-[9px] right-1/2 h-0.5 w-full -translate-y-1/2',
                  done ? 'bg-accent' : 'bg-line',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-10 grid size-[18px] place-items-center rounded-full',
                done
                  ? 'bg-accent text-accent-ink'
                  : next
                    ? 'bg-surface ring-2 ring-accent ring-inset'
                    : 'bg-surface ring-2 ring-line-strong ring-inset',
              )}
            >
              {done && <Check weight="bold" className="size-3" aria-hidden />}
              {next && <span aria-hidden className="size-1.5 animate-pulse-dot rounded-full bg-accent" />}
            </span>
            <span className={cn('text-[11px] leading-tight', done || next ? 'font-medium text-ink' : 'text-ink-3')}>
              {label}
              <span className="sr-only">{done ? ', done' : next ? ', next' : ', to come'}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ─────────────────────────────── stage panels ───────────────────────────── */

function Panel({ title, tone = 'plain', children }: { title: string; tone?: 'plain' | 'you'; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-lg p-4 sm:p-5',
        tone === 'you' ? 'bg-accent-soft/50 ring-1 ring-accent-line' : 'bg-sunken',
      )}
    >
      <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-ink">
        {tone === 'you' && <span aria-hidden className="size-2 rounded-full bg-accent" />}
        {title}
      </h3>
      {children}
    </section>
  )
}

function ProviderLine({ provider }: { provider: Provider }) {
  const checks = [
    provider.checks.identity && 'identity',
    provider.checks.insurance && 'insurance',
    provider.checks.licence && 'trade licence',
    provider.checks.policeVet && 'police vetting',
  ].filter(Boolean)
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink-2 shadow-card">
        <Wrench weight="fill" className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">{provider.name}</p>
        <p className="text-xs text-ink-2">
          {provider.trade}
          {provider.rating > 0 && (
            <>
              {' · '}
              <Star weight="fill" className="mb-0.5 inline size-3 text-warn" aria-hidden />{' '}
              <span className="num">{provider.rating.toFixed(1)}</span> from{' '}
              <span className="num">{provider.jobs}</span> jobs
            </>
          )}
        </p>
        {checks.length > 0 && (
          <p className="mt-1 flex items-start gap-1 text-xs text-ink-3">
            <ShieldCheck weight="fill" className="mt-px size-3.5 shrink-0 text-ok" aria-hidden />
            <span>Checked by the Loop team: {checks.join(', ')}.</span>
          </p>
        )}
      </div>
    </div>
  )
}

/** A booked visit: when, who, and whether the entry is lawful. */
function VisitPanel({ tk, provider }: { tk: Ticket; provider?: Provider }) {
  const pack = usePack()
  const notice = pack.rules['entry.repairs_notice_min'].value
  const earliest =
    tk.entryNoticeServedAt && notice.unit === 'hours'
      ? new Date(new Date(tk.entryNoticeServedAt).getTime() + notice.n * 3_600_000).toISOString()
      : undefined
  const lawful = earliest && tk.scheduledFor ? tk.scheduledFor >= earliest : undefined

  return (
    <Panel
      title={
        tk.status === 'in_progress'
          ? 'The tradesperson is there now'
          : tk.scheduledFor
            ? `Booked for ${whenText(tk.scheduledFor)}`
            : 'Sent to the tradesperson'
      }
    >
      <div className="grid gap-4">
        {provider && <ProviderLine provider={provider} />}
        {!tk.scheduledFor && (
          <p className="text-[13px] leading-relaxed text-ink-2">
            They will agree a time with the tenant. You will see it here as soon as it is set.
          </p>
        )}

        {tk.scheduledFor && (
          <div className="rounded-md bg-surface p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink">Getting in</p>
              <Why rule="entry.repairs_notice_min" />
            </div>
            {tk.entryNoticeServedAt ? (
              <>
                <dl className="mt-2 grid gap-1.5 text-[13px]">
                  <div className="flex flex-wrap justify-between gap-x-4">
                    <dt className="text-ink-2">Entry notice served</dt>
                    <dd className="num text-ink">{whenText(tk.entryNoticeServedAt)}</dd>
                  </div>
                  {earliest && (
                    <div className="flex flex-wrap justify-between gap-x-4">
                      <dt className="text-ink-2">Earliest lawful entry</dt>
                      <dd className="num text-ink">{whenText(earliest)}</dd>
                    </div>
                  )}
                </dl>
                {lawful === true && (
                  <p className="mt-2.5 flex items-start gap-1.5 text-[13px] text-ok-text">
                    <CheckCircle weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
                    The visit is after the notice has run.
                  </p>
                )}
                {lawful === false && (
                  <p role="alert" className="mt-2.5 flex items-start gap-1.5 text-[13px] font-medium text-danger-text">
                    <Warning weight="fill" className="mt-0.5 size-4 shrink-0" aria-hidden />
                    The visit is before the notice has run. Move it, or get the tenant’s agreement to the earlier time.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                No entry notice is on file for this visit. That is lawful only where the tenant agrees to the time, or
                in an emergency — the history below says which.
              </p>
            )}
          </div>
        )}

        {tk.keyCode && (
          <div className="flex items-start gap-3 rounded-md bg-surface p-3.5">
            <Key weight="fill" className="mt-0.5 size-[18px] shrink-0 text-ink-2" aria-hidden />
            <div className="min-w-0 text-[13px] leading-relaxed">
              <p className="text-ink">
                Lockbox code{' '}
                <span className="rounded-[5px] bg-sunken px-1.5 py-0.5 font-mono font-semibold tracking-wider">
                  {tk.keyCode.code}
                </span>
              </p>
              <p className="mt-1 text-ink-2">
                {tk.keyCode.depot}. Released to the tradesperson only from{' '}
                <span className="num">{whenText(tk.keyCode.validFrom)}</span>, and it stops working at{' '}
                <span className="num">{fmtTime(tk.keyCode.validTo)}</span>.
              </p>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}

/** The tradesperson says the tenant caused it. Who pays, and how much at most. */
function CausePanel({ tk, provider, onDone }: { tk: Ticket; provider?: Provider; onDone: () => void }) {
  const pack = usePack()
  const nameOf = useNameOf()
  const tenancy = useStore((s) => s.db.tenancies.find((t) => t.id === tk.tenancyId))
  const property = useStore((s) => s.db.properties.find((p) => p.id === tk.propertyId))
  const [note, setNote] = useState('')
  if (!tk.invoice || !property) return null

  const insurance = { insured: Boolean(property.insurance.insurer), excess: property.insurance.excess }
  const rent = tenancy?.weeklyRent ?? 0
  const cap = tenantLiabilityCap(pack, 'careless', rent, insurance)
  const check = checkTenantInvoice(pack, tk.invoice.amount, 'careless', rent, insurance)
  const disputed = tk.status === 'disputed'
  const tenants = tenancy ? tenancy.tenantIds.map((id) => nameOf(id).split(' ')[0]).join(' and ') : 'the tenant'

  const decide = (payer: 'tenant' | 'sinking_fund') => {
    const billed = resolveFault(tk.id, payer, note, pack)
    if (payer === 'tenant')
      toast.success(`Tenant invoice of ${money(billed)} sent`, {
        description: 'It is on the ledger as money owed. If they still disagree, the Tribunal decides.',
      })
    else toast.success('Recorded as wear and tear', { description: 'Nothing is billed to the tenants.' })
    onDone()
  }

  return (
    <Panel
      tone={disputed ? 'you' : 'plain'}
      title={
        disputed
          ? 'Two accounts of what caused it. You decide.'
          : `Waiting for ${tenants} to read the tradesperson’s report`
      }
    >
      <div className="grid gap-4">
        <div className={cn('grid gap-3', disputed && 'md:grid-cols-2')}>
          <figure className="rounded-md bg-surface p-3.5">
            <figcaption className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-2">
              <Wrench weight="fill" className="size-3.5" aria-hidden />
              {provider?.name ?? 'The tradesperson'}
            </figcaption>
            <blockquote className="text-[13px] leading-relaxed text-ink">{tk.invoice.providerNote}</blockquote>
          </figure>
          {disputed && tk.tenantResponse?.note && (
            <figure className="rounded-md bg-surface p-3.5">
              <figcaption className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-2">
                <Quotes weight="fill" className="size-3.5" aria-hidden />
                {tenants}
              </figcaption>
              <blockquote className="text-[13px] leading-relaxed text-ink">{tk.tenantResponse.note}</blockquote>
            </figure>
          )}
        </div>

        <div className="rounded-md bg-surface p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink">The most the tenant can be asked for</p>
            <Why rule="damage.careless_cap_weeks" />
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{cap.why}</p>
          <dl className="mt-2.5 grid gap-1.5 text-[13px]">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">Invoice</dt>
              <dd className="num text-ink">{money(tk.invoice.amount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-2">If it was careless, the tenant pays</dt>
              <dd className="num font-semibold text-ink">{money(check.billable)}</dd>
            </div>
            {check.billable < tk.invoice.amount && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Stays with you or your insurer</dt>
                <dd className="num text-ink">{money(tk.invoice.amount - check.billable)}</dd>
              </div>
            )}
          </dl>
        </div>

        {disputed ? (
          <>
            <details className="group rounded-md bg-surface p-3.5 text-[13px]">
              <summary className="cursor-pointer font-medium text-ink marker:text-ink-3">
                How these usually fall
              </summary>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-2">Usually wear and tear</p>
                  <ul className="grid list-disc gap-0.5 pl-4 text-ink-2">
                    {LIABILITY_EXAMPLES.wearAndTear.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-ink-2">Usually the tenant’s</p>
                  <ul className="grid list-disc gap-0.5 pl-4 text-ink-2">
                    {LIABILITY_EXAMPLES.tenant.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-2.5 text-xs text-ink-3">Examples, not rulings. Each case turns on its own facts.</p>
            </details>
            <Field label="Your reason, for the record" optional hint="The tenant sees this.">
              {(p) => (
                <Textarea
                  {...p}
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="For example: the photos show objects in the trap, not a pipe fault."
                />
              )}
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button intent="secondary" size="lg" onClick={() => decide('sinking_fund')}>
                Wear and tear — I pay
              </Button>
              <Button intent="primary" size="lg" onClick={() => decide('tenant')}>
                Careless — bill {money(check.billable)}
              </Button>
            </div>
            <p className="text-xs leading-relaxed text-ink-3">
              You decide what you ask for; you cannot make the tenant agree. If they still disagree, either of you can
              ask the{' '}
              <a
                href={pack.tribunal.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent-text underline-offset-2 hoverable:hover:underline"
              >
                {pack.tribunal.name}
                <ArrowSquareOut className="mb-0.5 ml-0.5 inline size-3" aria-hidden />
              </a>{' '}
              to decide.
            </p>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 flex-1 basis-56 text-[13px] leading-relaxed text-ink-2">
              Nothing is billed until they agree, or disagree and you decide. You can close it now if you already think
              it was wear and tear.
            </p>
            <Button intent="secondary" onClick={() => decide('sinking_fund')}>
              It was wear and tear
            </Button>
          </div>
        )}
      </div>
    </Panel>
  )
}

/** Nobody vetted to send: the landlord finds someone, and says who. */
function ArrangePanel({ tk }: { tk: Ticket }) {
  const [who, setWho] = useState('')
  const [tried, setTried] = useState(false)
  const trade = tk.triage.suggestedTrade.toLowerCase()
  return (
    <Panel tone="you" title={`This one is yours to arrange: it needs a ${trade}`}>
      <div className="grid gap-4">
        <p className="text-[13px] leading-relaxed text-ink-2">
          Nobody vetted for this trade is in the network near this home yet, so Loop has not sent anyone. The tenant has
          been told you are arranging it.
        </p>
        <Field
          label="Who have you arranged?"
          error={tried && who.trim().length < 2 ? 'Add a name, so the history shows who was sent.' : undefined}
        >
          {(p) => (
            <Input
              {...p}
              value={who}
              onChange={(e) => setWho(e.target.value)}
              placeholder="For example: Nelson Roofing, Thursday morning"
            />
          )}
        </Field>
        <Button
          intent="primary"
          className="justify-self-start"
          onClick={() => {
            setTried(true)
            if (who.trim().length < 2) return
            arrangeOwnTrade(tk.id, who)
            toast.success('Recorded', {
              description: 'When the invoice arrives, add it in Money so it lands on the right tax line.',
            })
          }}
        >
          Record that it is arranged
        </Button>
      </div>
    </Panel>
  )
}

function ClosedPanel({ tk, provider }: { tk: Ticket; provider?: Provider }) {
  const paidBy =
    tk.paidFrom === 'tenant'
      ? 'The tenants'
      : tk.paidFrom === 'sinking_fund'
        ? 'The sinking fund'
        : tk.paidFrom === 'owner'
          ? 'You'
          : '—'
  return (
    <Panel title="Finished">
      <Facts>
        <Fact label="Cost">{tk.invoice ? money(tk.invoice.amount) : '—'}</Fact>
        <Fact label="Paid by">{paidBy}</Fact>
        <Fact label="Cause recorded">
          {tk.invoice ? (tk.paidFrom === 'tenant' ? 'Careless damage' : 'Fair wear and tear') : '—'}
        </Fact>
        <Fact label="Done by">{provider?.name ?? '—'}</Fact>
      </Facts>
      {tk.invoice?.providerNote && (
        <p className="mt-3 rounded-md bg-surface p-3.5 text-[13px] leading-relaxed text-ink">
          {tk.invoice.providerNote}
        </p>
      )}
    </Panel>
  )
}

/* ──────────────────────────────── one repair ────────────────────────────── */

const BY: Record<Ticket['events'][number]['by'], { label: string; tone: 'ok' | 'accent' | 'neutral' | 'warn' }> = {
  tenant: { label: 'Tenant', tone: 'warn' },
  landlord: { label: 'You', tone: 'accent' },
  system: { label: 'Loop', tone: 'neutral' },
  provider: { label: 'Tradesperson', tone: 'ok' },
  admin: { label: 'Loop team', tone: 'neutral' },
}

function JobDetail({ tk, heading, onDone }: { tk: Ticket; heading: boolean; onDone: () => void }) {
  const day = useToday()
  const nameOf = useNameOf()
  const property = useStore((s) => s.db.properties.find((p) => p.id === tk.propertyId))
  const provider = useStore((s) => s.db.providers.find((p) => p.id === tk.providerId))
  const where = [property?.address.line1, tk.room].filter(Boolean).join(' · ')
  const tier = URGENCY[tk.triage.urgency]

  return (
    <div
      className={cn('grid grid-cols-[minmax(0,1fr)] gap-5', heading && '2xl:grid-cols-[minmax(0,1fr)_23rem] 2xl:gap-8')}
    >
      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-5">
        {heading && (
          <header>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={URGENCY_TONE[tk.triage.urgency]} dot>
                {tier.label}
              </Badge>
              <Badge tone="outline">{tk.category}</Badge>
            </div>
            <h2 className="display text-[22px] leading-tight text-ink">{tk.title}</h2>
            <p className="mt-1 text-[13px] text-ink-2">
              {where} · reported by {nameOf(tk.reportedBy).split(' ')[0]} {fmtRelative(dateOf(tk.createdAt), day)}
            </p>
          </header>
        )}

        <Track status={tk.status} />

        {tk.status === 'submitted' && <ArrangePanel tk={tk} />}
        {tk.status === 'quote_requested' && (
          <Panel title={`Waiting for a quote${provider ? ` from ${provider.name}` : ''}`}>
            <p className="text-[13px] leading-relaxed text-ink-2">
              Nothing is booked and nothing is spent until you have seen the quote and approved it. The tenant has been
              told a decision is coming.
            </p>
          </Panel>
        )}
        {tk.status === 'quote_ready' && (
          <Panel tone="you" title="A quote is waiting for your answer">
            <QuoteOffer ticketId={tk.id} done={onDone} />
          </Panel>
        )}
        {(tk.status === 'approved' || tk.status === 'scheduled' || tk.status === 'in_progress') && (
          <VisitPanel tk={tk} provider={provider} />
        )}
        {tk.status === 'awaiting_invoice' && (
          <Panel title="Fixed — waiting for the invoice">
            {provider && <ProviderLine provider={provider} />}
            <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
              The tradesperson records what they found and what caused it. That record decides whether anyone but you is
              asked to pay.
            </p>
          </Panel>
        )}
        {(tk.status === 'tenant_verifying' || tk.status === 'disputed') && (
          <CausePanel tk={tk} provider={provider} onDone={onDone} />
        )}
        {tk.status === 'closed' && <ClosedPanel tk={tk} provider={provider} />}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-5">
        <div
          className={cn(
            'grid grid-cols-[minmax(0,1fr)] gap-5',
            heading && 'xl:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)]',
          )}
        >
          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">
              In {nameOf(tk.reportedBy).split(' ')[0]}’s words
            </h3>
            <blockquote className="border-l-2 border-line-strong pl-3.5 text-[14px] leading-relaxed text-ink">
              {tk.description}
            </blockquote>
            {tk.triage.selfHelpTried && (
              <p className="mt-2.5 pl-4 text-[13px] leading-relaxed text-ink-2">
                Already tried: {tk.triage.selfHelpTried}
              </p>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-ink">How Loop sorted it</h3>
            <p className="text-[13px] leading-relaxed text-ink-2">
              <span className="font-medium text-ink">{tier.label}:</span>{' '}
              {tier.test.charAt(0).toLowerCase() + tier.test.slice(1)} {tk.triage.reasoning}
            </p>
            <p className="mt-2 text-xs text-ink-3">
              <span className="num">{Math.round(tk.triage.confidence * 100)}%</span> sure · needs a{' '}
              {tk.triage.suggestedTrade.toLowerCase()} ·{' '}
              {tk.mode === 'quote_first' ? 'quote first' : 'sent without waiting for you'}
            </p>
            {tk.triage.possibleTenantFault && (
              <p className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn-text">
                Flagged to check the cause. That asks the tradesperson to record what they find — it is not a finding
                against anyone.
              </p>
            )}
          </section>
        </div>

        <section>
          <h3 className="mb-3 text-[13px] font-semibold text-ink">History</h3>
          <Timeline
            items={[...tk.events].reverse().map((e, i) => ({
              id: `${e.at}-${i}`,
              title: e.text,
              at: `${BY[e.by].label} · ${fmtDate(dateOf(e.at))}, ${fmtTime(e.at)}`,
              tone: BY[e.by].tone,
            }))}
          />
        </section>
      </div>
    </div>
  )
}

/* ─────────────────────────────── log a repair ───────────────────────────── */

function LogRepair({
  open,
  onClose,
  onLogged,
}: {
  open: boolean
  onClose: () => void
  onLogged: (id: string) => void
}) {
  const me = useMe()
  const day = useToday()
  const properties = useOrgRows('properties')
  const [propertyId, setPropertyId] = useState('')
  const [issueKey, setIssueKey] = useState('')
  const [description, setDescription] = useState('')
  const [tried, setTried] = useState(false)
  const property = properties.find((p) => p.id === propertyId)
  const issue = issueKey ? issueOf(issueKey) : undefined
  const ready = issue && description.trim().length >= 10
  const sorted = ready ? triage(description, issueKey, day) : undefined
  const mode =
    sorted && issue && property
      ? dispatchMode(sorted.urgency, issue.cost, property.sinkingFund.autoApproveLimit)
      : undefined
  const bad = { property: !propertyId, issue: !issueKey, description: description.trim().length < 10 }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      eyebrow="Repairs"
      title="Log a repair yourself"
      description="For something you noticed, or a tenant told you about in person."
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <Field label="Which home?" error={tried && bad.property ? 'Choose the home it is in.' : undefined}>
          {(p) => (
            <Select {...p} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Choose a property…</option>
              {properties.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.address.line1}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="What kind of problem?"
          hint={issue?.hint}
          error={tried && bad.issue ? 'Choose the closest match, or “Something else”.' : undefined}
        >
          {(p) => (
            <Select {...p} value={issueKey} onChange={(e) => setIssueKey(e.target.value)}>
              <option value="">Choose…</option>
              {ISSUE_GROUPS.map((g) => (
                <optgroup key={g.key} label={g.label}>
                  {ISSUES.filter((i) => i.group === g.key).map((i) => (
                    <option key={i.key} value={i.key}>
                      {i.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="What is happening?"
          error={tried && bad.description ? 'A sentence or two, so the tradesperson knows what to bring.' : undefined}
        >
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What you can see, hear or smell, and since when."
            />
          )}
        </Field>

        {sorted && issue && (
          <div aria-live="polite" className="rounded-lg bg-sunken p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-ink">Loop would sort this as</p>
              <Badge tone={URGENCY_TONE[sorted.urgency]} dot>
                {URGENCY[sorted.urgency].label}
              </Badge>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{sorted.reasoning}</p>
            <dl className="mt-3 grid gap-1.5 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Trade</dt>
                <dd className="text-ink">{sorted.suggestedTrade}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-2">Usual cost, as a guide</dt>
                <dd className="num text-ink">
                  {issue.cost
                    ? `${money(issue.cost.low)}–${money(issue.cost.high)}${issue.cost.openEnded ? '+' : ''}`
                    : 'Not known'}
                </dd>
              </div>
              {mode && property && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-2">What happens next</dt>
                  <dd className="text-right text-ink">
                    {mode === 'auto_dispatch'
                      ? 'Sent to a tradesperson now'
                      : `A quote first — over your ${money(property.sinkingFund.autoApproveLimit)} limit`}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <Button
          intent="primary"
          size="lg"
          block
          onClick={() => {
            setTried(true)
            if (bad.property || bad.issue || bad.description || !issue) return
            const first = description.trim().split(/[.!?\n]/)[0]
            const id = logRepair({
              orgId: me.orgId ?? '',
              propertyId,
              reporterId: me.id,
              issueKey,
              title: issue.key === 'other' ? (first.length > 60 ? `${first.slice(0, 57)}…` : first) : issue.title,
              description,
            })
            if (!id) return
            toast.success('Repair logged', {
              description:
                mode === 'auto_dispatch'
                  ? 'Sent to a vetted tradesperson.'
                  : 'A quote has been requested. Nothing is booked until you approve it.',
            })
            onLogged(id)
          }}
        >
          Log it
        </Button>
      </div>
    </Sheet>
  )
}

/* ──────────────────────────────── the screen ────────────────────────────── */

export function Repairs({ job }: { job?: string }) {
  const day = useToday()
  const navigate = useNavigate()
  const tickets = useOrgRows('tickets')
  const properties = useOrgRows('properties')
  const tenancies = useOrgRows('tenancies')
  const wide = useMediaQuery('(min-width: 1024px)')
  const [logging, setLogging] = useState(false)
  const asked = tickets.find((t) => t.id === job)
  const [view, setView] = useState<'open' | 'done'>(asked?.status === 'closed' ? 'done' : 'open')

  const { open, done } = useMemo(() => {
    const newest = (a: Ticket, b: Ticket) => b.createdAt.localeCompare(a.createdAt)
    const open = tickets
      .filter((t) => t.status !== 'closed')
      .sort(
        (a, b) =>
          Number(NEEDS_YOU.includes(b.status)) - Number(NEEDS_YOU.includes(a.status)) ||
          URGENCY_RANK[a.triage.urgency] - URGENCY_RANK[b.triage.urgency] ||
          newest(a, b),
      )
    return { open, done: tickets.filter((t) => t.status === 'closed').sort(newest) }
  }, [tickets])

  const list = view === 'open' ? open : done
  const waiting = open.filter((t) => NEEDS_YOU.includes(t.status)).length
  const selected = asked ?? (wide ? list[0] : undefined)
  const addressOf = useMemo(() => new Map(properties.map((p) => [p.id, p.address.line1])), [properties])
  const shown = useLast(asked)
  const pick = (id?: string) => void navigate({ to: '/loop/repairs', search: id ? { job: id } : {}, replace: true })
  const vacant = properties.filter((p) => !activeTenancy(tenancies, p.id)).length

  return (
    <Page wide>
      <PageHeader
        eyebrow="Repairs"
        title={
          waiting
            ? `${waiting} ${waiting === 1 ? 'repair is' : 'repairs are'} waiting on you`
            : open.length
              ? `${open.length} in hand, none waiting on you`
              : 'Nothing is broken'
        }
        lede="Tenants report faults from Pool. Loop sorts each one by urgency, sends a vetted tradesperson when it is urgent or inside your limit, and asks you about the rest."
        actions={
          <Button intent="secondary" icon={<Plus weight="bold" className="size-4" />} onClick={() => setLogging(true)}>
            Log a repair
          </Button>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div className="min-w-0">
          <Segmented
            label="Which repairs to show"
            value={view}
            onChange={(v) => {
              setView(v)
              pick(undefined)
            }}
            options={[
              { value: 'open', label: `Open · ${open.length}` },
              { value: 'done', label: `Finished · ${done.length}` },
            ]}
            className="mb-3"
          />
          {list.length === 0 ? (
            <div className="rounded-lg bg-surface shadow-card">
              {view === 'open' ? (
                <Empty
                  icon={<Wrench />}
                  title="Nothing is broken"
                  body={`When a tenant reports a fault from Pool it lands here already sorted. ${vacant ? 'For an empty home, or something you spotted yourself, log it here.' : 'If you spot something yourself, log it here.'}`}
                  action={
                    <Button intent="primary" onClick={() => setLogging(true)}>
                      Log a repair
                    </Button>
                  }
                />
              ) : (
                <Empty
                  icon={<CheckCircle />}
                  title="No finished repairs yet"
                  body="Every finished job keeps its invoice, its cause and its history here, ready for the tax return or a dispute."
                />
              )}
            </div>
          ) : (
            <ul className="grid gap-2">
              {list.map((t) => {
                const s = standing(t)
                const on = wide && selected?.id === t.id
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => pick(t.id)}
                      aria-current={on ? 'true' : undefined}
                      className={cn(
                        'pressable flex w-full items-start gap-3 rounded-lg p-3.5 text-left transition-shadow',
                        on
                          ? 'bg-surface shadow-card ring-2 ring-accent'
                          : 'bg-surface shadow-card hoverable:hover:shadow-pop',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-full',
                          t.status === 'closed'
                            ? 'bg-sunken text-ink-3'
                            : t.triage.urgency === 'emergency'
                              ? 'bg-danger-soft text-danger-text'
                              : t.triage.urgency === 'urgent'
                                ? 'bg-warn-soft text-warn-text'
                                : 'bg-sunken text-ink-2',
                        )}
                      >
                        <CategoryIcon category={t.category} className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[14px] font-semibold text-ink">{t.title}</span>
                          {(t.quote ?? t.invoice) && (
                            <span className="num shrink-0 text-[13px] font-medium text-ink">
                              {money((t.invoice ?? t.quote)!.amount)}
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-xs text-ink-2">
                          {addressOf.get(t.propertyId)}
                          {t.room ? ` · ${t.room}` : ''}
                        </span>
                        <span className="mt-1.5 flex items-center justify-between gap-2">
                          <Badge
                            tone={s.tone}
                            size="sm"
                            dot={NEEDS_YOU.includes(t.status)}
                            pulse={NEEDS_YOU.includes(t.status)}
                          >
                            {s.text}
                          </Badge>
                          <span className="flex shrink-0 items-center gap-1 text-[11px] text-ink-3">
                            <Clock className="size-3" aria-hidden />
                            {fmtRelative(dateOf(t.createdAt), day)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {wide &&
          (selected ? (
            <article key={selected.id} className="min-w-0 animate-fade rounded-lg bg-surface p-6 shadow-card">
              <JobDetail tk={selected} heading onDone={() => pick(undefined)} />
            </article>
          ) : (
            <div className="rounded-lg bg-surface shadow-card">
              <Empty
                icon={<Wrench />}
                title="Choose a repair"
                body="Its progress, the decision it needs and its whole history open here."
              />
            </div>
          ))}
      </div>

      {!wide && (
        <Sheet
          open={Boolean(asked)}
          onOpenChange={(o) => !o && pick(undefined)}
          size="lg"
          eyebrow={shown ? [addressOf.get(shown.propertyId), shown.room].filter(Boolean).join(' · ') : undefined}
          title={shown?.title ?? ''}
          description={shown ? `${URGENCY[shown.triage.urgency].label} · ${shown.category}` : undefined}
        >
          {shown && <JobDetail tk={shown} heading={false} onDone={() => pick(undefined)} />}
        </Sheet>
      )}

      <LogRepair
        key={logging ? 'open' : 'closed'}
        open={logging}
        onClose={() => setLogging(false)}
        onLogged={(id) => {
          setLogging(false)
          setView('open')
          pick(id)
        }}
      />
    </Page>
  )
}
