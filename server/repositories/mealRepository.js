import { getDb, generateId } from '../db.js'

export function findByDateRange(from, to) {
  const db = getDb()
  return db.prepare(
    'SELECT * FROM meals WHERE date >= ? AND date <= ? ORDER BY date'
  ).all(from, to)
}

export function create({ date, meal_name }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO meals (id, date, meal_name)
    VALUES (?, ?, ?)
  `).run(id, date, meal_name)
  return db.prepare('SELECT * FROM meals WHERE id = ?').get(id)
}

export function update(id, { meal_name }) {
  const db = getDb()
  db.prepare('UPDATE meals SET meal_name = ? WHERE id = ?').run(meal_name, id)
  return db.prepare('SELECT * FROM meals WHERE id = ?').get(id)
}

export function remove(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM meals WHERE id = ?').run(id)
  return result.changes > 0
}

function formatDateLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export function recentNames(days = 30) {
  const db = getDb()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = formatDateLocal(since)
  return db.prepare(`
    SELECT meal_name FROM meals WHERE date >= ?
    GROUP BY meal_name COLLATE NOCASE
    ORDER BY MAX(date) DESC
  `).all(sinceStr).map(r => r.meal_name)
}
