import { Router } from 'express'
import * as userController from './controllers/userController.js'
import * as scheduleController from './controllers/scheduleController.js'
import * as taskController from './controllers/taskController.js'
import * as mealController from './controllers/mealController.js'

const router = Router()

// Users
router.get('/users', userController.list)
router.post('/auth/login', userController.login)
router.patch('/users/:id', userController.updateAvatar)
router.post('/users/:id/change-pin', userController.changePin)

// Schedules
router.get('/schedules/categories', scheduleController.categories)
router.get('/schedules', scheduleController.list)
router.post('/schedules', scheduleController.create)
router.get('/schedules/:id', scheduleController.get)
router.put('/schedules/:id', scheduleController.update)
router.delete('/schedules/:id', scheduleController.remove)

// Tasks (static routes before parameterized)
router.get('/tasks/history', taskController.history)
router.get('/tasks/stats', taskController.stats)
router.post('/tasks/housekeeping', taskController.housekeeping)
router.get('/tasks', taskController.list)
router.post('/tasks', taskController.create)
router.put('/tasks/:id', taskController.update)
router.delete('/tasks/:id', taskController.remove)
router.post('/tasks/:id/complete', taskController.complete)
router.post('/tasks/:id/uncomplete', taskController.uncomplete)

// Meals
router.get('/meals', mealController.list)
router.post('/meals', mealController.create)
router.put('/meals/:id', mealController.update)
router.delete('/meals/:id', mealController.remove)

export default router
