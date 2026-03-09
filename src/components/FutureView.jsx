import { useState, useEffect, useCallback } from 'react'
import { api, isMutationQueued } from '../lib/api'
import { useToast } from '../lib/toast'
import { getUserColor, BOTH_COLOR, getStatusColor, STATUS_COLORS } from '../lib/colors'
import useLiveSync from '../hooks/useLiveSync'
import TaskModal from './TaskModal'

const DAY_NAMES = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag']
const MIN_LOOKAHEAD_DAYS = 30

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

export default function FutureView({ currentUser, users, calendarEnabled, onOpenMenu, onComplete }) {
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [ghosts, setGhosts] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [dayStatuses, setDayStatuses] = useState({})
  const [dailyEntries, setDailyEntries] = useState({})
  const [loading, setLoading] = useState(true)
  const [editTask, setEditTask] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [eventAction, setEventAction] = useState(null) // { eventId, mode: 'choose'|'status'|'task', date, label, color }

  const loadData = useCallback(async () => {
    try {
      const today = new Date()
      const from = formatDateISO(today)
      const minTo = new Date(today)
      minTo.setDate(minTo.getDate() + MIN_LOOKAHEAD_DAYS)
      let toStr = formatDateISO(minTo)

      // Fetch calendar events first to determine the full range
      let allEvents = []
      if (calendarEnabled) {
        const calData = await api.getCalendarEvents(from)
        allEvents = calData.events || []
        // Extend range to cover the furthest calendar event
        if (allEvents.length > 0) {
          const maxEventDate = allEvents.reduce((max, e) => e.start_date > max ? e.start_date : max, allEvents[0].start_date)
          if (maxEventDate > toStr) toStr = maxEventDate
        }
      }

      const [taskData, statusData, entriesData] = await Promise.all([
        api.getTasks(from, toStr),
        api.getDayStatuses(from, toStr),
        api.getDailyScheduleEntries(from, toStr),
      ])

      setTasks(taskData.tasks || [])
      setGhosts(taskData.ghosts || [])
      setDayStatuses(statusData || {})
      setDailyEntries(entriesData || {})
      setCalendarEvents(allEvents)
    } catch (err) {
      console.error('Failed to load future data:', err)
      toast.error('Laden mislukt')
    }
    setLoading(false)
  }, [calendarEnabled])

  useEffect(() => {
    loadData()

    function handleVisibilityChange() {
      if (!document.hidden) loadData()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loadData])

  useLiveSync('tasks', loadData)
  useLiveSync('day-statuses', loadData)
  useLiveSync('daily-schedules', loadData)

  // --- Task actions ---
  async function handleCompleteTask(task) {
    if (!currentUser) return
    try {
      await api.completeTask(task.id, currentUser.id)
      if (onComplete) onComplete()
      loadData()
      toast.undo(
        `"${task.title}" afgerond`,
        async () => {
          try {
            await api.uncompleteTask(task.id)
            loadData()
          } catch (err) {
            console.error('Failed to undo complete:', err)
            toast.error('Ongedaan maken mislukt')
          }
        }
      )
    } catch (err) {
      console.error('Failed to complete task:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Afvinken mislukt')
      }
    }
  }

  async function handleUncompleteTask(task) {
    try {
      await api.uncompleteTask(task.id)
      loadData()
    } catch (err) {
      console.error('Failed to uncomplete task:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Ongedaan maken mislukt')
      }
    }
  }

  async function handleDeleteTask(task) {
    try {
      await api.deleteTask(task.id)
      loadData()
      toast.undo(
        `"${task.title}" verwijderd`,
        async () => {
          try {
            await api.createTask({
              title: task.title,
              date: task.date,
              assigned_to: task.is_both ? null : task.assigned_to,
              is_both: task.is_both,
              notes: task.notes || null,
              calendar_event_id: task.calendar_event_id || null,
            })
            loadData()
          } catch (err) {
            console.error('Failed to undo delete:', err)
            toast.error('Herstellen mislukt')
          }
        }
      )
    } catch (err) {
      console.error('Failed to delete task:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Verwijderen mislukt')
      }
    }
  }

  async function handlePostponeTask(task, date) {
    try {
      await api.postponeTask(task.id, date)
      loadData()
      toast.success('Taak verplaatst')
    } catch (err) {
      console.error('Failed to postpone task:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Verplaatsen mislukt')
      }
    }
  }

  // --- Calendar event actions ---
  async function handleConvertToStatus() {
    if (!eventAction || !eventAction.label?.trim()) return
    try {
      await api.createDayStatus({
        date: eventAction.date,
        label: eventAction.label.trim(),
        color: eventAction.color,
      })
      setEventAction(null)
      loadData()
      toast.success('Status toegevoegd')
    } catch (err) {
      console.error('Failed to create status:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
        setEventAction(null)
      } else {
        toast.error('Status toevoegen mislukt')
      }
    }
  }

  async function handleConvertToTask(event) {
    if (!currentUser) return
    try {
      await api.createTask({
        title: event.summary,
        date: event.start_date,
        assigned_to: null,
        is_both: true,
        calendar_event_id: event.id,
      })
      setEventAction(null)
      loadData()
      toast.success('Taak aangemaakt')
    } catch (err) {
      console.error('Failed to create task from event:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
        setEventAction(null)
      } else {
        toast.error('Taak aanmaken mislukt')
      }
    }
  }

  // --- Build grouped timeline ---
  const todayStr = formatDateISO(new Date())
  const grouped = {}

  // Build lookup: calendar_event_id -> linked task
  const linkedTasksByEvent = {}
  for (const task of tasks) {
    if (task.calendar_event_id) {
      linkedTasksByEvent[task.calendar_event_id] = task
    }
  }

  // Add tasks (non-completed only for future, all for today)
  for (const task of tasks) {
    const date = task.date
    if (!grouped[date]) grouped[date] = { tasks: [], ghosts: [], events: [] }
    grouped[date].tasks.push(task)
  }

  // Add ghosts
  for (const ghost of ghosts) {
    const date = ghost.date
    if (!grouped[date]) grouped[date] = { tasks: [], ghosts: [], events: [] }
    grouped[date].ghosts.push(ghost)
  }

  // Add calendar events
  for (const event of calendarEvents) {
    const date = event.start_date
    if (!grouped[date]) grouped[date] = { tasks: [], ghosts: [], events: [] }
    grouped[date].events.push(event)
  }

  const dates = Object.keys(grouped).sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-cream">
        <div className="sticky top-0 z-40 glass border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={onOpenMenu} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Toekomst</h1>
            <div className="w-10" />
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
      <div className="sticky top-0 z-40 glass border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onOpenMenu} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Toekomst</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 pt-3 space-y-4">
        {dates.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-card">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">Niets gepland</p>
          </div>
        ) : (
          dates.map(dateStr => {
            const day = grouped[dateStr]
            const today = isToday(dateStr)
            const tomorrow = isTomorrow(dateStr)

            // Split tasks: one-off (important) vs recurring (de-emphasized)
            // Tasks linked to calendar events are rendered on the event card, not separately
            const activeTasks = day.tasks.filter(t => !t.completed_at)
            const completedTasks = day.tasks.filter(t => !!t.completed_at)
            const oneOffTasks = activeTasks.filter(t => !t.schedule_id && !t.calendar_event_id)
            const recurringTasks = activeTasks.filter(t => !!t.schedule_id)

            const hasContent = oneOffTasks.length > 0 || recurringTasks.length > 0 || day.ghosts.length > 0 || day.events.length > 0 || completedTasks.length > 0

            if (!hasContent) return null

            return (
              <div key={dateStr}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-1.5">
                  <h2 className={`text-sm font-semibold flex-shrink-0 ${today ? 'text-accent-mint' : tomorrow ? 'text-gray-700' : 'text-gray-500'}`}>
                    {formatDateLabel(dateStr)}
                  </h2>
                  {dayStatuses[dateStr]?.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap flex-shrink-0">
                      {dayStatuses[dateStr].map(s => {
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
                  {dailyEntries[dateStr]?.length > 0 && (
                    <DailyEntryPills entries={dailyEntries[dateStr]} users={users} />
                  )}
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="space-y-1">
                  {/* Calendar events — interactive cards */}
                  {day.events.map(event => (
                    <CalendarEventCard
                      key={`cal-${event.id}`}
                      event={event}
                      linkedTask={linkedTasksByEvent[event.id]}
                      eventAction={eventAction}
                      onToggleAction={(evt) => {
                        if (eventAction?.eventId === evt.id) {
                          setEventAction(null)
                        } else {
                          setEventAction({ eventId: evt.id, mode: 'choose', date: evt.start_date, label: evt.summary, color: 'mint' })
                        }
                      }}
                      onChooseStatus={() => setEventAction(a => ({ ...a, mode: 'status' }))}
                      onChooseTask={() => handleConvertToTask(event)}
                      onStatusLabelChange={(label) => setEventAction(a => ({ ...a, label }))}
                      onStatusColorChange={(color) => setEventAction(a => ({ ...a, color }))}
                      onStatusConfirm={handleConvertToStatus}
                      onStatusCancel={() => setEventAction(null)}
                      onCompleteLinked={() => handleCompleteTask(linkedTasksByEvent[event.id])}
                      onUncompleteLinked={() => handleUncompleteTask(linkedTasksByEvent[event.id])}
                      onDeleteLinked={() => handleDeleteTask(linkedTasksByEvent[event.id])}
                    />
                  ))}

                  {/* One-off tasks — prominent */}
                  {oneOffTasks.map(task => (
                    <FutureTaskRow
                      key={task.id}
                      task={task}
                      users={users}
                      prominent
                      onComplete={() => handleCompleteTask(task)}
                      onUncomplete={() => handleUncompleteTask(task)}
                      onEdit={() => { setEditTask(task); setShowModal(true) }}
                      onDelete={() => handleDeleteTask(task)}
                    />
                  ))}

                  {/* Recurring tasks — compact & subdued */}
                  {recurringTasks.length > 0 && (
                    <RecurringGroup
                      tasks={recurringTasks}
                      ghosts={day.ghosts}
                      users={users}
                      onComplete={handleCompleteTask}
                      onUncomplete={handleUncompleteTask}
                      onEdit={(t) => { setEditTask(t); setShowModal(true) }}
                    />
                  )}

                  {/* Ghosts without recurring tasks (when no active recurring on that day) */}
                  {recurringTasks.length === 0 && day.ghosts.length > 0 && (
                    <RecurringGroup
                      tasks={[]}
                      ghosts={day.ghosts}
                      users={users}
                      onComplete={handleCompleteTask}
                      onUncomplete={handleUncompleteTask}
                      onEdit={(t) => { setEditTask(t); setShowModal(true) }}
                    />
                  )}

                  {/* Completed tasks — collapsed & very subtle */}
                  {completedTasks.length > 0 && (
                    <CompletedGroup tasks={completedTasks} users={users} />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Task edit modal */}
      {showModal && (
        <TaskModal
          date={editTask?.date || todayStr}
          dayName=""
          onClose={() => { setShowModal(false); setEditTask(null) }}
          users={users}
          currentUser={currentUser}
          onTaskCreated={loadData}
          onTaskQueued={() => {}}
          editTask={editTask}
        />
      )}
    </div>
  )
}

// --- Sub-components ---

function DailyEntryPills({ entries, users }) {
  // Group entries by user, same as WeekView
  const byUser = {}
  entries.forEach(e => {
    if (!byUser[e.user_name]) byUser[e.user_name] = { labels: [] }
    byUser[e.user_name].labels.push(e.label)
  })

  const userEntries = Object.entries(byUser)
  if (userEntries.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap flex-shrink-0">
      {userEntries.map(([name, { labels }]) => {
        const userObj = users.find(u => u.name === name)
        const color = userObj ? getUserColor(userObj) : { bg: 'bg-gray-300' }
        return (
          <div key={name} className="flex items-center gap-1 bg-white/70 shadow-card px-2 py-0.5 rounded-lg">
            {userObj?.avatar_url ? (
              <img src={userObj.avatar_url} alt={name} className="w-3 h-3 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className={`w-3 h-3 rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-[6px] leading-none">{name.charAt(0)}</span>
              </div>
            )}
            <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{labels.join(', ')}</span>
          </div>
        )
      })}
    </div>
  )
}

function CalendarEventCard({
  event, linkedTask, eventAction,
  onToggleAction, onChooseStatus, onChooseTask,
  onStatusLabelChange, onStatusColorChange, onStatusConfirm, onStatusCancel,
  onCompleteLinked, onUncompleteLinked, onDeleteLinked,
}) {
  const isActive = eventAction?.eventId === event.id
  const hasLinkedTask = !!linkedTask
  const isTaskCompleted = hasLinkedTask && !!linkedTask.completed_at

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      hasLinkedTask
        ? isTaskCompleted
          ? 'bg-accent-mint/10 border-accent-mint/20'
          : 'bg-pastel-sky/10 border-pastel-sky/20'
        : 'bg-pastel-sky/20 border-pastel-sky/30'
    }`}>
      <div
        className="flex items-start gap-2.5 px-3 py-2"
        onClick={() => !hasLinkedTask && onToggleAction(event)}
      >
        {/* Left: checkbox (linked task) or calendar indicator */}
        {hasLinkedTask ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (isTaskCompleted) onUncompleteLinked()
              else onCompleteLinked()
            }}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              isTaskCompleted
                ? 'bg-accent-mint border-accent-mint'
                : 'border-pastel-skyDark hover:border-accent-mint bg-white'
            }`}
          >
            {isTaskCompleted && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : (
          <div className="flex-shrink-0 mt-0.5">
            {event.all_day ? (
              <span className="text-[10px] font-medium text-pastel-skyDark bg-pastel-sky/40 px-1.5 py-0.5 rounded">
                hele dag
              </span>
            ) : (
              <svg className="w-4 h-4 text-pastel-skyDark mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isTaskCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {event.summary}
          </p>
          {event.location && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{event.location}</p>
          )}
          {hasLinkedTask && !isTaskCompleted && (
            <span className="text-[10px] text-pastel-skyDark mt-0.5 inline-block">taak</span>
          )}
        </div>

        {/* Right action area */}
        {hasLinkedTask && !isTaskCompleted ? (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteLinked() }}
            className="flex-shrink-0 p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        ) : !hasLinkedTask ? (
          <div className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isActive ? 'text-pastel-skyDark' : 'text-gray-300'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        ) : null}
      </div>

      {/* Action panel */}
      {isActive && !hasLinkedTask && (
        <div className="px-3 pb-2.5 border-t border-pastel-sky/20 pt-2">
          {eventAction.mode === 'choose' && (
            <div className="flex gap-2">
              <button
                onClick={onChooseStatus}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl bg-white/80 shadow-card text-gray-600 active:scale-[0.97] transition-transform"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-accent-mint flex-shrink-0" />
                Status
              </button>
              <button
                onClick={onChooseTask}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl bg-white/80 shadow-card text-gray-600 active:scale-[0.97] transition-transform"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Taak
              </button>
            </div>
          )}

          {eventAction.mode === 'status' && (
            <div className="space-y-2">
              <input
                type="text"
                value={eventAction.label}
                onChange={e => onStatusLabelChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && eventAction.label.trim()) onStatusConfirm()
                  if (e.key === 'Escape') onStatusCancel()
                }}
                placeholder="Status label..."
                className="w-full text-sm px-3 py-2 rounded-xl bg-white/80 border-0 focus:bg-white focus:ring-2 focus:ring-accent-mint/30 outline-none transition-colors"
                autoFocus
              />

              {/* Color swatches */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  {STATUS_COLORS.map(c => (
                    <button
                      key={c.key}
                      onClick={() => onStatusColorChange(c.key)}
                      className={`w-6 h-6 rounded-full ${c.swatch} transition-all ${
                        eventAction.color === c.key
                          ? 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex-1" />

                {/* Preview */}
                {eventAction.label.trim() && (
                  <div className="flex items-center gap-1.5 bg-white/70 shadow-card px-2 py-1 rounded-lg">
                    <div className={`w-3.5 h-3.5 rounded-full ${getStatusColor(eventAction.color).swatch}`} />
                    <span className="text-xs text-gray-500">{eventAction.label.trim()}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={onStatusCancel}
                  className="flex-1 py-2 text-sm text-gray-400 rounded-xl hover:bg-white/50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={onStatusConfirm}
                  disabled={!eventAction.label.trim()}
                  className="flex-1 py-2 text-sm font-medium text-white bg-accent-mint rounded-xl active:scale-[0.97] transition-transform disabled:opacity-50"
                >
                  Toevoegen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FutureTaskRow({ task, users, prominent, onComplete, onUncomplete, onEdit, onDelete }) {
  const isCompleted = !!task.completed_at
  const assignedUser = users.find(u => u.id === task.assigned_to)
  const config = task.is_both
    ? BOTH_COLOR
    : assignedUser
      ? getUserColor(assignedUser)
      : { bg: 'bg-gray-100', bgLight: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', dot: 'bg-gray-400' }

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2 rounded-xl transition-colors ${
        prominent ? 'bg-white shadow-card' : 'bg-white/60'
      } ${isCompleted ? 'opacity-50' : ''}`}
      onClick={() => !isCompleted && onEdit?.()}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (isCompleted) onUncomplete?.()
          else onComplete?.()
        }}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
          isCompleted
            ? 'bg-accent-mint border-accent-mint'
            : 'border-gray-300 hover:border-accent-mint bg-white'
        }`}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {!task.is_both && (
            <span className={`inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-md font-medium ${config.bgLight} ${config.text}`}>
              {assignedUser?.avatar_url ? (
                <img src={assignedUser.avatar_url} alt={assignedUser.name} className="w-3 h-3 rounded-full object-cover mr-1" />
              ) : null}
              {task.is_both ? 'Samen' : assignedUser?.name || 'Niemand'}
            </span>
          )}
          {task.notes && !isCompleted && (
            <span className="text-[11px] text-gray-400 truncate max-w-[120px]">{task.notes}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isCompleted && onDelete && !task.schedule_id && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="flex-shrink-0 p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

function RecurringGroup({ tasks, ghosts, users, onComplete, onUncomplete, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const allItems = [...tasks, ...ghosts]
  const count = allItems.length

  if (count === 0) return null

  return (
    <div className="rounded-xl bg-gray-50/80 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
      >
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-xs font-medium text-gray-400">
          {count} {count === 1 ? 'terugkerend' : 'terugkerende'}
        </span>
        <svg className={`w-3 h-3 text-gray-400 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-1 pb-1 space-y-0.5">
          {allItems.map(item => (
            <RecurringRow
              key={item.id}
              task={item}
              users={users}
              onComplete={item.is_ghost ? undefined : () => onComplete(item)}
              onUncomplete={item.is_ghost ? undefined : () => onUncomplete(item)}
              onEdit={item.is_ghost ? undefined : () => onEdit(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RecurringRow({ task, users, onComplete, onUncomplete, onEdit }) {
  const isGhost = !!task.is_ghost
  const assignedUser = users.find(u => u.id === task.assigned_to)
  const config = task.is_both
    ? BOTH_COLOR
    : assignedUser
      ? getUserColor(assignedUser)
      : { bg: 'bg-gray-100', bgLight: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${isGhost ? 'opacity-40' : 'hover:bg-white/60'}`}
      onClick={() => !isGhost && onEdit?.()}
    >
      {/* Checkbox */}
      {!isGhost ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onComplete?.()
          }}
          className="w-4 h-4 rounded-full border-2 border-gray-300 hover:border-accent-mint flex-shrink-0 transition-colors"
        />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0" />
      )}

      <p className={`text-xs flex-1 truncate ${isGhost ? 'text-gray-400 italic' : 'text-gray-600'}`}>
        {task.title}
      </p>

      {!task.is_both && (
        <span className={`text-[10px] px-1 py-0.5 rounded ${config.bgLight} ${config.text} flex-shrink-0`}>
          {assignedUser?.name || 'Niemand'}
        </span>
      )}

      {task.interval_days && (
        <span className="text-[10px] text-gray-400 flex-shrink-0">{task.interval_days}d</span>
      )}
    </div>
  )
}

function CompletedGroup({ tasks, users }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl bg-gray-50/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
      >
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-xs text-gray-400">
          {tasks.length} afgerond
        </span>
        <svg className={`w-3 h-3 text-gray-300 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-1.5 space-y-0.5">
          {tasks.map(task => {
            const completedByUser = users.find(u => u.id === task.completed_by)
            return (
              <div key={task.id} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded-full bg-accent-mint flex-shrink-0 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400 line-through flex-1 truncate">{task.title}</p>
                {completedByUser && (
                  <span className="text-[10px] text-gray-400">{completedByUser.name}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
