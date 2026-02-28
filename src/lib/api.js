const BASE = '/api'

const TOKEN_KEY = 'sessionToken'

// Callback invoked when a 401 response is received (session expired/invalid).
// App.jsx sets this to trigger logout.
let onUnauthorized = null

export function setOnUnauthorized(callback) {
  onUnauthorized = callback
}

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {}
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && onUnauthorized) {
    // Don't trigger on login/select-user calls (they expect 401 for wrong PIN)
    const isAuthRoute = path === '/auth/login' || path === '/auth/select-user'
    if (!isAuthRoute) {
      onUnauthorized()
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Auth
  login: (pin) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  }),

  selectUser: (pin, userId) => request('/auth/select-user', {
    method: 'POST',
    body: JSON.stringify({ pin, user_id: userId }),
  }),

  logout: () => request('/auth/logout', {
    method: 'POST',
  }),

  // Users
  getUsers: () => request('/users'),

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

  postponeTask: (id, date) => request(`/tasks/${id}/postpone`, {
    method: 'POST',
    ...(date ? { body: JSON.stringify({ date }) } : {}),
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

  getBringCatalog: () => request('/bring/catalog'),

  addBringItem: (name, specification, uuid) => request('/bring/items', {
    method: 'POST',
    body: JSON.stringify({ name, specification, uuid }),
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

  // Day statuses
  getDayStatuses: (from, to) =>
    request(`/day-statuses/entries?from=${from}&to=${to}`),

  createDayStatus: (data) => request('/day-statuses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateDayStatus: (id, data) => request(`/day-statuses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  deleteDayStatus: (id) => request(`/day-statuses/${id}`, {
    method: 'DELETE',
  }),

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

  // Calendar / Agenda
  getCalendarStatus: () => request('/calendar/status'),

  getCalendarEvents: (from) => request(`/calendar/events?from=${from}`),

  syncCalendar: () => request('/calendar/sync', {
    method: 'POST',
  }),
}
