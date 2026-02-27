import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { getUserColor } from '../lib/colors'
import DagschemaModal from './DagschemaModal'

const DAY_NAMES = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const DAY_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']

export default function DagschemaView({ users, onBack }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    try {
      const data = await api.getDailySchedules()
      setEntries(data)
    } catch (err) {
      console.error('Failed to load daily schedules:', err)
    }
    setLoading(false)
  }

  function groupByUser() {
    const groups = {}
    entries.forEach(entry => {
      if (!groups[entry.user_id]) {
        groups[entry.user_id] = {
          user_id: entry.user_id,
          user_name: entry.user_name,
          user_color: entry.user_color,
          entries: [],
        }
      }
      groups[entry.user_id].entries.push(entry)
    })

    // Sort entries within each user by day_of_week (Monday first)
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]
    Object.values(groups).forEach(group => {
      group.entries.sort((a, b) => dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week))
    })

    return Object.values(groups)
  }

  function formatInterval(entry) {
    if (entry.interval_weeks === 1) return 'Elke week'
    return 'Om de week'
  }

  const grouped = groupByUser()

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
          <button onClick={onBack} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800">Dagschema</h1>
            <p className="text-gray-400 text-xs">Wie is waar op welke dag</p>
          </div>

          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-4 pb-32">
        {grouped.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-pastel-lavender/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-pastel-lavenderDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400">Nog geen dagschema items</p>
            <p className="text-gray-300 text-sm mt-1">Druk op + om een item toe te voegen</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => {
              const user = users.find(u => u.id === group.user_id)
              const color = getUserColor(user || { color: group.user_color })

              return (
                <div key={group.user_id}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={`w-3 h-3 rounded-full ${color.dot}`} />
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      {group.user_name}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {group.entries.map(entry => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          setEditEntry(entry)
                          setShowModal(true)
                        }}
                        className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left transition-all hover:shadow-soft active:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl ${color.bgLight} flex items-center justify-center`}>
                              <span className={`text-sm font-bold ${color.text}`}>
                                {DAY_SHORT[entry.day_of_week]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{entry.label}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400">{DAY_NAMES[entry.day_of_week]}</span>
                                {entry.interval_weeks > 1 && (
                                  <>
                                    <span className="text-gray-300">·</span>
                                    <span className="text-xs text-gray-400">{formatInterval(entry)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setEditEntry(null)
          setShowModal(true)
        }}
        className="fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white rounded-2xl shadow-soft-lg flex items-center justify-center text-2xl active:scale-95 transition-all hover:shadow-soft-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <DagschemaModal
          onClose={() => {
            setShowModal(false)
            setEditEntry(null)
          }}
          users={users}
          editEntry={editEntry}
          onSaved={loadEntries}
        />
      )}
    </div>
  )
}
