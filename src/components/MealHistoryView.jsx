import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const PAGE_SIZE = 60

const DAY_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function monthLabel(dateStr) {
  const [year, month] = dateStr.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function groupByMonth(meals) {
  const groups = []
  meals.forEach(meal => {
    const label = monthLabel(meal.date)
    const current = groups[groups.length - 1]
    if (current && current.label === label) {
      current.meals.push(meal)
    } else {
      groups.push({ label, meals: [meal] })
    }
  })
  return groups
}

export default function MealHistoryView({ onBack }) {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(null)
  const [loadMoreError, setLoadMoreError] = useState(null)

  useEffect(() => {
    loadFirstPage()
  }, [])

  async function loadFirstPage() {
    setLoading(true)
    setError(null)
    setLoadMoreError(null)
    try {
      const page = await api.getMealHistory({ limit: PAGE_SIZE })
      setMeals(page)
      setHasMore(page.length === PAGE_SIZE)
    } catch (err) {
      console.error('Failed to load meal history:', err)
      setError('Geschiedenis laden mislukt')
    }
    setLoading(false)
  }

  async function loadMore() {
    const oldest = meals[meals.length - 1]
    if (!oldest || loadingMore) return

    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await api.getMealHistory({ before: oldest.date, limit: PAGE_SIZE })
      setMeals(prev => [...prev, ...page])
      setHasMore(page.length === PAGE_SIZE)
    } catch (err) {
      console.error('Failed to load more meal history:', err)
      setLoadMoreError('Meer laden mislukt')
    }
    setLoadingMore(false)
  }

  function loadMoreLabel() {
    if (loadingMore) return 'Laden…'
    if (loadMoreError) return 'Opnieuw proberen'
    return 'Meer laden'
  }

  const groups = groupByMonth(meals)

  return (
    <div className="min-h-screen bg-pastel-cream overflow-x-hidden">
      <div className="sticky top-0 z-40 glass border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800">Gegeten</h1>
            <p className="text-gray-400 text-xs">Wat we de afgelopen tijd aten</p>
          </div>

          {/* Spacer to balance the back button */}
          <div className="w-10" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <svg className="animate-spin w-8 h-8 text-pastel-mint" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <div className="px-4 py-4 pb-32 space-y-5">
          {error && (
            <div className="text-center space-y-2 py-16">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={loadFirstPage}
                className="px-4 py-2 rounded-xl bg-accent-mint/10 text-accent-mint text-sm font-medium transition-colors active:bg-accent-mint/20"
              >
                Opnieuw proberen
              </button>
            </div>
          )}

          {meals.length === 0 && !error && (
            <p className="text-sm text-gray-400 text-center py-16">Nog niets in de geschiedenis</p>
          )}

          {groups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">
                {group.label}
              </p>
              <div className="bg-white rounded-2xl shadow-card divide-y divide-gray-50">
                {group.meals.map(meal => {
                  const date = parseDate(meal.date)
                  return (
                    <div key={meal.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold leading-none text-gray-400">
                          {DAY_SHORT[date.getDay()]}
                        </span>
                        <span className="text-sm font-bold leading-tight">{date.getDate()}</span>
                      </div>
                      <p className="text-[15px] text-gray-800 font-medium min-w-0 flex-1 truncate">
                        {meal.meal_name}
                      </p>
                      {meal.times_eaten > 1 && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg flex-shrink-0">
                          {meal.times_eaten}×
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {loadMoreError && (
            <p className="text-sm text-red-400 text-center">{loadMoreError}</p>
          )}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl bg-accent-mint/10 text-accent-mint text-sm font-medium disabled:opacity-40 transition-colors active:bg-accent-mint/20"
            >
              {loadMoreLabel()}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
