/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`ALTER TABLE lists ADD COLUMN category_order TEXT`)
}
