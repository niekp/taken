export function up(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS interval_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      interval_days INTEGER NOT NULL DEFAULT 7,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_interval_tasks_category ON interval_tasks(category);

    CREATE TABLE IF NOT EXISTS interval_completions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES interval_tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_interval_completions_task ON interval_completions(task_id);
    CREATE INDEX IF NOT EXISTS idx_interval_completions_completed ON interval_completions(completed_at DESC);
  `)
}
