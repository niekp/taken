import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
import { getUserColor } from '../lib/colors'
import useKeyboardOffset from '../hooks/useKeyboardOffset'

const DAYS_OF_WEEK = [
  { value: 1, label: 'Maandag' },
  { value: 2, label: 'Dinsdag' },
  { value: 3, label: 'Woensdag' },
  { value: 4, label: 'Donderdag' },
  { value: 5, label: 'Vrijdag' },
  { value: 6, label: 'Zaterdag' },
  { value: 0, label: 'Zondag' },
]

const INTERVALS = [
  { value: 1, label: 'Elke week' },
  { value: 2, label: 'Om de week' },
]

function formatTodayISO() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function DagschemaModal({ onClose, users, editEntry, onSaved }) {
  const [userId, setUserId] = useState(editEntry?.user_id || (users[0]?.id ?? ''))
  const [dayOfWeek, setDayOfWeek] = useState(editEntry?.day_of_week ?? 1)
  const [label, setLabel] = useState(editEntry?.label || '')
  const [intervalWeeks, setIntervalWeeks] = useState(editEntry?.interval_weeks || 1)
  const [referenceDate, setReferenceDate] = useState(editEntry?.reference_date || formatTodayISO())
  const [loading, setLoading] = useState(false)
  const [labelSuggestions, setLabelSuggestions] = useState([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const panelRef = useKeyboardOffset()

  const isEditing = !!editEntry

  useEffect(() => {
    loadLabels()
  }, [])

  async function loadLabels() {
    try {
      const data = await api.getDailyScheduleLabels()
      setLabelSuggestions(data)
    } catch (err) {
      console.error('Failed to load labels:', err)
    }
  }

  function getFilteredSuggestions() {
    const query = label.trim().toLowerCase()
    if (!query) return labelSuggestions
    return labelSuggestions.filter(s => s.toLowerCase().includes(query))
  }

  function selectSuggestion(name) {
    setLabel(name)
    setShowAutocomplete(false)
    setSelectedIndex(-1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!label.trim() || !userId) return

    setLoading(true)
    try {
      const data = {
        user_id: userId,
        day_of_week: dayOfWeek,
        label: label.trim(),
        interval_weeks: intervalWeeks,
        reference_date: intervalWeeks > 1 ? referenceDate : null,
      }

      if (isEditing) {
        await api.updateDailySchedule(editEntry.id, data)
      } else {
        await api.createDailySchedule(data)
      }
      onSaved()
      onClose()
    } catch (err) {
      console.error('Failed to save daily schedule:', err)
    }
    setLoading(false)
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (!confirm('Weet je zeker dat je dit item wilt verwijderen?')) return

    setLoading(true)
    try {
      await api.deleteDailySchedule(editEntry.id)
      onSaved()
      onClose()
    } catch (err) {
      console.error('Failed to delete daily schedule:', err)
    }
    setLoading(false)
  }

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
              {isEditing ? 'Item wijzigen' : 'Nieuw dagschema item'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* User picker */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Persoon</label>
            <div className="flex gap-2 flex-wrap">
              {users.map(user => {
                const color = getUserColor(user)
                const isSelected = userId === user.id
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setUserId(user.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? `${color.bg} text-white shadow-soft`
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {user.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day of week picker */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Dag</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DAYS_OF_WEEK.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDayOfWeek(d.value)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-all ${
                    dayOfWeek === d.value
                      ? 'bg-accent-mint text-white shadow-soft'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Label input with autocomplete */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Activiteit</label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={label}
                onChange={e => {
                  setLabel(e.target.value)
                  setShowAutocomplete(true)
                  setSelectedIndex(-1)
                }}
                onFocus={() => {
                  setShowAutocomplete(true)
                  setSelectedIndex(-1)
                }}
                onBlur={() => {
                  // Delay to allow click on suggestion
                  setTimeout(() => setShowAutocomplete(false), 200)
                }}
                onKeyDown={e => {
                  const filtered = getFilteredSuggestions()
                  if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setSelectedIndex(prev => Math.max(prev - 1, -1))
                  } else if (e.key === 'Enter' && selectedIndex >= 0 && filtered[selectedIndex]) {
                    e.preventDefault()
                    selectSuggestion(filtered[selectedIndex])
                  } else if (e.key === 'Escape') {
                    setShowAutocomplete(false)
                  }
                }}
                placeholder="Bijv. Werk, Opvang, Thuis..."
                className="input-field w-full"
                required
              />
              {showAutocomplete && getFilteredSuggestions().length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-soft-lg border border-gray-100 max-h-48 overflow-y-auto">
                  {getFilteredSuggestions().map((name, idx) => (
                    <button
                      key={name}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault()
                        selectSuggestion(name)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        idx === selectedIndex
                          ? 'bg-pastel-mint/30 text-accent-mint'
                          : 'text-gray-700 hover:bg-gray-50'
                      } ${idx === 0 ? 'rounded-t-xl' : ''} ${idx === getFilteredSuggestions().length - 1 ? 'rounded-b-xl' : ''}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Frequentie</label>
            <div className="flex gap-2">
              {INTERVALS.map(iv => (
                <button
                  key={iv.value}
                  type="button"
                  onClick={() => setIntervalWeeks(iv.value)}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                    intervalWeeks === iv.value
                      ? 'bg-accent-mint text-white shadow-soft'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {iv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference date (only for bi-weekly) */}
          {intervalWeeks > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Referentiedatum</label>
              <input
                type="date"
                value={referenceDate}
                onChange={e => setReferenceDate(e.target.value)}
                className="input-field"
              />
              <p className="text-xs text-gray-400 mt-1">
                Een datum waarop dit schema wel van toepassing is (bepaalt welke weken)
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !label.trim() || !userId}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isEditing ? 'Wijzigingen opslaan' : 'Toevoegen'}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="w-full py-3 text-red-500 font-medium text-sm hover:bg-red-50 rounded-xl transition-colors"
            >
              Item verwijderen
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
