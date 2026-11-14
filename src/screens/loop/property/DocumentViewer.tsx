/**
 * One document, opened.
 *
 * Two things can be behind a row and this shows both, apart: the file itself,
 * when someone has attached one, and what Loop holds in its own records about
 * the same document. A notice Loop wrote is shown in full, because the stored
 * words are the notice. Nothing is drawn to look like a file that is not there.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowSquareOut, DownloadSimple, FileDashed, Paperclip, Trash, WarningCircle } from '@phosphor-icons/react'
import type { Doc } from '@/domain/types'
import { DOC_KINDS, DOC_KIND_LABEL, documentFacts } from '@/domain/documents'
import { dateOf, fmtDate } from '@/domain/rules/calendar'
import { useStore } from '@/data/store'
import { usePack } from '@/data/hooks'
import { ACCEPTED_FILES, MAX_FILE_MB, saveFile, useStoredFile } from '@/data/files'
import { attachFile, detachFile, removeDocument, setDocumentKind } from '@/data/doc-mutations'
import { Button, buttonClass } from '@/ui/Button'
import { Field, Select } from '@/ui/controls'
import { Fact, Facts } from '@/ui/display'
import { Sheet } from '@/ui/Sheet'
import { useLast } from '@/ui/hooks'
import { NoticeDoc } from '../tenancies/NoticeDoc'

const MAX_PAGES = 40

/** A PDF drawn page by page, because a phone's browser will not show one inside a page. */
function PdfPages({ blob, name }: { blob: Blob; name: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<{ step: 'reading' | 'shown' | 'failed'; pages: number }>({ step: 'reading', pages: 0 })
  useEffect(() => {
    const el = host.current
    if (!el) return
    let alive = true
    void (async () => {
      try {
        const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default
        const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise
        const sharp = Math.min(window.devicePixelRatio || 1, 2)
        for (let n = 1; n <= Math.min(pdf.numPages, MAX_PAGES); n++) {
          const page = await pdf.getPage(n)
          const natural = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (el.clientWidth / natural.width) * sharp })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = 'block h-auto w-full rounded-sm bg-white shadow-card'
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', `${name}, page ${n} of ${pdf.numPages}`)
          const context = canvas.getContext('2d')
          if (!context) throw new Error('No canvas')
          await page.render({ canvas, canvasContext: context, viewport }).promise
          if (!alive) return
          el.appendChild(canvas)
        }
        if (alive) setState({ step: 'shown', pages: pdf.numPages })
      } catch {
        if (alive) setState({ step: 'failed', pages: 0 })
      }
    })()
    return () => {
      alive = false
      el.replaceChildren()
    }
  }, [blob, name])
  return (
    <div>
      <div ref={host} className="grid gap-3" />
      <p className="mt-2 text-xs text-ink-3" role="status">
        {state.step === 'reading' && 'Reading the pages…'}
        {state.step === 'failed' && 'The pages could not be drawn here (the reader needs a connection the first time). Open the file in a new tab instead.'}
        {state.step === 'shown' && state.pages > MAX_PAGES && `Showing the first ${MAX_PAGES} of ${state.pages} pages. Open the file to read the rest.`}
      </p>
    </div>
  )
}

