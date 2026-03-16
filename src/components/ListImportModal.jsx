import { useState } from 'react'
import { api, isMutationQueued } from '../lib/api'
import { useToast } from '../lib/toast'
import useKeyboardOffset from '../hooks/useKeyboardOffset'

export default function ListImportModal({ listId, onClose, onImported }) {
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const panelRef = useKeyboardOffset()

  // Preview: parse markdown to show what will be imported
  function parsePreview() {
    if (!markdown.trim()) return []
    const lines = markdown.split('\n')
    let currentCategory = ''
    const categories = {}

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const headingMatch = trimmed.match(/^#{1,2}\s+(.+)$/)
      if (headingMatch) {
        currentCategory = headingMatch[1].trim()
        if (!categories[currentCategory]) categories[currentCategory] = []
        continue
      }

      const checkMatch = trimmed.match(/^-\s*\[[ xX]?\]\s*(.+)$/)
      if (checkMatch) {
        if (!categories[currentCategory]) categories[currentCategory] = []
        categories[currentCategory].push(checkMatch[1].trim())
        continue
      }

      const listMatch = trimmed.match(/^-\s+(.+)$/)
      if (listMatch) {
        if (!categories[currentCategory]) categories[currentCategory] = []
        categories[currentCategory].push(listMatch[1].trim())
        continue
      }
    }

    return Object.entries(categories).map(([cat, items]) => ({
      category: cat,
      items,
    }))
  }

  const preview = parsePreview()
  const totalItems = preview.reduce((sum, g) => sum + g.items.length, 0)

  async function handleImport(e) {
    e.preventDefault()
    if (!markdown.trim() || totalItems === 0) return

    setLoading(true)
    try {
      await api.importListMarkdown(listId, markdown)
      toast.success(`${totalItems} items geïmporteerd`)
      onImported()
      onClose()
    } catch (err) {
      console.error('Failed to import:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
        onClose()
      } else {
        toast.error('Importeren mislukt')
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
            <h2 className="text-xl font-semibold text-gray-800">Importeren</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleImport} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Plak je lijst (markdown)
            </label>
            <textarea
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
              placeholder={"# Categorie\n- [ ] Item 1\n- [ ] Item 2\n\n# Andere categorie\n- [ ] Item 3"}
              className="input-field resize-none font-mono text-sm"
              rows={8}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              Gebruik # of ## voor categorieën en - [ ] voor items
            </p>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-gray-600">
                Voorbeeld ({totalItems} items)
              </p>
              {preview.map((group, i) => (
                <div key={i}>
                  {group.category && (
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {group.category}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {group.items.slice(0, 5).map((item, j) => (
                      <p key={j} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-4 h-4 rounded border border-gray-300 flex-shrink-0" />
                        {item}
                      </p>
                    ))}
                    {group.items.length > 5 && (
                      <p className="text-xs text-gray-400">
                        +{group.items.length - 5} meer...
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || totalItems === 0}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : totalItems > 0 ? `${totalItems} items importeren` : 'Importeren'}
          </button>
        </form>
      </div>
    </div>
  )
}
