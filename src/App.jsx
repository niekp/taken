import { useState, useEffect } from 'react'
import { api } from './lib/api'
import Login from './components/Login'
import WeekView from './components/WeekView'
import SchedulesView from './components/SchedulesView'
import MealsView from './components/MealsView'
import BoodschappenView from './components/BoodschappenView'
import DagschemaView from './components/DagschemaView'
import Menu from './components/Menu'
import Stats from './components/Stats'
import Confetti from './components/Confetti'
import UserManagementView from './components/UserManagementView'
import NotificationSettings from './components/NotificationSettings'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [view, setView] = useState('weekly') // 'weekly' | 'meals' | 'schedules' | 'boodschappen' | 'dagschema'
  const [showMenu, setShowMenu] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [bringEnabled, setBringEnabled] = useState(false)
  const [presentationMode, setPresentationMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') === 'presentation'
  })
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(true)

  useEffect(() => {
    loadUsers()
    checkBringStatus()
  }, [])

  // Restore session from localStorage once users are loaded
  useEffect(() => {
    if (users.length === 0) return
    const savedUserId = localStorage.getItem('currentUserId')
    if (savedUserId && !currentUser) {
      const user = users.find(u => String(u.id) === savedUserId)
      if (user) {
        setCurrentUser(user)
      } else {
        localStorage.removeItem('currentUserId')
      }
    }
    setIsRestoringSession(false)
  }, [users])

  useEffect(() => {
    if (presentationMode && users.length > 0) {
      const params = new URLSearchParams(window.location.search)
      const pin = params.get('pin')
      if (pin && !currentUser && !isAutoLoggingIn) {
        setIsAutoLoggingIn(true)
        handleLogin(pin).then(matched => {
          setIsAutoLoggingIn(false)
          if (matched && matched.length > 0) {
            if (matched.length === 1) {
              setCurrentUser(matched[0])
            }
          }
        })
      }
    }
  }, [presentationMode, users, currentUser])

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
      // Bring not available
    }
  }

  async function handleLogin(pin) {
    try {
      const data = await api.login(pin)
      if (data.length === 1) {
        setCurrentUser(data[0])
        localStorage.setItem('currentUserId', String(data[0].id))
      }
      return data
    } catch (err) {
      return null
    }
  }

  function handleSelectUser(user) {
    setCurrentUser(user)
    localStorage.setItem('currentUserId', String(user.id))
  }

  async function handleUpdateUser(updates) {
    try {
      const data = await api.updateUser(currentUser.id, updates)
      setCurrentUser(data)
      setUsers(users.map(u => u.id === data.id ? data : u))
    } catch (err) {
      console.error('Failed to update user:', err)
    }
  }

  async function handleLogout() {
    setCurrentUser(null)
    localStorage.removeItem('currentUserId')

    // Unregister service worker so the next load gets a fresh one
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        await reg.unregister()
      }
    }
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
    <div className={`min-h-screen ${presentationMode ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {showConfetti && <Confetti />}
      
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
          onOpenMenu={() => setShowMenu(true)}
          presentationMode={presentationMode}
          onTogglePresentation={() => setPresentationMode(!presentationMode)}
        />
      ) : view === 'boodschappen' ? (
        <BoodschappenView
          onOpenMenu={() => setShowMenu(true)}
        />
      ) : view === 'dagschema' ? (
        <DagschemaView
          users={users}
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
                onClick={() => setView('boodschappen')}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                  view === 'boodschappen' ? 'text-accent-mint' : 'text-gray-400'
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
  )
}
