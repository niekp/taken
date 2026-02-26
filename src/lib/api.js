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

  updateUser: (id, updates) => request(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),

  changePin: (id, currentPin, newPin) => request(`/users/${id}/change-pin`, {
    method: 'POST',
    body: JSON.stringify({ currentPin, newPin }),
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
}
