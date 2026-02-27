import * as mealRepo from '../repositories/mealRepository.js'
import { broadcast } from '../lib/liveSync.js'

export function list(req, res) {
  const { from, to } = req.query
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' })

  res.json(mealRepo.findByDateRange(from, to))
}

export function create(req, res) {
  const { date, meal_name } = req.body
  if (!date || !meal_name) return res.status(400).json({ error: 'date and meal_name are required' })

  const meal = mealRepo.create({ date, meal_name })
  broadcast('meals')
  res.status(201).json(meal)
}

export function update(req, res) {
  const meal = mealRepo.update(req.params.id, { meal_name: req.body.meal_name })
  if (!meal) return res.status(404).json({ error: 'Meal not found' })
  broadcast('meals')
  res.json(meal)
}

export function remove(req, res) {
  const deleted = mealRepo.remove(req.params.id)
  if (!deleted) return res.status(404).json({ error: 'Meal not found' })
  broadcast('meals')
  res.json({ success: true })
}

export function suggestions(req, res) {
  res.json(mealRepo.recentNames())
}
