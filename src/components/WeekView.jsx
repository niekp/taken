import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import TaskItem from './TaskItem'
import TaskModal from './TaskModal'
import { getUserColor } from '../lib/colors'

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

export default function WeekView({ currentUser, users, onComplete, presentationMode, onTogglePresentation, onOpenMenu }) {
  const [tasks, setTasks] = useState([])
  const [ghosts, setGhosts] = useState([])
  const [meals, setMeals] = useState([])
  const [dailyEntries, setDailyEntries] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [filter, setFilter] = useState('all')
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [resetKey, setResetKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const today = new Date()
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  const [activeDay, setActiveDay] = useState(currentDayIndex)

  function getWeekDates(offset = 0) {
    const start = new Date(today)
    start.setDate(today.getDate() - currentDayIndex + (offset * 7))
    return DAYS.map((_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  const weekDates = getWeekDates(currentWeekOffset)

  function formatDateISO(d) {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    loadData()

    function handleVisibilityChange() {
      if (!document.hidden) loadData()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [currentWeekOffset])

  async function loadData() {
    const from = formatDateISO(weekDates[0])
    const to = formatDateISO(weekDates[6])

    try {
      // Run housekeeping on current week load
      if (currentWeekOffset === 0) {
        await api.runHousekeeping()
      }

      const [taskData, mealData, entriesData] = await Promise.all([
        api.getTasks(from, to),
        api.getMeals(from, to),
        api.getDailyScheduleEntries(from, to),
      ])

      setTasks(taskData.tasks || [])
      setGhosts(taskData.ghosts || [])
      setMeals(mealData)
      setDailyEntries(entriesData || {})
    } catch (err) {
      console.error('Failed to load data:', err)
    }
    setIsLoading(false)
  }

  function getItemsForDay(dayIndex) {
    const dateStr = formatDateISO(weekDates[dayIndex])

    let dayTasks = tasks.filter(t => t.date === dateStr)
    let dayGhosts = ghosts.filter(g => g.date === dateStr)

    // Apply user filter
    if (filter !== 'all') {
      dayTasks = dayTasks.filter(t => t.assigned_to === filter || t.is_both)
      dayGhosts = dayGhosts.filter(g => g.assigned_to === filter || g.is_both)
    }

    // Sort: uncompleted first, then completed
    dayTasks.sort((a, b) => {
      if (a.completed_at && !b.completed_at) return 1
      if (!a.completed_at && b.completed_at) return -1
      return 0
    })

    // Group by category: uncategorized first, then each category in order seen
    // Merge ghosts into the same groups so they appear under their category
    const uncategorized = []
    const categoryMap = new Map()
    for (const task of [...dayTasks, ...dayGhosts]) {
      const cat = task.category || null
      if (!cat) {
        uncategorized.push(task)
      } else {
        if (!categoryMap.has(cat)) categoryMap.set(cat, [])
        categoryMap.get(cat).push(task)
      }
    }
    const taskGroups = []
    if (uncategorized.length > 0) {
      taskGroups.push({ category: null, items: uncategorized })
    }
    for (const [category, catItems] of categoryMap) {
      taskGroups.push({ category, items: catItems })
    }

    return { tasks: dayTasks, ghosts: dayGhosts, taskGroups }
  }

  async function handleCompleteTask(task) {
    if (!currentUser) return
    try {
      await api.completeTask(task.id, currentUser.id)
      onComplete()
      loadData()
    } catch (err) {
      console.error('Failed to complete task:', err)
    }
  }

  async function handleUncompleteTask(task) {
    try {
      await api.uncompleteTask(task.id)
      loadData()
    } catch (err) {
      console.error('Failed to uncomplete task:', err)
    }
  }

  async function handleDeleteTask(task) {
    try {
      await api.deleteTask(task.id)
      loadData()
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  async function handlePostponeTask(task) {
    try {
      await api.postponeTask(task.id)
      loadData()
    } catch (err) {
      console.error('Failed to postpone task:', err)
    }
  }

  function formatDate(date) {
    return date.getDate()
  }

  function getWeekRange() {
    const start = weekDates[0]
    const end = weekDates[6]
    const startStr = `${start.getDate()}/${start.getMonth() + 1}`
    const endStr = `${end.getDate()}/${end.getMonth() + 1}`
    return `${startStr} - ${endStr}`
  }

  function getMealForDay(dayIndex) {
    const dateStr = formatDateISO(weekDates[dayIndex])
    return meals.find(m => m.date === dateStr)
  }

  function getDailyEntriesForDay(dayIndex) {
    const dateStr = formatDateISO(weekDates[dayIndex])
    return dailyEntries[dateStr] || []
  }

  function renderDayInfoCard(dayIndex, compact = false) {
    const entries = getDailyEntriesForDay(dayIndex)
    const meal = getMealForDay(dayIndex)
    if (entries.length === 0 && !meal) return null

    // Group entries by user
    const byUser = {}
    entries.forEach(e => {
      if (!byUser[e.user_name]) byUser[e.user_name] = { labels: [] }
      byUser[e.user_name].labels.push(e.label)
    })

    const userEntries = Object.entries(byUser)

    function renderAvatar(name, size = 'w-4 h-4 text-[9px]') {
      const userObj = users.find(u => u.name === name)
      const color = userObj ? getUserColor(userObj) : { bg: 'bg-gray-300' }
      if (userObj?.avatar_url) {
        return <img src={userObj.avatar_url} alt={name} className={`${size} rounded-full object-cover flex-shrink-0`} />
      }
      return (
        <div className={`${size} rounded-full ${color.bg} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-bold leading-none">{name.charAt(0)}</span>
        </div>
      )
    }

    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'gap-2'}`}>
        {userEntries.map(([name, { labels }]) => (
          <div key={name} className={`flex items-center gap-1.5 ${compact ? 'bg-white/60 px-2 py-1 rounded-lg' : 'bg-white/70 shadow-card px-2.5 py-1.5 rounded-xl'}`}>
            {renderAvatar(name, compact ? 'w-3.5 h-3.5 text-[8px]' : 'w-4 h-4 text-[9px]')}
            <span className={`text-gray-500 truncate ${compact ? 'text-[10px] max-w-[70px]' : 'text-xs max-w-[120px]'}`}>{labels.join(', ')}</span>
          </div>
        ))}
        {meal && (
          <div className={`flex items-center gap-1.5 ${compact ? 'bg-white/60 px-2 py-1 rounded-lg' : 'bg-white/70 shadow-card px-2.5 py-1.5 rounded-xl'}`}>
            <svg className={`text-gray-400 flex-shrink-0 ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
            </svg>
            <span className={`text-gray-500 truncate ${compact ? 'text-[10px] max-w-[70px]' : 'text-xs max-w-[120px]'}`}>{meal.meal_name}</span>
          </div>
        )}
      </div>
    )
  }

  /** Render grouped task list with category headers */
  function renderGroupedTasks(taskGroups, renderTask, renderGhost, compact = false) {
    return (
      <>
        {taskGroups.map(({ category, items }) => (
          <div key={category || '_uncategorized'}>
            {category && (
              <div className={`flex items-center gap-2 ${compact ? 'mt-1.5 mb-0.5' : 'mt-4 mb-1.5'} ${taskGroups[0]?.category === category && !taskGroups.find(g => !g.category) ? (compact ? '' : 'mt-1') : ''}`}>
                <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-gray-400 uppercase tracking-wide`}>{category}</p>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>
            )}
            {items.map(item => item.is_ghost ? renderGhost(item) : renderTask(item))}
          </div>
        ))}
      </>
    )
  }

  if (presentationMode) {
    return (
      <div className="h-screen p-4 md:p-6 bg-gradient-to-br from-pastel-cream to-pastel-mint/20 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="w-8 md:w-10" />

          <div className="text-center">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800">Huishouden</h1>
            <div className="flex items-center justify-center gap-2 md:gap-3 mt-1 md:mt-2">
              <button
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="p-1.5 md:p-2 hover:bg-white/60 rounded-lg transition-colors"
              >
                <svg className="w-4 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-sm md:text-lg text-gray-500 font-medium min-w-[140px] md:min-w-[180px] text-center">{getWeekRange()}</p>
              <button
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-1.5 md:p-2 hover:bg-white/60 rounded-lg transition-colors"
              >
                <svg className="w-4 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            {currentWeekOffset === 0 && (
              <p className="text-accent-mint text-sm md:text-lg font-semibold mt-1 md:mt-2">Vandaag: {DAY_NAMES[currentDayIndex]}</p>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
              {users.filter(u => u.can_do_chores).map(u => {
                const c = getUserColor(u)
                return (
                  <div key={u.id} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ${c.dot}`}></div>
                    <span>{u.name}</span>
                  </div>
                )
              })}
            </div>
            <button onClick={onTogglePresentation} className="p-2 hover:bg-white/60 rounded-lg transition-colors" title="Presentatie modus afsluiten">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Desktop: all days side by side */}
        <div className="md:flex-1 md:flex md:gap-4 md:overflow-x-auto hidden">
           {DAYS.map((day, i) => {
            const { tasks: dayTasks, ghosts: dayGhosts, taskGroups } = getItemsForDay(i)
            const isToday = i === currentDayIndex && currentWeekOffset === 0
            const hasItems = dayTasks.length > 0 || dayGhosts.length > 0

            return (
              <div key={i} className="flex-1 flex flex-col min-w-0 bg-white/60 rounded-2xl">
                <div className={`text-center p-3 md:p-4 transition-all duration-300 ${
                  isToday
                    ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-lg'
                    : 'bg-white shadow-sm'
                }`}>
                  <p className={`font-medium ${isToday ? 'text-white/80' : 'text-gray-500'}`}>{DAYS[i]}</p>
                  <p className={`text-2xl md:text-3xl font-bold mt-1 ${isToday ? 'text-white' : 'text-gray-800'}`}>{formatDate(weekDates[i])}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {renderDayInfoCard(i, true)}
                  {renderGroupedTasks(
                    taskGroups,
                    task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onComplete={() => handleCompleteTask(task)}
                        onUncomplete={() => handleUncompleteTask(task)}
                        users={users}
                        isToday={isToday}
                        presentationMode={true}
                      />
                    ),
                    ghost => (
                      <TaskItem key={ghost.id} task={ghost} users={users} isToday={false} presentationMode={true} />
                    ),
                    true
                  )}
                  {!hasItems && !getMealForDay(i) && getDailyEntriesForDay(i).length === 0 && (
                    <div className="text-center text-gray-400 py-8 text-sm">
                      Geen taken
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile: swipeable day tabs */}
        <div className="flex-1 md:hidden flex flex-col overflow-hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 snap-x">
            {DAYS.map((day, i) => {
              const isToday = i === currentDayIndex && currentWeekOffset === 0
              return (
                <button
                  key={i}
                  onClick={() => setActiveDay(i)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all snap-start ${
                    activeDay === i
                      ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-soft'
                      : isToday
                        ? 'bg-white shadow-card text-gray-700'
                        : 'bg-white/60 text-gray-500'
                  }`}
                >
                  <span className="block text-xs opacity-70">{day}</span>
                  <span className="block text-lg font-bold mt-0.5">{formatDate(weekDates[i])}</span>
                </button>
              )
            })}
          </div>

          <div className="flex-1 overflow-y-auto bg-white/60 rounded-2xl">
            <div className={`text-center p-3 transition-all duration-300 ${
              activeDay === currentDayIndex && currentWeekOffset === 0
                ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-lg rounded-t-2xl'
                : 'bg-white shadow-sm rounded-t-2xl'
            }`}>
              <p className={`font-medium ${activeDay === currentDayIndex && currentWeekOffset === 0 ? 'text-white/80' : 'text-gray-500'}`}>{DAY_NAMES[activeDay]}</p>
              <p className={`text-3xl font-bold mt-1 ${activeDay === currentDayIndex && currentWeekOffset === 0 ? 'text-white' : 'text-gray-800'}`}>{formatDate(weekDates[activeDay])}</p>
            </div>

            <div className="p-3 space-y-2">
              {(() => {
                const { tasks: dayTasks, ghosts: dayGhosts, taskGroups } = getItemsForDay(activeDay)
                return (
                  <>
                    {renderDayInfoCard(activeDay)}
                    {renderGroupedTasks(
                      taskGroups,
                      task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onComplete={() => handleCompleteTask(task)}
                          onUncomplete={() => handleUncompleteTask(task)}
                          users={users}
                          isToday={activeDay === currentDayIndex && currentWeekOffset === 0}
                          presentationMode={true}
                        />
                      ),
                      ghost => (
                        <TaskItem key={ghost.id} task={ghost} users={users} isToday={false} presentationMode={true} />
                      ),
                      true
                    )}
                    {dayTasks.length === 0 && dayGhosts.length === 0 && !getMealForDay(activeDay) && getDailyEntriesForDay(activeDay).length === 0 && (
                      <div className="text-center text-gray-400 py-8">
                        Geen taken
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
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
            <h1 className="text-lg font-semibold text-gray-800">Huishouden</h1>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <button
                onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                className="p-1 hover:bg-white/50 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <p className="text-gray-400 text-xs">{getWeekRange()}</p>
              <button
                onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                className="p-1 hover:bg-white/50 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <button onClick={onTogglePresentation} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors" title="Presentatie modus">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-1.5 bg-white/60 p-1.5 rounded-2xl">
            <button
              onClick={() => setFilter('all')}
              className={`filter-btn flex items-center justify-center gap-1.5 ${
                filter === 'all'
                  ? 'bg-accent-mint text-white shadow-soft'
                  : 'text-gray-500 hover:bg-white/50'
              }`}
            >
              Alle
            </button>
            {users.filter(u => u.can_do_chores).map(u => {
              const avatar = u.avatar_url
              return (
                <button
                  key={u.id}
                  onClick={() => setFilter(u.id)}
                  className={`filter-btn flex items-center justify-center gap-1.5 ${
                    filter === u.id
                      ? 'bg-accent-mint text-white shadow-soft'
                      : 'text-gray-500 hover:bg-white/50'
                  }`}
                >
                  {avatar && (
                    <img src={avatar} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                  )}
                  {u.name}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="px-3 py-4">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
          {DAYS.map((day, i) => {
            const { tasks: dayTasks, ghosts: dayGhosts } = getItemsForDay(i)
            const isActive = i === activeDay
            const isToday = i === currentDayIndex && currentWeekOffset === 0
            const hasTasks = dayTasks.length > 0 || dayGhosts.length > 0

            return (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`day-tab min-w-[48px] ${
                  isActive
                    ? 'bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white shadow-soft'
                    : isToday
                      ? 'bg-white shadow-card text-gray-700'
                      : 'bg-white/50 text-gray-500 hover:bg-white'
                }`}
              >
                <p className="text-xs opacity-70">{day}</p>
                <p className="text-lg font-semibold mt-0.5">{formatDate(weekDates[i])}</p>
                {hasTasks && !isActive && (
                  <span className="w-1.5 h-1.5 bg-accent-mint rounded-full mx-auto mt-1.5"></span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-32">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            {DAY_NAMES[activeDay]}
          </h2>
          {activeDay === currentDayIndex && currentWeekOffset === 0 && (
            <span className="text-xs font-medium text-accent-mint bg-pastel-mint/30 px-3 py-1 rounded-full">
              Vandaag
            </span>
          )}
        </div>

        <div className="space-y-3">
          {(() => {
            const { tasks: dayTasks, ghosts: dayGhosts, taskGroups } = getItemsForDay(activeDay)
            const isToday = activeDay === currentDayIndex && currentWeekOffset === 0
            return (
              <>
                {renderDayInfoCard(activeDay)}
                {renderGroupedTasks(
                  taskGroups,
                  task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onComplete={() => handleCompleteTask(task)}
                      onUncomplete={() => handleUncompleteTask(task)}
                      onEdit={(t) => { setEditTask(t); setShowModal(true) }}
                      onDelete={!task.schedule_id ? () => handleDeleteTask(task) : undefined}
                      onDeleteAttempt={() => setResetKey(k => k + 1)}
                      onPostpone={!task.completed_at ? () => handlePostponeTask(task) : undefined}
                      users={users}
                      isToday={isToday}
                      presentationMode={false}
                      resetKey={resetKey}
                    />
                  ),
                  ghost => (
                    <TaskItem key={ghost.id} task={ghost} users={users} isToday={false} presentationMode={false} />
                  )
                )}
                {dayTasks.length === 0 && dayGhosts.length === 0 && !getMealForDay(activeDay) && getDailyEntriesForDay(activeDay).length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-pastel-lavender/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-pastel-lavenderDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-gray-400">Geen taken voor deze dag</p>
                    <p className="text-gray-300 text-sm mt-1">Druk op + om een taak toe te voegen</p>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>

      <button
        onClick={() => {
          setEditTask(null)
          setShowModal(true)
        }}
        className="fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white rounded-2xl shadow-soft-lg flex items-center justify-center text-2xl active:scale-95 transition-all hover:shadow-soft-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <TaskModal
          date={editTask?.date || formatDateISO(weekDates[activeDay])}
          dayName={DAY_NAMES[activeDay]}
          onClose={() => {
            setShowModal(false)
            setEditTask(null)
          }}
          users={users}
          currentUser={currentUser}
          onTaskCreated={loadData}
          editTask={editTask}
        />
      )}
    </div>
  )
}
