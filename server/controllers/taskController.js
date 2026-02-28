import * as taskRepo from '../repositories/taskRepository.js'
import { broadcast } from '../lib/liveSync.js'

export function list(req, res) {
  const { from, to } = req.query
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to date params required (YYYY-MM-DD)' })
  }
  const tasks = taskRepo.findByDateRange(from, to)
  const ghosts = taskRepo.getGhostTasks(from, to)
  res.json({ tasks, ghosts })
}

export function create(req, res) {
  const { title, date } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required' })
  if (!date) return res.status(400).json({ error: 'Date is required' })

  const task = taskRepo.create(req.body)
  broadcast('tasks')
  res.status(201).json(task)
}

export function update(req, res) {
  const task = taskRepo.update(req.params.id, req.body)
  if (!task) return res.status(404).json({ error: 'Task not found' })
  broadcast('tasks')
  res.json(task)
}

export function reassign(req, res) {
  const existing = taskRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Task not found' })
  if (existing.completed_at) return res.status(400).json({ error: 'Cannot reassign a completed task' })

  const task = taskRepo.reassign(req.params.id, req.body)
  broadcast('tasks')
  res.json(task)
}

export function postpone(req, res) {
  const existing = taskRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Task not found' })
  if (existing.completed_at) return res.status(400).json({ error: 'Cannot postpone a completed task' })

  const targetDate = req.body?.date || null
  const task = taskRepo.postpone(req.params.id, targetDate)
  broadcast('tasks')
  res.json(task)
}

export function remove(req, res) {
  const deleted = taskRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Task not found (or is a scheduled task)' })
  broadcast('tasks')
  res.json({ success: true })
}

export function complete(req, res) {
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id is required' })

  const existing = taskRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Task not found' })
  if (existing.completed_at) return res.status(400).json({ error: 'Task already completed' })

  const result = taskRepo.complete(req.params.id, user_id)
  broadcast('tasks')
  res.json(result)
}

export function uncomplete(req, res) {
  const existing = taskRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Task not found' })
  if (!existing.completed_at) return res.status(400).json({ error: 'Task not completed' })

  const task = taskRepo.uncomplete(req.params.id)
  broadcast('tasks')
  res.json(task)
}

export function housekeeping(req, res) {
  const moved = taskRepo.runHousekeeping()
  if (moved > 0) broadcast('tasks')
  res.json({ moved })
}

export function history(req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : 50
  res.json(taskRepo.findCompletionHistory(limit))
}

export function stats(req, res) {
  const period = req.query.period || 'week'
  res.json(taskRepo.findStats(period))
}
