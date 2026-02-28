import { getDb, generateId } from '../db.js'

export function findById(id) {
  const db = getDb()
  return db.prepare('SELECT * FROM day_statuses WHERE id = ?').get(id)
}

export function create({ date, label, color }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO day_statuses (id, date, label, color)
    VALUES (?, ?, ?, ?)
  `).run(id, date, label, color || 'mint')
  return findById(id)
}

export function update(id, { label, color }) {
  const db = getDb()
  const fields = []
  const values = []
  if (label !== undefined) { fields.push('label = ?'); values.push(label) }
  if (color !== undefined) { fields.push('color = ?'); values.push(color) }
  if (fields.length === 0) return findById(id)
  values.push(id)
  db.prepare(`UPDATE day_statuses SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return findById(id)
}

export function remove(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM day_statuses WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * Get all statuses for a date range, grouped by date.
 * Returns { [dateStr]: [{ id, date, label, color }] }
 */
export function getForDateRange(from, to) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM day_statuses
    WHERE date >= ? AND date <= ?
    ORDER BY date, created_at
  `).all(from, to)

  const result = {}
  for (const row of rows) {
    if (!result[row.date]) result[row.date] = []
    result[row.date].push(row)
  }
  return result
}
