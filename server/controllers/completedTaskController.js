import * as completedTaskRepo from '../repositories/completedTaskRepository.js'

export function list(req, res) {
  const { week_number, year } = req.query
  if (!week_number || !year) return res.status(400).json({ error: 'week_number and year are required' })

  res.json(completedTaskRepo.findByWeek(week_number, year))
}

export function create(req, res) {
  const ct = completedTaskRepo.create(req.body)
  res.status(201).json(ct)
}

export function remove(req, res) {
  const { task_id, week_number, year } = req.query
  if (!task_id || !week_number || !year) {
    return res.status(400).json({ error: 'task_id, week_number and year are required' })
  }

  completedTaskRepo.removeByTaskAndWeek(task_id, week_number, year)
  res.json({ success: true })
}

export function history(req, res) {
  const { limit } = req.query
  res.json(completedTaskRepo.findHistory(limit))
}

export function stats(req, res) {
  const { period } = req.query
  res.json(completedTaskRepo.findStats(period))
}
