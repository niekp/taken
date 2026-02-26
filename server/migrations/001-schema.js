/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      avatar_url TEXT,
      color TEXT DEFAULT 'blue',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE schedules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      interval_days INTEGER NOT NULL DEFAULT 7,
      assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      is_both INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_schedules_category ON schedules(category);

    CREATE TABLE tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      schedule_id TEXT REFERENCES schedules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      original_date TEXT,
      assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      is_both INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      completed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_tasks_date ON tasks(date);
    CREATE INDEX idx_tasks_schedule ON tasks(schedule_id);
    CREATE INDEX idx_tasks_completed ON tasks(completed_at);

    CREATE TABLE meals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      date TEXT NOT NULL,
      meal_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_meals_date ON meals(date);
  `)
}
