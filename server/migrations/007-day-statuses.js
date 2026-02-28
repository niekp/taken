/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`
    CREATE TABLE day_statuses (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      date TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'mint',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_day_statuses_date ON day_statuses(date);
  `)
}
