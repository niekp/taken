import { getDb, generateId } from '../db.js'

// ── Settings ────────────────────────────────────────────────────────

export function getSettings() {
  const db = getDb()
  return db.prepare('SELECT * FROM calendar_settings WHERE id = 1').get() || null
}

export function saveSettings({ ical_url, name }) {
  const db = getDb()
  const existing = getSettings()

  if (existing) {
    db.prepare(`
      UPDATE calendar_settings SET ical_url = ?, name = ? WHERE id = 1
    `).run(ical_url, name || 'Google Agenda')
  } else {
    db.prepare(`
      INSERT INTO calendar_settings (id, ical_url, name) VALUES (1, ?, ?)
    `).run(ical_url, name || 'Google Agenda')
  }
  return getSettings()
}

export function updateLastSynced() {
  const db = getDb()
  db.prepare(`UPDATE calendar_settings SET last_synced_at = datetime('now') WHERE id = 1`).run()
}

export function removeSettings() {
  const db = getDb()
  db.prepare('DELETE FROM calendar_settings WHERE id = 1').run()
  db.prepare('DELETE FROM calendar_events').run()
}

// ── Events ──────────────────────────────────────────────────────────

export function upsertEvent({ uid, summary, description, location, start_date, end_date, all_day, recurrence_id }) {
  const db = getDb()
  // Use uid + recurrence_id as unique key for recurring event instances
  const lookupKey = recurrence_id ? `${uid}__${recurrence_id}` : uid
  const existing = db.prepare('SELECT id FROM calendar_events WHERE uid = ? AND COALESCE(recurrence_id, \'\') = ?').get(uid, recurrence_id || '')

  if (existing) {
    db.prepare(`
      UPDATE calendar_events
      SET summary = ?, description = ?, location = ?, start_date = ?, end_date = ?, all_day = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(summary, description || null, location || null, start_date, end_date || null, all_day ? 1 : 0, existing.id)
    return existing.id
  } else {
    const id = generateId()
    db.prepare(`
      INSERT INTO calendar_events (id, uid, summary, description, location, start_date, end_date, all_day, recurrence_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, uid, summary, description || null, location || null, start_date, end_date || null, all_day ? 1 : 0, recurrence_id || null)
    return id
  }
}

export function removeEventsNotIn(uids) {
  const db = getDb()
  if (uids.length === 0) {
    db.prepare('DELETE FROM calendar_events').run()
    return
  }
  const placeholders = uids.map(() => '?').join(',')
  db.prepare(`DELETE FROM calendar_events WHERE uid NOT IN (${placeholders})`).run(...uids)
}

export function getEventsForDateRange(from, to) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM calendar_events
    WHERE start_date >= ? AND start_date <= ?
    ORDER BY start_date, summary
  `).all(from, to)
}

export function getAllFutureEvents(from) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM calendar_events
    WHERE start_date >= ?
    ORDER BY start_date, summary
  `).all(from)
}
