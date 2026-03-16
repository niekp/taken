/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  db.exec(`
    CREATE TABLE grocery_items (
      uuid TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      specification TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      status TEXT NOT NULL CHECK(status IN ('purchase', 'recently')),
      sort_order INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX idx_grocery_items_status ON grocery_items(status);
  `)
}
