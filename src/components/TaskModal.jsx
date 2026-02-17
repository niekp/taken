import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

export default function TaskModal({ dayIndex, dayName, onClose, users, currentUser, onTaskCreated, editTask }) {
  const [title, setTitle] = useState(editTask?.title || '')
  const [description, setDescription] = useState(editTask?.description || '')
  const [dayOfWeek, setDayOfWeek] = useState(editTask?.day_of_week ?? dayIndex)
  const [assignedTo, setAssignedTo] = useState(() => {
    if (editTask?.is_both) return 'both'
    if (editTask?.assigned_to) {
      const assignedUser = users.find(u => u.id === editTask.assigned_to)
      return assignedUser?.name?.toLowerCase() || 'both'
    }
    return 'both'
  })
  const [isRecurring, setIsRecurring] = useState(editTask?.is_recurring ?? true)
  const [loading, setLoading] = useState(false)

  const isEditing = !!editTask

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)

    const bijan = users.find(u => u.name === 'Bijan')
    const esther = users.find(u => u.name === 'Esther')

    let taskAssignedTo = null
    let taskIsBoth = false

    if (assignedTo === 'both') {
      taskIsBoth = true
    } else if (assignedTo === 'bijan' && bijan) {
      taskAssignedTo = bijan.id
    } else if (assignedTo === 'esther' && esther) {
      taskAssignedTo = esther.id
    }

    if (isEditing) {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          day_of_week: dayOfWeek,
          assigned_to: taskAssignedTo,
          is_both: taskIsBoth,
          is_recurring: isRecurring
        })
        .eq('id', editTask.id)

      setLoading(false)

      if (!error) {
        onTaskCreated()
        onClose()
      }
    } else {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          day_of_week: dayOfWeek,
          assigned_to: taskAssignedTo,
          is_both: taskIsBoth,
          is_recurring: isRecurring,
          created_by: currentUser.id
        })

      setLoading(false)

      if (!error) {
        onTaskCreated()
        onClose()
      }
    }
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (!confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return

    setLoading(true)

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', editTask.id)

    setLoading(false)

    if (!error) {
      onTaskCreated()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-t-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{isEditing ? 'Taak wijzigen' : 'Taak toevoegen'}</h2>
            <button onClick={onClose} className="p-2 text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taak *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Opmerking</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Extra informatie..."
              className="input-field resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dag</label>
            <select
              value={dayOfWeek}
              onChange={e => setDayOfWeek(parseInt(e.target.value))}
              className="input-field"
            >
              {DAYS.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Toewijzen aan</label>
            <div className="flex gap-2">
              {['both', 'bijan', 'esther'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAssignedTo(val)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    assignedTo === val
                      ? val === 'both' 
                        ? 'bg-purple-500 text-white'
                        : val === 'bijan'
                          ? 'bg-bijan text-white'
                          : 'bg-esther text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {val === 'both' ? 'Samen' : val === 'bijan' ? '👤 Bijan' : '👤 Esther'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRecurring(!isRecurring)}
              className={`w-12 h-6 rounded-full transition-all ${
                isRecurring ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isRecurring ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
            <span className="text-sm text-gray-600">Elke week herhalen</span>
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="btn-primary w-full py-4 text-lg disabled:opacity-50"
          >
            {loading ? 'Bezig...' : isEditing ? 'Wijzigingen opslaan' : 'Taak toevoegen'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-3 text-red-500 font-medium disabled:opacity-50"
            >
              Taak verwijderen
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
