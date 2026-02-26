/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      description TEXT,
      day_of_week INTEGER NOT NULL,
      assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
      is_both INTEGER NOT NULL DEFAULT 0,
      is_recurring INTEGER NOT NULL DEFAULT 0,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE completed_tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE meals (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      day_of_week INTEGER NOT NULL,
      meal_name TEXT NOT NULL,
      meal_type TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_completed_tasks_week
      ON completed_tasks(week_number, year);
    CREATE INDEX idx_meals_week
      ON meals(week_number, year);
    CREATE INDEX idx_tasks_day
      ON tasks(day_of_week);
  `)
}
