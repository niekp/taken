import * as mealRepo from '../repositories/mealRepository.js'

export function list(req, res) {
  const { week_number, year } = req.query
  if (!week_number || !year) return res.status(400).json({ error: 'week_number and year are required' })

  res.json(mealRepo.findByWeek(week_number, year))
}

export function create(req, res) {
  const meal = mealRepo.create(req.body)
  res.status(201).json(meal)
}

export function remove(req, res) {
  const deleted = mealRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Meal not found' })
  res.json({ success: true })
}
