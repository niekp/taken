export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      keys_p256dh TEXT NOT NULL,
      keys_auth TEXT NOT NULL,
      notify_time TEXT NOT NULL DEFAULT '08:00',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
}
