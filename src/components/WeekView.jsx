import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import TaskItem from './TaskItem'
import TaskModal from './TaskModal'

const DAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']
const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

export default function WeekView({ currentUser, users, onComplete, presentationMode, onTogglePresentation, onOpenMenu }) {
  const [tasks, setTasks] = useState([])
  const [completedTasks, setCompletedTasks] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const swipeStart = useRef(null)

  const today = new Date()
  const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1
  
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

  useEffect(() => {
    loadTasks()
    loadCompletedTasks()
  }, [currentWeekOffset])

  async function loadTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setTasks(data)
  }

  async function loadCompletedTasks() {
    const weekDates = getWeekDates(currentWeekOffset)
    const startDate = weekDates[0].toISOString().split('T')[0]
    const endDate = weekDates[6].toISOString().split('T')[0]
    
    const { data } = await supabase
      .from('completed_tasks')
      .select('*')
      .gte('completed_at', startDate)
      .lte('completed_at', endDate + 'T23:59:59')
    
    if (data) setCompletedTasks(data)
  }

  function getTasksForDay(dayIndex) {
    return tasks.filter(task => {
      const taskDay = task.day_of_week
      if (taskDay !== dayIndex) return false
      
      if (filter === 'bijan') {
        return task.assigned_to === users.find(u => u.name === 'Bijan')?.id || task.is_both
      }
      if (filter === 'esther') {
        return task.assigned_to === users.find(u => u.name === 'Esther')?.id || task.is_both
      }
      return true
    })
  }

  function isTaskCompleted(taskId) {
    return completedTasks.some(ct => ct.task_id === taskId && ct.user_id === currentUser.id)
  }

  async function handleCompleteTask(task) {
    const weekNumber = getWeekNumber(weekDates[0])
    const year = weekDates[0].getFullYear()
    
    const { error } = await supabase
      .from('completed_tasks')
      .insert({
        task_id: task.id,
        user_id: currentUser.id,
        week_number: weekNumber,
        year: year
      })
    
    if (!error) {
      loadCompletedTasks()
      onComplete()
    }
  }

  function getWeekNumber(date) {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  }

  function handleSwipeStart(e) {
    swipeStart.current = e.touches[0].clientX
  }

  function handleSwipeEnd(e) {
    if (!swipeStart.current) return
    const diff = e.changedTouches[0].clientX - swipeStart.current
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentWeekOffset(prev => prev - 1)
      } else {
        setCurrentWeekOffset(prev => prev + 1)
      }
    }
    swipeStart.current = null
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

  function getIndicators() {
    return DAYS.map((_, i) => {
      const dayTasks = tasks.filter(t => t.day_of_week === i)
      return dayTasks.length > 0 && i !== currentDayIndex
    })
  }

  const indicators = getIndicators()

  return (
    <div 
      className={`min-h-screen ${presentationMode ? 'p-8' : ''}`}
      onTouchStart={handleSwipeStart}
      onTouchEnd={handleSwipeEnd}
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${presentationMode ? 'mb-8' : 'p-4'}`}>
        <button onClick={onOpenMenu} className="p-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="text-center">
          <h1 className={`font-bold ${presentationMode ? 'text-3xl' : 'text-xl'}`}>Divide/Chores</h1>
          <p className="text-gray-500 text-sm">{getWeekRange()}</p>
        </div>
        
        <button onClick={onTogglePresentation} className="p-2" title="Presentatie modus">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Filter */}
      {!presentationMode && (
        <div className="px-4 mb-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            {['all', 'bijan', 'esther'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  filter === f 
                    ? 'bg-white shadow text-emerald-600' 
                    : 'text-gray-500'
                }`}
              >
                {f === 'all' ? 'Alle' : f === 'bijan' ? '👤 Bijan' : '👤 Esther'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-between px-2 mb-4">
        <button 
          onClick={() => setCurrentWeekOffset(prev => prev - 1)}
          className="p-2 text-gray-500"
        >
          ←
        </button>
        <span className="text-sm text-gray-400">
          {currentWeekOffset === 0 ? 'Deze week' : currentWeekOffset > 0 ? 'Volgende weken' : 'Vorige weken'}
        </span>
        <button 
          onClick={() => setCurrentWeekOffset(prev => prev + 1)}
          className="p-2 text-gray-500"
        >
          →
        </button>
      </div>

      {/* Days Grid */}
      <div className="flex gap-1 px-1 overflow-x-auto">
        {DAYS.map((day, i) => {
          const dayTasks = getTasksForDay(i)
          const hasTasks = dayTasks.length > 0
          const completedCount = dayTasks.filter(t => isTaskCompleted(t.id)).length
          const isToday = i === currentDayIndex && currentWeekOffset === 0
          const hasIndicator = indicators[i]

          return (
            <div
              key={i}
              className={`flex-1 min-w-[80px] ${presentationMode ? 'p-4' : 'p-2'}`}
            >
              <div 
                onClick={() => {
                  setSelectedDay(i)
                  setShowModal(true)
                }}
                className={`text-center mb-2 ${
                  isToday ? 'bg-emerald-500 text-white rounded-lg py-1' : ''
                }`}
              >
                <p className={`font-medium ${presentationMode ? 'text-lg' : 'text-xs'}`}>{day}</p>
                <p className={presentationMode ? 'text-2xl' : 'text-lg'}>{formatDate(weekDates[i])}</p>
                {hasIndicator && (
                  <span className="text-orange-400 text-xs">🔔</span>
                )}
              </div>
              
              <div className="space-y-1">
                {dayTasks.slice(0, presentationMode ? 10 : 3).map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isCompleted={isTaskCompleted(task.id)}
                    onComplete={() => handleCompleteTask(task)}
                    users={users}
                    isToday={isToday}
                    presentationMode={presentationMode}
                  />
                ))}
                {dayTasks.length > (presentationMode ? 10 : 3) && (
                  <p className="text-xs text-gray-400 text-center">
                    +{dayTasks.length - (presentationMode ? 10 : 3)} meer
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Task FAB */}
      {!presentationMode && (
        <button
          onClick={() => {
            setSelectedDay(currentDayIndex)
            setShowModal(true)
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-95 transition-all"
        >
          +
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <TaskModal
          dayIndex={selectedDay !== null ? selectedDay : currentDayIndex}
          dayName={DAY_NAMES[selectedDay !== null ? selectedDay : currentDayIndex]}
          onClose={() => {
            setShowModal(false)
            setSelectedDay(null)
          }}
          users={users}
          currentUser={currentUser}
          onTaskCreated={loadTasks}
        />
      )}
    </div>
  )
}
