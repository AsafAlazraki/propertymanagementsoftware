/**
 * Keys and paperwork: who holds which key and when it last moved, and every
 * document the law expects a landlord to be able to produce.
 */
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ArrowsLeftRight, CaretRight, Certificate, Paperclip, Plus, ClipboardText, FileText, Key, LockKey, Receipt, ShieldCheck, Storefront, User } from '@phosphor-icons/react'
import type { Doc, KeySet, Property } from '@/domain/types'
import { dateOf, fmtDate, fmtRelative } from '@/domain/rules/calendar'
import { useStore } from '@/data/store'
import { ACCEPTED_FILES, saveFile } from '@/data/files'
import { addDocument } from '@/data/doc-mutations'
import { activeTenancy } from '@/data/hooks'
import { durationText } from '@/domain/rules/core'
import { usePack, useToday } from '@/data/hooks'
import { Badge } from '@/ui/Badge'
import { Button } from '@/ui/Button'
import { Empty, Timeline } from '@/ui/display'
import { Why } from '@/ui/Law'
import { DocumentViewer } from './DocumentViewer'

const HOLDER: Record<KeySet['holder'], { icon: typeof Key; word: string }> = {
  tenant: { icon: User, word: 'With the tenant' },
  landlord: { icon: Key, word: 'With you' },
  depot: { icon: Storefront, word: 'At a key depot' },
  lockbox: { icon: LockKey, word: 'In a lockbox' },
  provider: { icon: ArrowsLeftRight, word: 'Out with a provider' },
}

const DOC_ICON: Record<Doc['kind'], typeof FileText> = {
  tenancy_agreement: FileText,
  healthy_homes_statement: ShieldCheck,
  insurance: ShieldCheck,
  bond_receipt: Receipt,
  inspection_report: ClipboardText,
  body_corp_rules: FileText,
  meth_report: Certificate,
  invoice: Receipt,
  notice: FileText,
  other: FileText,
}

const KEY_ACTION = { deposited: 'Returned to the depot', code_issued: 'One-time code issued', collected: 'Collected', returned: 'Returned', code_expired: 'Code expired unused' } as const

export function Records({ property }: { property: Property }) {
  const pack = usePack()
  const day = useToday()
  const allEvents = useStore((s) => s.db.keyEvents)
  const allDocs = useStore((s) => s.db.docs)
  const events = useMemo(() => allEvents.filter((e) => e.propertyId === property.id).sort((a, b) => b.at.localeCompare(a.at)), [allEvents, property.id])
  const docs = useMemo(() => allDocs.filter((d) => d.propertyId === property.id).sort((a, b) => b.addedAt.localeCompare(a.addedAt)), [allDocs, property.id])
  const tenancies = useStore((s) => s.db.tenancies)
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const open = docs.find((d) => d.id === openId) ?? null

  async function add(file: File | undefined) {
    if (!file) return
    setAdding(true)
    try {
      const saved = await saveFile(file)
      // Opened straight away, so the person can check it is the right file and say what it is.
      setOpenId(addDocument(property, saved, file.name, activeTenancy(tenancies, property.id)?.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The document could not be added.')
    } finally {
      setAdding(false)
      if (picker.current) picker.current.value = ''
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
      <section aria-labelledby="keys-title" className="min-w-0">
        <p className="eyebrow">Key custody</p>
        <h2 id="keys-title" className="mb-3 text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Every key, and where it is
        </h2>
        {property.keys.length === 0 ? (
          <div className="rounded-lg bg-surface shadow-card">
            <Empty icon={<Key />} title="No keys registered" body="Register a spare set at a key depot or in a lockbox, and trades and inspectors can be let in with a one-time code instead of a handover." />
          </div>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2.5">
            {property.keys.map((k) => {
              const h = HOLDER[k.holder]
              return (
                <li key={k.id} className="flex items-center gap-3.5 rounded-lg bg-surface p-4 shadow-card">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
                    <h.icon weight="fill" className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-ink">{k.label}</p>
                    <p className="truncate text-[13px] text-ink-2">{k.location}</p>
                  </div>
                  <Badge tone={k.holder === 'provider' ? 'warn' : 'neutral'} size="sm">
                    {h.word}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 rounded-lg bg-surface p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[14px] font-semibold text-ink">Chain of custody</p>
            <Why rule="entry.repairs_notice_min" label="when a code unlocks" />
          </div>
          {events.length === 0 ? (
            <p className="text-[13px] text-ink-2">No key has moved yet. A code for a tradesperson is released only once the tenant has had their notice — {durationText(pack.rules['entry.repairs_notice_min'].value)} for repairs, {durationText(pack.rules['entry.inspection_notice_min'].value)} for an inspection — or straight away in a real emergency.</p>
          ) : (
            <Timeline
              items={events.map((e) => ({
                id: e.id,
                at: `${fmtRelative(dateOf(e.at), day)} · ${new Date(e.at).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}`,
                title: `${KEY_ACTION[e.action]} — ${e.actor}`,
                body: e.note,
                tone: e.action === 'returned' || e.action === 'deposited' ? 'ok' : e.action === 'collected' ? 'warn' : 'accent',
              }))}
            />
          )}
        </div>
      </section>

      <section aria-labelledby="docs-title" className="min-w-0">
        <p className="eyebrow">Documents</p>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="docs-title" className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
            The file you can be asked to produce
          </h2>
          <Why rule="records.retention_after_tenancy" label="how long to keep it" />
        </div>
        <input ref={picker} type="file" accept={ACCEPTED_FILES} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void add(e.target.files?.[0])} />
        {docs.length === 0 ? (
          <div className="rounded-lg bg-surface shadow-card">
            <Empty icon={<FileText />} title="Nothing filed yet" body="The agreement, statements, inspection reports and notices land here automatically as they are made." />
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg bg-surface shadow-card">
            {docs.map((d) => {
              const Icon = DOC_ICON[d.kind]
              return (
                <li key={d.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(d.id)}
                    className="pressable flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hoverable:hover:bg-surface-2"
                  >
                    <Icon className="size-5 shrink-0 text-ink-3" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{d.name}</span>
                      <span className="num flex items-center gap-1.5 text-[11px] text-ink-3">
                        {fmtDate(dateOf(d.addedAt), { weekday: false, year: 'always' })}
                        {d.fileId && (
                          <>
                            <span aria-hidden>·</span>
                            <Paperclip className="size-3" aria-hidden />
                            {d.sizeKb >= 1000 ? `${(d.sizeKb / 1000).toFixed(1)} MB` : `${d.sizeKb} KB`}
                          </>
                        )}
                      </span>
                    </span>
                    <Badge tone={d.source === 'generated' ? 'accent' : 'neutral'} size="sm">
                      {d.source === 'generated' ? 'Made by Loop' : d.source === 'imported' ? 'Imported' : 'Uploaded'}
                    </Badge>
                    <CaretRight className="size-4 shrink-0 text-ink-3" aria-hidden />
                    <span className="sr-only">Open</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Button intent="secondary" size="sm" icon={<Plus className="size-4" />} loading={adding} onClick={() => picker.current?.click()}>
            Add a document
          </Button>
          <p className="min-w-0 flex-1 basis-56 text-xs leading-relaxed text-ink-3">
            Open any row to read what Loop holds. The rows that came with the demo have no file behind them; a file you attach is kept in this browser.
          </p>
        </div>
        <DocumentViewer doc={open} onClose={() => setOpenId(null)} />
      </section>
    </div>
  )
}
