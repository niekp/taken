import { useState, useEffect } from 'react'
import { api, isMutationQueued } from '../lib/api'
import { useToast } from '../lib/toast'
import useLiveSync from '../hooks/useLiveSync'
import ListModal from './ListModal'

export default function ListsView({ currentUser, users, onOpenMenu, onOpenList }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const toast = useToast()

  useEffect(() => {
    loadLists()
  }, [])

  async function loadLists() {
    try {
      const data = await api.getLists()
      setLists(data)
    } catch (err) {
      console.error('Failed to load lists:', err)
    }
    setLoading(false)
  }

  useLiveSync('lists', loadLists)

  async function handleCopy(list) {
    try {
      const newList = await api.copyList(list.id, `${list.title} (kopie)`)
      toast.success('Lijst gekopieerd')
      loadLists()
    } catch (err) {
      console.error('Failed to copy list:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Kopiëren mislukt')
      }
    }
  }

  async function handleDelete(list) {
    if (!confirm(`Weet je zeker dat je "${list.title}" wilt verwijderen?`)) return
    try {
      await api.deleteList(list.id)
      toast.success('Lijst verwijderd')
      loadLists()
    } catch (err) {
      console.error('Failed to delete list:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Verwijderen mislukt')
      }
    }
  }

  const notesLists = lists.filter(l => l.type === 'notes')
  const packingLists = lists.filter(l => l.type === 'packing')

  function renderListCard(list) {
    const total = list.item_count || 0
    const checked = list.checked_count || 0
    const progress = total > 0 ? Math.round((checked / total) * 100) : 0

    return (
      <div
        key={list.id}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-[0.98]"
      >
        <div
          className="p-4 cursor-pointer"
          onClick={() => onOpenList(list.id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{list.title}</p>
              <div className="flex items-center gap-2 mt-1">
                {total > 0 ? (
                  <span className="text-xs text-gray-400">
                    {checked}/{total} items
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">Geen items</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {list.type === 'packing' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(list)
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Lijst kopiëren"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(list)
                }}
                className="p-2 rounded-xl hover:bg-red-50 transition-colors"
                title="Lijst verwijderen"
              >
                <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {total > 0 && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-mint rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pastel-cream flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-pastel-mint" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pastel-cream overflow-x-hidden">
      <div className="sticky top-0 z-40 glass border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onOpenMenu} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <h1 className="text-lg font-semibold text-gray-800">Lijsten</h1>
          
          <div className="w-10" />
        </div>
      </div>

      <div className="px-4 py-4 pb-32 space-y-6">
        {lists.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-pastel-lavender/50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-pastel-lavenderDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-gray-400">Nog geen lijsten</p>
            <p className="text-gray-300 text-sm mt-1">Druk op + om een lijst toe te voegen</p>
          </div>
        ) : (
          <>
            {/* Notes section */}
            {notesLists.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Notities
                </h2>
                <div className="space-y-2">
                  {notesLists.map(renderListCard)}
                </div>
              </div>
            )}

            {/* Packing lists section */}
            {packingLists.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Paklijsten
                </h2>
                <div className="space-y-2">
                  {packingLists.map(renderListCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-br from-accent-mint to-pastel-mintDark text-white rounded-2xl shadow-soft-lg flex items-center justify-center text-2xl active:scale-95 transition-all hover:shadow-soft-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showModal && (
        <ListModal
          onClose={() => setShowModal(false)}
          onSaved={(newList) => {
            loadLists()
            if (newList) onOpenList(newList.id)
          }}
        />
      )}
    </div>
  )
}
