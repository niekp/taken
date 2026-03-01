import { useState } from 'react'
import { api } from '../lib/api'
import { getUserColor, BOTH_COLOR } from '../lib/colors'
import { useToast } from '../lib/toast'
import useKeyboardOffset from '../hooks/useKeyboardOffset'

export default function TaskModal({ date, dayName, onClose, users, currentUser, onTaskCreated, editTask, onNavigateToDate }) {
  const [title, setTitle] = useState(editTask?.title || '')
  const [taskDate, setTaskDate] = useState(editTask?.date || date)
  const [assignedTo, setAssignedTo] = useState(() => {
    if (editTask?.is_both) return 'both'
    if (editTask?.assigned_to) return editTask.assigned_to
    return 'both'
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const panelRef = useKeyboardOffset()

  const isEditing = !!editTask
  const isScheduled = isEditing && !!editTask.schedule_id

  async function handleSubmit(e) {
    e.preventDefault()

    setLoading(true)

    let taskAssignedTo = null
    let taskIsBoth = false

    if (assignedTo === 'both') {
      taskIsBoth = true
    } else {
      taskAssignedTo = assignedTo
    }

    try {
      if (isScheduled) {
        // Scheduled task instance: only reassign
        await api.reassignTask(editTask.id, {
          assigned_to: taskAssignedTo,
          is_both: taskIsBoth,
        })
        toast.success('Toewijzing opgeslagen')
      } else if (isEditing) {
        // One-off task: full edit
        await api.updateTask(editTask.id, {
          title: title.trim(),
          date: taskDate,
          assigned_to: taskAssignedTo,
          is_both: taskIsBoth,
        })
        toast.success('Taak bijgewerkt')
      } else {
        // New task
        await api.createTask({
          title: title.trim(),
          date: taskDate,
          assigned_to: taskAssignedTo,
          is_both: taskIsBoth,
        })
        // If the task was created for a different date, navigate there
        if (taskDate !== date && onNavigateToDate) {
          onNavigateToDate(taskDate)
        }
        toast.success('Taak toegevoegd')
      }
      onTaskCreated()
      onClose()
    } catch (err) {
      console.error('Failed to save task:', err)
      toast.error('Opslaan mislukt')
    }

    setLoading(false)
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (!confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return

    setLoading(true)

    try {
      await api.deleteTask(editTask.id)
      toast.success('Taak verwijderd')
      onTaskCreated()
      onClose()
    } catch (err) {
      console.error('Failed to delete task:', err)
      toast.error('Verwijderen mislukt')
    }

    setLoading(false)
  }

  const bothColor = BOTH_COLOR
  const assigneeOptions = [
    { value: 'both', label: 'Samen', bg: bothColor.bgLight, activeBg: bothColor.bg },
    ...users.filter(u => u.can_do_chores).map(u => {
      const c = getUserColor(u)
      return { value: u.id, label: u.name, bg: c.bgLight, activeBg: c.bg }
    }),
  ]

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        ref={panelRef}
        className="bg-white rounded-t-3xl w-full max-h-[90vh] max-h-[90dvh] overflow-y-auto shadow-soft-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {isScheduled ? 'Taak toewijzen' : isEditing ? 'Taak wijzigen' : 'Taak toevoegen'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {isScheduled ? (
            /* Scheduled task: show title + schedule info as read-only */
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-medium text-gray-800">{editTask.title}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Herhalend elke {editTask.interval_days} dagen</span>
                {editTask.category && (
                  <>
                    <span>&middot;</span>
                    <span>{editTask.category}</span>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* One-off or new task: editable title + date */
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Taak</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Bijv. Stofzuigen"
                  className="input-field"
                  autoFocus={!isEditing}
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
            </>
          )}

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
            disabled={loading || (!isScheduled && !title.trim())}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isScheduled ? 'Toewijzing opslaan' : isEditing ? 'Wijzigingen opslaan' : 'Taak toevoegen'}
          </button>

          {isEditing && !isScheduled && (
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
