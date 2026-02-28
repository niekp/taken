import { useState, useEffect, useCallback, useRef } from 'react'
import { api, setToken, getToken, setOnUnauthorized } from './lib/api'
import { ToastProvider } from './lib/toast'
import Login from './components/Login'
import WeekView from './components/WeekView'
import SchedulesView from './components/SchedulesView'
import MealsView from './components/MealsView'
import GroceryView from './components/GroceryView'
import DagschemaView from './components/DagschemaView'
import AgendaView from './components/AgendaView'
import Menu from './components/Menu'
import Stats from './components/Stats'
import Confetti from './components/Confetti'
import UserManagementView from './components/UserManagementView'
import NotificationSettings from './components/NotificationSettings'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem('activeTab')
      if (saved && ['weekly', 'meals', 'schedules', 'grocery', 'dagschema', 'agenda'].includes(saved)) return saved
    } catch {}
    return 'weekly'
  })
  const [showMenu, setShowMenu] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [bringEnabled, setBringEnabled] = useState(null) // null = not yet checked
  const [calendarEnabled, setCalendarEnabled] = useState(null) // null = not yet checked
  const [presentationMode, setPresentationMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') === 'presentation'
  })
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(true)
  const [swWaiting, setSwWaiting] = useState(null) // waiting SW registration
  // Temporarily hold PIN during multi-user selection flow
  const pendingPinRef = useRef(null)

  // Register onUnauthorized callback — force logout on 401
  useEffect(() => {
    setOnUnauthorized(() => {
      setCurrentUser(null)
      setToken(null)
      localStorage.removeItem('currentUserId')
    })
    return () => setOnUnauthorized(null)
  }, [])

  // Detect when a new service worker is waiting to activate
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then(registration => {
      // Check if there's already a waiting worker
      if (registration.waiting) {
        setSwWaiting(registration)
      }

      // Listen for new workers that enter the waiting state
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setSwWaiting(registration)
          }
        })
      })
    })
  }, [])

  const handleUpdate = useCallback(() => {
    if (swWaiting?.waiting) {
      swWaiting.waiting.postMessage({ type: 'SKIP_WAITING' })
      setSwWaiting(null)
    }
  }, [swWaiting])

  // Restore session on mount: validate stored token, then load app data
  useEffect(() => {
    async function restoreSession() {
      const token = getToken()
      const savedUserId = localStorage.getItem('currentUserId')

      if (token && savedUserId) {
        try {
          // Validate token by fetching users — will 401 if expired/invalid
          const data = await api.getUsers()
          setUsers(data)
          const user = data.find(u => String(u.id) === savedUserId)
          if (user) {
            setCurrentUser(user)
            // Token is valid — load remaining app data
            checkBringStatus()
            checkCalendarStatus()
          } else {
            // User no longer exists
            setToken(null)
            localStorage.removeItem('currentUserId')
          }
        } catch {
          // Token invalid/expired — clear everything
          setToken(null)
          localStorage.removeItem('currentUserId')
        }
      }

      setIsRestoringSession(false)
    }

    restoreSession()
  }, [])

  // If saved tab was 'grocery' but Bring is disabled, fall back to weekly
  useEffect(() => {
    if (view === 'grocery' && bringEnabled === false) {
      setView('weekly')
    }
  }, [bringEnabled])

  // If saved tab was 'agenda' but calendar is disabled, fall back to weekly
  useEffect(() => {
    if (view === 'agenda' && calendarEnabled === false) {
      setView('weekly')
    }
  }, [calendarEnabled])

  // Persist active tab
  useEffect(() => {
    try { localStorage.setItem('activeTab', view) } catch {}
  }, [view])

  // Presentation mode auto-login
  useEffect(() => {
    if (presentationMode && !currentUser && !isAutoLoggingIn && !isRestoringSession) {
      const params = new URLSearchParams(window.location.search)
      const pin = params.get('pin')
      if (pin) {
        setIsAutoLoggingIn(true)
        handleLogin(pin).then(result => {
          setIsAutoLoggingIn(false)
          // Single-user match is handled inside handleLogin already
        })
      }
    }
  }, [presentationMode, currentUser, isRestoringSession])

  async function loadUsers() {
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  async function checkBringStatus() {
    try {
      const data = await api.getBringStatus()
      setBringEnabled(data.configured && !!data.list_uuid)
    } catch (err) {
      setBringEnabled(false)
    }
  }

  async function checkCalendarStatus() {
    try {
      const data = await api.getCalendarStatus()
      setCalendarEnabled(data.configured)
    } catch (err) {
      setCalendarEnabled(false)
    }
  }

  async function handleLogin(pin) {
    try {
      const data = await api.login(pin)
      const { users: matchedUsers, token } = data

      if (matchedUsers.length === 1 && token) {
        // Single-user match — session created server-side
        setToken(token)
        setCurrentUser(matchedUsers[0])
        localStorage.setItem('currentUserId', String(matchedUsers[0].id))
        // Load app data now that we're authenticated
        loadUsers()
        checkBringStatus()
        checkCalendarStatus()
        return matchedUsers
      }

      // Multi-user match — store PIN for selectUser call
      pendingPinRef.current = pin
      return matchedUsers
    } catch (err) {
      return null
    }
  }

  async function handleSelectUser(user) {
    const pin = pendingPinRef.current
    pendingPinRef.current = null

    if (!pin) {
      console.error('No pending PIN for user selection')
      return
    }

    try {
      const data = await api.selectUser(pin, user.id)
      setToken(data.token)
      setCurrentUser(data.user)
      localStorage.setItem('currentUserId', String(data.user.id))
      // Load app data now that we're authenticated
      loadUsers()
      checkBringStatus()
      checkCalendarStatus()
    } catch (err) {
      console.error('Failed to select user:', err)
    }
  }

  async function handleUpdateUser(updates) {
    try {
      const data = await api.updateUser(currentUser.id, updates)
      setCurrentUser(data)
      setUsers(prev => prev.map(u => u.id === data.id ? data : u))
    } catch (err) {
      console.error('Failed to update user:', err)
    }
  }

  async function handleLogout() {
    try { await api.logout() } catch {}
    setToken(null)
    setCurrentUser(null)
    localStorage.removeItem('currentUserId')
  }

  function handleComplete() {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2000)
  }

  if (isRestoringSession) {
    return null
  }

  if (!currentUser) {
    return (
      <Login 
        onLogin={handleLogin} 
        onSelectUser={handleSelectUser}
        users={users}
      />
    )
  }

  return (
    <ToastProvider>
    <div className={`min-h-screen ${presentationMode ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {showConfetti && <Confetti />}

      {/* Update available banner */}
      {swWaiting && (
        <div className="fixed top-0 left-0 right-0 z-[100] px-4 pt-[env(safe-area-inset-top)]">
          <button
            onClick={handleUpdate}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-accent-mint text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Nieuwe versie beschikbaar — tik om te updaten
          </button>
        </div>
      )}
      
      {view === 'weekly' ? (
        <WeekView 
          currentUser={currentUser}
          users={users}
          onComplete={handleComplete}
          presentationMode={presentationMode}
          onTogglePresentation={() => setPresentationMode(!presentationMode)}
          onOpenMenu={() => setShowMenu(true)}
        />
      ) : view === 'meals' ? (
        <MealsView
          users={users}
          onOpenMenu={() => setShowMenu(true)}
          presentationMode={presentationMode}
          onTogglePresentation={() => setPresentationMode(!presentationMode)}
        />
      ) : view === 'grocery' ? (
        <GroceryView
          onOpenMenu={() => setShowMenu(true)}
        />
      ) : view === 'dagschema' ? (
        <DagschemaView
          users={users}
          onBack={() => setView('weekly')}
        />
      ) : view === 'agenda' ? (
        <AgendaView
          onBack={() => setView('weekly')}
        />
      ) : (
        <SchedulesView
          currentUser={currentUser}
          users={users}
          onOpenMenu={() => setShowMenu(true)}
          presentationMode={presentationMode}
          onTogglePresentation={() => setPresentationMode(!presentationMode)}
        />
      )}

      {!presentationMode && (
        <div className="fixed bottom-0 left-0 right-0 z-30 glass border-t border-gray-200">
          <div className="flex">
            <button
              onClick={() => setView('weekly')}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                view === 'weekly' ? 'text-accent-mint' : 'text-gray-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium">Week</span>
            </button>
            <button
              onClick={() => setView('meals')}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                view === 'meals' ? 'text-accent-mint' : 'text-gray-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2v0a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
              </svg>
              <span className="text-xs font-medium">Eten</span>
            </button>
            {bringEnabled && (
              <button
                onClick={() => setView('grocery')}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  view === 'grocery' ? 'text-accent-mint' : 'text-gray-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                <span className="text-xs font-medium">Boodschappen</span>
              </button>
            )}
            <button
              onClick={() => setView('schedules')}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                view === 'schedules' ? 'text-accent-mint' : 'text-gray-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs font-medium">Schema's</span>
            </button>
          </div>
        </div>
      )}

      {showMenu && (
        <Menu 
          onClose={() => setShowMenu(false)}
          onLogout={handleLogout}
          currentUser={currentUser}
          presentationMode={presentationMode}
          onTogglePresentation={() => setPresentationMode(!presentationMode)}
          onUpdateUser={handleUpdateUser}
          onOpenStats={() => {
            setShowMenu(false)
            setShowStats(true)
          }}
          onOpenDagschema={() => {
            setShowMenu(false)
            setView('dagschema')
          }}
          onOpenAgenda={calendarEnabled ? () => {
            setShowMenu(false)
            setView('agenda')
          } : undefined}
          onOpenUserManagement={() => {
            setShowMenu(false)
            setShowUserManagement(true)
          }}
          onOpenNotifications={() => {
            setShowMenu(false)
            setShowNotifications(true)
          }}
        />
      )}

      {showStats && (
        <Stats 
          onClose={() => setShowStats(false)}
          users={users}
        />
      )}

      {showUserManagement && (
        <UserManagementView
          users={users}
          onUsersChanged={async () => {
            try {
              const data = await api.getUsers()
              setUsers(data)
              // Update currentUser if still present
              if (currentUser) {
                const updated = data.find(u => u.id === currentUser.id)
                if (updated) {
                  setCurrentUser(updated)
                } else {
                  // Current user was deleted
                  handleLogout()
                }
              }
            } catch (err) {
              console.error('Failed to reload users:', err)
            }
          }}
          onClose={() => setShowUserManagement(false)}
        />
      )}

      {showNotifications && (
        <NotificationSettings
          currentUser={currentUser}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
    </ToastProvider>
  )
}
