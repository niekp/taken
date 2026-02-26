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
