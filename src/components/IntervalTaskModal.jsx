import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const PRESET_INTERVALS = [
  { days: 1, label: 'Elke dag' },
  { days: 2, label: 'Elke 2 dagen' },
  { days: 4, label: 'Elke 4 dagen' },
  { days: 7, label: 'Elke week' },
  { days: 14, label: 'Elke 2 weken' },
  { days: 21, label: 'Elke 3 weken' },
  { days: 30, label: 'Elke maand' },
  { days: 60, label: 'Elke 2 maanden' },
  { days: 90, label: 'Elke 3 maanden' },
]

export default function IntervalTaskModal({ onClose, currentUser, editTask, onSaved }) {
  const [title, setTitle] = useState(editTask?.title || '')
  const [category, setCategory] = useState(editTask?.category || '')
  const [intervalDays, setIntervalDays] = useState(editTask?.interval_days || 7)
  const [customInterval, setCustomInterval] = useState(false)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [showNewCategory, setShowNewCategory] = useState(false)

  const isEditing = !!editTask

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    // If the current interval doesn't match any preset, show custom input
    if (!PRESET_INTERVALS.some(p => p.days === intervalDays)) {
      setCustomInterval(true)
    }
  }, [])

  async function loadCategories() {
    try {
      const cats = await api.getIntervalTaskCategories()
      setCategories(cats)
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)

    try {
      if (isEditing) {
        await api.updateIntervalTask(editTask.id, {
          title: title.trim(),
          category: category.trim(),
          interval_days: intervalDays,
        })
      } else {
        await api.createIntervalTask({
          title: title.trim(),
          category: category.trim(),
          interval_days: intervalDays,
          created_by: currentUser.id,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error('Failed to save interval task:', err)
    }

    setLoading(false)
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (!confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return

    setLoading(true)
    try {
      await api.deleteIntervalTask(editTask.id)
      onSaved()
      onClose()
    } catch (err) {
      console.error('Failed to delete interval task:', err)
    }
    setLoading(false)
  }

  const allCategories = [...new Set([...categories, ...(category && !categories.includes(category) ? [category] : [])])]

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto shadow-soft-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {isEditing ? 'Taak wijzigen' : 'Herhalende taak'}
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
            <label className="block text-sm font-medium text-gray-600 mb-2">Categorie</label>
            {allCategories.length > 0 && !showNewCategory ? (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        category === cat
                          ? 'bg-accent-mint text-white shadow-soft'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
                  >
                    + Nieuw
                  </button>
                </div>
                {category && (
                  <button
                    type="button"
                    onClick={() => setCategory('')}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Categorie verwijderen
                  </button>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="Bijv. Beneden, Boven, Keuken..."
                  className="input-field flex-1"
                />
                {allCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(false)}
                    className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Annuleren
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Herhaling</label>
            {!customInterval ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_INTERVALS.map(p => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setIntervalDays(p.days)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-all ${
                        intervalDays === p.days
                          ? 'bg-accent-mint text-white shadow-soft'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setCustomInterval(true)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Ander interval...
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Elke</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={intervalDays}
                    onChange={e => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="input-field w-20 text-center"
                  />
                  <span className="text-sm text-gray-600">dagen</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomInterval(false)
                    // Snap to nearest preset
                    const nearest = PRESET_INTERVALS.reduce((a, b) =>
                      Math.abs(b.days - intervalDays) < Math.abs(a.days - intervalDays) ? b : a
                    )
                    setIntervalDays(nearest.days)
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Presets tonen
                </button>
              </div>
            )}
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
