import { getDb, generateId } from '../db.js'
import { createTaskForSchedule } from './taskRepository.js'

function toBooleans(row) {
  if (!row) return row
  return { ...row, is_both: !!row.is_both }
}

export function findAll() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT s.*,
      u.name AS assigned_to_name,
      (SELECT COUNT(*) FROM tasks t WHERE t.schedule_id = s.id AND t.completed_at IS NOT NULL) AS completed_count,
      (SELECT t.date FROM tasks t WHERE t.schedule_id = s.id AND t.completed_at IS NULL ORDER BY t.date ASC LIMIT 1) AS next_date
    FROM schedules s
    LEFT JOIN users u ON s.assigned_to = u.id
    ORDER BY s.category, s.title
  `).all()
  return rows.map(toBooleans)
}

export function findById(id) {
  const db = getDb()
  const row = db.prepare(`
    SELECT s.*,
      u.name AS assigned_to_name,
      (SELECT COUNT(*) FROM tasks t WHERE t.schedule_id = s.id AND t.completed_at IS NOT NULL) AS completed_count,
      (SELECT t.date FROM tasks t WHERE t.schedule_id = s.id AND t.completed_at IS NULL ORDER BY t.date ASC LIMIT 1) AS next_date
    FROM schedules s
    LEFT JOIN users u ON s.assigned_to = u.id
    WHERE s.id = ?
  `).get(id)
  return toBooleans(row)
}

/**
 * Create a schedule and generate its first task.
 * @param {object} data - { title, category, interval_days, assigned_to, is_both, created_by, start_date }
 * @returns {object} The created schedule
 */
export function create({ title, category, interval_days, assigned_to, is_both, created_by, start_date }) {
  const db = getDb()
  const id = generateId()

  db.prepare(`
    INSERT INTO schedules (id, title, category, interval_days, assigned_to, is_both, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, category || '', interval_days || 7, assigned_to || null, is_both ? 1 : 0, created_by || null)

  // Generate the first task on the given start_date (defaults to today)
  const date = start_date || new Date().toISOString().split('T')[0]
  const schedule = findById(id)
  createTaskForSchedule(schedule, date)

  return findById(id)
}

export function update(id, { title, category, interval_days, assigned_to, is_both }) {
  const db = getDb()
  db.prepare(`
    UPDATE schedules SET title = ?, category = ?, interval_days = ?, assigned_to = ?, is_both = ?
    WHERE id = ?
  `).run(title, category || '', interval_days || 7, assigned_to || null, is_both ? 1 : 0, id)

  // Also update the title on any uncompleted tasks for this schedule
  db.prepare(`
    UPDATE tasks SET title = ?, assigned_to = ?, is_both = ?
    WHERE schedule_id = ? AND completed_at IS NULL
  `).run(title, assigned_to || null, is_both ? 1 : 0, id)

  return findById(id)
}

export function remove(id) {
  const db = getDb()
  // tasks cascade-delete via FK
  const result = db.prepare('DELETE FROM schedules WHERE id = ?').run(id)
  return result.changes > 0
}

export function getCategories() {
  const db = getDb()
  const rows = db.prepare(
    "SELECT DISTINCT category FROM schedules WHERE category != '' ORDER BY category"
  ).all()
  return rows.map(r => r.category)
}
