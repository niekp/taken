import * as scheduleRepo from '../repositories/scheduleRepository.js'
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
