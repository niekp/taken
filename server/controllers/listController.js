import * as listRepo from '../repositories/listRepository.js'
import * as taskRepo from '../repositories/taskRepository.js'
import { broadcast } from '../lib/liveSync.js'

export function list(req, res) {
  const type = req.query.type || null
  const lists = listRepo.findAll(type)
  res.json(lists)
}

export function get(req, res) {
  const list = listRepo.findById(req.params.id)
  if (!list) return res.status(404).json({ error: 'List not found' })
  res.json(list)
}

export function create(req, res) {
  const { title, type } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })
  if (!type || !['notes', 'packing'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "notes" or "packing"' })
  }

  const list = listRepo.create({
    title: title.trim(),
    type,
    created_by: req.user?.id || null,
  })
  broadcast('lists')
  res.status(201).json(list)
}

export function update(req, res) {
  const { title } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

  const existing = listRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'List not found' })

  const list = listRepo.update(req.params.id, { title: title.trim() })
  broadcast('lists')
  res.json(list)
}

export function remove(req, res) {
  const deleted = listRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'List not found' })
  broadcast('lists')
  res.json({ success: true })
}

export function copy(req, res) {
  const { title } = req.body
  const existing = listRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'List not found' })

  const newTitle = title?.trim() || `${existing.title} (kopie)`
  const list = listRepo.copy(req.params.id, newTitle)
  broadcast('lists')
  res.status(201).json(list)
}

export function importMarkdown(req, res) {
  const { markdown } = req.body
  if (!markdown) return res.status(400).json({ error: 'Markdown content is required' })

  const existing = listRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'List not found' })

  const list = listRepo.importMarkdown(req.params.id, markdown)
  broadcast('lists')
  res.json(list)
}

// ── Item operations ────────────────────────────────────────────────

export function addItem(req, res) {
  const { title, category, sort_order } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })

  const existing = listRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'List not found' })

  const item = listRepo.addItem(req.params.id, {
    title: title.trim(),
    category: category || '',
    sort_order,
  })
  broadcast('lists')
  res.status(201).json(item)
}

export function updateItem(req, res) {
  const item = listRepo.updateItem(req.params.itemId, req.body)
  if (!item) return res.status(404).json({ error: 'Item not found' })
  broadcast('lists')
  res.json(item)
}

export function removeItem(req, res) {
  const deleted = listRepo.removeItem(req.params.itemId)
  if (!deleted) return res.status(404).json({ error: 'Item not found' })
  broadcast('lists')
  res.json({ success: true })
}

/**
 * Convert a list item to a task in the existing task system.
 * Creates a one-off task and marks the list item as checked.
 */
export function itemToTask(req, res) {
  const { date, assigned_to, is_both } = req.body
  if (!date) return res.status(400).json({ error: 'Date is required' })

  const existing = listRepo.findById(req.params.id)
  if (!existing) return res.status(404).json({ error: 'List not found' })

  const item = existing.items.find(i => i.id === req.params.itemId)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  // Create task
  const task = taskRepo.create({
    title: item.title,
    date,
    assigned_to: assigned_to || null,
    is_both: !!is_both,
  })

  // Mark item as checked
  listRepo.updateItem(req.params.itemId, { checked: true })

  broadcast('lists')
  broadcast('tasks')
  res.status(201).json({ task, item: { ...item, checked: 1 } })
}
