import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useToast } from '../lib/toast'
import { STATUS_COLORS, getStatusColor } from '../lib/colors'

const DAY_NAMES = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']

function formatDateISO(d) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const dayName = DAY_NAMES[date.getDay()]

  if (date.getTime() === today.getTime()) return `Vandaag — ${dayName}`
  if (date.getTime() === tomorrow.getTime()) return `Morgen — ${dayName}`

  return `${dayName} ${d} ${date.toLocaleDateString('nl-NL', { month: 'long' })}`
}

function isToday(dateStr) {
  return dateStr === formatDateISO(new Date())
}

function isTomorrow(dateStr) {
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return dateStr === formatDateISO(t)
}

export default function AgendaView({ onBack }) {
  const toast = useToast()
  const [events, setEvents] = useState([])
  const [statuses, setStatuses] = useState({})
  const [lastSynced, setLastSynced] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [convertForm, setConvertForm] = useState(null) // { eventId, date, label, color }

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    try {
      const today = formatDateISO(new Date())
      const data = await api.getCalendarEvents(today)
      setEvents(data.events || [])
      setStatuses(data.statuses || {})
      setLastSynced(data.last_synced_at || null)
    } catch (err) {
      console.error('Failed to load calendar events:', err)
      toast.error('Agenda laden mislukt')
    }
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await api.syncCalendar()
      toast.success(`${result.synced} events gesynchroniseerd`)
      await loadEvents()
    } catch (err) {
      console.error('Calendar sync failed:', err)
      toast.error('Synchronisatie mislukt')
    }
    setSyncing(false)
  }

  async function handleConvert() {
    if (!convertForm || !convertForm.label.trim()) return
    try {
      await api.createDayStatus({
        date: convertForm.date,
        label: convertForm.label.trim(),
        color: convertForm.color,
      })
      toast.success('Status toegevoegd')
      setConvertForm(null)
      await loadEvents() // Refresh to show the new pill
    } catch (err) {
      console.error('Failed to create day status:', err)
      toast.error('Status toevoegen mislukt')
    }
  }

  // Group events by date
  const grouped = {}
  for (const event of events) {
    const date = event.start_date
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(event)
  }
  const dates = Object.keys(grouped).sort()

  function formatSyncTime(ts) {
    if (!ts) return 'Nog niet gesynchroniseerd'
    const d = new Date(ts + 'Z') // SQLite datetime is UTC
    return d.toLocaleString('nl-NL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-cream">
        <div className="px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 py-3">
            <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-white/60 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Agenda</h1>
          </div>
        </div>
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin w-6 h-6 text-accent-mint" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pastel-cream pb-24">
      {/* Header */}
      <div className="px-4 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-xl hover:bg-white/60 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Agenda</h1>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white shadow-card text-sm text-gray-600 active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
        </div>

        {/* Last synced timestamp */}
        <p className="text-[11px] text-gray-400 px-1 -mt-1 mb-3">
          Laatste sync: {formatSyncTime(lastSynced)}
        </p>
      </div>

      {/* Events grouped by date */}
      <div className="px-4 space-y-4">
        {dates.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-card">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Geen aankomende events</p>
            <p className="text-gray-300 text-xs mt-1">Stel een iCal URL in via manage.sh</p>
          </div>
        ) : (
          dates.map(dateStr => {
            const dayEvents = grouped[dateStr]
            const dayStatuses = statuses[dateStr] || []
            const today = isToday(dateStr)
            const tomorrow = isTomorrow(dateStr)

            return (
              <div key={dateStr}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-2">
                  <h2 className={`text-sm font-semibold ${today ? 'text-accent-mint' : tomorrow ? 'text-gray-700' : 'text-gray-500'}`}>
                    {formatDateLabel(dateStr)}
                  </h2>
                  {dayStatuses.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {dayStatuses.map(s => {
                        const sc = getStatusColor(s.color)
                        return (
                          <div key={s.id} className="flex items-center gap-1 bg-white/70 shadow-card px-2 py-0.5 rounded-lg">
                            <div className={`w-3 h-3 rounded-full ${sc.swatch}`} />
                            <span className="text-[10px] text-gray-500">{s.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Event cards */}
                <div className="space-y-1.5">
                  {dayEvents.map(event => {
                    const isConverting = convertForm?.eventId === event.id

                    return (
                      <div
                        key={event.id}
                        className="bg-white rounded-2xl shadow-card overflow-hidden"
                      >
                        <div className="px-4 py-3 flex items-start gap-3">
                          {/* Time indicator or all-day badge */}
                          <div className="flex-shrink-0 pt-0.5">
                            {event.all_day ? (
                              <span className="text-[10px] font-medium text-accent-lavender bg-pastel-lavender/30 px-1.5 py-0.5 rounded">
                                hele dag
                              </span>
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-pastel-sky mt-1.5" />
                            )}
                          </div>

                          {/* Event details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 leading-snug">{event.summary}</p>
                            {event.location && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{event.location}</p>
                            )}
                          </div>

                          {/* Convert to pill button */}
                          <button
                            onClick={() => {
                              if (isConverting) {
                                setConvertForm(null)
                              } else {
                                setConvertForm({
                                  eventId: event.id,
                                  date: event.start_date,
                                  label: event.summary,
                                  color: 'mint',
                                })
                              }
                            }}
                            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                              isConverting
                                ? 'bg-pastel-mint/30 text-accent-mint'
                                : 'hover:bg-gray-50 text-gray-300'
                            }`}
                            title="Toevoegen als dagstatus"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>

                        {/* Convert form (inline) */}
                        {isConverting && (
                          <div className="px-4 pb-3 space-y-2 border-t border-gray-50 pt-2">
                            <input
                              type="text"
                              value={convertForm.label}
                              onChange={e => setConvertForm(f => ({ ...f, label: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && convertForm.label.trim()) handleConvert()
                                if (e.key === 'Escape') setConvertForm(null)
                              }}
                              placeholder="Status label..."
                              className="w-full text-sm px-3 py-2 rounded-xl bg-gray-50 border-0 focus:bg-white focus:ring-2 focus:ring-accent-mint/30 outline-none transition-colors"
                              autoFocus
                            />

                            {/* Color swatches */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                {STATUS_COLORS.map(c => (
                                  <button
                                    key={c.key}
                                    onClick={() => setConvertForm(f => ({ ...f, color: c.key }))}
                                    className={`w-6 h-6 rounded-full ${c.swatch} transition-all ${
                                      convertForm.color === c.key
                                        ? 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                                        : 'opacity-60 hover:opacity-100'
                                    }`}
                                  />
                                ))}
                              </div>

                              <div className="flex-1" />

                              {/* Preview */}
                              {convertForm.label.trim() && (
                                <div className="flex items-center gap-1.5 bg-white/70 shadow-card px-2 py-1 rounded-lg">
                                  <div className={`w-3.5 h-3.5 rounded-full ${getStatusColor(convertForm.color).swatch}`} />
                                  <span className="text-xs text-gray-500">{convertForm.label.trim()}</span>
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => setConvertForm(null)}
                                className="flex-1 py-2 text-sm text-gray-400 rounded-xl hover:bg-gray-50 transition-colors"
                              >
                                Annuleren
                              </button>
                              <button
                                onClick={handleConvert}
                                disabled={!convertForm.label.trim()}
                                className="flex-1 py-2 text-sm font-medium text-white bg-accent-mint rounded-xl active:scale-[0.97] transition-transform disabled:opacity-50"
                              >
                                Toevoegen
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
          })
        )}
      </div>
    </div>
  )
}
