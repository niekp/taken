import { useState, useEffect } from 'react'
import { api } from './lib/api'
import Login from './components/Login'
import WeekView from './components/WeekView'
import IntervalTasksView from './components/IntervalTasksView'
import Menu from './components/Menu'
import Stats from './components/Stats'
import Confetti from './components/Confetti'

export default function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [view, setView] = useState('weekly') // 'weekly' | 'interval'
  const [showMenu, setShowMenu] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [presentationMode, setPresentationMode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('mode') === 'presentation'
  })
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

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

  async function handleLogin(pin) {
    try {
      const data = await api.login(pin)
      if (data.length === 1) {
        setCurrentUser(data[0])
      }
      return data
    } catch (err) {
      return null
    }
  }

  function handleSelectUser(user) {
    setCurrentUser(user)
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

  function handleLogout() {
    setCurrentUser(null)
  }

  function handleComplete() {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2000)
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
      ) : (
        <IntervalTasksView
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
              onClick={() => setView('interval')}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                view === 'interval' ? 'text-accent-mint' : 'text-gray-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs font-medium">Herhalend</span>
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
        />
      )}

      {showStats && (
        <Stats 
          onClose={() => setShowStats(false)}
          users={users}
        />
      )}
    </div>
  )
}
