import { getDb, generateId } from '../db.js'

function toBooleans(task) {
  if (!task) return task
  return { ...task, is_both: !!task.is_both }
}

/**
 * Find tasks within a date range, optionally enriched with user/schedule info.
 * @param {string} from - ISO date string (YYYY-MM-DD)
 * @param {string} to - ISO date string (YYYY-MM-DD)
 */
export function findByDateRange(from, to) {
  const db = getDb()
  const tasks = db.prepare(`
    SELECT t.*,
      u.name AS assigned_to_name,
      cu.name AS completed_by_name,
      s.interval_days,
      s.category
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users cu ON t.completed_by = cu.id
    LEFT JOIN schedules s ON t.schedule_id = s.id
    WHERE t.date BETWEEN ? AND ?
    ORDER BY t.date ASC, t.created_at ASC
  `).all(from, to)
  return tasks.map(toBooleans)
}

export function findById(id) {
  const db = getDb()
  const task = db.prepare(`
    SELECT t.*,
      u.name AS assigned_to_name,
      cu.name AS completed_by_name,
      s.interval_days,
      s.category
    FROM tasks t
    LEFT JOIN users u ON t.assigned_to = u.id
    LEFT JOIN users cu ON t.completed_by = cu.id
    LEFT JOIN schedules s ON t.schedule_id = s.id
    WHERE t.id = ?
  `).get(id)
  return toBooleans(task)
}

/**
 * Create a one-off task (no schedule).
 */
export function create({ title, date, assigned_to, is_both }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO tasks (id, title, date, assigned_to, is_both)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, date, assigned_to || null, is_both ? 1 : 0)
  return findById(id)
}

/**
 * Create a task instance from a schedule.
 * Called when a schedule is first created, and when a scheduled task is completed.
 */
export function createTaskForSchedule(schedule, date) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO tasks (id, schedule_id, title, date, original_date, assigned_to, is_both)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, schedule.id, schedule.title, date, date, schedule.assigned_to || null, schedule.is_both ? 1 : 0)
  return findById(id)
}

/**
 * Update a one-off task. Only allows updating title, date, assigned_to, is_both.
 */
export function update(id, { title, date, assigned_to, is_both }) {
  const db = getDb()
  db.prepare(`
    UPDATE tasks SET title = ?, date = ?, assigned_to = ?, is_both = ?
    WHERE id = ? AND schedule_id IS NULL
  `).run(title, date, assigned_to || null, is_both ? 1 : 0, id)
  return findById(id)
}

/**
 * Complete a task. If it belongs to a schedule, generate the next occurrence.
 * @returns {{ task: object, nextTask: object|null }}
 */
