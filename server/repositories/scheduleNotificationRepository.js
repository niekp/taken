import { getDb, generateId } from '../db.js'

/**
 * Notification types:
 *   - 'incomplete': fire at `time` if the task is not yet completed that day
 *   - (future) 'completed': fire when someone completes the task
 */

/**
 * Get all notification preferences for a schedule.
 */
export function findBySchedule(scheduleId) {
  const db = getDb()
  return db.prepare('SELECT * FROM schedule_notifications WHERE schedule_id = ?').all(scheduleId)
}

/**
 * Get a user's notification pref for a specific schedule and type (or null).
 */
export function findOne(scheduleId, userId, type) {
  const db = getDb()
  return db.prepare(
    'SELECT * FROM schedule_notifications WHERE schedule_id = ? AND user_id = ? AND type = ?'
  ).get(scheduleId, userId, type) || null
}

/**
 * Set (upsert) a notification preference.
 */
export function upsert(scheduleId, userId, type, time = null) {
  const db = getDb()
  const existing = findOne(scheduleId, userId, type)

  if (existing) {
    db.prepare(
      'UPDATE schedule_notifications SET time = ? WHERE id = ?'
    ).run(time, existing.id)
    return { ...existing, time }
  }

  const id = generateId()
  db.prepare(`
    INSERT INTO schedule_notifications (id, schedule_id, user_id, type, time)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, scheduleId, userId, type, time)

  return { id, schedule_id: scheduleId, user_id: userId, type, time }
}

/**
 * Remove a specific notification preference.
 */
export function remove(scheduleId, userId, type) {
  const db = getDb()
  db.prepare(
    'DELETE FROM schedule_notifications WHERE schedule_id = ? AND user_id = ? AND type = ?'
  ).run(scheduleId, userId, type)
}

/**
 * Remove all notification preferences for a user on a schedule.
 */
export function removeAllForScheduleUser(scheduleId, userId) {
  const db = getDb()
  db.prepare(
    'DELETE FROM schedule_notifications WHERE schedule_id = ? AND user_id = ?'
  ).run(scheduleId, userId)
}

/**
 * Find all 'incomplete' notifications that should fire at the given time,
 * where the schedule's current pending task is due on the given date
 * and is not yet completed.
 *
 * Returns rows with: notification fields + schedule title, category, task info.
 */
export function findDueIncomplete(remindTime, taskDate) {
  const db = getDb()
  return db.prepare(`
    SELECT
      sn.id AS notification_id,
      sn.user_id,
      sn.time AS remind_time,
      s.id AS schedule_id,
      s.title AS schedule_title,
      s.category AS schedule_category,
      t.id AS task_id,
      t.date AS task_date
    FROM schedule_notifications sn
    JOIN schedules s ON s.id = sn.schedule_id
    JOIN tasks t ON t.schedule_id = s.id
      AND t.completed_at IS NULL
      AND t.date = ?
    WHERE sn.type = 'incomplete'
      AND sn.time = ?
  `).all(taskDate, remindTime)
}
