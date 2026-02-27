import { Router } from 'express'
import * as userController from './controllers/userController.js'
import * as scheduleController from './controllers/scheduleController.js'
import * as taskController from './controllers/taskController.js'
import * as mealController from './controllers/mealController.js'
import * as bringController from './controllers/bringController.js'
import * as dailyScheduleController from './controllers/dailyScheduleController.js'

const router = Router()

// Users
router.get('/users', userController.list)
router.post('/users', userController.createUser)
router.post('/auth/login', userController.login)
router.patch('/users/:id', userController.updateUser)
router.post('/users/:id/change-pin', userController.changePin)
router.post('/users/:id/reset-pin', userController.resetPin)
router.delete('/users/:id', userController.deleteUser)

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
router.post('/tasks/:id/reassign', taskController.reassign)
router.delete('/tasks/:id', taskController.remove)
router.post('/tasks/:id/complete', taskController.complete)
router.post('/tasks/:id/uncomplete', taskController.uncomplete)

// Meals (static routes before parameterized)
router.get('/meals/suggestions', mealController.suggestions)
router.get('/meals', mealController.list)
router.post('/meals', mealController.create)
router.put('/meals/:id', mealController.update)
router.delete('/meals/:id', mealController.remove)

// Bring! shopping list
router.get('/bring/status', bringController.status)
router.get('/bring/lists', bringController.getLists)
router.get('/bring/items', bringController.getItems)
router.post('/bring/items', bringController.addItem)
router.post('/bring/items/complete', bringController.completeItem)
router.post('/bring/items/remove', bringController.removeItem)

// Daily schedules (static routes before parameterized)
router.get('/daily-schedules/entries', dailyScheduleController.entriesForRange)
router.get('/daily-schedules/labels', dailyScheduleController.labels)
router.get('/daily-schedules', dailyScheduleController.list)
router.post('/daily-schedules', dailyScheduleController.create)
router.put('/daily-schedules/:id', dailyScheduleController.update)
router.delete('/daily-schedules/:id', dailyScheduleController.remove)

export default router
