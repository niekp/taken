import { getDb, generateId } from '../db.js'

export function findAll() {
  const db = getDb()
  return db.prepare('SELECT id, name, avatar_url, color, created_at FROM users ORDER BY name').all()
}

export function findAllWithIdAndName() {
  const db = getDb()
  return db.prepare('SELECT id, name, color, created_at FROM users ORDER BY name').all()
}

export function findById(id) {
  const db = getDb()
  return db.prepare('SELECT id, name, avatar_url, color, created_at FROM users WHERE id = ?').get(id)
}

export function findByIdWithPin(id) {
  const db = getDb()
  return db.prepare('SELECT id, pin FROM users WHERE id = ?').get(id)
}

export function findByPin(pin) {
  const db = getDb()
  return db.prepare('SELECT id, name, avatar_url, color, created_at FROM users WHERE pin = ?').all(pin)
}

export function findByName(name) {
  const db = getDb()
  return db.prepare('SELECT id FROM users WHERE name = ?').get(name)
}

export function create(name, pin, color = 'blue') {
  const db = getDb()
  const id = generateId()
  db.prepare('INSERT INTO users (id, name, pin, color) VALUES (?, ?, ?, ?)').run(id, name, pin, color)
  return id
}

export function updateAvatar(id, avatarUrl) {
  const db = getDb()
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl ?? null, id)
}

export function updatePin(id, newPin) {
  const db = getDb()
  db.prepare('UPDATE users SET pin = ? WHERE id = ?').run(newPin, id)
}

export function remove(id) {
  const db = getDb()
  // FK ON DELETE SET NULL handles tasks.assigned_to, tasks.completed_by, schedules.assigned_to, schedules.created_by
  db.prepare('DELETE FROM users WHERE id = ?').run(id)
}
