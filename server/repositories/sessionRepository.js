import { randomBytes } from 'crypto'
import { getDb, generateId } from '../db.js'

const SESSION_DURATION_DAYS = 365

/**
 * Create a new session for a user.
 * Returns { token, expires_at }.
 */
export function create(userId) {
  const db = getDb()
  const id = generateId()
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  db.prepare(`
    INSERT INTO sessions (id, token, user_id, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, token, userId, expiresAt)

  return { token, expires_at: expiresAt }
}

/**
 * Find a valid (non-expired) session by token.
 * Returns the session row or null.
 */
export function findByToken(token) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM sessions
    WHERE token = ? AND expires_at > datetime('now')
  `).get(token) || null
}

/**
 * Delete a session by token (logout).
 */
export function deleteByToken(token) {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

/**
 * Delete all sessions for a user (e.g. when user is deleted or PIN changes).
 */
export function deleteByUserId(userId) {
  const db = getDb()
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

/**
 * Remove all expired sessions.
 */
export function deleteExpired() {
  const db = getDb()
  const result = db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run()
  if (result.changes > 0) {
    console.log(`Cleaned up ${result.changes} expired session(s)`)
  }
}
