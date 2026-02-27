const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Users
  getUsers: () => request('/users'),

  login: (pin) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  }),

  createUser: (data) => request('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateUser: (id, updates) => request(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),

  deleteUser: (id) => request(`/users/${id}`, {
    method: 'DELETE',
  }),

  changePin: (id, currentPin, newPin) => request(`/users/${id}/change-pin`, {
    method: 'POST',
    body: JSON.stringify({ currentPin, newPin }),
  }),

  resetPin: (id, newPin) => request(`/users/${id}/reset-pin`, {
    method: 'POST',
    body: JSON.stringify({ newPin }),
  }),

  // Schedules
  getSchedules: () => request('/schedules'),

  getSchedule: (id) => request(`/schedules/${id}`),

  createSchedule: (schedule) => request('/schedules', {
    method: 'POST',
    body: JSON.stringify(schedule),
  }),

  updateSchedule: (id, updates) => request(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),

  deleteSchedule: (id) => request(`/schedules/${id}`, {
    method: 'DELETE',
  }),

  getScheduleCategories: () => request('/schedules/categories'),

  // Tasks
  getTasks: (from, to) => request(`/tasks?from=${from}&to=${to}`),

  createTask: (task) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),

  updateTask: (id, updates) => request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),

  reassignTask: (id, { assigned_to, is_both }) => request(`/tasks/${id}/reassign`, {
    method: 'POST',
    body: JSON.stringify({ assigned_to, is_both }),
  }),

  deleteTask: (id) => request(`/tasks/${id}`, {
    method: 'DELETE',
  }),

  completeTask: (id, userId) => request(`/tasks/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }),

  uncompleteTask: (id) => request(`/tasks/${id}/uncomplete`, {
    method: 'POST',
  }),

  runHousekeeping: () => request('/tasks/housekeeping', {
    method: 'POST',
  }),

  getHistory: (limit = 50) => request(`/tasks/history?limit=${limit}`),

  getStats: (period) => request(`/tasks/stats?period=${period}`),

  // Meals
  getMeals: (from, to) =>
    request(`/meals?from=${from}&to=${to}`),

  getMealSuggestions: () => request('/meals/suggestions'),

  createMeal: (meal) => request('/meals', {
    method: 'POST',
    body: JSON.stringify(meal),
  }),

  updateMeal: (id, updates) => request(`/meals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),

  deleteMeal: (id) => request(`/meals/${id}`, {
    method: 'DELETE',
  }),

  // Bring! shopping list
  getBringStatus: () => request('/bring/status'),

  getBringItems: () => request('/bring/items'),

  addBringItem: (name, specification) => request('/bring/items', {
    method: 'POST',
    body: JSON.stringify({ name, specification }),
  }),

  completeBringItem: (name, uuid) => request('/bring/items/complete', {
    method: 'POST',
    body: JSON.stringify({ name, uuid }),
  }),

  removeBringItem: (name, uuid) => request('/bring/items/remove', {
    method: 'POST',
    body: JSON.stringify({ name, uuid }),
  }),

  // Daily schedules (Dagschema)
  getDailySchedules: () => request('/daily-schedules'),

  createDailySchedule: (data) => request('/daily-schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateDailySchedule: (id, data) => request(`/daily-schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  deleteDailySchedule: (id) => request(`/daily-schedules/${id}`, {
    method: 'DELETE',
  }),

  getDailyScheduleEntries: (from, to) =>
    request(`/daily-schedules/entries?from=${from}&to=${to}`),

  getDailyScheduleLabels: () => request('/daily-schedules/labels'),

  // Push notifications
  getVapidKey: () => request('/push/vapid-key'),

  getPushStatus: (endpoint) => request(`/push/status?endpoint=${encodeURIComponent(endpoint)}`),

  subscribePush: (userId, subscription, notifyTime) => request('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, subscription, notify_time: notifyTime }),
  }),

  unsubscribePush: (endpoint) => request('/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  }),

  updatePushSettings: (endpoint, settings) => request('/push/settings', {
    method: 'PUT',
    body: JSON.stringify({ endpoint, ...settings }),
  }),

  testPush: (userId) => request('/push/test', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }),
}
