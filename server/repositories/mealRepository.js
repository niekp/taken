import { getDb, generateId } from '../db.js'

export function findByWeek(weekNumber, year) {
  const db = getDb()
  return db.prepare(
    'SELECT * FROM meals WHERE week_number = ? AND year = ? ORDER BY day_of_week'
  ).all(Number(weekNumber), Number(year))
}

export function create({ day_of_week, meal_name, meal_type, week_number, year }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO meals (id, day_of_week, meal_name, meal_type, week_number, year)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, day_of_week, meal_name, meal_type, week_number, year)
  return db.prepare('SELECT * FROM meals WHERE id = ?').get(id)
}

export function remove(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM meals WHERE id = ?').run(id)
  return result.changes > 0
}
