import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

const DAY_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

function formatDateISO(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function BoodschappenView({ onOpenMenu }) {
  const [items, setItems] = useState([])
  const [recentItems, setRecentItems] = useState([])
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [inputSpec, setInputSpec] = useState('')
  const [showSpec, setShowSpec] = useState(false)
  const [adding, setAdding] = useState(false)
  const [completing, setCompleting] = useState({})
  const [showRecent, setShowRecent] = useState(false)
  const inputRef = useRef(null)
  const specRef = useRef(null)

  useEffect(() => {
    loadItems()
    loadMeals()

    function handleVisibilityChange() {
      if (!document.hidden) {
        loadItems()
        loadMeals()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  async function loadItems() {
    try {
      const data = await api.getBringItems()
      setItems(data.purchase || [])
      setRecentItems(data.recently || [])
      setError(null)
    } catch (err) {
      console.error('Failed to load shopping list:', err)
      setError('Kon boodschappenlijst niet laden')
    }
    setLoading(false)
  }

  async function loadMeals() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const end = new Date(today)
      end.setDate(today.getDate() + 6)
      const data = await api.getMeals(formatDateISO(today), formatDateISO(end))
      setMeals(data || [])
    } catch (err) {
      // Meals are non-critical, just ignore errors
      console.error('Failed to load meals:', err)
    }
  }

  async function handleAdd() {
    const name = inputValue.trim()
    if (!name || adding) return

    setAdding(true)
    try {
      await api.addBringItem(name, inputSpec.trim())
      setInputValue('')
      setInputSpec('')
      setShowSpec(false)
      await loadItems()
      window.scrollTo({ top: 0 })
      inputRef.current?.focus()
    } catch (err) {
      console.error('Failed to add item:', err)
    }
    setAdding(false)
  }

  async function handleComplete(item) {
    setCompleting(prev => ({ ...prev, [item.uuid]: true }))
    try {
      await api.completeBringItem(item.itemId, item.uuid)
      loadItems()
    } catch (err) {
      console.error('Failed to complete item:', err)
    }
    setCompleting(prev => ({ ...prev, [item.uuid]: false }))
  }

  async function handleRemove(item) {
    try {
      await api.removeBringItem(item.itemId, item.uuid)
      loadItems()
    } catch (err) {
      console.error('Failed to remove item:', err)
    }
  }

  async function handleReAdd(item) {
    try {
      await api.addBringItem(item.itemId, item.specification || '')
      loadItems()
    } catch (err) {
      console.error('Failed to re-add item:', err)
    }
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
            <h1 className="text-lg font-semibold text-gray-800">Boodschappen</h1>
            <p className="text-gray-400 text-xs">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="w-10" />
        </div>
      </div>

      {error ? (
        <div className="px-4 py-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => { setLoading(true); loadItems() }}
            className="mt-4 px-4 py-2 bg-accent-mint text-white rounded-xl text-sm font-medium"
          >
            Opnieuw proberen
          </button>
        </div>
      ) : (
        <div className="px-4 py-4 pb-44 space-y-3">
          {/* Upcoming meals - compact */}
          {meals.length > 0 && (
            <div className="bg-white/70 rounded-2xl shadow-card px-4 py-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Komende maaltijden</p>
              <div className="space-y-1">
                {meals.map(meal => {
                  const mealDate = new Date(meal.date + 'T00:00:00')
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const isToday = formatDateISO(mealDate) === formatDateISO(today)
                  return (
                    <div key={meal.id} className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-semibold w-6 flex-shrink-0 ${isToday ? 'text-accent-mint' : 'text-gray-400'}`}>
                        {isToday ? 'Nu' : DAY_SHORT[mealDate.getDay()]}
                      </span>
                      <span className={`text-sm truncate ${isToday ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                        {meal.meal_name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active shopping items */}
          {items.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-pastel-mint/30 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-accent-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-400">Boodschappenlijst is leeg</p>
              <p className="text-gray-300 text-sm mt-1">Typ hieronder om iets toe te voegen</p>
            </div>
          )}

          {items.map(item => (
            <div
              key={item.uuid}
              className={`bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3 transition-all ${
                completing[item.uuid] ? 'opacity-50 scale-95' : ''
              }`}
            >
              <button
                onClick={() => handleComplete(item)}
                className="w-6 h-6 rounded-full border-2 border-accent-mint flex-shrink-0 flex items-center justify-center hover:bg-pastel-mint/30 transition-colors"
              >
                {completing[item.uuid] && (
                  <svg className="w-4 h-4 text-accent-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 font-medium">{item.itemId}</p>
                {item.specification && (
                  <p className="text-gray-400 text-sm truncate">{item.specification}</p>
                )}
              </div>
            </div>
          ))}

          {/* Recently completed items (collapsible) */}
          {recentItems.length > 0 && (
            <>
              <button
                onClick={() => setShowRecent(!showRecent)}
                className="flex items-center gap-2 pt-4 w-full"
              >
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showRecent ? 'rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Recent afgevinkt ({recentItems.length})
                </p>
                <div className="flex-1 h-px bg-gray-200"></div>
              </button>

              {showRecent && recentItems.map(item => (
                <div
                  key={item.uuid}
                  className="bg-white/60 rounded-2xl shadow-card px-4 py-3 flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-pastel-mint/40 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-accent-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 font-medium line-through">{item.itemId}</p>
                    {item.specification && (
                      <p className="text-gray-300 text-sm truncate line-through">{item.specification}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleReAdd(item)}
                    className="p-1.5 text-gray-300 hover:text-accent-mint rounded-lg transition-colors"
                    title="Opnieuw toevoegen"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Fixed input bar above the tab bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-100">
        {showSpec && (
          <div className="px-4 pt-3">
            <input
              ref={specRef}
              type="text"
              value={inputSpec}
              onChange={e => setInputSpec(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setShowSpec(false); inputRef.current?.focus() }
              }}
              placeholder="Details (bijv. '2 liter')"
              className="w-full text-sm px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:border-accent-mint/50 text-gray-600 placeholder-gray-300"
            />
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => {
              setShowSpec(!showSpec)
              if (!showSpec) setTimeout(() => specRef.current?.focus(), 50)
            }}
            className={`p-2 rounded-xl transition-colors flex-shrink-0 ${showSpec ? 'bg-accent-mint/10 text-accent-mint' : 'text-gray-300 hover:text-gray-500'}`}
            title="Details toevoegen"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder="Toevoegen..."
            className="flex-1 text-sm px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:border-accent-mint/50 text-gray-800 placeholder-gray-300"
          />
          <button
            onClick={handleAdd}
            disabled={!inputValue.trim() || adding}
            className="p-2.5 rounded-xl bg-accent-mint text-white disabled:opacity-30 transition-all active:scale-95 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
