import { useState } from 'react'
import { fmtDate } from '@/domain/rules/calendar'
import { money } from '@/domain/rules/format'
import { Button } from '@/ui/Button'
import { Field, Input, Segmented, Select, Switch } from '@/ui/controls'
import { Why } from '@/ui/Law'
import { Sheet } from '@/ui/Sheet'
import { filterCount, matches, RENT_STEPS, type Filters, type LiveListing } from './params'

/**
 * Filters are tried on before they are applied: the button at the bottom
 * always says how many homes the current choices leave, so nobody applies a
 * filter into an empty list by accident.
 */
export function FiltersSheet({ open, applied, homes, today, onApply, onClose }: { open: boolean; applied: Filters; homes: LiveListing[]; today: string; onApply: (f: Filters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<Filters>(applied)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(applied)
  }
  const count = homes.filter((h) => matches(h, draft)).length
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }))

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      eyebrow="Search"
      title="Narrow it down"
      footer={
        <>
          {filterCount(draft) > 0 && (
            <Button intent="ghost" size="lg" onClick={() => setDraft({})}>
              Clear all
            </Button>
          )}
          <Button
            intent="primary"
            size="lg"
            className="flex-1 rounded-full"
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          >
            {count === 0 ? 'No homes match — show anyway' : `Show ${count} ${count === 1 ? 'home' : 'homes'}`}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
        <div>
          <p className="mb-2 text-[14px] font-semibold text-ink">Bedrooms</p>
          <Segmented
            label="Fewest bedrooms"
            className="w-full"
            value={String(draft.beds ?? 0)}
            onChange={(v) => set({ beds: Number(v) || undefined })}
            options={[
              { value: '0', label: 'Any' },
              { value: '1', label: '1+' },
              { value: '2', label: '2+' },
              { value: '3', label: '3+' },
              { value: '4', label: '4+' },
            ]}
          />
        </div>

        <Field label={<span className="text-[14px] font-semibold">Most you would pay a week</span>} hint="Every home lists one fixed weekly rent, so this is the real ceiling — nothing is ‘from’ or ‘negotiable’.">
          {(p) => (
            <Select {...p} value={String(draft.max ?? '')} onChange={(e) => set({ max: Number(e.target.value) || undefined })}>
              <option value="">Any rent</option>
              {RENT_STEPS.map((r) => (
                <option key={r} value={r}>
                  Up to {money(r)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label={<span className="text-[14px] font-semibold">Available by</span>} hint={draft.by ? `Homes you could move into on or before ${fmtDate(draft.by)}.` : 'Leave empty to see homes whenever they come free.'}>
          {(p) => <Input {...p} type="date" min={today} value={draft.by ?? ''} onChange={(e) => set({ by: e.target.value || undefined })} />}
        </Field>

        <div className="rounded-lg bg-sunken p-4">
          <Switch checked={draft.pets === true} onCheckedChange={(on) => set({ pets: on || undefined })} label="Pets considered" description="Only homes whose listing says a pet will be considered." />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-3">
            <span>In any tenancy you can ask, and a landlord needs a reason to say no.</span>
            <Why rule="pets.refusal_needs_grounds" label="Asking for a pet" />
          </div>
        </div>
      </div>
    </Sheet>
  )
}
