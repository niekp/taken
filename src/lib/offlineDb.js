/**
 * IndexedDB cache for offline API response storage.
 *
 * Uses the `idb` package for a promise-based wrapper.
 * Stores cached GET responses keyed by URL (with query string).
 * Automatic eviction: entries older than MAX_AGE_MS are pruned,
 * and total entries are capped at MAX_ENTRIES (LRU by cachedAt).
 */

import { openDB } from 'idb'

const DB_NAME = 'huis-offline'
const DB_VERSION = 1

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const MAX_ENTRIES = 200

/** @type {import('idb').IDBPDatabase | null} */
let dbPromise = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Cached API responses: key = request URL path+query, value = { data, cachedAt }
        if (!db.objectStoreNames.contains('api-cache')) {
          db.createObjectStore('api-cache')
        }
      },
    })
  }
  return dbPromise
}

/**
 * Cache an API response, then run eviction in the background.
 * @param {string} url - The API path (e.g. '/api/tasks?from=2026-03-02&to=2026-03-08')
 * @param {*} data - The parsed JSON response body
 */
export async function cacheResponse(url, data) {
  try {
    const db = await getDb()
    await db.put('api-cache', { data, cachedAt: Date.now() }, url)
    // Fire-and-forget eviction — never blocks the caller
    evict().catch(() => {})
  } catch (err) {
    // IndexedDB can fail in private browsing etc. — never block the app.
    console.warn('offlineDb: failed to cache response', err)
  }
}

/**
 * Retrieve a cached API response.
 * Returns null for expired entries (older than MAX_AGE_MS).
 * @param {string} url - The API path
 * @returns {Promise<* | null>} The cached data, or null if not found/expired
 */
export async function getCachedResponse(url) {
  try {
    const db = await getDb()
    const entry = await db.get('api-cache', url)
    if (!entry) return null
    // Treat expired entries as cache misses
    if (Date.now() - entry.cachedAt > MAX_AGE_MS) return null
    return entry.data
  } catch (err) {
    console.warn('offlineDb: failed to read cache', err)
    return null
  }
}

/**
 * Evict stale and excess entries.
 * 1. Delete anything older than MAX_AGE_MS.
 * 2. If still over MAX_ENTRIES, delete oldest entries until within budget.
 */
async function evict() {
  const db = await getDb()
  const tx = db.transaction('api-cache', 'readwrite')
  const store = tx.objectStore('api-cache')

  let cursor = await store.openCursor()
  const entries = [] // { key, cachedAt }
  const now = Date.now()

  while (cursor) {
    const { cachedAt } = cursor.value
    if (now - cachedAt > MAX_AGE_MS) {
      // Expired — delete immediately
      cursor.delete()
    } else {
      entries.push({ key: cursor.key, cachedAt })
    }
    cursor = await cursor.continue()
  }

  // If still over budget, evict oldest first
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => a.cachedAt - b.cachedAt)
    const toRemove = entries.slice(0, entries.length - MAX_ENTRIES)
    for (const entry of toRemove) {
      await store.delete(entry.key)
    }
  }

  await tx.done
}

/**
 * Clear all cached responses. Called on logout.
 */
export async function clearCache() {
  try {
    const db = await getDb()
    await db.clear('api-cache')
  } catch (err) {
    console.warn('offlineDb: failed to clear cache', err)
  }
}
