export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_notifications (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(schedule_id, user_id, type)
    )
  `)

  db.exec(`CREATE INDEX IF NOT EXISTS idx_schedule_notifications_schedule ON schedule_notifications(schedule_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_schedule_notifications_user ON schedule_notifications(user_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_schedule_notifications_type ON schedule_notifications(type)`)
}
