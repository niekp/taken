/** @param {import('better-sqlite3').Database} db */
export function up(db) {
  // Add a category column to tasks so completed tasks can retain their
  // category even after their parent schedule is deleted.
  db.exec(`ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT NULL`)

  // Back-fill: copy the category from schedules onto all existing tasks
  db.exec(`
    UPDATE tasks
    SET category = (SELECT s.category FROM schedules s WHERE s.id = tasks.schedule_id)
    WHERE schedule_id IS NOT NULL
  `)
}
