import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const DAY_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

function formatDateISO(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDays() {
  const days = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    days.push(d)
  }
  return days
}

export default function MealsView({ onOpenMenu, presentationMode, onTogglePresentation }) {
  const [meals, setMeals] = useState([])
  const [dailyEntries, setDailyEntries] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingDate, setEditingDate] = useState(null)
  const [editingMealId, setEditingMealId] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)

  const days = getDays()

  useEffect(() => {
    loadMeals()
    loadSuggestions()

    function handleVisibilityChange() {
      if (!document.hidden) {
        loadMeals()
        loadSuggestions()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  async function loadMeals() {
    const from = formatDateISO(days[0])
    const to = formatDateISO(days[6])
    try {
      const [data, entriesData] = await Promise.all([
        api.getMeals(from, to),
        api.getDailyScheduleEntries(from, to),
      ])
      setMeals(data)
      setDailyEntries(entriesData || {})
    } catch (err) {
      console.error('Failed to load meals:', err)
    }
    setLoading(false)
  }

  async function loadSuggestions() {
    try {
      const data = await api.getMealSuggestions()
      setSuggestions(data)
    } catch (err) {
      console.error('Failed to load suggestions:', err)
    }
  }

  function getFilteredSuggestions() {
    const query = inputValue.trim().toLowerCase()
    if (!query) return suggestions
    return suggestions.filter(s => s.toLowerCase().includes(query))
  }

  function getMealForDate(dateStr) {
    return meals.find(m => m.date === dateStr)
  }

  function startAdding(dateStr) {
    setEditingDate(dateStr)
    setEditingMealId(null)
    setInputValue('')
    setShowAutocomplete(true)
    setSelectedIndex(-1)
  }

  function startEditing(meal) {
    setEditingDate(meal.date)
    setEditingMealId(meal.id)
    setInputValue(meal.meal_name)
    setShowAutocomplete(false)
    setSelectedIndex(-1)
  }

  function cancelEditing() {
    setEditingDate(null)
    setEditingMealId(null)
    setInputValue('')
    setShowAutocomplete(false)
    setSelectedIndex(-1)
  }

  function selectSuggestion(name) {
    setInputValue(name)
    setShowAutocomplete(false)
    setSelectedIndex(-1)
  }

  async function handleSave(dateStr) {
    if (!inputValue.trim()) return

    try {
      if (editingMealId) {
        await api.updateMeal(editingMealId, { meal_name: inputValue.trim() })
      } else {
        await api.createMeal({ date: dateStr, meal_name: inputValue.trim() })
      }
      cancelEditing()
      loadMeals()
      loadSuggestions()
    } catch (err) {
      console.error('Failed to save meal:', err)
    }
  }

  async function handleDelete(mealId) {
    try {
      await api.deleteMeal(mealId)
      loadMeals()
    } catch (err) {
      console.error('Failed to delete meal:', err)
    }
  }

  function isToday(date) {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  function getDailyEntriesForDate(dateStr) {
    return dailyEntries[dateStr] || []
  }

  function renderDailyScheduleSummary(dateStr) {
    const entries = getDailyEntriesForDate(dateStr)
    if (entries.length === 0) return null

    const byUser = {}
    entries.forEach(e => {
      if (!byUser[e.user_name]) byUser[e.user_name] = []
      byUser[e.user_name].push(e.label)
    })

    return (
      <div className="flex items-center gap-2 mt-2">
        <svg className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-indigo-600">
          {Object.entries(byUser).map(([name, labels]) => `${name}: ${labels.join(', ')}`).join(' | ')}
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-cream flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-pastel-mint" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pastel-cream overflow-x-hidden">
      <div className="sticky top-0 z-40 glass border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onOpenMenu} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800">Eten plannen</h1>
            <p className="text-gray-400 text-xs">Komende 7 dagen</p>
          </div>

          <button onClick={onTogglePresentation} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors" title="Presentatie modus">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-4 pb-32 space-y-2">
        {days.map(date => {
          const dateStr = formatDateISO(date)
          const meal = getMealForDate(dateStr)
          const today = isToday(date)
          const isEditing = editingDate === dateStr

          return (
            <div
              key={dateStr}
              className={`bg-white rounded-2xl px-4 py-3 transition-all ${
                today ? 'shadow-soft ring-2 ring-accent-mint/30' : 'shadow-card'
              }`}
            >
              {/* Day header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center ${
                    today
                      ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                    <span className={`text-[10px] font-semibold leading-none ${today ? 'text-white/80' : 'text-gray-400'}`}>
                      {DAY_SHORT[date.getDay()]}
                    </span>
                    <span className="text-sm font-bold leading-tight">
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${today ? 'text-accent-mint' : 'text-gray-700'}`}>
                      {DAY_NAMES[date.getDay()]}
                      {today && <span className="text-xs text-accent-mint/70 ml-1.5 font-normal">vandaag</span>}
                    </p>
                    {meal && !isEditing && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
                        </svg>
                        <button
                          onClick={() => startEditing(meal)}
                          className="text-xs text-amber-800 font-medium hover:text-amber-600 transition-colors truncate"
                        >
                          {meal.meal_name}
                        </button>
                        <button
                          onClick={() => handleDelete(meal.id)}
                          className="p-0.5 text-gray-300 hover:text-red-400 rounded transition-colors flex-shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {!meal && !isEditing && renderDailyScheduleSummary(dateStr)}
                  </div>
                </div>

                {!meal && !isEditing && (
                  <button
                    onClick={() => startAdding(dateStr)}
                    className="p-2 rounded-xl hover:bg-gray-50 text-gray-300 hover:text-accent-mint transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Show dagschema below meal when both exist */}
              {meal && !isEditing && renderDailyScheduleSummary(dateStr)}

              {/* Editing form */}
              {isEditing && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={e => {
                          setInputValue(e.target.value)
                          setShowAutocomplete(true)
                          setSelectedIndex(-1)
                        }}
                        onFocus={() => {
                          setShowAutocomplete(true)
                          setSelectedIndex(-1)
                        }}
                        onKeyDown={e => {
                          const filtered = getFilteredSuggestions()
                          if (e.key === 'ArrowDown') {
                            e.preventDefault()
                            setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault()
                            setSelectedIndex(prev => Math.max(prev - 1, -1))
                          } else if (e.key === 'Enter') {
                            if (selectedIndex >= 0 && filtered[selectedIndex]) {
                              selectSuggestion(filtered[selectedIndex])
                            } else {
                              handleSave(dateStr)
                            }
                          } else if (e.key === 'Escape') {
                            if (showAutocomplete) {
                              setShowAutocomplete(false)
                            } else {
                              cancelEditing()
                            }
                          }
                        }}
                        placeholder="Wat eten we?"
                        className="input-field w-full"
                        autoFocus
                      />
                      {showAutocomplete && getFilteredSuggestions().length > 0 && (
                        <div
                          ref={autocompleteRef}
                          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-soft-lg border border-gray-100 max-h-48 overflow-y-auto"
                        >
                          {getFilteredSuggestions().map((name, idx) => (
                            <button
                              key={name}
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
                    <button
                      onClick={() => handleSave(dateStr)}
                      disabled={!inputValue.trim()}
                      className="px-4 py-2 bg-accent-mint text-white rounded-xl font-medium text-sm disabled:opacity-40 transition-all hover:opacity-90"
                    >
                      {editingMealId ? 'Opslaan' : 'Toevoegen'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-3 py-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