function TheFile({ doc }: { doc: Doc }) {
  const stored = useStoredFile(doc.fileId)
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function choose(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      attachFile(doc.id, await saveFile(file))
      toast.success('File attached', { description: 'It is kept in this browser, on this device.' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The file could not be attached.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  const picker = (
    <input ref={input} type="file" accept={ACCEPTED_FILES} className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void choose(e.target.files?.[0])} />
  )

  if (stored.state === 'ready' && stored.url && stored.file) {
    const image = stored.file.mime.startsWith('image/')
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {picker}
        <div className="flex flex-wrap gap-2">
          <a href={stored.url} target="_blank" rel="noreferrer" className={buttonClass({ intent: 'secondary', size: 'sm' })}>
            <ArrowSquareOut className="size-4" aria-hidden />
            Open in a new tab
          </a>
          <a href={stored.url} download={doc.name} className={buttonClass({ intent: 'secondary', size: 'sm' })}>
            <DownloadSimple className="size-4" aria-hidden />
            Download
          </a>
          <Button intent="ghost" size="sm" icon={<Paperclip className="size-4" />} loading={busy} onClick={() => input.current?.click()}>
            Replace the file
          </Button>
          <Button
            intent="ghost"
            size="sm"
            onClick={() => {
              detachFile(doc.id)
              toast('File taken off', { description: 'The row stays. The file is deleted from this device.' })
            }}
          >
            Take the file off
          </Button>
        </div>
        <div className="rounded-md bg-sunken p-2 sm:p-3">
          {image ? <img src={stored.url} alt={doc.name} className="block h-auto w-full rounded-sm" /> : <PdfPages blob={stored.file.blob} name={doc.name} />}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-dashed border-line-strong p-4">
      {picker}
      <div className="flex items-start gap-3">
        {stored.state === 'missing' ? <WarningCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-warn-text" aria-hidden /> : <FileDashed className="mt-0.5 size-5 shrink-0 text-ink-3" aria-hidden />}
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">
            {stored.state === 'loading' ? 'Looking for the file…' : stored.state === 'missing' ? 'This browser no longer has the file' : 'No file is attached to this row'}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
            {stored.state === 'missing'
              ? 'Files are kept on the device they were attached on, and this one has been cleared. Attach it again to keep it here.'
              : doc.addedHere
                ? 'Attach the PDF or a photo of it and it can be read here.'
                : doc.source === 'generated'
                  ? 'Loop made this from its own records, which are shown below. No separate file is kept in this prototype; attach one if you have it.'
                : 'This row came with the demo, which has no file behind it. Attach the real PDF, or a photo of it, and it can be read here.'}
          </p>
          <Button intent="secondary" size="sm" className="mt-3" icon={<Paperclip className="size-4" />} loading={busy} disabled={stored.state === 'loading'} onClick={() => input.current?.click()}>
            Attach the file
          </Button>
          <p className="mt-2 text-xs text-ink-3">A PDF or a photo, up to {MAX_FILE_MB} MB.</p>
        </div>
      </div>
    </div>
  )
}

export function DocumentViewer({ doc, onClose }: { doc: Doc | null; onClose: () => void }) {
  const shown = useLast(doc)
  const db = useStore((s) => s.db)
  const pack = usePack()
  const [confirming, setConfirming] = useState(false)
  // The row as it is now: attaching a file changes it while the sheet is open.
  const live = shown ? (db.docs.find((d) => d.id === shown.id) ?? shown) : null
  const facts = live ? documentFacts(db, live, pack) : null

  return (
    <Sheet
      open={doc !== null}
      onOpenChange={(open) => {
        if (!open) {
          setConfirming(false)
          onClose()
        }
      }}
      size="lg"
      eyebrow={live ? DOC_KIND_LABEL[live.kind] : undefined}
      title={live?.name ?? ''}
      description={live ? `Added ${fmtDate(dateOf(live.addedAt), { weekday: false, year: 'always' })} · ${live.source === 'generated' ? 'made by Loop' : live.source === 'imported' ? 'imported' : 'uploaded'}` : undefined}
    >
      {live && facts && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
          <section aria-labelledby="doc-file">
            <h3 id="doc-file" className="eyebrow mb-2">
              The file
            </h3>
            <TheFile doc={live} />
          </section>

          <section aria-labelledby="doc-facts">
            <h3 id="doc-facts" className="eyebrow mb-2">
              What Loop holds
            </h3>
            {facts.rows.length > 0 && (
              <Facts className="rounded-md bg-surface px-4 shadow-card">
                {facts.rows.map((r) => (
                  <Fact key={r.label} label={r.label}>
                    {r.value}
                  </Fact>
                ))}
              </Facts>
            )}
            <p className="mt-2 text-xs leading-relaxed text-ink-3">{facts.note}</p>
            {facts.inspectionId && (
              <Link to="/loop/inspections" search={{ report: facts.inspectionId }} className={buttonClass({ intent: 'secondary', size: 'sm', className: 'mt-3' })}>
                Open the full report
              </Link>
            )}
            {facts.paper && <NoticeDoc className="mt-4" title={facts.paper.title} body={facts.paper.body} footer={facts.paper.footer} fileName={live.name.replace(/\.pdf$/i, '.html')} />}
          </section>

          {live.addedHere && (
            <section aria-labelledby="doc-about" className="grid gap-3">
              <h3 id="doc-about" className="eyebrow">
                About this document
              </h3>
              <Field label="What is it?">
                {(p) => (
                  <Select {...p} value={live.kind} onChange={(e) => setDocumentKind(live.id, e.target.value as Doc['kind'])}>
                    {DOC_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {DOC_KIND_LABEL[k]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {confirming ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="basis-full text-[13px] text-ink-2">Remove this document and its file from this device? This cannot be undone.</p>
                  <Button
                    intent="dangerSoft"
                    size="sm"
                    onClick={() => {
                      removeDocument(live.id)
                      toast('Document removed')
                      setConfirming(false)
                      onClose()
                    }}
                  >
                    Remove it
                  </Button>
                  <Button intent="ghost" size="sm" onClick={() => setConfirming(false)}>
                    Keep it
                  </Button>
                </div>
              ) : (
                <Button intent="ghost" size="sm" className="justify-self-start" icon={<Trash className="size-4" />} onClick={() => setConfirming(true)}>
                  Remove this document
                </Button>
              )}
            </section>
          )}

          <p className="text-xs leading-relaxed text-ink-3">Files stay in this browser, on this device. Nothing is uploaded in this prototype.</p>
        </div>
      )}
    </Sheet>
  )
}
