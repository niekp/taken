import { getDb, generateId } from '../db.js'

export function findAll() {
  const db = getDb()
  const tasks = db.prepare(`
    SELECT 
      t.*,
      c.completed_at AS last_completed_at,
      c.user_id AS last_completed_by,
      u.name AS last_completed_by_name
    FROM interval_tasks t
    LEFT JOIN (
      SELECT task_id, completed_at, user_id,
        ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY completed_at DESC) AS rn
      FROM interval_completions
    ) c ON c.task_id = t.id AND c.rn = 1
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY t.category, t.title
  `).all()

  return tasks.map(enrichTask)
}

export function findById(id) {
  const db = getDb()
  const task = db.prepare(`
    SELECT 
      t.*,
      c.completed_at AS last_completed_at,
      c.user_id AS last_completed_by,
      u.name AS last_completed_by_name
    FROM interval_tasks t
    LEFT JOIN (
      SELECT task_id, completed_at, user_id,
        ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY completed_at DESC) AS rn
      FROM interval_completions
    ) c ON c.task_id = t.id AND c.rn = 1
    LEFT JOIN users u ON c.user_id = u.id
    WHERE t.id = ?
  `).get(id)

  return task ? enrichTask(task) : null
}

export function create({ title, category, interval_days, created_by }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO interval_tasks (id, title, category, interval_days, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, category || '', interval_days || 7, created_by || null)
  return findById(id)
}

export function update(id, { title, category, interval_days }) {
  const db = getDb()
  db.prepare(`
    UPDATE interval_tasks SET title = ?, category = ?, interval_days = ?
    WHERE id = ?
  `).run(title, category || '', interval_days || 7, id)
  return findById(id)
}

export function remove(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM interval_tasks WHERE id = ?').run(id)
  return result.changes > 0
}

export function complete(taskId, userId) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO interval_completions (id, task_id, user_id)
    VALUES (?, ?, ?)
  `).run(id, taskId, userId)
  return findById(taskId)
}

export function findCompletionHistory(taskId, limit = 10) {
  const db = getDb()
  return db.prepare(`
    SELECT ic.*, u.name AS user_name
    FROM interval_completions ic
    LEFT JOIN users u ON ic.user_id = u.id
    WHERE ic.task_id = ?
    ORDER BY ic.completed_at DESC
    LIMIT ?
  `).all(taskId, limit)
}

export function getCategories() {
  const db = getDb()
  const rows = db.prepare(
    "SELECT DISTINCT category FROM interval_tasks WHERE category != '' ORDER BY category"
  ).all()
  return rows.map(r => r.category)
}

/**
 * Enrich a task row with computed due-date fields.
 * - due_date: ISO string of when the task is next due
 * - days_remaining: negative = overdue, 0 = due today, positive = upcoming
 * - status: 'overdue' | 'due' | 'upcoming'
 */
function enrichTask(task) {
  const baseDate = task.last_completed_at || task.created_at
  const due = new Date(baseDate)
  due.setDate(due.getDate() + task.interval_days)

  const now = new Date()
  // Compare dates only (strip time)
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffMs = dueDay - today
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  let status
  if (daysRemaining < 0) status = 'overdue'
  else if (daysRemaining === 0) status = 'due'
  else status = 'upcoming'

  return {
    id: task.id,
    title: task.title,
    category: task.category,
    interval_days: task.interval_days,
    created_by: task.created_by,
    created_at: task.created_at,
    last_completed_at: task.last_completed_at || null,
    last_completed_by: task.last_completed_by || null,
    last_completed_by_name: task.last_completed_by_name || null,
    due_date: due.toISOString(),
    days_remaining: daysRemaining,
    status,
  }
}
