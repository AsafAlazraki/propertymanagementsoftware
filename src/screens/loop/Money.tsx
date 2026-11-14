/**
 * Money.
 *
 * What this screen does that no other does: it shows every dollar already
 * filed where the tax return wants it, and puts the few the machine was not
 * sure about in front of a person. A landlord should finish the tax year by
 * pressing one button, not by sorting a shoebox.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  ArrowSquareOut,
  Bank,
  CheckCircle,
  DownloadSimple,
  Info,
  MagnifyingGlass,
  Plus,
  Question,
  Scales,
} from '@phosphor-icons/react'
import type { BankLine, LedgerEntry } from '@/domain/types'
import { PM_ASSUMPTIONS, savingsVsManager, taxSummary, taxYearOf } from '@/domain/finance'
import { dateOf, diffDays, fmtDate, today } from '@/domain/rules/calendar'
import { money, round2, sum } from '@/domain/rules/format'
import { useStore } from '@/data/store'
import { activeTenancy, usePack, useToday } from '@/data/hooks'
import { addExpense, fileBankLine, ignoreBankLine, removeLedgerEntry, unfileBankLine } from '@/data/mutations'
import { Page } from '@/shell/common'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Columns } from '@/ui/charts'
import { Field, Input, Select, Tabs } from '@/ui/controls'
import { Callout, Empty, Money as Cash, PageHeader } from '@/ui/display'
import { Sheet } from '@/ui/Sheet'
import { cn } from '@/ui/cn'

export type MoneyTab = 'feed' | 'ledger' | 'tax' | 'savings'

const PAGE = 40

/** Whole dollars for a schedule; a dash where there is nothing. */
const whole = (n: number | undefined) => (n ? money(Math.round(Math.abs(n))) : '—')
const signed = (n: number) => (n < 0 ? `−${money(Math.round(-n))}` : money(Math.round(n)))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function downloadCsv(name: string, rows: (string | number)[][]): void {
  const csv = rows
    .map((r) => r.map((c) => (typeof c === 'number' ? String(c) : `"${String(c).replace(/"/g, '""')}"`)).join(','))
    .join('\r\n')
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/* ───────────────────────────── the bank feed ────────────────────────────── */

function FileLine({ line, onClose }: { line: BankLine | null; onClose: () => void }) {
  const pack = usePack()
  const orgId = useStore((s) => s.session?.orgId)
  const properties = useStore((s) => s.db.properties)
  const tenancies = useStore((s) => s.db.tenancies)
  const mine = useMemo(() => properties.filter((p) => p.orgId === orgId), [properties, orgId])
  const suggested = tenancies.find((t) => t.id === line?.suggestedTenancyId)
  const [propertyId, setPropertyId] = useState('')
  const [category, setCategory] = useState('')
  const [what, setWhat] = useState('')
  const [tried, setTried] = useState(false)
  const income = (line?.amount ?? 0) >= 0
  const options = pack.taxCategories.filter((c) =>
    income ? c.kind === 'income' || c.key === 'private' : c.kind !== 'income',
  )
  const pid = propertyId || suggested?.propertyId || ''
  const cat = category || (income ? 'other_income' : '')
  const chosen = pack.taxCategories.find((c) => c.key === cat)

  return (
    <Sheet
      open={line !== null}
      onOpenChange={(o) => !o && onClose()}
      eyebrow="Bank feed"
      title={line ? `${money(Math.abs(line.amount), { cents: true })} ${income ? 'in' : 'out'} — what was it?` : ''}
    >
      {line && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
          <div className="rounded-lg bg-sunken p-4 font-mono text-[13px] leading-relaxed text-ink">
            <p>{fmtDate(line.date, { year: 'always' })}</p>
            <p>{line.payer}</p>
            <p className="text-ink-3">Ref: {line.reference}</p>
          </div>
          {line.confidence !== undefined && suggested && (
            <Callout tone="accent" icon={<Info weight="fill" />}>
              This looks like it is from the tenant at {mine.find((p) => p.id === suggested.propertyId)?.address.line1},
              but it is not rent — the amount and reference do not match. Loop was {Math.round(line.confidence * 100)}%
              sure, which is not sure enough to file it for you.
            </Callout>
          )}
          <Field label="Which property?" error={tried && !pid ? 'Choose the property this belongs to.' : undefined}>
            {(p) => (
              <Select {...p} value={pid} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">Choose a property…</option>
                {mine.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.address.line1}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="What kind of money is it?"
            hint={chosen ? `${chosen.hint} On the return: ${chosen.formLine}.` : undefined}
            error={tried && !cat ? 'Choose what kind of money it was, so it lands on the right line.' : undefined}
          >
            {(p) => (
              <Select {...p} value={cat} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Choose…</option>
                {options.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="A few words for the ledger" optional>
            {(p) => (
              <Input
                {...p}
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                placeholder={income ? 'For example: water charges for September' : 'For example: gutter clean'}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="primary"
              onClick={() => {
                setTried(true)
                if (!pid || !cat) return
                const was = line.status === 'suggested' ? 'suggested' : 'unmatched'
                fileBankLine(line.id, pid, cat, what.trim() || `${chosen?.label ?? 'Payment'} — ${line.reference}`)
                toast.success('Filed', {
                  description: `Under ${chosen?.label.toLowerCase() ?? cat}. The books still balance.`,
                  action: { label: 'Undo', onClick: () => unfileBankLine(line.id, was) },
                })
                onClose()
              }}
            >
              File it
            </Button>
            <Button
              intent="ghost"
              onClick={() => {
                const was = line.status === 'suggested' ? 'suggested' : 'unmatched'
                ignoreBankLine(line.id)
                toast('Left out of the rental books', {
                  description: 'Nothing was filed for this line.',
                  action: { label: 'Undo', onClick: () => unfileBankLine(line.id, was) },
                })
                onClose()
              }}
            >
              It is nothing to do with the rentals
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

/* ─────────────────────────────── add an expense ─────────────────────────── */

function AddExpense({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pack = usePack()
  const orgId = useStore((s) => s.session?.orgId)
  const properties = useStore((s) => s.db.properties)
  const mine = useMemo(() => properties.filter((p) => p.orgId === orgId), [properties, orgId])
  const [propertyId, setPropertyId] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('repairs')
  const [what, setWhat] = useState('')
  const [date, setDate] = useState(today())
  const [tried, setTried] = useState(false)
  const chosen = pack.taxCategories.find((c) => c.key === category)
  const value = Number(amount)
  const bad = { property: !propertyId, amount: !(value > 0), what: what.trim().length < 3 }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} eyebrow="Ledger" title="Add a cost">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        <Field label="Property" error={tried && bad.property ? 'Choose the property this cost belongs to.' : undefined}>
          {(p) => (
            <Select {...p} value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              <option value="">Choose a property…</option>
              {mine.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.address.line1}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount" error={tried && bad.amount ? 'Enter the amount paid.' : undefined}>
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                prefix="$"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder="185.00"
              />
            )}
          </Field>
          <Field label="Date paid">
            {(p) => <Input {...p} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />}
          </Field>
        </div>
        <Field
          label="What was it for?"
          error={
            tried && bad.what ? 'Say what was done or bought, so the entry means something next March.' : undefined
          }
        >
          {(p) => (
            <Input
              {...p}
              value={what}
              onChange={(e) => setWhat(e.target.value)}
              placeholder="For example: replace hot water cylinder element"
            />
          )}
        </Field>
        <Field label="Kind of cost" hint={chosen ? `${chosen.hint} On the return: ${chosen.formLine}.` : undefined}>
          {(p) => (
            <Select {...p} value={category} onChange={(e) => setCategory(e.target.value)}>
              {pack.taxCategories
                .filter((c) => c.kind !== 'income')
                .map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
            </Select>
          )}
        </Field>
        <Callout tone="neutral" icon={<Question weight="fill" />} title="Repair or improvement?">
          <span className="font-medium text-ink">Repair:</span>{' '}
          {pack.taxCategories.find((c) => c.key === 'repairs')?.hint}{' '}
          <span className="font-medium text-ink">Improvement:</span>{' '}
          {pack.taxCategories.find((c) => c.key === 'capital')?.hint} An improvement is added to the cost of the
          property rather than claimed this year.
        </Callout>
        <Button
          intent="primary"
          size="lg"
          block
          onClick={() => {
            setTried(true)
            if (bad.property || bad.amount || bad.what || !orgId) return
            const id = addExpense({ orgId, propertyId, date, amount: value, category, description: what })
            toast.success('Cost added', {
              description: `${money(value, { cents: true })} filed under ${chosen?.label.toLowerCase()}.`,
              action: { label: 'Undo', onClick: () => removeLedgerEntry(id) },
            })
            onClose()
          }}
        >
          Add to the ledger
        </Button>
      </div>
    </Sheet>
  )
}

/* ─────────────────────────────── the screen ─────────────────────────────── */

export function Money({ tab }: { tab: MoneyTab }) {
  const pack = usePack()
  const day = useToday()
  const navigate = useNavigate()
  const orgId = useStore((s) => s.session?.orgId)
  const org = useStore((s) => s.db.orgs.find((o) => o.id === orgId))
  const allLedger = useStore((s) => s.db.ledger)
  const allLines = useStore((s) => s.db.bankLines)
  const properties = useStore((s) => s.db.properties)
  const tenancies = useStore((s) => s.db.tenancies)
  const fieldTasks = useStore((s) => s.db.fieldTasks)
  const [filing, setFiling] = useState<BankLine | null>(null)
  const [adding, setAdding] = useState(false)
  const [propertyFilter, setPropertyFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [query, setQuery] = useState('')
  const startMonth = pack.taxYearStartMonth
  const thisYear = taxYearOf(day, startMonth)
  const [taxYear, setTaxYear] = useState(thisYear)
  const [taxCol, setTaxCol] = useState('')
  const [shown, setShown] = useState(PAGE)
  // The tax year ends on the last day of the month before it starts.
  const yearEnd = `${new Date(Date.UTC(2001, startMonth - 1, 0)).getUTCDate()} ${MONTHS[(startMonth + 10) % 12]}`

  const mine = useMemo(() => properties.filter((p) => p.orgId === orgId), [properties, orgId])
  const ledger = useMemo(() => allLedger.filter((l) => l.orgId === orgId), [allLedger, orgId])
  const lines = useMemo(() => allLines.filter((l) => l.orgId === orgId), [allLines, orgId])
  const addressOf = useMemo(() => new Map(mine.map((p) => [p.id, p.address.line1])), [mine])
  const catOf = useMemo(() => new Map(pack.taxCategories.map((c) => [c.key, c])), [pack])
  const needsEye = lines.filter((l) => l.status === 'suggested' || l.status === 'unmatched')
  const settled = useMemo(
    () =>
      lines
        .filter((l) => l.status === 'matched' || l.status === 'ignored')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [lines],
  )

  // Twelve months of money in and deductible money out.
  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const rows = ledger.filter((l) => l.date.startsWith(key))
      return {
        label: `${MONTHS[d.getMonth()]}${d.getMonth() === 0 || i === 0 ? ` ${String(d.getFullYear()).slice(2)}` : ''}`,
        income: round2(sum(rows.filter((l) => catOf.get(l.category)?.kind === 'income').map((l) => l.amount))),
        costs: round2(-sum(rows.filter((l) => catOf.get(l.category)?.kind === 'deductible').map((l) => l.amount))),
      }
    })
  }, [ledger, catOf])

  const ytd = useMemo(() => {
    const t = taxSummary(ledger, thisYear, startMonth)
    const income = sum(pack.taxCategories.filter((c) => c.kind === 'income').map((c) => t[c.key] ?? 0))
    const costs = -sum(pack.taxCategories.filter((c) => c.kind === 'deductible').map((c) => t[c.key] ?? 0))
    const top = pack.taxCategories
      .filter((c) => c.kind === 'deductible')
      .map((c) => ({ key: c.key, label: c.label, amount: -(t[c.key] ?? 0) }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4)
    return { income, costs, net: round2(income - costs), top }
  }, [ledger, thisYear, startMonth, pack])

  // The books check: every matched bank line has a ledger entry for the same amount.
  const books = useMemo(() => {
    const byId = new Map(ledger.map((l) => [l.id, l]))
    const matched = lines.filter((l) => l.status === 'matched')
    const broken = matched.filter((l) => !l.ledgerId || byId.get(l.ledgerId)?.amount !== l.amount)
    return { matched: matched.length, broken: broken.length, total: sum(matched.map((l) => l.amount)) }
  }, [ledger, lines])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ledger.filter(
      (l) =>
        (!propertyFilter || l.propertyId === propertyFilter) &&
        (!categoryFilter || l.category === categoryFilter) &&
        (!q || l.description.toLowerCase().includes(q) || (l.bankRef ?? '').toLowerCase().includes(q)),
    )
  }, [ledger, propertyFilter, categoryFilter, query])

  const tax = useMemo(() => {
    const perProperty = mine.map((p) => ({
      p,
      t: taxSummary(
        ledger.filter((l) => l.propertyId === p.id),
        taxYear,
        startMonth,
      ),
    }))
    return { perProperty, all: taxSummary(ledger, taxYear, startMonth) }
  }, [mine, ledger, taxYear, startMonth])

  const savings = useMemo(() => {
    const rents = mine.map((p) => activeTenancy(tenancies, p.id)?.weeklyRent ?? 0).filter((r) => r > 0)
    const spend = sum(
      fieldTasks.filter((t) => t.orgId === orgId && diffDays(dateOf(t.requestedAt), day) <= 365).map((t) => t.price),
    )
    return org ? savingsVsManager(rents, org.plan, mine.length, spend) : null
  }, [mine, tenancies, fieldTasks, org, orgId, day])

  const exportLedger = () => {
    downloadCsv(`loop-ledger-${day}.csv`, [
      ['Date', 'Property', 'Description', 'Category', 'Tax return line', 'Amount', 'Bank reference', 'Matched'],
      ...filtered.map((l) => [
        l.date,
        addressOf.get(l.propertyId) ?? '',
        l.description,
        catOf.get(l.category)?.label ?? l.category,
        catOf.get(l.category)?.formLine ?? '',
        l.amount,
        l.bankRef ?? '',
        l.match,
      ]),
    ])
    toast.success('Ledger downloaded', { description: `${filtered.length} entries as a spreadsheet.` })
  }
  const exportTax = () => {
    const lines2 = pack.taxCategories.filter((c) => c.kind === 'income' || c.kind === 'deductible')
    downloadCsv(`rental-schedule-${taxYear}.csv`, [
      ['Tax return line', ...tax.perProperty.map((x) => x.p.address.line1), 'All properties'],
      ...lines2.map((c) => [
        c.formLine,
        ...tax.perProperty.map((x) => Math.abs(x.t[c.key] ?? 0)),
        Math.abs(tax.all[c.key] ?? 0),
      ]),
    ])
    toast.success('Rental schedule downloaded', {
      description: `Year to ${yearEnd} ${taxYear}, one column per property.`,
    })
  }

  const setTab = (t: MoneyTab) => void navigate({ to: '/loop/money', search: { tab: t }, replace: true })
  const taxLines = pack.taxCategories.filter((c) => c.kind === 'income' || c.kind === 'deductible')
  const netOf = (t: Record<string, number>) => round2(sum(taxLines.map((c) => t[c.key] ?? 0)))
  const phoneCol = tax.perProperty.find((x) => x.p.id === taxCol)?.t ?? tax.all

  return (
    <Page wide>
      <PageHeader
        eyebrow="Money"
        title={
          needsEye.length
            ? `${needsEye.length} ${needsEye.length === 1 ? 'payment needs' : 'payments need'} your eye`
            : 'Every dollar is filed'
        }
        lede={
          <>
            Rent is matched from your own bank feed and filed under the line your tax return uses. Loop never holds the
            money — it reads, sorts and keeps count.
          </>
        }
        actions={
          <Button intent="secondary" icon={<Plus weight="bold" className="size-4" />} onClick={() => setAdding(true)}>
            Add a cost
          </Button>
        }
      />

      <div className="flex flex-col">
        <div className="order-2 mt-8 grid grid-cols-1 gap-4 lg:order-none lg:mt-0 lg:mb-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section className="min-w-0 rounded-lg bg-surface p-5 shadow-card">
            <Columns
              title="In and out, month by month"
              subtitle="Rent and other income against deductible costs. Mortgage interest is the tall one."
              data={months}
              series={[
                { key: 'income', label: 'Income' },
                { key: 'costs', label: 'Deductible costs' },
              ]}
              format={(n) => money(n)}
              height={210}
            />
          </section>
          <section className="grid content-start gap-4 rounded-lg bg-surface p-5 shadow-card">
            <div>
              <p className="eyebrow">
                Net rental income, year to {yearEnd} {thisYear} so far
              </p>
              <Cash
                value={ytd.net}
                className={cn(
                  'display mt-1 block text-[34px] leading-none',
                  ytd.net < 0 ? 'text-danger-text' : 'text-ink',
                )}
              />
              <p className="mt-1.5 text-xs text-ink-3">
                <span className="num">{money(Math.round(ytd.income))}</span> in, less{' '}
                <span className="num">{money(Math.round(ytd.costs))}</span> of deductible costs.
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-ink-2">Where the costs go</p>
              <ul className="grid gap-2">
                {ytd.top.map((c) => (
                  <li
                    key={c.key}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-[13px]"
                  >
                    <span className="truncate text-ink">{c.label}</span>
                    <span className="num text-ink-2">{money(Math.round(c.amount))}</span>
                    <span className="col-span-2 h-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(3, (c.amount / (ytd.costs || 1)) * 100)}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={cn('flex items-start gap-2.5 rounded-md p-3', books.broken ? 'bg-danger-soft' : 'bg-ok-soft')}
            >
              {books.broken ? (
                <Scales weight="fill" className="mt-0.5 size-[18px] shrink-0 text-danger-text" aria-hidden />
              ) : (
                <CheckCircle weight="fill" className="mt-0.5 size-[18px] shrink-0 text-ok-text" aria-hidden />
              )}
              <p className="text-[13px] leading-relaxed text-ink">
                <span className="font-semibold">
                  {books.broken
                    ? `${books.broken} matched ${books.broken === 1 ? 'line does' : 'lines do'} not agree with the ledger.`
                    : 'The books balance.'}
                </span>{' '}
                {books.broken
                  ? 'Open the bank feed to see which.'
                  : `All ${books.matched} matched bank lines agree with the ledger to the cent.`}
              </p>
            </div>
          </section>
        </div>

        <div className="order-1 min-w-0 lg:order-none">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'feed', label: 'Bank feed', count: needsEye.length },
              { value: 'ledger', label: 'Ledger' },
              { value: 'tax', label: 'Tax pack' },
              { value: 'savings', label: 'Savings' },
            ]}
          />

          <div className="pt-5">
            {tab === 'feed' && (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
                {needsEye.length > 0 && (
                  <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    {needsEye.map((l) => (
                      <li key={l.id} className="flex items-center gap-3.5 rounded-lg bg-surface p-4 shadow-card">
                        <span
                          className={cn(
                            'grid size-10 shrink-0 place-items-center rounded-full',
                            l.status === 'suggested'
                              ? 'bg-accent-soft text-accent-text'
                              : 'bg-warn-soft text-warn-text',
                          )}
                        >
                          <Bank weight="fill" className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="num text-[15px] font-semibold text-ink">
                            {l.amount >= 0 ? '+' : '−'}
                            {money(Math.abs(l.amount), { cents: true })}
                          </p>
                          <p className="truncate font-mono text-xs text-ink-2">
                            {l.payer} · {l.reference}
                          </p>
                          <p className="text-xs text-ink-3">
                            {fmtDate(l.date)} ·{' '}
                            {l.status === 'suggested'
                              ? `probably the tenant at ${addressOf.get(tenancies.find((t) => t.id === l.suggestedTenancyId)?.propertyId ?? '') ?? 'one of your homes'}`
                              : 'no match found'}
                          </p>
                        </div>
                        <Button size="sm" intent="primary" onClick={() => setFiling(l)}>
                          Sort it
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <section>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[15px] font-semibold text-ink">Matched for you</h2>
                    <Badge tone="outline" size="sm">
                      Simulated bank feed
                    </Badge>
                  </div>
                  <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
                    {settled.slice(0, 14).map((l) => {
                      const entry = ledger.find((e) => e.id === l.ledgerId)
                      const twin =
                        l.status === 'ignored' &&
                        lines.some(
                          (o) =>
                            o.id !== l.id &&
                            o.status === 'matched' &&
                            o.amount === l.amount &&
                            o.reference === l.reference &&
                            Math.abs(diffDays(o.date, l.date)) <= 3,
                        )
                      return (
                        <li
                          key={l.id}
                          className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
                        >
                          <span className="num w-[5.5rem] shrink-0 text-xs text-ink-3">{fmtDate(l.date)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-ink">
                              {l.status === 'ignored'
                                ? twin
                                  ? 'Reported twice by the bank — counted once'
                                  : 'Left out of the rental books'
                                : `${catOf.get(entry?.category ?? '')?.label ?? 'Filed'} · ${addressOf.get(entry?.propertyId ?? '') ?? ''}`}
                            </p>
                            <p className="truncate font-mono text-[11px] text-ink-3">
                              {l.payer} · {l.reference}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'num shrink-0 text-[13px] font-semibold',
                              l.status === 'ignored' ? 'text-ink-3 line-through' : 'text-ink',
                            )}
                          >
                            {money(l.amount, { cents: true })}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              </div>
            )}

            {tab === 'ledger' && (
              <div>
                <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
                  <label className="relative block">
                    <span className="sr-only">Search the ledger</span>
                    <MagnifyingGlass
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
                      aria-hidden
                    />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search descriptions and references"
                      className="pl-9"
                    />
                  </label>
                  <Select
                    aria-label="Filter by property"
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                  >
                    <option value="">All properties</option>
                    {mine.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.address.line1}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Filter by kind"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">Every kind</option>
                    {pack.taxCategories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                  <Button
                    intent="secondary"
                    icon={<DownloadSimple className="size-4" />}
                    onClick={exportLedger}
                    disabled={filtered.length === 0}
                  >
                    Download
                  </Button>
                </div>
                {filtered.length === 0 ? (
                  <div className="rounded-lg bg-surface shadow-card">
                    <Empty
                      icon={<MagnifyingGlass />}
                      title="Nothing matches those filters"
                      body="Try a different property or kind, or clear the search."
                      action={
                        <Button
                          intent="secondary"
                          onClick={() => {
                            setQuery('')
                            setPropertyFilter('')
                            setCategoryFilter('')
                          }}
                        >
                          Clear the filters
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <LedgerList
                    rows={filtered.slice(0, shown)}
                    addressOf={addressOf}
                    labelOf={(k) => catOf.get(k)?.label ?? k}
                  />
                )}
                {filtered.length > shown && (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button intent="secondary" size="sm" onClick={() => setShown((n) => n + PAGE)}>
                      Show {Math.min(PAGE, filtered.length - shown)} more
                    </Button>
                    <p className="text-xs text-ink-3">
                      Showing the newest {shown} of {filtered.length}. The download has them all.
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === 'tax' && (
              <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
                <section className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[15px] font-semibold text-ink">
                      {pack.taxForm
                        ? `Rental schedule, the way the ${pack.taxForm.name} asks for it`
                        : 'Rental schedule'}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        aria-label="Tax year"
                        value={String(taxYear)}
                        onChange={(e) => setTaxYear(Number(e.target.value))}
                        className="w-44"
                      >
                        <option value={thisYear}>
                          Year to {yearEnd} {thisYear}
                        </option>
                        <option value={thisYear - 1}>
                          Year to {yearEnd} {thisYear - 1}
                        </option>
                      </Select>
                      <Button intent="primary" icon={<DownloadSimple className="size-4" />} onClick={exportTax}>
                        For my accountant
                      </Button>
                    </div>
                  </div>

                  {/* A phone shows one column at a time; the person chooses which. */}
                  <div className="md:hidden">
                    <Select
                      aria-label="Show the schedule for"
                      value={taxCol}
                      onChange={(e) => setTaxCol(e.target.value)}
                    >
                      <option value="">All properties together</option>
                      {tax.perProperty.map((x) => (
                        <option key={x.p.id} value={x.p.id}>
                          {x.p.address.line1}
                        </option>
                      ))}
                    </Select>
                    <ul className="mt-2.5 overflow-hidden rounded-lg bg-surface shadow-card">
                      {taxLines.map((c) => (
                        <li
                          key={c.key}
                          className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-2.5 text-[13px]"
                        >
                          <span className="text-ink">{c.formLine}</span>
                          <span className="num text-ink-2">{whole(phoneCol[c.key])}</span>
                        </li>
                      ))}
                      <li className="flex items-baseline justify-between gap-4 bg-surface-2 px-4 py-3 text-[13px] font-semibold">
                        <span className="text-ink">Net rental income</span>
                        <span className={cn('num', netOf(phoneCol) < 0 ? 'text-danger-text' : 'text-ink')}>
                          {signed(netOf(phoneCol))}
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="relative hidden overflow-x-auto rounded-lg bg-surface shadow-card md:block">
                    <table className="w-full text-left text-[13px]">
                      <thead className="text-xs text-ink-3">
                        <tr className="border-b border-line">
                          <th
                            scope="col"
                            className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-medium whitespace-nowrap"
                          >
                            Line on the return
                          </th>
                          {tax.perProperty.map((x) => (
                            <th
                              key={x.p.id}
                              scope="col"
                              className="px-3 py-2.5 text-right font-medium whitespace-nowrap"
                            >
                              {x.p.address.line1}
                            </th>
                          ))}
                          <th
                            scope="col"
                            className="sticky right-0 z-10 bg-surface px-4 py-2.5 text-right font-semibold text-ink"
                          >
                            All
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxLines.map((c) => (
                          <tr key={c.key} className="border-b border-line">
                            <th
                              scope="row"
                              className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-normal whitespace-nowrap text-ink"
                            >
                              {c.formLine}
                            </th>
                            {tax.perProperty.map((x) => (
                              <td key={x.p.id} className="num px-3 py-2.5 text-right text-ink-2">
                                {whole(x.t[c.key])}
                              </td>
                            ))}
                            <td className="num sticky right-0 z-10 bg-surface px-4 py-2.5 text-right font-medium text-ink">
                              {whole(tax.all[c.key])}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-surface-2">
                          <th
                            scope="row"
                            className="sticky left-0 z-10 bg-surface-2 px-4 py-3 font-semibold whitespace-nowrap text-ink"
                          >
                            Net rental income
                          </th>
                          {tax.perProperty.map((x) => {
                            const n = netOf(x.t)
                            return (
                              <td
                                key={x.p.id}
                                className={cn(
                                  'num px-3 py-3 text-right font-semibold',
                                  n < 0 ? 'text-danger-text' : 'text-ink',
                                )}
                              >
                                {signed(n)}
                              </td>
                            )
                          })}
                          <td
                            className={cn(
                              'num sticky right-0 z-10 bg-surface-2 px-4 py-3 text-right font-semibold',
                              netOf(tax.all) < 0 ? 'text-danger-text' : 'text-ink',
                            )}
                          >
                            {signed(netOf(tax.all))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-ink-3">
                    Shown in whole dollars; the download keeps the cents. Improvements, bonds and anything marked
                    private are left off the schedule on purpose.
                  </p>
                </section>

                {pack.taxNotes.length > 0 && (
                  <aside aria-label="Worth knowing" className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {pack.taxNotes.map((n) => (
                      <div key={n.key} className="flex min-w-0 flex-col rounded-lg bg-surface p-4 shadow-card">
                        <h3 className="text-[13px] font-semibold text-ink">{n.title}</h3>
                        <p className="mt-1 flex-1 text-[13px] leading-relaxed text-ink-2">{n.plain}</p>
                        <a
                          href={n.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-1 self-start text-xs font-medium text-accent-text underline-offset-2 hoverable:hover:underline"
                        >
                          {n.citation}
                          <ArrowSquareOut className="size-3.5 shrink-0" aria-hidden />
                        </a>
                      </div>
                    ))}
                  </aside>
                )}
                <p className="text-xs leading-relaxed text-ink-3">
                  General information from the tax authority’s published guidance, checked{' '}
                  {fmtDate(pack.taxNotes[0]?.lastVerified ?? pack.publishedOn, { weekday: false, year: 'always' })}. It
                  is not tax advice.
                </p>
              </div>
            )}

            {tab === 'savings' && savings && (
              <div className="grid items-start gap-5 lg:grid-cols-2">
                <section className="rounded-lg bg-nav p-6 text-nav-ink shadow-card">
                  <p className="eyebrow !text-nav-ink-2">Each year, managing it yourself with Loop</p>
                  <Cash value={savings.saved} className="display mt-2 block text-[46px] leading-none text-glow" />
                  <p className="mt-2 text-[14px] leading-relaxed text-nav-ink-2">
                    kept rather than paid to a property manager:{' '}
                    <span className="num text-nav-ink">{money(Math.round(savings.managerCost))}</span> in fees, against{' '}
                    <span className="num text-nav-ink">{money(Math.round(savings.loopCost))}</span> for Loop and the
                    field jobs you booked.
                  </p>
                </section>
                <section className="rounded-lg bg-surface p-5 shadow-card">
                  <h2 className="text-[15px] font-semibold text-ink">How that is worked out</h2>
                  <ul className="mt-3 divide-y divide-line">
                    {savings.parts.map((p) => (
                      <li key={p.label} className="flex items-baseline justify-between gap-4 py-2.5 text-[13px]">
                        <span className="text-ink-2">{p.label}</span>
                        <span className="num font-medium text-ink">{money(Math.round(p.amount))}</span>
                      </li>
                    ))}
                    <li className="flex items-baseline justify-between gap-4 py-2.5 text-[13px]">
                      <span className="font-semibold text-ink">What a manager would charge</span>
                      <span className="num font-semibold text-ink">{money(Math.round(savings.managerCost))}</span>
                    </li>
                    <li className="flex items-baseline justify-between gap-4 py-2.5 text-[13px]">
                      <span className="text-ink-2">Loop plan and field jobs</span>
                      <span className="num font-medium text-ink">−{money(Math.round(savings.loopCost))}</span>
                    </li>
                  </ul>
                  <p className="mt-3 text-xs leading-relaxed text-ink-3">
                    The comparison uses typical New Zealand fees found in November 2026: {PM_ASSUMPTIONS.managementPct}%
                    of rent plus GST, a letting fee of one week’s rent plus GST about every{' '}
                    {PM_ASSUMPTIONS.tenancyMonths} months, and {PM_ASSUMPTIONS.inspectionsPerYear} inspections a year at
                    ${PM_ASSUMPTIONS.inspectionFee} plus GST. Your own quotes may differ, and your time is not counted.
                  </p>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      <FileLine key={filing?.id ?? 'none'} line={filing} onClose={() => setFiling(null)} />
      <AddExpense key={adding ? 'open' : 'closed'} open={adding} onClose={() => setAdding(false)} />
    </Page>
  )
}

function LedgerList({
  rows,
  addressOf,
  labelOf,
}: {
  rows: LedgerEntry[]
  addressOf: Map<string, string>
  labelOf: (key: string) => string
}) {
  return (
    <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
      {rows.map((l) => (
        <li
          key={l.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b border-line px-4 py-3 last:border-b-0 md:grid-cols-[6rem_minmax(0,1.6fr)_minmax(0,1fr)_9rem_7rem]"
        >
          <span className="num order-3 text-xs text-ink-3 md:order-none">{fmtDate(l.date, { year: 'always' })}</span>
          <span className="min-w-0 truncate text-[13px] text-ink">{l.description}</span>
          <span className="order-4 min-w-0 truncate text-right text-xs text-ink-3 md:order-none md:text-left md:text-[13px] md:text-ink-2">
            {addressOf.get(l.propertyId) ?? ''}
          </span>
          <span className="hidden md:block">
            <Badge tone={l.amount >= 0 ? 'ok' : 'neutral'} size="sm">
              {labelOf(l.category)}
            </Badge>
          </span>
          <span
            className={cn(
              'num order-2 text-right text-[13px] font-semibold md:order-none',
              l.amount >= 0 ? 'text-ok-text' : 'text-ink',
            )}
          >
            {l.amount >= 0 ? '+' : '−'}
            {money(Math.abs(l.amount), { cents: !Number.isInteger(l.amount) })}
          </span>
        </li>
      ))}
    </ul>
  )
}
