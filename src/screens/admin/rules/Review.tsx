/**
 * Reviewing one detected change: a code review, for law.
 *
 * The reviewer reads down the left — the summary someone drafted, the verbatim
 * text it rests on, the exact values proposed, and what those values do when
 * the real calculators are run with them. On the right is everything that
 * stands between the proposal and a publish: the checks the code made, who has
 * signed, and the decision itself. A model may have drafted the summary; only
 * a person can press anything on this page.
 */
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, ArrowUUpLeft, CheckCircle, Equals, MinusCircle, PencilSimple, Quotes, RocketLaunch, SealCheck, UserSwitch, XCircle } from '@phosphor-icons/react'
import type { RuleChange, User } from '@/domain/types'
import type { RuleKey } from '@/domain/jurisdictions/types'
import type { Verdict } from '@/domain/rules/core'
import { PACKS, resolvePack } from '@/domain/jurisdictions'
import { approversOf, canApprove, canPublish, formatRuleValue, guardrails, impactAnalysis, inForce, isCalendarDate, latestOverriding, needsTwoReviewers, nextVersion, sameValue, sourceState, type FeedEvent, type ReviewVerdict } from '@/domain/regwatch'
import { fmtDate } from '@/domain/rules/calendar'
import { plural } from '@/domain/rules/format'
import { useMe, useStore } from '@/data/store'
import { useToday } from '@/data/hooks'
import { publishChange, reviewChange, rollbackVersion, saveChangeSummary } from '@/data/admin-mutations'
import { Button } from '@/ui/Button'
import { Checkbox, Field, Segmented, Textarea } from '@/ui/controls'
import { Callout, Timeline } from '@/ui/display'
import { Refusal } from '@/ui/Law'
import { cn } from '@/ui/cn'
import { Out, Panel, Simulated, Status, TONE_TEXT } from '../kit'
import { CHANGE_STATUS, CONFIDENCE, GUARDRAIL, IMPACT, JURISDICTION_NAME, SOURCE_STATE } from '../labels'
import { whenExact, whenInline } from '../format'
import { DiffLine, OriginTag, PackTag, isPracticeDrill } from './shared'

const VERDICT_WORD: Record<ReviewVerdict, string> = { approve: 'approved', reject: 'rejected', no_action: 'recorded no action needed' }

