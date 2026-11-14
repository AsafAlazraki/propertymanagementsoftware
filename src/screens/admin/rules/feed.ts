/**
 * Reads the scheduled watcher's feed.
 *
 * The watcher is a job that runs on a timer outside the app and writes
 * `regwatch/feed.json` next to it. Until that job has run, the file exists and
 * is empty, and the console says exactly that rather than showing a healthy
 * "last checked" it did not earn.
 */
import { useCallback, useEffect, useState } from 'react'
import { feedHasReported, parseFeed, type RegwatchFeed } from '@/domain/regwatch'
import { ingestFeed } from '@/data/admin-mutations'

export type FeedStatus =
  | { state: 'loading' }
  /** The file is there and the watcher has not written a run to it yet. */
  | { state: 'silent' }
  | { state: 'reported'; feed: RegwatchFeed; added: number; skipped: number }
  | { state: 'unavailable'; reason: string }

export const FEED_URL = `${import.meta.env.BASE_URL}regwatch/feed.json`

async function load(): Promise<FeedStatus> {
  let res: Response
  try {
    res = await fetch(FEED_URL, { cache: 'no-cache' })
  } catch {
    return { state: 'unavailable', reason: 'The feed file could not be fetched. You may be offline.' }
  }
  if (!res.ok) return { state: 'unavailable', reason: `The feed file answered with HTTP ${res.status}.` }
  let raw: unknown
  try {
    raw = await res.json()
  } catch {
    return { state: 'unavailable', reason: 'The feed address did not return the feed file.' }
  }
  const feed = parseFeed(raw)
  if (!feed) return { state: 'unavailable', reason: 'The feed file is not in the shape the watcher writes.' }
  if (!feedHasReported(feed)) return { state: 'silent' }
  const { added, skipped } = ingestFeed(feed)
  return { state: 'reported', feed, added, skipped }
}

/** One fetch per visit to the console; Overview and Rulewatch share the answer. */
let last: FeedStatus | null = null
let inFlight: Promise<FeedStatus> | null = null

export function useRegwatchFeed(): { status: FeedStatus; refresh: () => void } {
  const [status, setStatus] = useState<FeedStatus>(last ?? { state: 'loading' })

  const run = useCallback((force: boolean) => {
    if (force) inFlight = null
    inFlight ??= load()
    let live = true
    void inFlight.then((s) => {
      last = s
      if (live) setStatus(s)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => run(false), [run])

  const refresh = useCallback(() => {
    setStatus({ state: 'loading' })
    run(true)
  }, [run])

  return { status, refresh }
}
