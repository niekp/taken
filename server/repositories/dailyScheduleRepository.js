import { getDb, generateId } from '../db.js'

export function findAll() {
  const db = getDb()
  return db.prepare(`
    SELECT ds.*, u.name AS user_name, u.color AS user_color
    FROM daily_schedules ds
    JOIN users u ON ds.user_id = u.id
    ORDER BY ds.day_of_week, u.name, ds.label
  `).all()
}

export function findById(id) {
  const db = getDb()
  return db.prepare(`
    SELECT ds.*, u.name AS user_name, u.color AS user_color
    FROM daily_schedules ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.id = ?
  `).get(id)
}

export function create({ user_id, day_of_week, label, interval_weeks, reference_date }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO daily_schedules (id, user_id, day_of_week, label, interval_weeks, reference_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, user_id, day_of_week, label, interval_weeks || 1, reference_date || null)
  return findById(id)
}

export function update(id, { user_id, day_of_week, label, interval_weeks, reference_date }) {
  const db = getDb()
  db.prepare(`
    UPDATE daily_schedules
    SET user_id = ?, day_of_week = ?, label = ?, interval_weeks = ?, reference_date = ?
    WHERE id = ?
  `).run(user_id, day_of_week, label, interval_weeks || 1, reference_date || null, id)
  return findById(id)
}

export function remove(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM daily_schedules WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * Get all schedule entries that apply to a specific date.
 * Handles weekly (interval_weeks=1) and bi-weekly/multi-weekly (interval_weeks>1).
 * For multi-weekly, uses reference_date to determine which weeks apply.
 */
export function getEntriesForDate(dateStr) {
  const db = getDb()
  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = date.getDay() // 0=Sunday, 6=Saturday

  // Get all entries for this day of week
  const entries = db.prepare(`
    SELECT ds.*, u.name AS user_name, u.color AS user_color
    FROM daily_schedules ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.day_of_week = ?
    ORDER BY u.name, ds.label
  `).all(dayOfWeek)

  // Filter by interval_weeks using reference_date
  return entries.filter(entry => {
    if (entry.interval_weeks === 1) return true
    if (!entry.reference_date) return true // no reference = always applies

    const ref = new Date(entry.reference_date + 'T00:00:00')
    const diffMs = date.getTime() - ref.getTime()
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))
    return diffWeeks % entry.interval_weeks === 0
  })
}

/**
 * Get entries for a date range, grouped by date.
 * Returns { [dateStr]: [{ user_name, user_color, label }] }
 */
export function getEntriesForDateRange(from, to) {
  const result = {}
  const current = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')

  while (current <= end) {
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    const entries = getEntriesForDate(dateStr)
    if (entries.length > 0) {
      result[dateStr] = entries
    }
    current.setDate(current.getDate() + 1)
  }

  return result
}

/**
 * Get distinct labels used in daily schedules (for autocomplete).
 */
export function getLabels() {
  const db = getDb()
  return db.prepare(
    'SELECT DISTINCT label FROM daily_schedules ORDER BY label'
  ).all().map(r => r.label)
}
