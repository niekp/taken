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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-sm ml-auto h-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Menu</h2>
          <button onClick={onClose} className="p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* User Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Ingelogd als</p>
            <p className="text-lg font-medium">{currentUser.name}</p>
          </div>

          {/* Menu Options */}
          <button
            onClick={handleShowHistory}
            className="w-full p-4 bg-gray-50 rounded-xl text-left flex items-center gap-3"
          >
            <span className="text-xl">✓</span>
            <span>Voltooide taken</span>
          </button>

          <button
            onClick={onTogglePresentation}
            className="w-full p-4 bg-gray-50 rounded-xl text-left flex items-center gap-3"
          >
            <span className="text-xl">🖥️</span>
            <span>{presentationMode ? 'Presentatie uit' : 'Presentatie aan'}</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full p-4 bg-red-50 text-red-600 rounded-xl text-left flex items-center gap-3"
          >
            <span className="text-xl">🚪</span>
            <span>Uitloggen</span>
          </button>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowHistory(false)}>
          <div 
            className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold">Voltooide taken</h2>
              <button onClick={() => setShowHistory(false)} className="p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4">
              {loadingHistory ? (
                <p className="text-center text-gray-500">Laden...</p>
              ) : completedTasks.length === 0 ? (
                <p className="text-center text-gray-500">Nog geen voltooide taken</p>
              ) : (
                <div className="space-y-2">
                  {completedTasks.map(ct => (
                    <div key={ct.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-medium">{ct.tasks?.title}</p>
                      <p className="text-sm text-gray-500">
                        {ct.users?.name} • {new Date(ct.completed_at).toLocaleDateString('nl-NL', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
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
