import * as dayStatusRepo from '../repositories/dayStatusRepository.js'
import { broadcast } from '../lib/liveSync.js'

export function create(req, res) {
  const { date, label, color } = req.body
  if (!date) return res.status(400).json({ error: 'date is required' })
  if (!label) return res.status(400).json({ error: 'label is required' })

  const entry = dayStatusRepo.create({ date, label, color })
  broadcast('day-statuses')
  res.status(201).json(entry)
}

export function update(req, res) {
  const existing = dayStatusRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Status not found' })

  const entry = dayStatusRepo.update(req.params.id, req.body)
  broadcast('day-statuses')
  res.json(entry)
}

export function remove(req, res) {
  const deleted = dayStatusRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Status not found' })
  broadcast('day-statuses')
  res.json({ success: true })
}

export function entriesForRange(req, res) {
  const { from, to } = req.query
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to date params required (YYYY-MM-DD)' })
  }
  const entries = dayStatusRepo.getForDateRange(from, to)
  res.json(entries)
}
