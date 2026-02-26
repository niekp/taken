import * as intervalTaskRepo from '../repositories/intervalTaskRepository.js'

export function list(req, res) {
  res.json(intervalTaskRepo.findAll())
}

export function get(req, res) {
  const task = intervalTaskRepo.findById(req.params.id)
  if (!task) return res.status(404).json({ error: 'Task not found' })
  res.json(task)
}

export function create(req, res) {
  const { title } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required' })

  const task = intervalTaskRepo.create(req.body)
  res.status(201).json(task)
}

export function update(req, res) {
  const task = intervalTaskRepo.update(req.params.id, req.body)
  if (!task) return res.status(404).json({ error: 'Task not found' })
  res.json(task)
}

export function remove(req, res) {
  const deleted = intervalTaskRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Task not found' })
  res.json({ success: true })
}

export function complete(req, res) {
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id is required' })

  const task = intervalTaskRepo.findById(req.params.id)
  if (!task) return res.status(404).json({ error: 'Task not found' })

  const updated = intervalTaskRepo.complete(req.params.id, user_id)
  res.json(updated)
}

export function history(req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : 10
  const completions = intervalTaskRepo.findCompletionHistory(req.params.id, limit)
  res.json(completions)
}

export function categories(req, res) {
  res.json(intervalTaskRepo.getCategories())
}
