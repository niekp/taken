import * as taskRepo from '../repositories/taskRepository.js'

export function list(req, res) {
  res.json(taskRepo.findAll())
}

export function create(req, res) {
  const { title } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required' })

  const task = taskRepo.create(req.body)
  res.status(201).json(task)
}

export function update(req, res) {
  const task = taskRepo.update(req.params.id, req.body)
  if (!task) return res.status(404).json({ error: 'Task not found' })
  res.json(task)
}

export function remove(req, res) {
  const deleted = taskRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Task not found' })
  res.json({ success: true })
}
