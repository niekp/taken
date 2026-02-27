import { useState, useRef } from 'react'
import { api } from '../lib/api'
import { getUserColor } from '../lib/colors'

export default function Menu({ onClose, onLogout, currentUser, presentationMode, onTogglePresentation, onUpdateUser, onOpenStats, onOpenDagschema }) {
  const [showHistory, setShowHistory] = useState(false)
  const [completedTasks, setCompletedTasks] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showChangePin, setShowChangePin] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const fileInputRef = useRef(null)

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const data = await api.getHistory(50)
      setCompletedTasks(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
    setLoadingHistory(false)
  }

  function handleShowHistory() {
    setShowHistory(true)
    loadHistory()
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target.result
      if (onUpdateUser) {
        await onUpdateUser({ avatar_url: base64 })
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleRemoveAvatar() {
    if (onUpdateUser) {
      await onUpdateUser({ avatar_url: null })
    }
  }

  async function handleChangePin(e) {
    e.preventDefault()
    setPinError('')
    setPinSuccess(false)

    if (!/^\d{4}$/.test(newPin)) {
      setPinError('PIN moet precies 4 cijfers zijn')
      return
    }
    if (newPin !== confirmPin) {
      setPinError('Nieuwe PINs komen niet overeen')
      return
    }

    setChangingPin(true)
    try {
      await api.changePin(currentUser.id, currentPin, newPin)
      setPinSuccess(true)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setTimeout(() => {
        setShowChangePin(false)
        setPinSuccess(false)
      }, 1500)
    } catch (err) {
      setPinError(err.message === 'Current PIN is incorrect' ? 'Huidige PIN is onjuist' : 'Er is iets misgegaan')
    }
    setChangingPin(false)
  }

  const menuItems = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      label: 'Voltooide taken',
      onClick: handleShowHistory,
      bg: 'bg-pastel-mint/30',
      iconBg: 'bg-pastel-mint',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      label: 'Dagschema',
      onClick: onOpenDagschema,
      bg: 'bg-pastel-sky/30',
      iconBg: 'bg-pastel-sky',
      closeOnClick: true,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: presentationMode ? 'Presentatie uit' : 'Presentatie aan',
      onClick: onTogglePresentation,
      bg: 'bg-pastel-lavender/30',
      iconBg: 'bg-pastel-lavender',
      closeOnClick: true,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: (
        <span className="flex items-center gap-2">
          Statistieken
          <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-medium">BETA</span>
        </span>
      ),
      onClick: onOpenStats,
      bg: 'bg-pastel-peach/30',
      iconBg: 'bg-pastel-peach',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      label: 'PIN wijzigen',
      onClick: () => setShowChangePin(true),
      bg: 'bg-pastel-sky/30',
      iconBg: 'bg-pastel-sky',
    },
    ...(currentUser?.avatar_url ? [{
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      label: 'Verwijder profielfoto',
      onClick: handleRemoveAvatar,
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      textColor: 'text-red-500',
    }] : []),
  ]


  return (
    <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-50 flex" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-sm ml-auto h-full shadow-soft-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Menu</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="bg-gradient-to-br from-pastel-mint/50 to-pastel-lavender/30 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="relative group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-soft flex items-center justify-center overflow-hidden">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className={`w-full h-full flex items-center justify-center text-lg font-semibold text-white ${getUserColor(currentUser).bg}`}>
                      {currentUser?.name?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div>
                <p className="text-xs text-gray-500">Ingelogd als</p>
                <p className="text-lg font-semibold text-gray-800">{currentUser?.name}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick()
                  if (item.closeOnClick) onClose()
                }}
                className="w-full p-4 rounded-2xl text-left flex items-center gap-4 hover:shadow-soft transition-all duration-200 active:bg-gray-50"
              >
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center text-gray-600`}>
                  {item.icon}
                </div>
                <span className={`font-medium ${item.textColor || 'text-gray-700'}`}>{item.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onLogout}
            className="w-full p-4 rounded-2xl text-left flex items-center gap-4 hover:bg-red-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-500 group-hover:bg-red-200 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="font-medium text-red-500">Uitloggen</span>
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-[60]" onClick={() => setShowHistory(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto absolute bottom-0 shadow-soft-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">Voltooide taken</h2>
              <button onClick={() => setShowHistory(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin w-6 h-6 text-accent-mint" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : completedTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-400">Nog geen voltooide taken</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTasks.map(task => (
                    <div key={task.id} className="p-4 bg-gray-50 rounded-2xl">
                      <p className="font-medium text-gray-700">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">{task.completed_by_name}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          {new Date(task.completed_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showChangePin && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-[60]" onClick={() => setShowChangePin(false)}>
          <div 
            className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto absolute bottom-0 shadow-soft-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">PIN wijzigen</h2>
              <button onClick={() => setShowChangePin(false)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleChangePin} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Huidige PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="input-field text-center text-2xl tracking-[0.5em]"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Nieuwe PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="input-field text-center text-2xl tracking-[0.5em]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Bevestig nieuwe PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="****"
                  className="input-field text-center text-2xl tracking-[0.5em]"
                  required
                />
              </div>

              {pinError && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 py-2 px-4 rounded-xl">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {pinError}
                </div>
              )}

              {pinSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 py-2 px-4 rounded-xl">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  PIN is gewijzigd!
                </div>
              )}

              <button
                type="submit"
                disabled={changingPin || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
                className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPin ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'PIN wijzigen'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
