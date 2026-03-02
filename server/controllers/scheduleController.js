import * as scheduleRepo from '../repositories/scheduleRepository.js'
import * as scheduleNotificationRepo from '../repositories/scheduleNotificationRepository.js'
import { broadcast } from '../lib/liveSync.js'

export function list(req, res) {
  res.json(scheduleRepo.findAll())
}

export function get(req, res) {
  const schedule = scheduleRepo.findById(req.params.id)
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' })
  res.json(schedule)
}

export function create(req, res) {
  const { title } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required' })

  const schedule = scheduleRepo.create(req.body)
  broadcast('schedules')
  res.status(201).json(schedule)
}

export function update(req, res) {
  const schedule = scheduleRepo.update(req.params.id, req.body)
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' })
  broadcast('schedules')
  res.json(schedule)
}

export function remove(req, res) {
  const deleted = scheduleRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Schedule not found' })
  broadcast('schedules')
  res.json({ success: true })
}

export function categories(req, res) {
  res.json(scheduleRepo.getCategories())
}

// ── Schedule notification preferences ────────────────────────────────

export function getNotifications(req, res) {
  const { id } = req.params
  const notifications = scheduleNotificationRepo.findBySchedule(id)
  res.json(notifications)
}

export function setNotification(req, res) {
  const { id } = req.params
  const { user_id, type, time } = req.body

  if (!user_id || !type) {
    return res.status(400).json({ error: 'user_id and type are required' })
  }

  const VALID_TYPES = ['incomplete']
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` })
  }

  if (type === 'incomplete' && !time) {
    return res.status(400).json({ error: 'time is required for incomplete notifications' })
  }

  const notification = scheduleNotificationRepo.upsert(id, user_id, type, time || null)
  res.json(notification)
}

export function removeNotification(req, res) {
  const { id } = req.params
  const { user_id, type } = req.body

  if (!user_id || !type) {
    return res.status(400).json({ error: 'user_id and type are required' })
  }

  scheduleNotificationRepo.remove(id, user_id, type)
  res.json({ success: true })
}
