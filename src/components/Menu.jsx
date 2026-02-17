import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Menu({ onClose, onLogout, currentUser, presentationMode, onTogglePresentation }) {
  const [showHistory, setShowHistory] = useState(false)
  const [completedTasks, setCompletedTasks] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  async function loadHistory() {
    setLoadingHistory(true)
    const { data } = await supabase
      .from('completed_tasks')
      .select('*, tasks(title, day_of_week), users(name)')
      .order('completed_at', { ascending: false })
      .limit(50)
    
    if (data) setCompletedTasks(data)
    setLoadingHistory(false)
  }

  function handleShowHistory() {
    setShowHistory(true)
    loadHistory()
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: presentationMode ? 'Presentatie uit' : 'Presentatie aan',
      onClick: onTogglePresentation,
      bg: 'bg-pastel-lavender/30',
      iconBg: 'bg-pastel-lavender',
    },
  ]

  const dayNames = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

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
              <div className="w-14 h-14 rounded-2xl bg-white shadow-soft flex items-center justify-center">
                <span className="text-2xl">
                  {currentUser?.name === 'Bijan' ? '👤' : '👤'}
                </span>
              </div>
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
                  if (index === 1) onClose()
                }}
                className="w-full p-4 rounded-2xl text-left flex items-center gap-4 hover:shadow-soft transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center text-gray-600`}>
                  {item.icon}
                </div>
                <span className="font-medium text-gray-700">{item.label}</span>
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
                  {completedTasks.map(ct => (
                    <div key={ct.id} className="p-4 bg-gray-50 rounded-2xl">
                      <p className="font-medium text-gray-700">{ct.tasks?.title}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-gray-400">{ct.users?.name}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          {dayNames[ct.tasks?.day_of_week]} • {new Date(ct.completed_at).toLocaleDateString('nl-NL', {
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
    </div>
  )
}
