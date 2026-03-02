export function up(db) {
  db.exec(`ALTER TABLE tasks ADD COLUMN notes TEXT DEFAULT NULL`)
  db.exec(`ALTER TABLE schedules ADD COLUMN notes TEXT DEFAULT NULL`)
}
