/**
 * Document files, kept on the device.
 *
 * A document row says a file exists; this is where the file itself lives when
 * someone has attached one. Like photos, the bytes stay in this browser's
 * IndexedDB and are referenced from the record by id (`Doc.fileId`). In
 * production this is the upload to private storage; here nothing leaves the
 * device, and the screens say so.
 */
import { createStore, del, get, set } from 'idb-keyval'
import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'

// All <user>.github.io projects share one origin, so the database name carries the project.
const store = createStore('loop-pool-files', 'files')

/** Big enough for a scanned agreement, small enough not to fill the browser's quota with one file. */
export const MAX_FILE_MB = 15

/** What a document can be and still be shown here: a PDF, or a picture of one. */
export const ACCEPTED_FILES = 'application/pdf,image/jpeg,image/png,image/webp'

export interface StoredFile {
  id: string
  blob: Blob
  name: string
  mime: string
  savedAt: string
}

export interface SavedFile {
  id: string
  mime: string
  sizeKb: number
}

/** Saves a file a person chose. Returns what the record needs, or throws a sentence a person can read. */
export async function saveFile(file: File): Promise<SavedFile> {
  const mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '')
  if (!ACCEPTED_FILES.split(',').includes(mime)) throw new Error('Only a PDF or a photo (JPEG, PNG or WebP) can be kept here.')
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`That file is over ${MAX_FILE_MB} MB. Save a smaller copy, then try again.`)
  if (file.size === 0) throw new Error('That file is empty.')
  const id = `file_${nanoid(10)}`
  const record: StoredFile = { id, blob: file, name: file.name, mime, savedAt: new Date().toISOString() }
  try {
    await set(id, record, store)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') throw new Error('This device is out of storage for files. Free some space, then try again.')
    throw new Error('The file could not be saved on this device.')
  }
  // Ask the browser not to evict what the person has just filed. It may say no; that is fine.
  void navigator.storage?.persist?.()
  return { id, mime, sizeKb: Math.max(1, Math.round(file.size / 1024)) }
}

export async function loadFile(id: string): Promise<StoredFile | undefined> {
  return get<StoredFile>(id, store)
}

export async function deleteFile(id: string): Promise<void> {
  await del(id, store)
}

/**
 * A stored file and an object URL for it, revoked when the component unmounts.
 * `state` separates "still reading" from "the record points at a file this
 * browser no longer has", which happens when site data is cleared.
 */
export function useStoredFile(id: string | undefined): { state: 'none' | 'loading' | 'ready' | 'missing'; url?: string; file?: StoredFile } {
  const [found, setFound] = useState<{ id: string; url?: string; file?: StoredFile } | null>(null)
  useEffect(() => {
    if (!id) return
    let alive = true
    let made: string | undefined
    void loadFile(id).then(
      (file) => {
        if (!alive) return
        if (!file) return setFound({ id })
        made = URL.createObjectURL(file.blob)
        setFound({ id, url: made, file })
      },
      () => alive && setFound({ id }),
    )
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [id])
  if (!id) return { state: 'none' }
  if (!found || found.id !== id) return { state: 'loading' }
  return found.url ? { state: 'ready', url: found.url, file: found.file } : { state: 'missing' }
}
