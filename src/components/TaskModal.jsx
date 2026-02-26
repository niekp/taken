import { useState } from 'react'
import { api } from '../lib/api'
import { getUserColor, BOTH_COLOR } from '../lib/colors'

export default function TaskModal({ date, dayName, onClose, users, currentUser, onTaskCreated, editTask }) {
  const [title, setTitle] = useState(editTask?.title || '')
  const [taskDate, setTaskDate] = useState(editTask?.date || date)
  const [assignedTo, setAssignedTo] = useState(() => {
    if (editTask?.is_both) return 'both'
    if (editTask?.assigned_to) return editTask.assigned_to
    return 'both'
  })
  const [loading, setLoading] = useState(false)

  const isEditing = !!editTask

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)

    let taskAssignedTo = null
    let taskIsBoth = false

    if (assignedTo === 'both') {
      taskIsBoth = true
    } else {
      taskAssignedTo = assignedTo
    }

    try {
      if (isEditing) {
        await api.updateTask(editTask.id, {
          title: title.trim(),
          date: taskDate,
          assigned_to: taskAssignedTo,
          is_both: taskIsBoth,
        })
      } else {
        await api.createTask({
          title: title.trim(),
          date: taskDate,
          assigned_to: taskAssignedTo,
          is_both: taskIsBoth,
        })
      }
      onTaskCreated()
      onClose()
    } catch (err) {
      console.error('Failed to save task:', err)
    }

    setLoading(false)
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (!confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return

    setLoading(true)

    try {
      await api.deleteTask(editTask.id)
      onTaskCreated()
      onClose()
    } catch (err) {
      console.error('Failed to delete task:', err)
    }

    setLoading(false)
  }

  const bothColor = BOTH_COLOR
  const assigneeOptions = [
    { value: 'both', label: 'Samen', bg: bothColor.bgLight, activeBg: bothColor.bg },
    ...users.map(u => {
      const c = getUserColor(u)
      return { value: u.id, label: u.name, bg: c.bgLight, activeBg: c.bg }
    }),
  ]

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto shadow-soft-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditing ? 'Taak wijzigen' : 'Taak toevoegen'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Taak</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Bijv. Stofzuigen"
              className="input-field"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Datum</label>
            <input
              type="date"
              value={taskDate}
              onChange={e => setTaskDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Toewijzen aan</label>
            <div className="flex gap-2">
              {assigneeOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAssignedTo(opt.value)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    assignedTo === opt.value
                      ? `${opt.activeBg} text-white shadow-soft`
                      : `${opt.bg} text-gray-600 hover:opacity-80`
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isEditing ? 'Wijzigingen opslaan' : 'Taak toevoegen'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-3 text-red-500 font-medium text-sm hover:bg-red-50 rounded-xl transition-colors"
            >
              Taak verwijderen
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
