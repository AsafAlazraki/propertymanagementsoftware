/**
 * Vetting a provider: the four checks, ticked as each document is seen, and
 * the decision to let them take jobs. Used from the provider's own sheet and
 * from a vetting task in the queue, so the two can never disagree.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { PauseCircle, ShieldCheck } from '@phosphor-icons/react'
import type { Provider } from '@/domain/types'
import type { Verdict } from '@/domain/rules/core'
import { useMe } from '@/data/store'
import { CHECK_LABEL, REQUIRED_CHECKS, approveProvider, setProviderCheck, suspendProvider } from '@/data/admin-mutations'
import { Button } from '@/ui/Button'
import { Checkbox, Field, Textarea } from '@/ui/controls'
import { Refusal } from '@/ui/Law'

const CHECKS = Object.keys(CHECK_LABEL) as (keyof Provider['checks'])[]

export function Vetting({ provider, onApproved }: { provider: Provider; onApproved?: () => void }) {
  const me = useMe()
  const [refusal, setRefusal] = useState<Verdict | null>(null)
  const [suspending, setSuspending] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <fieldset className="grid gap-2 rounded-lg bg-sunken p-3.5">
        <legend className="sr-only">Vetting checks for {provider.name}</legend>
        {CHECKS.map((check) => (
          <Checkbox
            key={check}
            checked={provider.checks[check]}
            onCheckedChange={(v) => {
              setProviderCheck(provider.id, check, v, me.fullName)
              setRefusal(null)
            }}
          >
            {CHECK_LABEL[check]}
            {!REQUIRED_CHECKS.includes(check) && <span className="text-ink-3"> · where the trade needs one</span>}
          </Checkbox>
        ))}
      </fieldset>
      <p className="text-xs leading-relaxed text-ink-3">Tick a check once you have seen the document. Identity, insurance and police vetting are Loop &amp; Pool’s own bar for taking jobs, not a legal requirement.</p>

      {refusal && <Refusal verdict={refusal} />}

      {suspending ? (
        <div className="grid gap-3">
          <Field label={`Why is ${provider.name} being suspended?`} hint="They take no new jobs while suspended. Open jobs are held by the self-healing sweep and offered to the next vetted provider.">
            {(p) => (
              <Textarea
                {...p}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setRefusal(null)
                }}
                placeholder="For example: insurance certificate expired and no renewal has been sent."
                className="min-h-16"
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              intent="dangerSoft"
              onClick={() => {
                const v = suspendProvider(provider.id, reason, me.fullName)
                if (!v.ok) return setRefusal(v)
                setSuspending(false)
                setReason('')
                toast(`${provider.name} is suspended`)
              }}
            >
              Suspend
            </Button>
            <Button intent="ghost" onClick={() => setSuspending(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {provider.vetting !== 'vetted' && (
            <Button
              intent="primary"
              icon={<ShieldCheck weight="fill" className="size-4" />}
              onClick={() => {
                const v = approveProvider(provider.id, me.fullName)
                if (!v.ok) return setRefusal(v)
                toast.success(`${provider.name} can take jobs`)
                onApproved?.()
              }}
            >
              {provider.vetting === 'suspended' ? 'Lift the suspension' : `Approve ${provider.name}`}
            </Button>
          )}
          {provider.vetting !== 'suspended' && (
            <Button intent="ghost" icon={<PauseCircle className="size-4" />} onClick={() => setSuspending(true)}>
              Suspend
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