export function Review({ change, event, back }: { change: RuleChange; event?: FeedEvent; back: () => void }) {
  const me = useMe()
  const day = useToday()
  const data = useStore((s) => s.db)
  const admins = useMemo(() => data.users.filter((u) => u.role === 'platform_admin' && u.status === 'active'), [data.users])
  const [reviewerId, setReviewerId] = useState(me.id)
  const reviewer: User = admins.find((u) => u.id === reviewerId) ?? me
  const [read, setRead] = useState(false)
  const [note, setNote] = useState('')
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const [draft, setDraft] = useState<string | null>(null)

  const code = change.jurisdiction
  const pack = useMemo(() => resolvePack(code, data.packVersions), [code, data.packVersions])
  const source = data.ruleSources.find((s) => s.id === change.sourceId)
  const rails = useMemo(() => guardrails(change, { source, pack, today: day }), [change, source, pack, day])
  const impact = useMemo(() => impactAnalysis(data, change, day), [data, change, day])
  const approve = canApprove(change, rails, reviewer.fullName)
  const publish = canPublish(change, rails)
  const live = inForce(change, pack)
  const drill = isPracticeDrill(change)
  const open = change.status === 'pending_review' || change.status === 'needs_second_review'
  const status = CHANGE_STATUS[change.status]
  const impactLamp = IMPACT[change.impact]
  const met = rails.filter((g) => g.status === 'pass').length
  const applies = rails.filter((g) => g.status !== 'na').length
  const approvers = approversOf(change)
  /** Someone on the team who has not approved yet: the person the second approval can come from. */
  const second = admins.find((u) => !approvers.includes(u.fullName))
  const publishedAs = data.packVersions.find((v) => v.jurisdiction === code && v.version === change.publishedInVersion)
  const canRollBack = publishedAs !== undefined && latestOverriding(data.packVersions, code)?.id === publishedAs.id
  const next = nextVersion(data.packVersions, code, day)
  const src = source ? sourceState(source, day) : null

  const decide = (verdict: ReviewVerdict) => {
    if (verdict === 'approve' && !read) {
      return setRefusal({ ok: false, reason: 'Tick that you have read the quoted text at its source.', fix: 'An approval rests on the source, not on someone’s summary of it.' })
    }
    const first = verdict === 'approve' && needsTwoReviewers(change) && approvers.length === 0
    const v = reviewChange(change.id, verdict, reviewer.fullName, verdict === 'approve' ? `Read at source.${note.trim() ? ` ${note.trim()}` : ''}` : note)
    if (!v.ok) return setRefusal(v)
    setNote('')
    setRead(false)
    setRefusal(null)
    if (verdict === 'approve') {
      if (first) toast.success('First approval recorded', { description: 'A high-impact rule needs a second approval from a different person before it can be published.' })
      else toast.success('Approved', { description: PACKS[code].status === 'live' ? 'It can be published now.' : 'Recorded. A preview pack drives no calculator, so there is nothing to publish.' })
    } else toast(`${reviewer.fullName.split(' ')[0]} ${VERDICT_WORD[verdict]}`, { description: 'The live rules are unchanged.' })
  }

  return (
    <div>
      <button type="button" onClick={back} className="mb-3 inline-flex items-center gap-1.5 rounded-sm text-[13px] text-ink-2 hoverable:hover:text-ink">
        <ArrowLeft className="size-3.5" aria-hidden /> All changes
      </button>

      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <PackTag code={code} />
          <OriginTag change={change} />
        </div>
        <h2 className="mt-2 max-w-[60ch] text-[20px] leading-tight font-semibold tracking-[-0.02em] text-ink">{change.title}</h2>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
          <Status tone={status.tone} icon={status.icon} strong>
            {status.label}
          </Status>
          <Status tone={impactLamp.tone} icon={impactLamp.icon}>
            {impactLamp.label}
          </Status>
          <span className="text-ink-2">{CONFIDENCE[change.confidence]}</span>
          <span className="text-ink-3" title={whenExact(change.detectedAt)}>
            Detected {whenInline(change.detectedAt, day)}
          </span>
        </p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* ── what is proposed ─────────────────────────────────────────── */}
        <div className="grid min-w-0 gap-4">
          <Panel
            title="Summary"
            note={change.origin === 'watcher' ? 'Drafted by a model from the changed text. Correct it before you rely on it.' : 'In production a model drafts this from the changed text and a person corrects it.'}
            action={
              <>
                {change.origin === 'demo' && <Simulated>Model draft simulated</Simulated>}
                {draft === null && (
                  <Button size="sm" intent="ghost" icon={<PencilSimple className="size-3.5" />} onClick={() => setDraft(change.summary)}>
                    Edit
                  </Button>
                )}
              </>
            }
          >
            {draft === null ? (
              <p className="max-w-[72ch] text-[14px] leading-relaxed text-ink">{change.summary}</p>
            ) : (
              <div className="grid gap-2.5">
                <label htmlFor="summary-draft" className="sr-only">
                  Summary
                </label>
                <Textarea id="summary-draft" value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-28" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    intent="primary"
                    onClick={() => {
                      const v = saveChangeSummary(change.id, draft, reviewer.fullName)
                      if (!v.ok) return toast.error(v.reason ?? 'The summary could not be saved.')
                      setDraft(null)
                      toast.success('Summary corrected')
                    }}
                  >
                    Save the correction
                  </Button>
                  <Button size="sm" intent="ghost" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Evidence" note="The verbatim text the summary rests on. Read this, then the source, before the summary.">
            {change.evidenceQuote.trim() ? (
              <blockquote className="flex gap-3 rounded-md bg-sunken p-3.5">
                <Quotes weight="fill" className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
                <p className="min-w-0 font-mono text-[13px] leading-relaxed text-ink">{change.evidenceQuote}</p>
              </blockquote>
            ) : (
              <Callout tone="warn">Nothing is quoted. Without verbatim source text there is nothing to check a proposed value against, so no rule can be approved from this item.</Callout>
            )}
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-[auto_minmax(0,1fr)]">
              <dt className="text-ink-3">Source</dt>
              <dd className="min-w-0">
                <Out href={change.evidenceUrl}>{source?.name ?? change.evidenceUrl}</Out>
              </dd>
              {source && src && (
                <>
                  <dt className="text-ink-3">Being read</dt>
                  <dd>
                    <Status tone={SOURCE_STATE[src.state].tone} icon={SOURCE_STATE[src.state].icon}>
                      {SOURCE_STATE[src.state].label}
                      {source.lastCheckedAt ? ` · last read ${whenInline(source.lastCheckedAt, day)}` : ''}
                    </Status>
                  </dd>
                </>
              )}
            </dl>
            {event && (event.addedLines.length > 0 || event.removedLines.length > 0) && (
              <div className="mt-4">
                <p className="eyebrow mb-1.5">What changed on the page</p>
                <div className="overflow-hidden rounded-md shadow-card">
                  {event.removedLines.map((l) => (
                    <DiffLine key={`r${l}`} side="before">
                      {l}
                    </DiffLine>
                  ))}
                  {event.addedLines.map((l) => (
                    <DiffLine key={`a${l}`} side="after">
                      {l}
                    </DiffLine>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Proposed change" note={change.patches.length ? `${plural(change.patches.length, 'rule')} in the ${JURISDICTION_NAME[code]} pack` : undefined} bodyClassName={change.patches.length ? 'grid gap-4 p-4' : 'p-4'}>
            {change.patches.length === 0 ? (
              <p className="max-w-[68ch] text-[13px] leading-relaxed text-ink-2">No rule value is proposed to change. If the summary is right, the decision here is “no action needed”; if the source did change something the pack holds, reject this and raise it with the change spelled out.</p>
            ) : (
              change.patches.map((p) => {
                const rule = p.ruleKey in pack.rules ? pack.rules[p.ruleKey as RuleKey] : undefined
                const now = rule?.value
                const drifted = rule !== undefined && !sameValue(now, p.from) && !sameValue(now, p.to)
                return (
                  <article key={p.ruleKey} className="overflow-hidden rounded-md shadow-card">
                    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-surface-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink">{rule?.label ?? 'Unknown rule'}</p>
                        <p className="truncate font-mono text-[11px] text-ink-3">{p.ruleKey}</p>
                      </div>
                      {rule && (
                        <Out href={rule.sourceUrl} className="font-mono text-[11px]">
                          {rule.citation}
                        </Out>
                      )}
                    </header>
                    <DiffLine side="before">{formatRuleValue(p.ruleKey, p.from)}</DiffLine>
                    <DiffLine side="after" note={isCalendarDate(p.effectiveFrom) ? `in force from ${fmtDate(p.effectiveFrom, { weekday: false, year: 'always' })}` : 'no commencement date'}>
                      {formatRuleValue(p.ruleKey, p.to)}
                    </DiffLine>
                    {rule && (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line px-3 py-2 text-xs text-ink-2">
                        <span className="text-ink-3">
                          The {pack.status === 'live' ? 'live' : 'preview'} pack returns, right now:
                        </span>
                        <span className={cn('font-mono text-[12px] font-medium', sameValue(now, p.to) ? 'text-ok-text' : 'text-ink')}>{formatRuleValue(p.ruleKey, now)}</span>
                        <span className="font-mono text-[11px] text-ink-3">pack {pack.version}</span>
                        {drifted && <span className="text-warn-text">Neither side of this diff: the proposal was drafted against an older pack.</span>}
                      </p>
                    )}
                  </article>
                )
              })
            )}
          </Panel>

          {change.patches.length > 0 && (
            <Panel
              title="What it would change"
              note={
                impact.scenarios === 0
                  ? 'No calculator reads these rules directly.'
                  : `The real calculators, run on the pack before and after the patch: ${impact.changed} of ${plural(impact.scenarios, 'answer')} ${impact.changed === 1 ? 'changes' : 'change'}.`
              }
              bodyClassName="grid gap-5 p-4"
            >
              {!impact.drivesCalculators && (
                <Callout tone="neutral" title={`${JURISDICTION_NAME[code]} is a preview pack`}>
                  These are the answers the calculators would give. No calculator runs on a preview pack, and no organisation in the store is in this jurisdiction, so nothing changes for anyone whatever is decided here.
                </Callout>
              )}
              {impact.patches.map((p) => (
                <section key={p.ruleKey} aria-label={`Impact of ${p.label}`}>
                  <p className="text-[13px] text-ink">
                    <span className="font-semibold">{p.label}</span>
                    {p.reads && <span className="text-ink-2"> is read by: {p.reads.charAt(0).toLowerCase() + p.reads.slice(1)}.</span>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {p.records === 0 ? (
                      `No ${p.noun} in the store ${p.noun.endsWith('s') ? 'are' : 'is'} governed by it today.`
                    ) : (
                      <>
                        It governs <span className="num font-semibold text-ink">{p.records}</span> {p.noun} across <span className="num font-semibold text-ink">{p.orgs}</span> {p.orgs === 1 ? 'organisation' : 'organisations'} in the store today.
                      </>
                    )}
                  </p>
                  {p.scenarios.length === 0 ? (
                    <p className="mt-2 rounded-md bg-sunken px-3 py-2 text-xs text-ink-2">No date or money calculator reads this rule, so there is no before-and-after to show. It changes guidance text and checklists only.</p>
                  ) : (
                    <table className="mt-2.5 w-full text-left text-[13px]">
                      <caption className="sr-only">Calculator answers before and after the patch, for {p.label}</caption>
                      <thead className="hidden sm:table-header-group">
                        <tr className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 uppercase [&>th]:pb-1.5 [&>th]:font-medium">
                          <th scope="col">Fixture</th>
                          <th scope="col" className="w-[28%]">
                            Before
                          </th>
                          <th scope="col" className="w-[30%]">
                            After
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.scenarios.map((s) => (
                          <tr key={s.id} className="block border-t border-line py-2 sm:table-row sm:py-0 [&>*]:block sm:[&>*]:table-cell sm:[&>*]:py-2 sm:[&>*]:pr-3">
                            <th scope="row" className="font-normal text-ink-2">
                              {s.label}
                            </th>
                            <td className={cn('num', s.changed ? 'text-ink-2 line-through decoration-line-strong' : 'text-ink-2')}>{s.before}</td>
                            <td className="num">
                              {s.changed ? (
                                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                                  <ArrowRight weight="bold" className="size-3 shrink-0 text-accent-text" aria-hidden />
                                  {s.after}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-ink-3">
                                  <Equals className="size-3 shrink-0" aria-hidden /> No change
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              ))}
              {impact.scenarios > 0 && impact.changed === 0 && <Callout tone="warn">The patch changes no calculator answer. If the summary says it should, the proposal is wrong somewhere: check the rule key and the value.</Callout>}
              <p className="text-xs leading-relaxed text-ink-3">
                Fixture dates are chosen where date arithmetic most often goes wrong: after the email cut-off, by post, across Christmas and at a month end. The prototype applies a published value at once; in production a value with a future commencement date ships ahead and switches on that day.
              </p>
            </Panel>
          )}
        </div>

        {/* ── what stands between it and a publish ─────────────────────── */}
        <div className="grid min-w-0 gap-4">
          <Panel title="Guardrails" note={`Computed from the change itself. ${met} of ${applies} met.`} bodyClassName="">
            <ul className="divide-y divide-line">
              {rails.map((g) => {
                const lamp = GUARDRAIL[g.status]
                const Glyph = lamp.icon
                return (
                  <li key={g.id} className={cn('flex gap-2.5 px-4 py-2.5', g.status === 'na' && 'opacity-70')}>
                    <Glyph weight="fill" className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[lamp.tone])} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink">
                        {g.label} <span className={cn('ml-1 text-xs font-normal', TONE_TEXT[lamp.tone])}>{lamp.label}</span>
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{g.detail}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="Reviewers" note={needsTwoReviewers(change) ? 'Two different people must approve: this touches a money cap, a notice period or a termination ground.' : 'One reviewer is enough at this impact.'}>
            {change.reviews.length === 0 ? (
              <p className="text-[13px] text-ink-2">Nobody has reviewed this yet.</p>
            ) : (
              <Timeline
                items={change.reviews.map((r, i) => ({
                  id: `${r.at}-${i}`,
                  at: whenExact(r.at),
                  title: (
                    <>
                      <span className="font-medium">{r.by}</span> {VERDICT_WORD[r.verdict]}
                    </>
                  ),
                  body: r.note,
                  tone: r.verdict === 'approve' ? 'ok' : r.verdict === 'reject' ? 'danger' : 'neutral',
                }))}
              />
            )}
          </Panel>

          <Panel title="Decision" bodyClassName="grid gap-4 p-4">
            {open && (
              <>
                {admins.length > 1 && (
                  <div>
                    <p className="mb-1.5 text-[13px] font-medium text-ink">Reviewing as</p>
                    <Segmented
                      label="Reviewing as"
                      className="w-full"
                      value={reviewer.id}
                      onChange={(id) => {
                        setReviewerId(id)
                        setRefusal(null)
                      }}
                      options={admins.map((u) => ({ value: u.id, label: u.id === me.id ? `${u.fullName.split(' ')[0]} (you)` : `${u.fullName.split(' ')[0]} (demo)` }))}
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-3">Demo control. In production the second reviewer signs in as themselves; this lets one visitor walk the two-person path. Each verdict is recorded under the name chosen here.</p>
                  </div>
                )}

                {approve.ok ? (
                  <Checkbox
                    checked={read}
                    onCheckedChange={(v) => {
                      setRead(v)
                      setRefusal(null)
                    }}
                  >
                    I have read the quoted text at its source, not only the summary.
                  </Checkbox>
                ) : (
                  <div className="grid gap-2">
                    <Refusal verdict={approve} />
                    {second && approvers.includes(reviewer.fullName) && (
                      <Button
                        intent="soft"
                        icon={<UserSwitch className="size-4" />}
                        onClick={() => {
                          setReviewerId(second.id)
                          setRefusal(null)
                        }}
                      >
                        Review as {second.fullName.split(' ')[0]} (demo)
                      </Button>
                    )}
                  </div>
                )}

                <Field label="Note" optional hint="Required to reject. Kept with the verdict and in the audit log.">
                  {(p) => (
                    <Textarea
                      {...p}
                      value={note}
                      onChange={(e) => {
                        setNote(e.target.value)
                        setRefusal(null)
                      }}
                      placeholder="What you checked, or why this is wrong."
                      className="min-h-16"
                    />
                  )}
                </Field>

                {refusal && <Refusal verdict={refusal} />}

                <div className="grid gap-2">
                  {approve.ok && (
                    <Button intent="primary" block icon={<SealCheck weight="fill" className="size-4" />} onClick={() => decide('approve')}>
                      {needsTwoReviewers(change) ? (approvers.length === 0 ? 'Approve: first of two' : 'Approve: second of two') : 'Approve'}
                    </Button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button intent={approve.ok ? 'secondary' : 'primary'} icon={<MinusCircle className="size-4" />} onClick={() => decide('no_action')}>
                      No action needed
                    </Button>
                    <Button intent="dangerSoft" icon={<XCircle className="size-4" />} onClick={() => decide('reject')}>
                      Reject
                    </Button>
                  </div>
                </div>
              </>
            )}

            {change.status === 'approved' && (
              <>
                <p className="text-[13px] leading-relaxed text-ink">
                  Approved by {approvers.join(' and ') || 'the team'}. It is not in force: the calculators still return the old {change.patches.length === 1 ? 'value' : 'values'}.
                </p>
                {publish.ok ? (
                  <>
                    <div className="rounded-md bg-accent-soft p-3 text-[13px] leading-relaxed text-ink">
                      Publishing creates <span className="font-mono text-[12px] font-medium">{code} {next}</span>, a new pack version whose overrides carry this patch. From that moment every calculator in Loop and Pool that reads {change.patches.length === 1 ? 'this rule' : 'these rules'} returns the new {change.patches.length === 1 ? 'value' : 'values'}, with no deploy.
                      {drill && <span className="mt-1.5 block font-medium text-warn-text">This is the practice drill. Publishing it really does change the tenant notice period across this demo, which is the point of the rehearsal. Roll it back afterwards.</span>}
                    </div>
                    <Button
                      intent="primary"
                      block
                      icon={<RocketLaunch weight="fill" className="size-4" />}
                      onClick={() => {
                        const v = publishChange(change.id, reviewer.fullName)
                        if (!v.ok) return setRefusal(v)
                        toast.success(`Published as ${code} ${v.version}`, { description: 'Every calculator that reads this rule now returns the new value. Open any notice builder in Loop to see it.' })
                      }}
                    >
                      Publish as {next}
                    </Button>
                  </>
                ) : (
                  <Refusal verdict={publish} />
                )}
                {refusal && <Refusal verdict={refusal} />}
              </>
            )}

            {change.status === 'published' && (
              <>
                {live ? (
                  <Callout tone="ok" icon={<CheckCircle weight="fill" />} title={`In force since ${code} ${change.publishedInVersion ?? pack.version}`}>
                    Every calculator that reads {change.patches.length === 1 ? 'this rule' : 'these rules'} returns the new {change.patches.length === 1 ? 'value' : 'values'}.
                    {drill && <span className="mt-1 block text-warn-text">This was the practice drill: the live tenant notice period in this demo is now the practice value. Roll it back when the rehearsal is over.</span>}
                  </Callout>
                ) : (
                  <Callout tone="neutral" title={`Published in ${code} ${change.publishedInVersion ?? 'an earlier version'}`}>
                    {change.patches.length === 0 ? 'It changed no rule value.' : 'A later version has since changed these values again; see Versions.'}
                  </Callout>
                )}
                {publishedAs && Object.keys(publishedAs.overrides).length > 0 && (
                  <>
                    {canRollBack ? (
                      <Button
                        intent="secondary"
                        block
                        icon={<ArrowUUpLeft className="size-4" />}
                        onClick={() => {
                          const v = rollbackVersion(publishedAs.id, reviewer.fullName)
                          if (!v.ok) return setRefusal(v)
                          toast.success(`Rolled back with ${code} ${v.version}`, { description: 'The previous values are live again. The change is back to approved, not published.' })
                        }}
                      >
                        Roll back {publishedAs.version}
                      </Button>
                    ) : (
                      <p className="text-xs text-ink-3">A newer version has been published on top of this one. Roll that back first, from Versions.</p>
                    )}
                    <p className="text-xs leading-relaxed text-ink-3">Packs are never edited in place. Rolling back publishes a new version that restores the values this one replaced, so the history shows both.</p>
                  </>
                )}
                {refusal && <Refusal verdict={refusal} />}
              </>
            )}

            {(change.status === 'rejected' || change.status === 'no_action') && (
              <Callout tone="neutral" title={change.status === 'rejected' ? 'Rejected' : 'No action needed'}>
                {change.reviews[change.reviews.length - 1]?.note ?? 'No note was left.'} The live rules were not changed.
              </Callout>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
