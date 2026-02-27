/**
 * Live sync module — SSE broadcast + revision counter.
 *
 * Tracks a global revision number (in-memory, starts at 0 on boot).
 * Every data-mutating operation bumps the revision and broadcasts
 * an SSE event to all connected clients so they can refetch.
 *
 * Clients that can't use SSE fall back to polling GET /api/revision.
 */

let revision = 0
const clients = new Set()

/** Bump revision and broadcast to all SSE clients. */
export function broadcast(channel = 'data') {
  revision++
  const payload = JSON.stringify({ revision, channel })
  for (const res of clients) {
    res.write(`data: ${payload}\n\n`)
  }
}

/** Get current revision number. */
export function getRevision() {
  return revision
}

/**
 * Express route handler for SSE connections.
 * GET /api/events
 */
export function sseHandler(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // disable nginx buffering
  })

  // Send current revision immediately so the client can sync
  res.write(`data: ${JSON.stringify({ revision, channel: 'connected' })}\n\n`)

  clients.add(res)

  // Send a keep-alive comment every 30s to prevent timeouts
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n')
  }, 30_000)

  req.on('close', () => {
    clearInterval(keepAlive)
    clients.delete(res)
  })
}

/**
 * Express route handler for revision polling fallback.
 * GET /api/revision
 */
export function revisionHandler(req, res) {
  res.json({ revision })
}
