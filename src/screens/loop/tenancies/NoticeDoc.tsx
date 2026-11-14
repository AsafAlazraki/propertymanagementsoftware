/**
 * A notice as the tenant will read it: paper, not interface. The same text is
 * what gets stored and what gets downloaded, so the preview is never a
 * prettier version of the real thing.
 */
import { DownloadSimple } from '@phosphor-icons/react'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** A self-contained page that prints cleanly from any browser. */
export function downloadDocument(fileName: string, title: string, body: string, footer?: string): void {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:16px/1.6 Georgia,'Times New Roman',serif;color:#000;background:#fff;max-width:42rem;margin:3rem auto;padding:0 1.5rem}h1{font:600 1.5rem/1.25 system-ui,sans-serif;margin:0 0 1.5rem}p{margin:0 0 1rem}footer{margin-top:3rem;padding-top:.75rem;border-top:1px solid #999;font:12px/1.5 system-ui,sans-serif;color:#444}pre{font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap}</style></head><body><h1>${esc(title)}</h1>${paragraphs}${footer ? `<footer>${esc(footer)}</footer>` : ''}</body></html>`
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function NoticeDoc({
  title,
  body,
  footer,
  fileName,
  className,
}: {
  title: string
  body: string
  footer?: string
  fileName?: string
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-2', className)}>
      <article className="rounded-md border border-line bg-surface px-5 py-6 shadow-card sm:px-8 sm:py-8">
        <h3 className="display mb-5 text-[19px] text-ink">{title}</h3>
        <div className="grid gap-3.5 text-[14.5px] leading-relaxed text-ink">
          {body.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
        {footer && <p className="mt-6 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-3">{footer}</p>}
      </article>
      {fileName && (
        <Button
          intent="ghost"
          size="sm"
          className="justify-self-start"
          icon={<DownloadSimple className="size-4" />}
          onClick={() => downloadDocument(fileName, title, body, footer)}
        >
          Download a copy to print
        </Button>
      )}
    </div>
  )
}
