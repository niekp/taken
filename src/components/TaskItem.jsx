import { useState, useRef, useEffect } from 'react'
import { getUserColor, BOTH_COLOR } from '../lib/colors'

export default function TaskItem({ task, onComplete, onUncomplete, onEdit, onDelete, onDeleteAttempt, onPostpone, users, isToday, presentationMode, resetKey }) {
  const isCompleted = !!task.completed_at
  const isGhost = !!task.is_ghost
  const isOverdue = task.original_date && task.date !== task.original_date

  const assignedUser = users.find(u => u.id === task.assigned_to)
  const completedByUser = users.find(u => u.id === task.completed_by)
  const assignee = task.is_both
    ? 'Samen'
    : assignedUser?.name || 'Niemand'

  const assigneeAvatar = task.is_both ? null : assignedUser?.avatar_url

  const config = task.is_both
    ? BOTH_COLOR
    : assignedUser
      ? getUserColor(assignedUser)
      : { bg: 'bg-gray-100', bgLight: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', dot: 'bg-gray-400' }

  const [swipeX, setSwipeX] = useState(0)
  const touchStartX = useRef(null)
  const swipeDirection = useRef(null) // 'left' or 'right', locked after first significant move

  const canSwipeLeft = !isGhost && !isCompleted && !task.schedule_id && onDelete
  const canSwipeRight = !isGhost && !isCompleted && onPostpone

  useEffect(() => {
    setSwipeX(0)
  }, [resetKey])

  function handleTouchStart(e) {
    if (isGhost || isCompleted) return
    touchStartX.current = e.touches[0].clientX
    swipeDirection.current = null
  }

  function handleTouchMove(e) {
    if (!touchStartX.current) return
    const diff = e.touches[0].clientX - touchStartX.current

    // Lock direction after a small threshold
    if (!swipeDirection.current && Math.abs(diff) > 10) {
      swipeDirection.current = diff < 0 ? 'left' : 'right'
    }

    if (swipeDirection.current === 'left' && canSwipeLeft) {
      setSwipeX(Math.max(diff, -100))
    } else if (swipeDirection.current === 'right' && canSwipeRight) {
      setSwipeX(Math.min(diff, 100))
    }
  }

  function handleTouchEnd() {
    if (swipeDirection.current === 'left') {
      if (swipeX < -60 && onDelete) {
        onDeleteAttempt?.()
        onDelete()
      } else if (swipeX < -30) {
        setSwipeX(-80)
      } else {
        setSwipeX(0)
      }
    } else if (swipeDirection.current === 'right') {
      if (swipeX > 60 && onPostpone) {
        onPostpone()
        setSwipeX(0)
      } else if (swipeX > 30) {
        setSwipeX(80)
      } else {
        setSwipeX(0)
      }
    } else {
      setSwipeX(0)
    }
    touchStartX.current = null
    swipeDirection.current = null
  }

  // Ghost tasks - preview style
  if (isGhost) {
    return (
      <div className="task-card opacity-40 pointer-events-none" style={{ borderLeftWidth: '3px', borderLeftStyle: 'dashed', borderLeftColor: '#d1d5db' }}>
        <div className="flex items-start gap-2.5 px-3 py-2 rounded-xl">
          <div className="mt-0.5 w-5 h-5 rounded-full border-2 border-dashed border-gray-300 flex-shrink-0 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-gray-400">{task.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-300">Volgende</span>
              {task.category && (
                <span className="text-xs text-gray-300">{task.category}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (presentationMode) {
    return (
      <div
        onClick={() => !isCompleted && onEdit && onEdit(task)}
        className={`flex items-center gap-3 p-2 rounded-lg bg-white/80 hover:bg-white transition-all cursor-pointer ${isCompleted ? 'opacity-50' : ''}`}
      >
        <div
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            if (isCompleted) {
              onUncomplete()
            } else {
              onComplete()
            }
          }}
          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${isCompleted ? 'bg-accent-mint border-accent-mint' : 'border-gray-300 hover:border-accent-mint bg-white'}`}
        >
          {isCompleted && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm leading-tight whitespace-normal ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
          {isOverdue && !isCompleted && (
            <span className="inline-flex items-center mt-1 text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">
              Uitgesteld
            </span>
          )}
        </div>

        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} title={assignee}>
          {assigneeAvatar && (
            <img src={assigneeAvatar} alt={assignee} className="w-full h-full rounded-full object-cover" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => !isCompleted && onEdit && onEdit(task)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Postpone action (right swipe reveals left side) */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-20 bg-amber-500 flex items-center justify-center transition-opacity duration-200 ${swipeX > 10 ? 'opacity-100' : 'opacity-0'}`}
        style={{ borderRadius: '0.75rem' }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-white text-xs font-medium">Morgen</span>
        </div>
      </div>
      {/* Delete action (left swipe reveals right side) */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center transition-opacity duration-200 ${swipeX < -10 ? 'opacity-100' : 'opacity-0'}`}
        style={{ borderRadius: '0.75rem' }}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </div>
      <div
        className={`task-card group ${isCompleted ? 'opacity-60' : ''}`}
        style={{
          borderLeftWidth: '3px',
          borderLeftStyle: task.schedule_id ? 'dashed' : 'solid',
          borderLeftColor: config.border.replace('border-', ''),
          transform: `translateX(${swipeX}px)`,
          transition: swipeX === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        <div className="flex items-start gap-2.5 px-3 py-2 rounded-xl">
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (isCompleted) {
                onUncomplete()
              } else {
                onComplete()
              }
            }}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              isCompleted
                ? 'bg-accent-mint border-accent-mint'
                : 'border-gray-300 hover:border-accent-mint bg-white group-hover:shadow-soft'
            }`}
          >
            {isCompleted && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`font-medium truncate transition-all ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'} ${presentationMode ? 'text-base' : 'text-sm'}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md font-medium ${config.bgLight} ${config.text}`}>
                {assigneeAvatar ? (
                  <img src={assigneeAvatar} alt={assignee} className="w-3.5 h-3.5 rounded-full object-cover mr-1" />
                ) : null}
                {assignee}
              </span>
              {task.schedule_id && (
                <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-md font-medium bg-gray-100 text-gray-400">
                  <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {task.interval_days}d
                </span>
              )}
              {task.category && (
                <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-md font-medium bg-pastel-lavender/30 text-gray-500">
                  {task.category}
                </span>
              )}
              {isOverdue && !isCompleted && (
                <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-md font-medium bg-red-50 text-red-600">
                  Uitgesteld
                </span>
              )}
              {isCompleted && completedByUser && (
                <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-md font-medium bg-green-50 text-green-600">
                  {completedByUser.name}
                </span>
              )}
            </div>
          </div>

          {!isCompleted && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
