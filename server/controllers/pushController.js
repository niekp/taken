import * as pushRepo from '../repositories/pushRepository.js'
import * as notifications from '../lib/notifications.js'

/**
 * GET /api/push/vapid-key
 * Returns the VAPID public key (needed by the browser to subscribe)
 */
export function vapidKey(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    return res.json({ configured: false, key: null })
  }
  res.json({ configured: true, key })
}

/**
 * POST /api/push/subscribe
 * Body: { user_id, subscription: { endpoint, keys: { p256dh, auth } }, notify_time }
 */
export function subscribe(req, res) {
  const { user_id, subscription, notify_time } = req.body

  if (!user_id || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({ error: 'user_id and valid subscription object required' })
  }

  const time = notify_time || '08:00'
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return res.status(400).json({ error: 'notify_time must be HH:MM format' })
  }

  const id = pushRepo.upsert(user_id, subscription, time)
  res.json({ success: true, id })
}

/**
 * POST /api/push/unsubscribe
 * Body: { endpoint }
 */
export function unsubscribe(req, res) {
  const { endpoint } = req.body
  if (!endpoint) {
    return res.status(400).json({ error: 'endpoint is required' })
  }

  pushRepo.removeByEndpoint(endpoint)
  res.json({ success: true })
}

/**
 * PUT /api/push/settings
 * Body: { endpoint, notify_time?, enabled? }
 */
export function updateSettings(req, res) {
  const { endpoint, notify_time, enabled } = req.body
  if (!endpoint) {
    return res.status(400).json({ error: 'endpoint is required' })
  }

  const sub = pushRepo.findByEndpoint(endpoint)
  if (!sub) {
    return res.status(404).json({ error: 'Subscription not found' })
  }

  if (notify_time !== undefined) {
    if (!/^\d{2}:\d{2}$/.test(notify_time)) {
      return res.status(400).json({ error: 'notify_time must be HH:MM format' })
    }
    pushRepo.updateTime(endpoint, notify_time)
  }

  if (enabled !== undefined) {
    if (enabled) {
      pushRepo.enable(endpoint)
    } else {
      pushRepo.disable(endpoint)
    }
  }

  const updated = pushRepo.findByEndpoint(endpoint)
  res.json(updated)
}

/**
 * GET /api/push/status
 * Query: ?endpoint=...
 * Returns subscription status for this device
 */
export function status(req, res) {
  const { endpoint } = req.query
  if (!endpoint) {
    return res.json({ subscribed: false })
  }

  const sub = pushRepo.findByEndpoint(endpoint)
  if (!sub) {
    return res.json({ subscribed: false })
  }

  res.json({
    subscribed: true,
    enabled: !!sub.enabled,
    notify_time: sub.notify_time,
  })
}

/**
 * POST /api/push/test
 * Body: { user_id }
 * Sends a test notification to all subscriptions for this user
 */
export async function test(req, res) {
  const { user_id } = req.body
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' })
  }

  if (!notifications.isConfigured()) {
    return res.status(503).json({ error: 'Push notifications not configured' })
  }

  const subs = pushRepo.findByUserId(user_id)
  if (subs.length === 0) {
    return res.status(404).json({ error: 'No subscriptions found for this user' })
  }

  const summary = notifications.buildSummary(user_id)
  let sent = 0
  for (const sub of subs) {
    const ok = await notifications.sendPush(sub, summary)
    if (ok) sent++
  }

  res.json({ success: true, sent, total: subs.length })
}
