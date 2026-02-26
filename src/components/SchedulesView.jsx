import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { getUserColor, BOTH_COLOR } from '../lib/colors'
import ScheduleModal from './ScheduleModal'
import Confetti from './Confetti'

export default function SchedulesView({ currentUser, users, onOpenMenu, presentationMode, onTogglePresentation }) {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSchedule, setEditSchedule] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'overdue' | 'due' | 'upcoming'

  useEffect(() => {
    loadSchedules()

    function handleVisibilityChange() {
      if (!document.hidden) loadSchedules()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  async function loadSchedules() {
    try {
      const data = await api.getSchedules()
      setSchedules(data)
    } catch (err) {
      console.error('Failed to load schedules:', err)
    }
    setLoading(false)
  }

  function getStatus(schedule) {
    if (!schedule.next_date) return { status: 'upcoming', days_remaining: 999 }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextDate = new Date(schedule.next_date + 'T00:00:00')
    const diffMs = nextDate - today
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { status: 'overdue', days_remaining: diffDays }
    if (diffDays === 0) return { status: 'due', days_remaining: 0 }
    return { status: 'upcoming', days_remaining: diffDays }
  }

  function getEnrichedSchedules() {
    return schedules.map(s => {
      const { status, days_remaining } = getStatus(s)
      return { ...s, status, days_remaining }
    })
  }

  function getFilteredSchedules() {
    const enriched = getEnrichedSchedules()
    if (filter === 'all') return enriched
    return enriched.filter(s => s.status === filter)
  }

  function groupByCategory(scheduleList) {
    const groups = {}
    const uncategorized = []

    scheduleList.forEach(s => {
      if (s.category) {
        if (!groups[s.category]) groups[s.category] = []
        groups[s.category].push(s)
      } else {
        uncategorized.push(s)
      }
    })

    const statusOrder = { overdue: 0, due: 1, upcoming: 2 }
    const sortItems = (a, b) => {
      const orderDiff = statusOrder[a.status] - statusOrder[b.status]
      if (orderDiff !== 0) return orderDiff
      return a.days_remaining - b.days_remaining
    }

    const result = []
    Object.keys(groups).sort().forEach(cat => {
      result.push({ category: cat, schedules: groups[cat].sort(sortItems) })
    })
    if (uncategorized.length > 0) {
      result.push({ category: '', schedules: uncategorized.sort(sortItems) })
    }
    return result
  }

  async function handleComplete(schedule) {
    if (!schedule.next_date) return
    // We need to find the actual task to complete it. The schedule's next_date
    // corresponds to the current pending task. We need its ID.
    // Fetch tasks for that date range to find it.
    try {
      const { tasks } = await api.getTasks(schedule.next_date, schedule.next_date)
      const task = tasks.find(t => t.schedule_id === schedule.id && !t.completed_at)
      if (task) {
        await api.completeTask(task.id, currentUser.id)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2000)
        loadSchedules()
      }
    } catch (err) {
      console.error('Failed to complete task:', err)
    }
  }

  const enriched = getEnrichedSchedules()
  const filtered = getFilteredSchedules()
  const grouped = groupByCategory(filtered)

  const counts = {
    all: enriched.length,
    overdue: enriched.filter(s => s.status === 'overdue').length,
    due: enriched.filter(s => s.status === 'due').length,
    upcoming: enriched.filter(s => s.status === 'upcoming').length,
  }

  function getStatusBadge(schedule) {
    if (schedule.status === 'overdue') {
      const days = Math.abs(schedule.days_remaining)
      return (
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          {days} {days === 1 ? 'dag' : 'dagen'} te laat
        </span>
      )
    }
    if (schedule.status === 'due') {
      return (
        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          Vandaag
        </span>
      )
    }
    const days = schedule.days_remaining
    return (
      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
        over {days} {days === 1 ? 'dag' : 'dagen'}
      </span>
    )
  }

  function formatInterval(days) {
    if (days === 1) return 'Elke dag'
    if (days === 7) return 'Elke week'
    if (days === 14) return 'Elke 2 weken'
    if (days === 21) return 'Elke 3 weken'
    if (days === 28) return 'Elke 4 weken'
    if (days === 30) return 'Elke maand'
    if (days === 60) return 'Elke 2 maanden'
    if (days === 90) return 'Elke 3 maanden'
    return `Elke ${days} dagen`
  }

  function getAssignmentLabel(schedule) {
    if (schedule.is_both) return 'Samen'
    if (schedule.assigned_to_name) return schedule.assigned_to_name
    return null
  }

  const FILTERS = [
    { key: 'all', label: 'Alle' },
    { key: 'overdue', label: 'Te laat', dot: 'bg-red-400' },
    { key: 'due', label: 'Vandaag', dot: 'bg-amber-400' },
    { key: 'upcoming', label: 'Binnenkort', dot: 'bg-gray-300' },
  ]

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
      {showConfetti && <Confetti />}

      <div className="sticky top-0 z-40 glass border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onOpenMenu} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-800">Schema's</h1>
            {counts.overdue > 0 && (
              <p className="text-xs text-red-500 font-medium mt-0.5">
                {counts.overdue} {counts.overdue === 1 ? 'taak' : 'taken'} te laat
              </p>
            )}
          </div>
          
          <button onClick={onTogglePresentation} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors" title="Presentatie modus">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-1.5 bg-white/60 p-1.5 rounded-2xl">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`filter-btn flex items-center justify-center gap-1.5 ${
                  filter === f.key
                    ? 'bg-accent-mint text-white shadow-soft'
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
                {f.label}
                {counts[f.key] > 0 && (
                  <span className={`text-xs ${filter === f.key ? 'text-white/70' : 'text-gray-400'}`}>
                    {counts[f.key]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 pb-32">
        {grouped.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-pastel-lavender/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-pastel-lavenderDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-gray-400">
              {filter === 'all' ? "Nog geen schema's" : 'Geen taken met deze status'}
            </p>
            {filter === 'all' && (
              <p className="text-gray-300 text-sm mt-1">Druk op + om een schema toe te voegen</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.category || '__uncategorized'}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  {group.category || 'Overig'}
                </h2>
                <div className="space-y-2">
                  {group.schedules.map(schedule => {
                    const assignmentLabel = getAssignmentLabel(schedule)
                    const assignedUser = users.find(u => u.id === schedule.assigned_to)
                    const colorClasses = schedule.is_both
                      ? BOTH_COLOR
                      : assignedUser
                        ? getUserColor(assignedUser)
                        : null

                    return (
                      <div
                        key={schedule.id}
                        className={`bg-white rounded-2xl shadow-sm border transition-all ${
                          schedule.status === 'overdue'
                            ? 'border-red-200'
                            : schedule.status === 'due'
                            ? 'border-amber-200'
                            : 'border-gray-100'
                        }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <button
                                onClick={() => handleComplete(schedule)}
                                className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                  schedule.status === 'overdue'
                                    ? 'border-red-300 hover:bg-red-50'
                                    : schedule.status === 'due'
                                    ? 'border-amber-300 hover:bg-amber-50'
                                    : 'border-gray-300 hover:bg-gray-50'
                                }`}
                                title="Markeer als gedaan"
                              >
                                <svg className={`w-3 h-3 ${
                                  schedule.status === 'overdue' ? 'text-red-300' : schedule.status === 'due' ? 'text-amber-300' : 'text-gray-300'
                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800">{schedule.title}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  {getStatusBadge(schedule)}
                                  <span className="text-xs text-gray-400">{formatInterval(schedule.interval_days)}</span>
                                  {assignmentLabel && colorClasses && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClasses.bgLight} ${colorClasses.text}`}>
                                      {assignmentLabel}
                                    </span>
                                  )}
                                </div>
                                {schedule.completed_count > 0 && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {schedule.completed_count}x voltooid
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setEditSchedule(schedule)
                                setShowModal(true)
                              }}
                              className="p-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {schedule.status === 'overdue' && (
                          <div className="px-4 pb-3">
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-400 rounded-full"
                                style={{ width: `${Math.min(100, (Math.abs(schedule.days_remaining) / schedule.interval_days) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => {
          setEditSchedule(null)
          setShowModal(true)
        }}
        className="fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white rounded-2xl shadow-soft-lg flex items-center justify-center text-2xl active:scale-95 transition-all hover:shadow-soft-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <ScheduleModal
          onClose={() => {
            setShowModal(false)
            setEditSchedule(null)
          }}
          currentUser={currentUser}
          users={users}
          editSchedule={editSchedule}
          onSaved={loadSchedules}
        />
      )}
    </div>
  )
}