export function complete(id, userId) {
  const db = getDb()
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE tasks SET completed_at = ?, completed_by = ?
    WHERE id = ? AND completed_at IS NULL
  `).run(now, userId, id)

  const task = findById(id)
  let nextTask = null

  // If this task has a schedule, generate the next occurrence
  if (task && task.schedule_id) {
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(task.schedule_id)
    if (schedule) {
      // Next task date = this task's date + interval_days
      const taskDate = new Date(task.date + 'T00:00:00')
      taskDate.setDate(taskDate.getDate() + schedule.interval_days)
      const nextDate = taskDate.toISOString().split('T')[0]

      nextTask = createTaskForSchedule(
        { ...schedule, is_both: !!schedule.is_both },
        nextDate
      )
    }
  }

  return { task, nextTask }
}

/**
 * Uncomplete a task. Removes completion timestamp.
 * If a next task was generated from the schedule, it gets deleted.
 */
export function uncomplete(id) {
  const db = getDb()
  const task = findById(id)
  if (!task || !task.completed_at) return task

  // If this task has a schedule, delete any future uncompleted tasks for the same schedule
  // (the "next" task that was auto-generated)
  if (task.schedule_id) {
    db.prepare(`
      DELETE FROM tasks
      WHERE schedule_id = ? AND completed_at IS NULL AND date > ?
    `).run(task.schedule_id, task.date)
  }

  db.prepare(`
    UPDATE tasks SET completed_at = NULL, completed_by = NULL
    WHERE id = ?
  `).run(id)

  return findById(id)
}

/**
 * Delete a task. Only allows deleting one-off tasks (no schedule).
 */
export function remove(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM tasks WHERE id = ? AND schedule_id IS NULL').run(id)
  return result.changes > 0
}

/**
 * Housekeeping: move overdue uncompleted tasks to today.
 * Preserves original_date so we know when it was originally scheduled.
 * Returns the number of tasks moved.
 */
export function runHousekeeping() {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  const result = db.prepare(`
    UPDATE tasks
    SET date = ?,
        original_date = COALESCE(original_date, date)
    WHERE date < ? AND completed_at IS NULL
  `).run(today, today)

  return result.changes
}

/**
 * Get ghost tasks: for each schedule, compute where the *next* occurrence
 * would land if the current pending task were completed on time.
 * Returns virtual task objects (not in the DB).
 */
export function getGhostTasks(from, to) {
  const db = getDb()

  // For each schedule, find the current pending task (the one uncompleted)
  const pendingTasks = db.prepare(`
    SELECT t.*, s.interval_days, s.category
    FROM tasks t
    JOIN schedules s ON t.schedule_id = s.id
    WHERE t.completed_at IS NULL
  `).all()

  const ghosts = []

  for (const task of pendingTasks) {
    // Ghost = task.date + interval_days
    const ghostDate = new Date(task.date + 'T00:00:00')
    ghostDate.setDate(ghostDate.getDate() + task.interval_days)
    const ghostDateStr = ghostDate.toISOString().split('T')[0]

    if (ghostDateStr >= from && ghostDateStr <= to) {
      ghosts.push({
        id: `ghost-${task.schedule_id}`,
        schedule_id: task.schedule_id,
        title: task.title,
        date: ghostDateStr,
        assigned_to: task.assigned_to,
        is_both: !!task.is_both,
        is_ghost: true,
        interval_days: task.interval_days,
        category: task.category,
      })
    }
  }

  return ghosts
}

/**
 * Get completion history across all tasks (for stats/history views).
 */
export function findCompletionHistory(limit = 50) {
  const db = getDb()
  return db.prepare(`
    SELECT t.id, t.title, t.date, t.completed_at, t.completed_by,
      u.name AS completed_by_name,
      s.category
    FROM tasks t
    LEFT JOIN users u ON t.completed_by = u.id
    LEFT JOIN schedules s ON t.schedule_id = s.id
    WHERE t.completed_at IS NOT NULL
    ORDER BY t.completed_at DESC
    LIMIT ?
  `).all(limit).map(toBooleans)
}

/**
 * Get completion stats filtered by period.
 */
export function findStats(period = 'week') {
  const db = getDb()
  let dateFilter = ''

  const now = new Date()
  if (period === 'week') {
    // Get start of ISO week (Monday)
    const day = now.getDay() || 7
    const monday = new Date(now)
    monday.setDate(now.getDate() - day + 1)
    monday.setHours(0, 0, 0, 0)
    dateFilter = `AND t.completed_at >= '${monday.toISOString()}'`
  } else if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    dateFilter = `AND t.completed_at >= '${start.toISOString()}'`
  } else if (period === 'year') {
    const start = new Date(now.getFullYear(), 0, 1)
    dateFilter = `AND t.completed_at >= '${start.toISOString()}'`
  }
  // 'all' = no filter

  return db.prepare(`
    SELECT t.id, t.title, t.date, t.completed_at, t.completed_by,
      u.name AS completed_by_name
    FROM tasks t
    LEFT JOIN users u ON t.completed_by = u.id
    WHERE t.completed_at IS NOT NULL
    ${dateFilter}
    ORDER BY t.completed_at DESC
  `).all().map(toBooleans)
}
