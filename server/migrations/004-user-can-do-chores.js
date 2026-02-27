/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`
    ALTER TABLE users ADD COLUMN can_do_chores INTEGER NOT NULL DEFAULT 1;
  `)
}
