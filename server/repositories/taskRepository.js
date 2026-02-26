import { getDb, generateId } from '../db.js'

function toBooleans(task) {
  if (!task) return task
  return { ...task, is_both: !!task.is_both, is_recurring: !!task.is_recurring }
}

export function findAll() {
  const db = getDb()
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
  return tasks.map(toBooleans)
}

export function findById(id) {
  const db = getDb()
  return toBooleans(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id))
}

export function create({ title, description, day_of_week, assigned_to, is_both, is_recurring, created_by }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO tasks (id, title, description, day_of_week, assigned_to, is_both, is_recurring, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description || null, day_of_week, assigned_to || null, is_both ? 1 : 0, is_recurring ? 1 : 0, created_by || null)
  return findById(id)
}

export function update(id, { title, description, day_of_week, assigned_to, is_both, is_recurring }) {
  const db = getDb()
  db.prepare(`
    UPDATE tasks SET title = ?, description = ?, day_of_week = ?, assigned_to = ?, is_both = ?, is_recurring = ?
    WHERE id = ?
  `).run(title, description || null, day_of_week, assigned_to || null, is_both ? 1 : 0, is_recurring ? 1 : 0, id)
  return findById(id)
}

export function remove(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return result.changes > 0
}
