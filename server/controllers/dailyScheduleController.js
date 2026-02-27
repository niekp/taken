import * as dailyScheduleRepo from '../repositories/dailyScheduleRepository.js'
import { broadcast } from '../lib/liveSync.js'

export function list(req, res) {
  const entries = dailyScheduleRepo.findAll()
  res.json(entries)
}

export function create(req, res) {
  const { user_id, day_of_week, label } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id is required' })
  if (day_of_week === undefined || day_of_week === null) return res.status(400).json({ error: 'day_of_week is required' })
  if (!label) return res.status(400).json({ error: 'label is required' })

  const entry = dailyScheduleRepo.create(req.body)
  broadcast('daily-schedules')
  res.status(201).json(entry)
}

export function update(req, res) {
  const existing = dailyScheduleRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Entry not found' })

  const entry = dailyScheduleRepo.update(req.params.id, req.body)
  broadcast('daily-schedules')
  res.json(entry)
}

export function remove(req, res) {
  const deleted = dailyScheduleRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Entry not found' })
  broadcast('daily-schedules')
  res.json({ success: true })
}

export function entriesForRange(req, res) {
  const { from, to } = req.query
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to date params required (YYYY-MM-DD)' })
  }
  const entries = dailyScheduleRepo.getEntriesForDateRange(from, to)
  res.json(entries)
}

export function labels(req, res) {
  res.json(dailyScheduleRepo.getLabels())
}
