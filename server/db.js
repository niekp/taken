import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import path from 'path'
import { readdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'chores.db')

let db

/**
 * Initialize the database connection and run any pending migrations.
 * Must be called (and awaited) once at app startup before using getDb().
 */
export async function initDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const migrationsDir = path.join(__dirname, 'migrations')
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort()

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map(r => r.name)
  )

  for (const file of files) {
    if (applied.has(file)) continue

    const migration = await import(path.join(migrationsDir, file))
    console.log(`Running migration: ${file}`)
    migration.up(db)
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    console.log(`Applied migration: ${file}`)
  }

  return db
}

/**
 * Get the database instance. Throws if initDb() has not been called.
 */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call await initDb() first.')
  }
  return db
}

export function generateId() {
  return randomUUID()
}
