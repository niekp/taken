import { getDb, generateId } from '../db.js'

export function findByUserId(userId) {
  const db = getDb()
  return db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId)
}

export function findByEndpoint(endpoint) {
  const db = getDb()
  return db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?').get(endpoint)
}

export function findAllEnabled() {
  const db = getDb()
  return db.prepare('SELECT * FROM push_subscriptions WHERE enabled = 1').all()
}

export function findEnabledForTime(time) {
  const db = getDb()
  return db.prepare('SELECT * FROM push_subscriptions WHERE enabled = 1 AND notify_time = ?').all(time)
}

export function upsert(userId, subscription, notifyTime = '08:00') {
  const db = getDb()
  const existing = findByEndpoint(subscription.endpoint)

  if (existing) {
    db.prepare(`
      UPDATE push_subscriptions
      SET user_id = ?, keys_p256dh = ?, keys_auth = ?, notify_time = ?, enabled = 1
      WHERE endpoint = ?
    `).run(userId, subscription.keys.p256dh, subscription.keys.auth, notifyTime, subscription.endpoint)
    return existing.id
  }

  const id = generateId()
  db.prepare(`
    INSERT INTO push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth, notify_time, enabled)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `).run(id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, notifyTime)
  return id
}

export function updateTime(endpoint, notifyTime) {
  const db = getDb()
  db.prepare('UPDATE push_subscriptions SET notify_time = ? WHERE endpoint = ?').run(notifyTime, endpoint)
}

export function disable(endpoint) {
  const db = getDb()
  db.prepare('UPDATE push_subscriptions SET enabled = 0 WHERE endpoint = ?').run(endpoint)
}

export function enable(endpoint) {
  const db = getDb()
  db.prepare('UPDATE push_subscriptions SET enabled = 1 WHERE endpoint = ?').run(endpoint)
}

export function removeByEndpoint(endpoint) {
  const db = getDb()
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
}

export function removeById(id) {
  const db = getDb()
  db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(id)
}
