import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef({})
  const callbacksRef = useRef({}) // store onUndo/onExpire keyed by toast id

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    delete callbacksRef.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'success', duration = 2500, onUndo = null, onExpire = null) => {
    const id = ++idCounter
    callbacksRef.current[id] = { onUndo, onExpire }
    setToasts(prev => [...prev, { id, message, type, exiting: false, hasUndo: !!onUndo }])

    // Start exit animation before removing
    timersRef.current[id] = setTimeout(() => {
      // Fire onExpire callback when the undo window closes
      callbacksRef.current[id]?.onExpire?.()
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
      timersRef.current[id] = setTimeout(() => {
        removeToast(id)
      }, 300)
    }, duration)

    return id
  }, [removeToast])

  const handleUndo = useCallback((id) => {
    callbacksRef.current[id]?.onUndo?.()
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    delete callbacksRef.current[id]
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Reassign as plain object (useCallback doesn't work with objects)
  const toastApi = useRef(null)
  toastApi.current = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 4000),
    info: (msg) => addToast(msg, 'info'),
    undo: (msg, onUndo, onExpire, duration = 5000) => addToast(msg, 'undo', duration, onUndo, onExpire),
  }

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} onUndo={handleUndo} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ref = useContext(ToastContext)
  if (!ref) throw new Error('useToast must be used within ToastProvider')
  // Return a stable wrapper that delegates to the ref
  return {
    success: (msg) => ref.current.success(msg),
    error: (msg) => ref.current.error(msg),
    info: (msg) => ref.current.info(msg),
    undo: (msg, onUndo, onExpire, duration) => ref.current.undo(msg, onUndo, onExpire, duration),
  }
}

const ICONS = {
  success: (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01" />
      <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
    </svg>
  ),
  undo: (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a5 5 0 015 5v0a5 5 0 01-5 5H8M3 10l4-4M3 10l4 4" />
    </svg>
  ),
}

const COLORS = {
  success: 'bg-accent-mint',
  error: 'bg-red-400',
  info: 'bg-gray-500',
  undo: 'bg-gray-700',
}

function ToastContainer({ toasts, onDismiss, onUndo }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex flex-col items-center pt-[env(safe-area-inset-top)] pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => t.type === 'undo' ? null : onDismiss(t.id)}
          className={`pointer-events-auto mt-2 flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-white text-sm font-medium transition-all duration-300 ${COLORS[t.type]} ${
            t.exiting ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-toast-in'
          }`}
        >
          <span className="flex-shrink-0">{ICONS[t.type]}</span>
          <span>{t.message}</span>
          {t.type === 'undo' && t.hasUndo && (
            <button
              onClick={(e) => { e.stopPropagation(); onUndo(t.id) }}
              className="ml-2 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              Ongedaan maken
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
