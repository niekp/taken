/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`
    CREATE TABLE bring_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      list_uuid TEXT,
      list_name TEXT,
      uuid TEXT,
      public_uuid TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at INTEGER,
      country TEXT DEFAULT 'NL'
    )
  `)
}
