import { getDb, generateId } from '../db.js'

export function findByWeek(weekNumber, year) {
  const db = getDb()
  return db.prepare(
    'SELECT * FROM completed_tasks WHERE week_number = ? AND year = ?'
  ).all(Number(weekNumber), Number(year))
}

export function create({ task_id, user_id, week_number, year }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO completed_tasks (id, task_id, user_id, week_number, year)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, task_id, user_id, week_number, year)
  return db.prepare('SELECT * FROM completed_tasks WHERE id = ?').get(id)
}

export function removeByTaskAndWeek(taskId, weekNumber, year) {
  const db = getDb()
  db.prepare(
    'DELETE FROM completed_tasks WHERE task_id = ? AND week_number = ? AND year = ?'
  ).run(taskId, Number(weekNumber), Number(year))
}

function formatHistoryRow(h) {
  return {
    id: h.id,
    task_id: h.task_id,
    user_id: h.user_id,
    week_number: h.week_number,
    year: h.year,
    completed_at: h.completed_at,
    tasks: { title: h.task_title, day_of_week: h.task_day_of_week },
    users: { name: h.user_name, ...(h.user_avatar_url !== undefined && { avatar_url: h.user_avatar_url }) },
  }
}

export function findHistory(limit = 50) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT 
      ct.id, ct.task_id, ct.user_id, ct.week_number, ct.year, ct.completed_at,
      t.title AS task_title, t.day_of_week AS task_day_of_week,
      u.name AS user_name
    FROM completed_tasks ct
    LEFT JOIN tasks t ON ct.task_id = t.id
    LEFT JOIN users u ON ct.user_id = u.id
    ORDER BY ct.completed_at DESC
    LIMIT ?
  `).all(Number(limit))
  return rows.map(formatHistoryRow)
}

export function findStats(period) {
  const db = getDb()
  let query = `
    SELECT 
      ct.id, ct.task_id, ct.user_id, ct.week_number, ct.year, ct.completed_at,
      t.title AS task_title, t.day_of_week AS task_day_of_week,
      u.name AS user_name, u.avatar_url AS user_avatar_url
    FROM completed_tasks ct
    LEFT JOIN tasks t ON ct.task_id = t.id
    LEFT JOIN users u ON ct.user_id = u.id
  `

  const params = []
  const now = new Date()

  if (period === 'week') {
    const weekNum = getWeekNumber(now)
    const year = now.getFullYear()
    query += ' WHERE ct.week_number = ? AND ct.year = ?'
    params.push(weekNum, year)
  } else if (period === 'month') {
    const year = now.getFullYear()
    const startOfMonth = new Date(year, now.getMonth(), 1)
    const endOfMonth = new Date(year, now.getMonth() + 1, 0)
    const startWeek = getWeekNumber(startOfMonth)
    const endWeek = getWeekNumber(endOfMonth)

    if (startWeek <= endWeek) {
      query += ' WHERE ct.year = ? AND ct.week_number >= ? AND ct.week_number <= ?'
      params.push(year, startWeek, endWeek)
    } else {
      query += ' WHERE ct.year = ? AND ct.week_number >= ?'
      params.push(year, startWeek)
    }
  } else if (period === 'year') {
    query += ' WHERE ct.year = ?'
    params.push(now.getFullYear())
  }
  // 'all' => no WHERE clause

  query += ' ORDER BY ct.completed_at DESC'

  const rows = db.prepare(query).all(...params)
  return rows.map(formatHistoryRow)
}

function getWeekNumber(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}
