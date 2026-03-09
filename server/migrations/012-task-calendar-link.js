export function up(db) {
  db.exec(`ALTER TABLE tasks ADD COLUMN calendar_event_id TEXT DEFAULT NULL REFERENCES calendar_events(id) ON DELETE SET NULL`)
  db.exec(`CREATE INDEX idx_tasks_calendar_event ON tasks(calendar_event_id)`)
}
