/**
 * Photos, kept on the device.
 *
 * Inspection and repair photos are taken where signal is worst — a basement, a
 * concrete stairwell, a lifestyle block up the valley — so they are saved to
 * IndexedDB the moment they are taken and never depend on a network. Each is
 * downscaled to 1600px on its long edge and re-encoded as JPEG first: a phone
 * photo is 3–8 MB, and a 40-photo inspection would otherwise fill the browser's
 * quota.
 *
 * Records reference photos by id (`photoIds`). In production these blobs are
 * the upload outbox; here they simply stay on the device.
 */
import { createStore, del, get, keys, set } from 'idb-keyval'
import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'

// All <user>.github.io projects share one origin, so the database name carries the project.
const store = createStore('loop-pool-photos', 'photos')

const MAX_EDGE = 1600
const QUALITY = 0.82

export interface StoredPhoto {
  id: string
  blob: Blob
  takenAt: string
  width: number
  height: number
  /** What the photo is of, in the taker's words. */
  caption?: string
}

async function downscale(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the photo'))), 'image/jpeg', QUALITY))
  return { blob, width, height }
}

/** Saves a photo from a file input or the camera. Returns its id, or throws a sentence a person can read. */
export async function savePhoto(file: Blob, caption?: string): Promise<string> {
  let shrunk: { blob: Blob; width: number; height: number }
  try {
    shrunk = await downscale(file)
  } catch {
    throw new Error('That file could not be read as a photo. Try taking it again.')
  }
  const id = `ph_${nanoid(10)}`
  const record: StoredPhoto = { id, takenAt: new Date().toISOString(), caption, ...shrunk }
  try {
    await set(id, record, store)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') throw new Error('This device is out of storage for photos. Free some space, then try again.')
    throw new Error('The photo could not be saved on this device.')
  }
  // Ask the browser not to evict what the user has just captured. It may say no; that is fine.
  void navigator.storage?.persist?.()
  return id
}

export async function loadPhoto(id: string): Promise<StoredPhoto | undefined> {
  return get<StoredPhoto>(id, store)
}

export async function deletePhoto(id: string): Promise<void> {
  await del(id, store)
}

export async function photoCount(): Promise<number> {
  return (await keys(store)).length
}

/** An object URL for a stored photo, revoked when the component unmounts. `undefined` while loading or if missing. */
export function usePhotoUrl(id: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!id) return
    let alive = true
    let made: string | undefined
    void loadPhoto(id).then((p) => {
      if (!alive || !p) return
      made = URL.createObjectURL(p.blob)
      setUrl(made)
    })
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
      setUrl(undefined)
    }
  }, [id])
  return url
}
