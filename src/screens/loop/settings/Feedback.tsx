/**
 * A line to the people who build Loop: say something, and see what became of
 * everything said before.
 */
import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { ChatCircleDots } from '@phosphor-icons/react'
import type { Feedback } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { useMe, useOrgRows } from '@/data/store'
import { useNameOf } from '@/data/hooks'
import { sendLoopFeedback } from '@/data/ops-mutations'
import { Badge, type Tone } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Field, Select, Textarea } from '@/ui/controls'
import { Empty } from '@/ui/display'
import { Section, Truth } from './shared'

const KINDS: { value: Feedback['kind']; label: string; ask: string }[] = [
  { value: 'idea', label: 'An idea', ask: 'What would make Loop more useful to you?' },
  { value: 'bug', label: 'Something is broken', ask: 'What were you doing, and what happened instead?' },
  { value: 'question', label: 'A question', ask: 'What are you trying to find out?' },
  { value: 'praise', label: 'Something good', ask: 'What worked well?' },
  { value: 'complaint', label: 'A complaint', ask: 'What went wrong, and what should have happened?' },
]

const AREAS = [
  'Command centre',
  'Properties',
  'Money',
  'Repairs',
  'Inspections',
  'Tenancies',
  'Services',
  'Rulebook',
  'Billing',
  'Something else',
]

const STATUS: Record<Feedback['status'], { label: string; tone: Tone }> = {
  new: { label: 'Received', tone: 'neutral' },
  triaged: { label: 'Being looked at', tone: 'info' },
  planned: { label: 'Planned', tone: 'accent' },
  shipped: { label: 'Done', tone: 'ok' },
  declined: { label: 'Not going ahead', tone: 'neutral' },
}

export function FeedbackSection() {
  const me = useMe()
  const nameOf = useNameOf()
  const kindId = useId()
  const all = useOrgRows('feedback')
  const sent = useMemo(() => [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [all])
  const [kind, setKind] = useState<Feedback['kind']>('idea')
  const [area, setArea] = useState(AREAS[0])
  const [text, setText] = useState('')
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const chosen = KINDS.find((k) => k.value === kind) ?? KINDS[0]

  const send = () => {
    const verdict = sendLoopFeedback(me, kind, area, text)
    setRefusal(verdict.ok ? null : verdict)
    if (!verdict.ok) return
    setText('')
    toast.success('Sent to the Loop team', { description: 'It is listed below, with any reply when one comes.' })
  }

  return (
    <Section
      id="feedback"
      title="Tell the Loop team"
      lede="An idea, a fault, a question. A person reads each one, and the answer comes back here."
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-lg bg-surface p-5 shadow-card">
        <div>
          <p id={kindId} className="mb-2 text-[13px] font-medium text-ink">
            What kind of message?
          </p>
          <RadioGroup
            aria-labelledby={kindId}
            value={kind}
            onValueChange={(v) => setKind(v as Feedback['kind'])}
            className="flex flex-wrap gap-2"
          >
            {KINDS.map((k) => (
              <Radio.Root
                key={k.value}
                value={k.value}
                className="pressable inline-flex h-10 cursor-pointer items-center rounded-full bg-sunken px-4 text-[13px] font-medium text-ink-2 transition-colors duration-150 select-none data-checked:bg-ink data-checked:text-bg coarse:h-11"
              >
                {k.label}
              </Radio.Root>
            ))}
          </RadioGroup>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
          <Field label="Which part of Loop?">
            {(p) => (
              <Select {...p} value={area} onChange={(e) => setArea(e.target.value)}>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Your message" error={refusal?.reason}>
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                value={text}
                placeholder={chosen.ask}
                onChange={(e) => {
                  setText(e.target.value)
                  setRefusal(null)
                }}
              />
            )}
          </Field>
        </div>
        <div>
          <Button intent="primary" onClick={send}>
            Send it
          </Button>
        </div>
      </div>

      <h3 className="mt-6 mb-2.5 text-[14px] font-semibold text-ink">What this organisation has sent</h3>
      {sent.length === 0 ? (
        <div className="rounded-lg bg-surface shadow-card">
          <Empty
            icon={<ChatCircleDots />}
            title="Nothing sent yet"
            body="Whatever you send is kept here with what became of it and any reply. Write the first message above."
          />
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-lg bg-surface shadow-card">
          {sent.map((f) => (
            <li key={f.id} className="p-4 sm:px-5">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-3">
                <Badge tone={STATUS[f.status].tone} size="sm">
                  {STATUS[f.status].label}
                </Badge>
                <span>
                  {KINDS.find((k) => k.value === f.kind)?.label ?? f.kind} · {f.area} ·{' '}
                  {f.userId === me.id ? 'you' : nameOf(f.userId)}, {fmtDate(dateOf(f.createdAt))}
                </span>
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink">{f.text}</p>
              {f.adminReply && (
                <p className="mt-2.5 rounded-md bg-accent-soft p-3 text-[13px] leading-relaxed text-ink">
                  <span className="mb-0.5 block text-xs font-semibold text-accent-text">Reply from the Loop team</span>
                  {f.adminReply}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <Truth>
        In this prototype the Loop team is the team console: step into it from the account menu and you will find your
        message in its feedback inbox, where it can be answered.
      </Truth>
    </Section>
  )
}
