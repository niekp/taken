import { useState } from 'react'
import { api, isMutationQueued } from '../lib/api'
import { useToast } from '../lib/toast'
import useKeyboardOffset from '../hooks/useKeyboardOffset'

export default function ListModal({ onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('notes')
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const panelRef = useKeyboardOffset()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const list = await api.createList({
        title: title.trim(),
        type,
      })
      toast.success('Lijst aangemaakt')
      onSaved(list)
      onClose()
    } catch (err) {
      console.error('Failed to create list:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
        onClose()
      } else {
        toast.error('Aanmaken mislukt')
      }
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div
        ref={panelRef}
        className="bg-white rounded-t-3xl w-full max-h-[90vh] max-h-[90dvh] overflow-y-auto shadow-soft-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Nieuwe lijst</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('notes')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  type === 'notes'
                    ? 'bg-accent-mint text-white shadow-soft'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notities
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType('packing')}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                  type === 'packing'
                    ? 'bg-accent-mint text-white shadow-soft'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Paklijst
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Naam</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === 'packing' ? 'Bijv. 2026 - Landal Warsberg' : 'Bijv. Verhuizing'}
              className="input-field"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Lijst aanmaken'}
          </button>
        </form>
      </div>
    </div>
  )
}
