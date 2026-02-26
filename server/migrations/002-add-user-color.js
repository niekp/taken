/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`ALTER TABLE users ADD COLUMN color TEXT NOT NULL DEFAULT 'blue'`)
}
