/**
 * Live sync client — singleton SSE connection with polling fallback.
 *
 * One EventSource connection is shared across all subscribers.
 * Each subscriber registers for a specific channel (e.g. 'tasks', 'grocery')
 * and receives a callback when that channel has new data.
 *
 * If SSE fails or is unavailable, falls back to polling GET /api/revision
 * every 5 seconds.
 *
 * Pauses when the tab is hidden and resyncs all channels on return.
 */

/** @type {EventSource | null} */
let eventSource = null

/** @type {ReturnType<typeof setInterval> | null} */
let pollInterval = null

/** Last seen revision from the server */
let lastRevision = -1

/** Whether we're using SSE (true) or polling fallback (false) */
let useSSE = true

/** Map of channel -> Set of callbacks */
const listeners = new Map()

/** Whether the connection has been started */
let started = false

/** Number of SSE errors in a row (used to decide when to fall back) */
let sseErrorCount = 0
const SSE_MAX_ERRORS = 3

function notifyListeners(channel) {
  const cbs = listeners.get(channel)
  if (cbs) {
    for (const cb of cbs) {
      try { cb() } catch (e) { console.error('liveSync listener error:', e) }
    }
  }
}

function notifyAllListeners() {
  for (const [, cbs] of listeners) {
    for (const cb of cbs) {
      try { cb() } catch (e) { console.error('liveSync listener error:', e) }
    }
  }
}

function handleMessage(data) {
  try {
    const msg = JSON.parse(data)
    if (msg.revision !== undefined && msg.revision > lastRevision) {
      lastRevision = msg.revision
      if (msg.channel && msg.channel !== 'connected') {
        notifyListeners(msg.channel)
      }
    }
  } catch {
    // ignore malformed messages
  }
}

function startSSE() {
  if (eventSource) return

  try {
    eventSource = new EventSource('/api/events')

    eventSource.onmessage = (event) => {
      sseErrorCount = 0
      handleMessage(event.data)
    }

    eventSource.onerror = () => {
      sseErrorCount++
      if (sseErrorCount >= SSE_MAX_ERRORS) {
        console.warn('liveSync: SSE failed, falling back to polling')
        stopSSE()
        useSSE = false
        startPolling()
      }
    }
  } catch {
    // EventSource not supported
    useSSE = false
    startPolling()
  }
}

function stopSSE() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
}

async function pollRevision() {
  try {
    const res = await fetch('/api/revision')
    if (!res.ok) return
    const data = await res.json()
    if (data.revision > lastRevision) {
      lastRevision = data.revision
      // Polling doesn't tell us which channel changed, so notify all
      notifyAllListeners()
    }
  } catch {
    // Network error, will retry next interval
  }
}

function startPolling() {
  if (pollInterval) return
  pollInterval = setInterval(pollRevision, 5000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

function start() {
  if (started) return
  started = true

  if (typeof EventSource !== 'undefined' && useSSE) {
    startSSE()
  } else {
    useSSE = false
    startPolling()
  }

  // Pause when tab is hidden, resync when visible
  document.addEventListener('visibilitychange', handleVisibility)
}

function stop() {
  if (!started) return
  started = false
  stopSSE()
  stopPolling()
  document.removeEventListener('visibilitychange', handleVisibility)
}

function handleVisibility() {
  if (document.hidden) {
    // Pause to save resources
    stopSSE()
    stopPolling()
  } else {
    // Resume and immediately notify all listeners to resync
    if (useSSE) {
      startSSE()
    } else {
      startPolling()
    }
    // Trigger an immediate poll to catch up
    pollRevision().then(() => {
      // After poll, the handlers above will fire if revision changed.
      // But also notify all anyway since we were away
      notifyAllListeners()
    })
  }
}

/**
 * Subscribe to sync events for a specific channel.
 * Returns an unsubscribe function.
 *
 * @param {string} channel - e.g. 'tasks', 'grocery', 'meals', 'schedules'
 * @param {() => void} callback - called when the channel has new data
 * @returns {() => void} unsubscribe function
 */
export function subscribe(channel, callback) {
  if (!listeners.has(channel)) {
    listeners.set(channel, new Set())
  }
  listeners.get(channel).add(callback)

  // Auto-start the connection when first subscriber appears
  if (!started) start()

  return () => {
    const cbs = listeners.get(channel)
    if (cbs) {
      cbs.delete(callback)
      if (cbs.size === 0) listeners.delete(channel)
    }

    // Auto-stop when no subscribers remain
    if (listeners.size === 0) stop()
  }
}
