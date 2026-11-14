import { useState } from 'react'

/**
 * The last value that was not `undefined`. A sheet keeps showing the row it
 * was opened for while it slides away, instead of emptying the moment the
 * selection is cleared.
 */
export function useLast<T>(value: T | undefined): T | undefined {
  const [last, setLast] = useState(value)
  if (value !== undefined && value !== last) setLast(value)
  return value ?? last
}

/**
 * Arrow keys move between the rows of a list. Put the handler on the list and
 * `data-row-open` on each row's button; Home and End jump to the ends.
 */
export function arrowNav(e: { key: string; currentTarget: HTMLElement; preventDefault: () => void }): void {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
  const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-row-open]'))
  const at = rows.indexOf(document.activeElement as HTMLElement)
  if (at < 0) return
  e.preventDefault()
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : Math.max(0, Math.min(rows.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)))
  rows[next]?.focus()
}

/** Hands the browser a file to save. Nothing leaves the device: the file is built from what is on screen. */
export function saveFile(filename: string, mime: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
