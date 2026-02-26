import { Router } from 'express'
import * as userController from './controllers/userController.js'
import * as taskController from './controllers/taskController.js'
import * as completedTaskController from './controllers/completedTaskController.js'
import * as mealController from './controllers/mealController.js'
import * as intervalTaskController from './controllers/intervalTaskController.js'

const router = Router()

// Users
router.get('/users', userController.list)
router.post('/auth/login', userController.login)
router.patch('/users/:id', userController.updateAvatar)
router.post('/users/:id/change-pin', userController.changePin)

// Tasks
router.get('/tasks', taskController.list)
router.post('/tasks', taskController.create)
router.put('/tasks/:id', taskController.update)
router.delete('/tasks/:id', taskController.remove)

// Completed Tasks
router.get('/completed-tasks/history', completedTaskController.history)
router.get('/completed-tasks/stats', completedTaskController.stats)
router.get('/completed-tasks', completedTaskController.list)
router.post('/completed-tasks', completedTaskController.create)
router.delete('/completed-tasks', completedTaskController.remove)

// Meals
router.get('/meals', mealController.list)
router.post('/meals', mealController.create)
router.delete('/meals/:id', mealController.remove)

// Interval Tasks
router.get('/interval-tasks/categories', intervalTaskController.categories)
router.get('/interval-tasks', intervalTaskController.list)
router.post('/interval-tasks', intervalTaskController.create)
router.get('/interval-tasks/:id', intervalTaskController.get)
router.put('/interval-tasks/:id', intervalTaskController.update)
router.delete('/interval-tasks/:id', intervalTaskController.remove)
router.post('/interval-tasks/:id/complete', intervalTaskController.complete)
router.get('/interval-tasks/:id/history', intervalTaskController.history)

export default router
