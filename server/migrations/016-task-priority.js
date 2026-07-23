/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`ALTER TABLE tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 0`)
}
