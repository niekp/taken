/**
 * Offline sync orchestrator.
 *
 * Provides two key behaviors:
 * 1. GET requests: network-first, with IndexedDB cache fallback when offline.
 * 2. Pending mutation tracking: listens for SW messages about queued/replayed
 *    mutations and exposes a count + syncing state for the UI banner.
 * 3. Mutation queueing detection: when a mutation fails due to network error,
 *    throws a MutationQueuedError so callers can show "queued" instead of "failed".
 *
 * Actual mutation queuing and retry is handled by workbox-background-sync
 * in the service worker — this module only tracks counts for the UI.
 */

import { cacheResponse, getCachedResponse, clearCache } from './offlineDb.js'
import { refreshAll } from './liveSync.js'

// ─── MutationQueuedError ───────────────────────────────────────────────

/**
 * Thrown when a mutation fails due to network error but the service worker
 * has queued it for background sync. Callers should show an informational
 * message ("queued for sync") instead of a hard error ("failed").
 */
export class MutationQueuedError extends Error {
  constructor() {
    super('Mutation queued for background sync')
    this.name = 'MutationQueuedError'
  }
}

// ─── Online/offline state ──────────────────────────────────────────────

let online = typeof navigator !== 'undefined' ? navigator.onLine : true
let pendingCount = 0
let syncing = false

/** @type {Set<() => void>} */
const statusListeners = new Set()

function notifyStatusListeners() {
  for (const cb of statusListeners) {
    try { cb() } catch (e) { console.error('offlineSync listener error:', e) }
  }
}

/**
 * Subscribe to offline status changes.
 * @param {() => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeStatus(callback) {
  statusListeners.add(callback)
  return () => statusListeners.delete(callback)
}

/** Current status snapshot */
export function getStatus() {
  return { online, pendingCount, syncing }
}

// ─── Browser event listeners ───────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    online = true
    notifyStatusListeners()
    // Tell the SW to attempt replaying queued mutations.
    // This is the primary replay trigger for Safari/Firefox which don't
    // support the Background Sync API. On Chrome, the browser's sync event
    // handles this, but sending the message is harmless (the SW deduplicates).
    triggerSWReplay()
  })
  window.addEventListener('offline', () => {
    online = false
    notifyStatusListeners()
  })
}

/**
 * Send a message to the active service worker to replay queued mutations.
 * Called on `online` events and on page load (in case the SW has stale entries
 * from a previous offline session).
 */
function triggerSWReplay() {
  if (typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'REPLAY_MUTATIONS' })
  }
}

// On page load, if we're online, try to replay any queued mutations
// from a previous session (e.g. user closed the app while offline).
if (typeof window !== 'undefined' && online) {
  // Delay slightly to let the SW activate first
  setTimeout(triggerSWReplay, 1000)
}

// ─── SW message bridge ─────────────────────────────────────────────────
//
// The service worker sends us messages about the mutation queue:
// - { type: 'BG_SYNC_QUEUED' }     — a mutation was queued because network failed
// - { type: 'BG_SYNC_STARTED' }    — replay started
// - { type: 'BG_SYNC_COMPLETE' }   — all queued mutations replayed successfully
// - { type: 'BG_SYNC_ERROR' }      — a replay attempt failed (will retry later)

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type } = event.data || {}

    switch (type) {
      case 'BG_SYNC_QUEUED':
        pendingCount++
        notifyStatusListeners()
        break

      case 'BG_SYNC_STARTED':
        syncing = true
        notifyStatusListeners()
        break

      case 'BG_SYNC_COMPLETE':
        pendingCount = 0
        syncing = false
        notifyStatusListeners()
        // Tell all live-synced views to refetch fresh data from the server.
        // The server already broadcast SSE events for each replayed mutation,
        // but SSE may not have reconnected yet — this is a safety net.
        refreshAll()
        break

      case 'BG_SYNC_ERROR':
        syncing = false
        notifyStatusListeners()
        break
    }
  })
}

// ─── API request wrapper ───────────────────────────────────────────────

/**
 * Wrap a fetch call with offline caching.
 *
 * For GET requests:
 * - On success: cache the response and return it.
 * - On network error: return cached data if available, otherwise re-throw.
 *
 * For mutation requests (POST/PUT/DELETE):
 * - Always attempt the network call. If it fails, the SW's background-sync
 *   plugin will have already queued a clone of the request. We just re-throw
 *   so the caller's catch block runs (showing an error toast or similar).
 *   The SW will notify us when the queue replays.
 *
 * @param {string} url - Full URL path (e.g. '/api/tasks?from=...')
 * @param {RequestInit} options - fetch options
 * @param {Function} fetchFn - the actual fetch call to execute (returns parsed JSON)
 * @returns {Promise<*>} parsed response
 */
export async function withOfflineSupport(url, options, fetchFn) {
  const method = (options?.method || 'GET').toUpperCase()

  if (method === 'GET') {
    try {
      const data = await fetchFn()
      // Cache successful response (fire-and-forget)
      cacheResponse(url, data)
      return data
    } catch (err) {
      // Network error — try cache
      if (isNetworkError(err)) {
        const cached = await getCachedResponse(url)
        if (cached !== null) {
          return cached
        }
      }
      throw err
    }
  }

  // Mutations: try the network. If offline, the SW queues the request
  // via background-sync. We throw a MutationQueuedError so callers
  // can distinguish "queued for later" from "truly failed".
  try {
    return await fetchFn()
  } catch (err) {
    if (isNetworkError(err) && hasSWBackgroundSync()) {
      throw new MutationQueuedError()
    }
    throw err
  }
}

/**
 * Check if an error is a network-level failure (not an HTTP error).
 *
 * When a service worker with Workbox's NetworkOnly + BackgroundSyncPlugin
 * intercepts a fetch, the error thrown back to the main thread may not be
 * a standard TypeError/"Failed to fetch". Workbox can throw its own error
 * types (e.g. "no-response"). We also check navigator.onLine as a
 * fallback signal — if the browser says we're offline and we got a fetch
 * error, it's almost certainly a network failure.
 */
function isNetworkError(err) {
  // Standard: TypeError is thrown by fetch when the network is unavailable
  if (err instanceof TypeError) return true
  // Some browsers/environments use this message
  if (err.message && err.message.includes('Failed to fetch')) return true
  // Workbox NetworkOnly rejects with "no-response" when bgSync queues the request
  if (err.message && err.message.includes('no-response')) return true
  // Fallback: if the browser reports offline and we got any fetch-level error,
  // treat it as a network failure
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  return false
}

/**
 * Check if a service worker with background sync capability is active.
 * If no SW is controlling the page, mutations can't be queued.
 */
function hasSWBackgroundSync() {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && navigator.serviceWorker.controller != null
}

/**
 * Clear the offline cache (call on logout).
 */
export { clearCache }
