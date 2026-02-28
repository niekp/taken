export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      ical_url TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Google Agenda',
      last_synced_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      uid TEXT NOT NULL,
      summary TEXT NOT NULL,
      description TEXT,
      location TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT,
      all_day INTEGER NOT NULL DEFAULT 1,
      recurrence_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.exec(`CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_date)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_calendar_events_uid ON calendar_events(uid)`)
}
