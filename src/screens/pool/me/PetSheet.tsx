/**
 * Asking to keep a pet. The request is one short form; the law that protects
 * it is shown beside the button that sends it, with the date the landlord has
 * to answer by worked out before the renter commits.
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { PawPrint } from '@phosphor-icons/react'
import { bondCaps, petRespondBy } from '@/domain/rules/tenancy'
import { fmtDate } from '@/domain/rules/calendar'
import { durationText } from '@/domain/rules/core'
import { money } from '@/domain/rules/format'
import { useMe } from '@/data/store'
import { usePack, useToday } from '@/data/hooks'
import { requestPet } from '@/data/pool-mutations'
import { Button } from '@/ui/Button'
import { Field, Input, Segmented, Select, Switch, Textarea } from '@/ui/controls'
import { Why } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { firstName, type MyHome } from '../shared'

const ANIMALS = ['Cat', 'Dog', 'Rabbit', 'Bird', 'Fish', 'Something else']
type Where = 'Indoors' | 'Indoor and outdoor' | 'Outdoors'

export function PetSheet({ open, home, onClose }: { open: boolean; home: MyHome; onClose: () => void }) {
  const me = useMe()
  const pack = usePack()
  const day = useToday()
  const [animal, setAnimal] = useState('Cat')
  const [other, setOther] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [desexed, setDesexed] = useState(true)
  const [where, setWhere] = useState<Where>('Indoor and outdoor')
  const [note, setNote] = useState('')
  const [nudged, setNudged] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setAnimal('Cat')
      setOther('')
      setName('')
      setAge('')
      setDesexed(true)
      setWhere('Indoor and outdoor')
      setNote('')
      setNudged(false)
    }
  }

  const landlord = firstName(home.landlord?.fullName)
  const deadline = pack.rules['pets.response_deadline'].value
  const respondBy = petRespondBy(pack, day)
  const petBond = bondCaps(pack, home.tenancy.weeklyRent).pet
  const kind = animal === 'Something else' ? other.trim() : animal
  const furry = animal === 'Cat' || animal === 'Dog' || animal === 'Rabbit'
  const errors = {
    kind: kind.length < 2 ? 'Say what kind of animal it is.' : undefined,
    name: name.trim().length < 1 ? 'Give its name — it makes the request about a real animal, not “a pet”.' : undefined,
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      eyebrow={`Pet request · ${home.property.address.line1}`}
      title="Ask to keep a pet"
      description={`You are asking ${landlord} for consent in writing. Pool sends it, dates it, and keeps the clock.`}
      footer={
        <Button
          intent="primary"
          size="lg"
          className="rounded-full"
          block
          icon={<PawPrint weight="fill" className="size-4" />}
          onClick={() => {
            setNudged(true)
            if (errors.kind || errors.name) return
            requestPet(me.id, home.tenancy.id, { animal: kind, name, age, desexed: furry && desexed, indoors: where, note }, pack)
            toast.success(`Sent to ${landlord}`, { description: respondBy ? `They have until ${fmtDate(respondBy)} to answer in writing.` : 'They need to answer in writing.' })
            onClose()
          }}
        >
          Send the request
        </Button>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="What kind of animal?">
            {(p) => (
              <Select {...p} value={animal} onChange={(e) => setAnimal(e.target.value)}>
                {ANIMALS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Name" error={nudged ? errors.name : undefined}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />}
          </Field>
        </div>
        {animal === 'Something else' && (
          <Field label="What is it?" error={nudged ? errors.kind : undefined}>
            {(p) => <Input {...p} value={other} onChange={(e) => setOther(e.target.value)} placeholder="For example: two guinea pigs" />}
          </Field>
        )}
        <Field label="Age" optional>
          {(p) => <Input {...p} value={age} onChange={(e) => setAge(e.target.value)} placeholder="4 years" autoComplete="off" />}
        </Field>
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink">Where will it live?</p>
          <Segmented<Where> label="Where the pet will live" className="w-full" value={where} onChange={setWhere} options={[{ value: 'Indoors', label: 'Indoors' }, { value: 'Indoor and outdoor', label: 'In and out' }, { value: 'Outdoors', label: 'Outdoors' }]} />
        </div>
        {furry && <Switch checked={desexed} onCheckedChange={setDesexed} label="Desexed" />}
        <Field label={`Anything that helps ${landlord} say yes`} optional hint="Has it lived in a rental before? Is it microchipped, trained, quiet?">
          {(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>

        <div className="grid gap-3 rounded-lg bg-accent-soft p-4">
          <p className="text-[15px] font-semibold text-ink">
            {deadline && respondBy ? (
              <>
                {landlord} has {durationText(deadline)} to answer. Sent today, that is by {fmtDate(respondBy)}.
              </>
            ) : (
              <>{landlord} needs to answer in writing.</>
            )}
          </p>
          <p className="text-[14px] leading-relaxed text-ink-2">They can say yes, say yes with reasonable conditions, or refuse — but only on reasonable grounds, given in writing. “No pets” on its own is not a ground.</p>
          <div className="flex flex-wrap gap-2">
            <Why rule="pets.response_deadline" label="The deadline" />
            <Why rule="pets.refusal_needs_grounds" label="Grounds to refuse" />
          </div>
          <div className="border-t border-accent-line pt-3">
            <p className="eyebrow">Conditions the Act names as reasonable</p>
            <ul className="mt-1.5 grid gap-1 text-[14px] leading-relaxed text-ink">
              {pack.petConditions.map((c) => (
                <li key={c.key}>{c.label}</li>
              ))}
            </ul>
            {petBond !== null && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                For your home a pet bond could be at most {money(petBond)}.
                <Why rule="bond.pet_max_weeks" label="Pet bond" />
              </p>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
