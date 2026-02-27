/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`
    CREATE TABLE daily_schedules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      label TEXT NOT NULL,
      interval_weeks INTEGER NOT NULL DEFAULT 1,
      reference_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_daily_schedules_user ON daily_schedules(user_id);
    CREATE INDEX idx_daily_schedules_day ON daily_schedules(day_of_week);
  `)
}
