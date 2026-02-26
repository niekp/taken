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

  // Tasks
  getTasks: () => request('/tasks'),

  createTask: (task) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),

  updateTask: (id, updates) => request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),

  deleteTask: (id) => request(`/tasks/${id}`, {
    method: 'DELETE',
  }),

  // Completed Tasks
  getCompletedTasks: (weekNumber, year) =>
    request(`/completed-tasks?week_number=${weekNumber}&year=${year}`),

  completeTask: (data) => request('/completed-tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  uncompleteTask: (taskId, weekNumber, year) =>
    request(`/completed-tasks?task_id=${taskId}&week_number=${weekNumber}&year=${year}`, {
      method: 'DELETE',
    }),

  getHistory: (limit = 50) => request(`/completed-tasks/history?limit=${limit}`),

  getStats: (period) => request(`/completed-tasks/stats?period=${period}`),

  // Meals
  getMeals: (weekNumber, year) =>
    request(`/meals?week_number=${weekNumber}&year=${year}`),

  createMeal: (meal) => request('/meals', {
    method: 'POST',
    body: JSON.stringify(meal),
  }),

  deleteMeal: (id) => request(`/meals/${id}`, {
    method: 'DELETE',
  }),

  // Interval Tasks
  getIntervalTasks: () => request('/interval-tasks'),

  getIntervalTask: (id) => request(`/interval-tasks/${id}`),

  createIntervalTask: (task) => request('/interval-tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  }),

  updateIntervalTask: (id, updates) => request(`/interval-tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),

  deleteIntervalTask: (id) => request(`/interval-tasks/${id}`, {
    method: 'DELETE',
  }),

  completeIntervalTask: (id, userId) => request(`/interval-tasks/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  }),

  getIntervalTaskHistory: (id, limit = 10) =>
    request(`/interval-tasks/${id}/history?limit=${limit}`),

  getIntervalTaskCategories: () => request('/interval-tasks/categories'),
}
