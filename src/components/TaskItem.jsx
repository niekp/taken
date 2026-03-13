import { useState, useRef, useEffect } from 'react'
import { getUserColor, BOTH_COLOR } from '../lib/colors'

export default function TaskItem({ task, onComplete, onUncomplete, onEdit, onDelete, onDeleteAttempt, onPostpone, users, isToday, compact, resetKey, showCategory }) {
  const isCompleted = !!task.completed_at
  const isGhost = !!task.is_ghost
  const isPendingSync = !!task.is_pending_sync

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
  const [revealed, setRevealed] = useState(null) // null, 'left' (delete), or 'right' (postpone)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const swipeDirection = useRef(null)
  const actionTapped = useRef(false) // suppress parent click after action button tap

  const canSwipeLeft = !isGhost && !isCompleted && !isPendingSync && !task.schedule_id && onDelete
  const canSwipeRight = !isGhost && !isCompleted && !isPendingSync && onPostpone

  useEffect(() => {
    setSwipeX(0)
    setRevealed(null)
  }, [resetKey])

  function handleTouchStart(e) {
    if (isGhost || isCompleted) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipeDirection.current = null
    setIsDragging(true)
  }

  function handleTouchMove(e) {
    if (!touchStartX.current) return
    const diff = e.touches[0].clientX - touchStartX.current
    const diffY = e.touches[0].clientY - touchStartY.current

    // Lock direction after a threshold — only lock to horizontal
    // if horizontal movement clearly exceeds vertical (prevents
    // accidental swipe while scrolling)
    if (!swipeDirection.current && Math.abs(diff) > 20) {
      if (Math.abs(diff) > Math.abs(diffY) * 1.5) {
        swipeDirection.current = diff < 0 ? 'left' : 'right'
      } else {
        // Vertical scroll detected — cancel swipe entirely
        touchStartX.current = null
        touchStartY.current = null
        setIsDragging(false)
        return
      }
    }

    if (swipeDirection.current === 'left' && canSwipeLeft) {
      setSwipeX(Math.max(diff, -80))
    } else if (swipeDirection.current === 'right' && canSwipeRight) {
      setSwipeX(Math.min(diff, 80))
    }
  }

  function handleTouchEnd() {
    if (swipeDirection.current === 'left' && canSwipeLeft) {
      if (swipeX < -50) {
        // Snap open to reveal delete button
        setSwipeX(-80)
        setRevealed('left')
      } else {
        setSwipeX(0)
        setRevealed(null)
      }
    } else if (swipeDirection.current === 'right' && canSwipeRight) {
      if (swipeX > 50) {
        // Snap open to reveal postpone button
        setSwipeX(80)
        setRevealed('right')
      } else {
        setSwipeX(0)
        setRevealed(null)
      }
    } else {
      setSwipeX(0)
      setRevealed(null)
    }
    touchStartX.current = null
    touchStartY.current = null
    swipeDirection.current = null
    setIsDragging(false)
  }

  function closeSwipe() {
    setSwipeX(0)
    setRevealed(null)
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
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Pending sync badge — shown on tasks that were created/edited/completed offline
  const syncBadge = isPendingSync ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium bg-accent-mint/10 text-accent-mint">
      <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Sync
    </span>
  ) : null

  // Compact mode for desktop columns — interactive but space-efficient
  if (compact) {
    return (
      <div
        onClick={() => {
          if (!isCompleted && !isPendingSync && onEdit) onEdit(task)
        }}
        className={`flex items-center gap-2 p-2 rounded-lg bg-white/80 hover:bg-white transition-all cursor-pointer group ${isCompleted ? 'opacity-50' : ''} ${isPendingSync ? 'opacity-60' : ''}`}
        style={isPendingSync ? { borderLeftWidth: '3px', borderLeftStyle: 'dashed', borderLeftColor: 'rgb(var(--color-accent-mint))' } : undefined}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            if (isPendingSync) return // Don't allow toggling pending sync items
            if (isCompleted) {
              onUncomplete?.()
            } else {
              onComplete?.()
            }
          }}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
            isPendingSync && isCompleted
              ? 'bg-accent-mint/50 border-accent-mint/50'
              : isCompleted
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

        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm leading-tight whitespace-normal ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
          {showCategory && task.category && (
            <span className="inline-flex items-center mt-0.5 text-[10px] text-gray-400">{task.category}</span>
          )}
          {syncBadge}
          {task.notes && !isCompleted && (
            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{task.notes}</p>
          )}
        </div>

        {/* Desktop hover actions for compact view */}
        {!isCompleted && !isGhost && (
          <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {onPostpone && (
              <button
                onClick={(e) => { e.stopPropagation(); onPostpone() }}
                className="p-1 rounded-md hover:bg-accent-lavender/20 text-gray-400 hover:text-accent-lavender transition-colors"
                title="Verplaatsen"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteAttempt?.(); onDelete() }}
                className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Verwijderen"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}

        {!task.is_both && (
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} title={assignee}>
            {assigneeAvatar && (
              <img src={assigneeAvatar} alt={assignee} className="w-full h-full rounded-full object-cover" />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => {
        if (actionTapped.current) {
          actionTapped.current = false
          return
        }
        if (revealed) {
          closeSwipe()
          return
        }
        if (!isCompleted && !isPendingSync && onEdit) onEdit(task)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Postpone button (right swipe reveals left side) */}
      <button
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => {
          e.stopPropagation()
          e.preventDefault()
          actionTapped.current = true
          if (onPostpone) {
            onPostpone()
            closeSwipe()
          }
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (onPostpone) {
            onPostpone()
            closeSwipe()
          }
        }}
        className={`absolute left-0 top-0 bottom-0 w-20 z-10 bg-accent-lavender active:bg-pastel-lavender flex items-center justify-center transition-opacity duration-200 ${swipeX > 10 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ borderRadius: '0.75rem' }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-white text-xs font-medium">Later</span>
        </div>
      </button>
      {/* Delete button (left swipe reveals right side) */}
      <button
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => {
          e.stopPropagation()
          e.preventDefault()
          actionTapped.current = true
          if (onDelete) {
            onDeleteAttempt?.()
            onDelete()
            closeSwipe()
          }
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (onDelete) {
            onDeleteAttempt?.()
            onDelete()
            closeSwipe()
          }
        }}
        className={`absolute right-0 top-0 bottom-0 w-20 z-10 bg-red-500 active:bg-red-600 flex items-center justify-center transition-opacity duration-200 ${swipeX < -10 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ borderRadius: '0.75rem' }}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      <div
        className={`task-card group ${isCompleted ? 'opacity-60' : ''} ${isPendingSync ? 'opacity-60' : ''}`}
        style={{
          borderLeftWidth: '3px',
          borderLeftStyle: isPendingSync ? 'dashed' : 'solid',
          borderLeftColor: task.is_both ? '#e5e7eb' : config.border.replace('border-', ''),
          transform: `translateX(${swipeX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <div className="flex items-start gap-2.5 px-3 py-2 rounded-xl">
          <button
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (isPendingSync) return // Don't allow toggling pending sync items
              if (isCompleted) {
                onUncomplete()
              } else {
                onComplete()
              }
            }}
            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              isPendingSync && isCompleted
                ? 'bg-accent-mint/50 border-accent-mint/50'
                : isCompleted
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
            <p className={`font-medium text-sm truncate transition-all ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {task.title}
            </p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {!task.is_both && (
                <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-md font-medium ${config.bgLight} ${config.text}`}>
                  {assigneeAvatar ? (
                    <img src={assigneeAvatar} alt={assignee} className="w-3.5 h-3.5 rounded-full object-cover mr-1" />
                  ) : null}
                  {assignee}
                </span>
              )}
              {task.schedule_id && (
                <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-md font-medium bg-gray-100 text-gray-400">
                  <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {task.interval_days}d
                </span>
              )}
              {showCategory && task.category && (
                <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-md font-medium bg-gray-50 text-gray-400">
                  {task.category}
                </span>
              )}
              {isCompleted && completedByUser && (
                <span className="inline-flex items-center text-xs px-1.5 py-0.5 rounded-md font-medium bg-green-50 text-green-600">
                  {completedByUser.name}
                </span>
              )}
              {syncBadge}
            </div>
            {task.notes && !isCompleted && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{task.notes}</p>
            )}
          </div>

          {!isCompleted && !isPendingSync && (
            <div className="hidden md:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {onPostpone && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPostpone() }}
                  className="p-1 rounded-md hover:bg-accent-lavender/20 text-gray-400 hover:text-accent-lavender transition-colors"
                  title="Verplaatsen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(task) }}
                  className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Bewerken"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
              {onDelete && !task.schedule_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteAttempt?.(); onDelete() }}
                  className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Verwijderen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
