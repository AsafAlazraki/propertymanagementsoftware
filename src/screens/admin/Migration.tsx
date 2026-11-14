/**
 * Migration.
 *
 * What this screen does that no other does: it brings a whole rent roll onto
 * the platform in one go, which is how the launch market starts — an existing
 * agency's portfolio, not one landlord at a time. It is a bench with three
 * stations in a row: bring the file in, see every row judged by the same rules
 * engine the product runs on, then import what passed. Nothing is imported
 * that was not first shown, and nothing is hidden that was left out.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { CheckCircle, DownloadSimple, FileCsv, PaperPlaneTilt, UploadSimple, Warning, WarningCircle, XCircle } from '@phosphor-icons/react'
import type { MigrationBatch } from '@/domain/types'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { money, plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { MIGRATION_ORG, importBatch, sendFoundingInvites } from '@/data/admin-mutations'
import { Page } from '@/shell/common'
import { Button, buttonClass } from '@/ui/Button'
import { Field, Input, Segmented } from '@/ui/controls'
import { Empty } from '@/ui/display'
import { Refusal, Why } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { Flag, Head, Panel, Simulated, Status, type Icon, type Tone } from './kit'
import { share, text } from './format'
import { COLUMNS, SAMPLE_CSV, addressKey, checkRentRoll, type CheckedRow } from './migration/validate'

export interface MigrationSearch {
  /** The batch to bring into view, set after an import. */
  batch?: string
}

export function migrationSearch(s: Record<string, unknown>): MigrationSearch {
  return { batch: text(s.batch) }
}

const route = getRouteApi('/admin/migration')

const BATCH_STATE: Record<MigrationBatch['status'], { label: string; tone: Tone; icon: Icon }> = {
  draft: { label: 'Draft', tone: 'neutral', icon: FileCsv },
  validated: { label: 'Checked, not imported', tone: 'info', icon: CheckCircle },
  imported: { label: 'Imported, invites not sent', tone: 'warn', icon: PaperPlaneTilt },
  invited: { label: 'Invites sent', tone: 'ok', icon: CheckCircle },
}

function Station({ n, title, note, children, action }: { n: number; title: string; note?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <span className="num grid size-5 place-items-center rounded-full bg-ink text-[11px] font-semibold text-bg">{n}</span>
          {title}
        </span>
      }
      note={note}
      action={action}
    >
      {children}
    </Panel>
  )
}

