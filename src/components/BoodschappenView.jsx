import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { api } from '../lib/api'

const DAY_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

function formatDateISO(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Tiny component for a Bring! item image with fallback */
function ItemImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
    )
  }
  return (
    <div className={`bg-accent-mint/70 rounded-lg flex items-center justify-center ${className}`}>
      <img
        src={src}
        alt={alt}
        className="w-3/4 h-3/4 object-contain"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  )
}

export default function BoodschappenView({ onOpenMenu }) {
  const [items, setItems] = useState([])
  const [recentItems, setRecentItems] = useState([])
  const [meals, setMeals] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const [inputSpec, setInputSpec] = useState('')
  const [showSpec, setShowSpec] = useState(false)
  const [completing, setCompleting] = useState({})
  const [showRecent, setShowRecent] = useState(() => {
    try { return localStorage.getItem('boodschappen:showRecent') === 'true' } catch { return false }
  })
  const [showMeals, setShowMeals] = useState(() => {
    try { return localStorage.getItem('boodschappen:showMeals') === 'true' } catch { return false }
  })
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const [acSelected, setAcSelected] = useState(-1)
  const inputRef = useRef(null)
  const specRef = useRef(null)
  const inputBarRef = useRef(null)

  // Persist collapsed/expanded state
  useEffect(() => {
    try { localStorage.setItem('boodschappen:showRecent', String(showRecent)) } catch {}
  }, [showRecent])
  useEffect(() => {
    try { localStorage.setItem('boodschappen:showMeals', String(showMeals)) } catch {}
  }, [showMeals])

  // Track keyboard open/close via visualViewport to move input bar up
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function onViewportChange() {
      // On iOS, when keyboard is open and user scrolls, vv.offsetTop changes
      // as the browser pans the visual viewport within the layout viewport.
      // We need to account for this to keep the input bar pinned correctly.
      const keyboardH = window.innerHeight - vv.height - vv.offsetTop
      setKeyboardOffset(keyboardH > 50 ? keyboardH : 0)
    }
    vv.addEventListener('resize', onViewportChange)
    vv.addEventListener('scroll', onViewportChange)
    return () => {
      vv.removeEventListener('resize', onViewportChange)
      vv.removeEventListener('scroll', onViewportChange)
    }
  }, [])

  // Duplicate detection
  const duplicateMatch = useMemo(() => {
    const q = inputValue.trim().toLowerCase()
    if (q.length < 2) return null
    return items.find(item => item.itemId.toLowerCase().includes(q))
  }, [inputValue, items])

  // Autocomplete suggestions from catalog
  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase()
    if (q.length < 2 || !catalog.length) return []
    // Filter catalog items matching the query, exclude items already on the list
    const onList = new Set(items.map(i => i.itemId.toLowerCase()))
    return catalog
      .filter(c => c.name.toLowerCase().includes(q) && !onList.has(c.name.toLowerCase()))
      .slice(0, 5)
  }, [inputValue, catalog, items])

  // Reset autocomplete selection when suggestions change
  useEffect(() => { setAcSelected(-1) }, [suggestions])

  useEffect(() => {
    loadItems()
    loadMeals()
    loadCatalog()

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

  /** Background sync — silently refreshes, never sets error/loading */
  function syncItems() {
    api.getBringItems()
      .then(data => {
        setItems(data.purchase || [])
        setRecentItems(data.recently || [])
      })
      .catch(() => {}) // silent
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
      console.error('Failed to load meals:', err)
    }
  }

  async function loadCatalog() {
    try {
      const data = await api.getBringCatalog()
      setCatalog(data || [])
    } catch (err) {
      console.error('Failed to load catalog:', err)
    }
  }

  const handleAdd = useCallback((nameOverride, catalogItem) => {
    const name = (nameOverride || inputValue).trim()
    const spec = inputSpec.trim()
    if (!name) return

    // Try to find image from catalog if we got a suggestion object
    const imageUrl = catalogItem?.imageUrl || null

    // Optimistic: insert ghost item at top immediately
    const ghostId = `_ghost_${Date.now()}`
    const ghost = {
      uuid: ghostId,
      itemId: name,
      specification: spec,
      imageUrl,
      _ghost: true,
    }
    setItems(prev => [ghost, ...prev])

    // Clear input instantly
    setInputValue('')
    setInputSpec('')
    setShowSpec(false)
    inputRef.current?.focus()

    // Fire API in background, then sync to reconcile
    api.addBringItem(name, spec)
      .then(() => syncItems())
      .catch(err => {
        console.error('Failed to add item:', err)
        // Remove ghost on failure
        setItems(prev => prev.filter(i => i.uuid !== ghostId))
      })
  }, [inputValue, inputSpec])

  function handleSelectSuggestion(suggestion) {
    handleAdd(suggestion.name, suggestion)
  }

  function handleComplete(item) {
    // Optimistic: start completing animation, then remove from list
    setCompleting(prev => ({ ...prev, [item.uuid]: true }))

    // Remove after short animation
    setTimeout(() => {
      setItems(prev => prev.filter(i => i.uuid !== item.uuid))
      setCompleting(prev => {
        const next = { ...prev }
        delete next[item.uuid]
        return next
      })
    }, 300)

    // Fire API in background, then sync
    api.completeBringItem(item.itemId, item.uuid)
      .then(() => syncItems())
      .catch(err => {
        console.error('Failed to complete item:', err)
        // Re-add on failure
        setItems(prev => [item, ...prev])
        setCompleting(prev => {
          const next = { ...prev }
          delete next[item.uuid]
          return next
        })
      })
  }

  function handleRemove(item) {
    // Optimistic: remove immediately
    setItems(prev => prev.filter(i => i.uuid !== item.uuid))

    api.removeBringItem(item.itemId, item.uuid)
      .then(() => syncItems())
      .catch(err => {
        console.error('Failed to remove item:', err)
        setItems(prev => [item, ...prev])
      })
  }

  function handleReAdd(item) {
    // Optimistic: move from recent to purchase immediately
    setRecentItems(prev => prev.filter(i => i.uuid !== item.uuid))
    const ghost = { ...item, _ghost: true }
    setItems(prev => [ghost, ...prev])

    api.addBringItem(item.itemId, item.specification || '')
      .then(() => syncItems())
      .catch(err => {
        console.error('Failed to re-add item:', err)
        // Revert: move back to recent
        setItems(prev => prev.filter(i => i.uuid !== item.uuid))
        setRecentItems(prev => [item, ...prev])
      })
  }

  function handleInputKeyDown(e) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setAcSelected(prev => Math.min(prev + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setAcSelected(prev => Math.max(prev - 1, -1))
        return
      }
      if (e.key === 'Enter' && acSelected >= 0) {
        e.preventDefault()
        handleSelectSuggestion(suggestions[acSelected])
        return
      }
    }
    if (e.key === 'Enter') handleAdd()
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
          {/* Upcoming meals - collapsible */}
          {meals.length > 0 && (() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayISO = formatDateISO(today)
            const todayMeal = meals.find(m => m.date === todayISO)
            return (
              <button
                onClick={() => setShowMeals(!showMeals)}
                className="w-full bg-white/70 rounded-2xl shadow-card px-4 py-2.5 text-left"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showMeals ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Maaltijden</p>
                  {!showMeals && todayMeal && (
                    <p className="text-xs text-gray-500 truncate ml-auto">
                      <span className="text-accent-mint font-semibold">Nu</span>{' '}
                      {todayMeal.meal_name}
                    </p>
                  )}
                </div>
                {showMeals && (
                  <div className="space-y-1 mt-2">
                    {meals.map(meal => {
                      const mealDate = new Date(meal.date + 'T00:00:00')
                      const isToday = meal.date === todayISO
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
                )}
              </button>
            )
          })()}

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
              className={`rounded-2xl shadow-card px-3 py-2.5 flex items-center gap-3 transition-all duration-300 ${
                completing[item.uuid]
                  ? 'opacity-0 scale-95 -translate-x-4'
                  : item._ghost
                    ? 'bg-white/60 animate-pulse'
                    : 'bg-white'
              }`}
            >
              <button
                onClick={() => !item._ghost && handleComplete(item)}
                className="flex-shrink-0 relative"
                disabled={item._ghost}
              >
                {item._ghost && !item.imageUrl ? (
                  <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
                ) : (
                  <ItemImage
                    src={item.imageUrl}
                    alt={item.itemId}
                    className="w-9 h-9 rounded-lg"
                  />
                )}
                {completing[item.uuid] && (
                  <div className="absolute inset-0 bg-accent-mint/80 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${item._ghost ? 'text-gray-400' : 'text-gray-800'}`}>{item.itemId}</p>
                {item.specification && (
                  <p className="text-gray-400 text-xs truncate">{item.specification}</p>
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
                  className="bg-white/60 rounded-2xl shadow-card px-3 py-2.5 flex items-center gap-3"
                >
                  <div className="flex-shrink-0 relative opacity-40">
                    <ItemImage
                      src={item.imageUrl}
                      alt={item.itemId}
                      className="w-9 h-9 rounded-lg"
                    />
                    <div className="absolute inset-0 bg-pastel-mint/50 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-accent-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-400 font-medium text-sm line-through">{item.itemId}</p>
                    {item.specification && (
                      <p className="text-gray-300 text-xs truncate line-through">{item.specification}</p>
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
      <div
        ref={inputBarRef}
        className="fixed left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-gray-100 transition-[bottom] duration-100"
        style={{ bottom: keyboardOffset > 0 ? keyboardOffset : '4rem' }}
      >
        {/* Autocomplete suggestions */}
        {suggestions.length > 0 && (
          <div className="border-b border-gray-100">
            {suggestions.map((s, i) => (
              <button
                key={s.de}
                onClick={() => handleSelectSuggestion(s)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                  i === acSelected ? 'bg-accent-mint/10' : 'hover:bg-gray-50'
                }`}
              >
                <ItemImage
                  src={s.imageUrl}
                  alt={s.name}
                  className="w-7 h-7 rounded-md"
                />
                <span className="text-sm text-gray-700">{s.name}</span>
              </button>
            ))}
          </div>
        )}
        {duplicateMatch && !suggestions.length && (
          <div className="px-4 pt-2.5 pb-0.5 flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
              <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
            </svg>
            <p className="text-xs text-amber-500">
              <span className="font-medium">"{duplicateMatch.itemId}"</span> staat al op de lijst
            </p>
          </div>
        )}
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
            onKeyDown={handleInputKeyDown}
            placeholder="Toevoegen..."
            className="flex-1 text-sm px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-100 focus:outline-none focus:border-accent-mint/50 text-gray-800 placeholder-gray-300"
          />
          <button
            onClick={() => handleAdd()}
            disabled={!inputValue.trim()}
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