function RowLine({ r }: { r: CheckedRow }) {
  const blocked = r.problems.some((p) => p.blocks)
  const noted = !blocked && r.problems.length > 0
  return (
    <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 px-4 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-x-3">
      <span className="num pt-0.5 font-mono text-[11px] text-ink-3">{String(r.row).padStart(2, '0')}</span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink">
          {r.raw.address || <span className="text-ink-3">No address</span>}
          {r.raw.suburb && <span className="font-normal text-ink-3">, {r.raw.suburb}</span>}
        </p>
        <p className="truncate text-xs text-ink-3">
          {r.raw.tenant_name || 'No tenant named'}
          {r.value ? (
            <>
              {' '}
              · <span className="num">{money(r.value.weeklyRent)}</span> a week · bond <span className="num">{money(r.value.bond)}</span>
            </>
          ) : (
            r.raw.weekly_rent && <> · rent given as “{r.raw.weekly_rent}”</>
          )}
        </p>
        {r.problems.length > 0 && (
          <ul className="mt-1.5 grid gap-1">
            {r.problems.map((p) => (
              <li key={p.field + p.problem} className="flex items-start gap-1.5 text-xs leading-relaxed">
                {p.blocks ? <XCircle weight="fill" className="mt-0.5 size-3.5 shrink-0 text-danger-text" aria-hidden /> : <WarningCircle weight="fill" className="mt-0.5 size-3.5 shrink-0 text-warn-text" aria-hidden />}
                <span className="min-w-0 text-ink">
                  <span className="font-mono text-[11px] text-ink-3">{p.field}</span> {p.problem}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="col-start-2 mt-1.5 sm:col-start-3 sm:mt-0">
        {blocked ? (
          <Flag tone="danger" icon={XCircle}>
            Left out
          </Flag>
        ) : noted ? (
          <Flag tone="warn" icon={Warning}>
            Ready, with a note
          </Flag>
        ) : (
          <Flag tone="ok" icon={CheckCircle}>
            Ready
          </Flag>
        )}
      </div>
    </li>
  )
}

function Funnel({ batch }: { batch: MigrationBatch }) {
  const steps = [
    { label: 'In the file', value: batch.rows },
    { label: 'Imported', value: batch.imported },
    { label: 'Invited', value: batch.invitesSent },
    { label: 'Accepted', value: batch.invitesAccepted },
  ]
  return (
    <ol className="grid grid-cols-4 gap-2">
      {steps.map((s, i) => (
        <li key={s.label} className="min-w-0">
          <p className="truncate text-[11px] text-ink-3">{s.label}</p>
          <p className="num text-[15px] font-semibold text-ink">{s.value}</p>
          <span role="img" aria-label={`${s.value} of ${batch.rows}`} className="mt-1 block h-1 overflow-hidden rounded-full bg-sunken">
            <span className={cn('block h-full rounded-full', i === 3 ? 'bg-ok' : 'bg-accent')} style={{ width: `${batch.rows ? (s.value / batch.rows) * 100 : 0}%` }} />
          </span>
        </li>
      ))}
    </ol>
  )
}

export function Migration() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const me = useMe()
  const pack = usePack()
  const day = useToday()
  const batches = useStore((s) => s.db.migrations)
  const properties = useStore((s) => s.db.properties)
  const agency = useStore((s) => s.db.orgs.find((o) => o.id === MIGRATION_ORG))
  const [csv, setCsv] = useState('')
  const [name, setName] = useState('')
  const [only, setOnly] = useState<'all' | 'problems'>('all')
  const [tried, setTried] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const onPlatform = useMemo(() => new Set(properties.map((p) => addressKey(p.address.line1, p.address.suburb))), [properties])
  const checked = useMemo(() => (csv.trim() ? checkRentRoll(csv, pack, day, onPlatform) : null), [csv, pack, day, onPlatform])
  const leftOut = checked ? checked.rows.filter((r) => !r.value) : []
  const noted = checked ? checked.rows.filter((r) => r.value && r.problems.length > 0).length : 0
  const visible = checked ? (only === 'problems' ? checked.rows.filter((r) => r.problems.length > 0) : checked.rows) : []

  const load = (value: string) => {
    setCsv(value)
    setTried(false)
    setOnly('all')
  }

  const doImport = () => {
    setTried(true)
    if (!checked || checked.ready.length === 0) return
    const issues = leftOut.flatMap((r) => r.problems.filter((p) => p.blocks).map((p) => ({ row: r.row, field: p.field, problem: p.problem })))
    const { batchId, createdRecords } = importBatch(name, checked.ready, checked.rows.length, issues, me.fullName)
    toast.success(`${plural(checked.ready.length, 'row')} imported`, {
      description: createdRecords ? `${plural(checked.ready.length, 'home')} and ${checked.ready.length === 1 ? 'its tenancy' : 'their tenancies'} now sit under ${agency?.name ?? 'the partner agency'}.` : 'The batch is recorded. No partner agency exists to hold the homes, so no property records were created.',
    })
    load('')
    setName('')
    void navigate({ search: { batch: batchId }, replace: true })
  }

  return (
    <Page wide>
      <Head
        title="Migration"
        lede={
          <>
            Bring an agency’s rent roll across in one file. Each row is checked by the rules engine before anything is imported; rows that pass become a home and a live tenancy under {agency?.name ?? 'the partner agency'}, and their owners and tenants can then be invited.
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid min-w-0 gap-4">
          <Station
            n={1}
            title="Bring in the rent roll"
            note="Paste the rows or choose a .csv file. The first line names the columns."
            action={
              <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(SAMPLE_CSV)}`} download="rent-roll-sample.csv" className={buttonClass({ intent: 'ghost', size: 'sm' })}>
                <DownloadSimple className="size-4" aria-hidden /> Sample file
              </a>
            }
          >
            <label htmlFor="rent-roll" className="sr-only">
              Rent roll, as comma-separated rows
            </label>
            <textarea
              id="rent-roll"
              value={csv}
              onChange={(e) => load(e.target.value)}
              spellCheck={false}
              rows={7}
              placeholder={`${COLUMNS.map((c) => c.key).join(',')}\n12 Kōtuku Lane,Stoke,Nelson,7011,house,3,560,2240,BND-5512-0931,2025-03-14,…`}
              className="block w-full resize-y rounded-md bg-sunken px-3 py-2.5 font-mono text-xs leading-relaxed whitespace-pre text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none placeholder:text-ink-3 focus:shadow-[inset_0_0_0_2px_var(--focus)]"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                ref={file}
                type="file"
                accept=".csv,text/csv,text/plain"
                hidden
                aria-label="Choose a rent roll file"
                onChange={async (e) => {
                  const picked = e.target.files?.[0]
                  e.target.value = ''
                  if (!picked) return
                  load(await picked.text())
                  if (!name) setName(picked.name.replace(/\.[^.]+$/, ''))
                }}
              />
              <Button intent="secondary" size="sm" icon={<UploadSimple className="size-4" />} onClick={() => file.current?.click()}>
                Choose a file
              </Button>
              <Button
                intent="ghost"
                size="sm"
                onClick={() => {
                  load(SAMPLE_CSV)
                  if (!name) setName('Sample rent roll')
                }}
              >
                Use the sample
              </Button>
              {csv && (
                <Button intent="ghost" size="sm" onClick={() => load('')}>
                  Clear
                </Button>
              )}
            </div>
            <details className="mt-3 text-xs text-ink-2">
              <summary className="w-fit rounded-sm text-ink-3 underline decoration-line-strong underline-offset-2 hoverable:hover:text-ink">The columns the file needs</summary>
              <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {COLUMNS.map((c) => (
                  <li key={c.key} className="flex min-w-0 items-baseline gap-2">
                    <span className="shrink-0 font-mono text-[11px] text-ink">{c.key}</span>
                    <span className="min-w-0 truncate text-ink-3">
                      {c.required ? '' : 'optional · '}
                      {c.example}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-ink-3">The sample file’s people and addresses are invented. Some of its rows carry deliberate mistakes so you can see the checks work.</p>
            </details>
          </Station>

          <Station
            n={2}
            title="Every row, checked"
            note={
              <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                Rent must be one figure <Why rule="listing.fixed_price_required" /> and the bond within the cap <Why rule="bond.max_weeks" />
              </span>
            }
            action={
              checked && checked.rows.length > 0 && leftOut.length + noted > 0 ? (
                <Segmented
                  label="Which rows to show"
                  size="sm"
                  value={only}
                  onChange={setOnly}
                  options={[
                    { value: 'all', label: `All · ${checked.rows.length}` },
                    { value: 'problems', label: `With a problem · ${leftOut.length + noted}` },
                  ]}
                />
              ) : undefined
            }
          >
            {!checked ? (
              <Empty icon={<FileCsv />} title="Nothing to check yet" body="Paste a rent roll above, choose a file, or load the sample. Each row is judged here before anything is imported." className="py-6" />
            ) : checked.missingColumns.length > 0 ? (
              <Refusal
                verdict={{
                  ok: false,
                  reason: `The file is missing ${checked.missingColumns.length === 1 ? 'a column' : 'columns'} it cannot be checked without: ${checked.missingColumns.join(', ')}.`,
                  fix: 'Add them to the first line, spelled as in the list of columns above. The sample file shows the layout.',
                }}
              />
            ) : checked.rows.length === 0 ? (
              <Refusal verdict={{ ok: false, reason: 'The file has a heading line and no rows under it.', fix: 'Add one line for each tenancy.' }} />
            ) : (
              <div className="-mx-4 -mb-4">
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-line bg-surface-2 px-4 py-2 text-xs">
                  <Status tone="ok" icon={CheckCircle} strong>
                    {checked.ready.length} ready to import
                  </Status>
                  {noted > 0 && (
                    <Status tone="warn" icon={Warning}>
                      {noted} of those with a note
                    </Status>
                  )}
                  {leftOut.length > 0 && (
                    <Status tone="danger" icon={XCircle} strong>
                      {leftOut.length} left out
                    </Status>
                  )}
                  {checked.ignoredColumns.length > 0 && <span className="text-ink-3">Ignored {plural(checked.ignoredColumns.length, 'column')} the import does not use: {checked.ignoredColumns.join(', ')}</span>}
                </p>
                <ol className="max-h-[28rem] divide-y divide-line overflow-y-auto overscroll-contain">
                  {visible.map((r) => (
                    <RowLine key={r.row} r={r} />
                  ))}
                </ol>
              </div>
            )}
          </Station>

          <Station n={3} title="Import what passed" note={`Rows that passed become records under ${agency?.name ?? 'the partner agency'}. Rows left out stay listed on the batch.`}>
            <div className="grid gap-3">
              <Field label="Name this batch" optional hint="How it will appear in the list and the audit log.">
                {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Blue Penguin rent roll, Richmond" />}
              </Field>
              <p className="text-xs leading-relaxed text-ink-3">
                Only what the rent roll states is recorded as known. Healthy homes, insurance and the signed agreement start as “not on file”, rent is taken as paid to today until the bank feed says otherwise, and a bond with a reference is recorded as lodged on the tenancy’s start date until Bond Hub confirms the real one.
              </p>
              {tried && (!checked || checked.ready.length === 0) && (
                <Refusal verdict={{ ok: false, reason: 'There is no row to import.', fix: checked && checked.rows.length > 0 ? 'Every row has a blocking problem. Fix the file and bring it in again.' : 'Bring in a rent roll first.' }} />
              )}
              <div>
                <Button intent="primary" icon={<UploadSimple weight="bold" className="size-4" />} onClick={doImport}>
                  {checked && checked.ready.length > 0 ? `Import ${plural(checked.ready.length, 'row')}` : 'Import'}
                </Button>
              </div>
            </div>
          </Station>
        </div>

        <section aria-labelledby="batches-title" className="min-w-0 xl:sticky xl:top-6">
          <h2 id="batches-title" className="mb-2.5 text-[13px] font-semibold text-ink">
            Batches
          </h2>
          {batches.length === 0 ? (
            <div className="rounded-lg bg-surface shadow-card">
              <Empty icon={<FileCsv />} title="No rent roll has been imported" body="Each import is kept here as a batch: how many rows came across, who has been invited and who has accepted." />
            </div>
          ) : (
            <ul className="grid gap-3">
              {batches.map((b) => {
                const state = BATCH_STATE[b.status]
                return (
                  <li key={b.id} className={cn('rounded-lg bg-surface p-4 shadow-card', b.id === search.batch && 'outline-2 outline-offset-2 outline-accent')}>
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-ink">{b.name}</h3>
                        <p className="text-xs text-ink-3">Imported {fmtDate(dateOf(b.createdAt), { weekday: false, year: 'always' })}</p>
                      </div>
                      <Status tone={state.tone} icon={state.icon} strong className="text-xs">
                        {state.label}
                      </Status>
                    </div>
                    <div className="mt-3">
                      <Funnel batch={b} />
                    </div>
                    {b.invitesSent > 0 && <p className="mt-2 text-xs text-ink-3">{share(b.invitesAccepted, b.invitesSent)} of invites accepted so far.</p>}

                    {b.issues.length > 0 && (
                      <details className="mt-3 border-t border-line pt-2.5">
                        <summary className="w-fit rounded-sm text-xs font-medium text-ink-2 hoverable:hover:text-ink">
                          {plural(b.issues.length, 'problem')} left {plural(b.rows - b.imported, 'row')} out
                        </summary>
                        <ul className="mt-2 grid gap-1.5">
                          {b.issues.map((issue) => (
                            <li key={`${issue.row}-${issue.field}`} className="flex items-start gap-1.5 text-xs leading-relaxed text-ink">
                              <XCircle weight="fill" className="mt-0.5 size-3.5 shrink-0 text-danger-text" aria-hidden />
                              <span className="min-w-0">
                                <span className="num font-mono text-[11px] text-ink-3">
                                  row {issue.row} · {issue.field}
                                </span>{' '}
                                {issue.problem}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                      {b.status === 'imported' && b.imported > 0 ? (
                        <Button
                          intent="primary"
                          size="sm"
                          icon={<PaperPlaneTilt weight="fill" className="size-3.5" />}
                          onClick={() => {
                            sendFoundingInvites(b.id, me.fullName)
                            toast.success(`${plural(b.imported, 'founding invite')} marked as sent`, { description: 'Simulated: the prototype sends no email.' })
                          }}
                        >
                          Send founding invites
                        </Button>
                      ) : b.status === 'invited' ? (
                        <span className="text-xs text-ink-2">
                          {b.invitesSent} founding {b.invitesSent === 1 ? 'invite' : 'invites'} sent to owners and tenants.
                        </span>
                      ) : (
                        <span className="text-xs text-ink-3">Nothing was imported, so there is nobody to invite.</span>
                      )}
                      <Simulated className="ml-auto">Invites simulated</Simulated>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {agency && (
            <p className="mt-3 text-xs text-ink-3">
              Imported homes are held by{' '}
              <Link to="/admin/orgs" search={{ org: agency.id }} className="rounded-sm text-accent-text underline decoration-accent-line underline-offset-2">
                {agency.name}
              </Link>{' '}
              until their owners accept a founding invite.
            </p>
          )}
        </section>
      </div>
    </Page>
  )
}
