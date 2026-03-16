import { useState, useEffect, useRef } from 'react'
import { api, isMutationQueued } from '../lib/api'
import { useToast } from '../lib/toast'
import useLiveSync from '../hooks/useLiveSync'
import ListImportModal from './ListImportModal'

export default function ListView({ listId, currentUser, users, onBack }) {
  const [list, setList] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [newItemText, setNewItemText] = useState({}) // { [category]: text }
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState({})
  const [toTaskItem, setToTaskItem] = useState(null) // item being converted to task
  const [taskDate, setTaskDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const toast = useToast()
  const titleInputRef = useRef(null)

  useEffect(() => {
    loadList()
  }, [listId])

  async function loadList() {
    try {
      const data = await api.getList(listId)
      setList(data)
      setTitleValue(data.title)
    } catch (err) {
      console.error('Failed to load list:', err)
    }
    setLoading(false)
  }

  useLiveSync('lists', loadList)

  // Group items by category
  function getGroupedItems() {
    if (!list?.items) return []
    const groups = {}
    const order = []

    for (const item of list.items) {
      const cat = item.category || ''
      if (!groups[cat]) {
        groups[cat] = []
        order.push(cat)
      }
      groups[cat].push(item)
    }

    return order.map(cat => ({
      category: cat,
      items: groups[cat],
      checkedCount: groups[cat].filter(i => i.checked).length,
      totalCount: groups[cat].length,
    }))
  }

  async function handleTitleSave() {
    if (!titleValue.trim() || titleValue.trim() === list.title) {
      setEditingTitle(false)
      setTitleValue(list.title)
      return
    }
    try {
      await api.updateList(listId, { title: titleValue.trim() })
      setEditingTitle(false)
      loadList()
    } catch (err) {
      console.error('Failed to update title:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Naam opslaan mislukt')
      }
    }
  }

  async function handleToggleItem(item) {
    try {
      await api.updateListItem(listId, item.id, { checked: !item.checked })
      loadList()
    } catch (err) {
      console.error('Failed to toggle item:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Bijwerken mislukt')
      }
    }
  }

  async function handleAddItem(category) {
    const text = (newItemText[category] || '').trim()
    if (!text) return

    try {
      await api.addListItem(listId, { title: text, category })
      setNewItemText(prev => ({ ...prev, [category]: '' }))
      loadList()
    } catch (err) {
      console.error('Failed to add item:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Toevoegen mislukt')
      }
    }
  }

  async function handleDeleteItem(item) {
    try {
      await api.deleteListItem(listId, item.id)
      loadList()
    } catch (err) {
      console.error('Failed to delete item:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Verwijderen mislukt')
      }
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    // Create a category by adding a placeholder — just track it.
    // We add the category to newItemText so the section appears.
    setNewItemText(prev => ({ ...prev, [newCategoryName.trim()]: '' }))
    setNewCategoryName('')
    setAddingCategory(false)
  }

  async function handleItemToTask(item) {
    setToTaskItem(item)
  }

  async function confirmItemToTask() {
    if (!toTaskItem || !taskDate) return
    try {
      await api.listItemToTask(listId, toTaskItem.id, {
        date: taskDate,
        is_both: true,
      })
      toast.success('Taak aangemaakt')
      setToTaskItem(null)
      loadList()
    } catch (err) {
      console.error('Failed to create task:', err)
      if (isMutationQueued(err)) {
        toast.info('Wordt gesynchroniseerd wanneer online')
      } else {
        toast.error('Taak aanmaken mislukt')
      }
    }
  }

  function toggleCollapse(category) {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const grouped = getGroupedItems()

  // Collect categories that exist in items, plus any from newItemText
  const allCategories = new Set(grouped.map(g => g.category))
  Object.keys(newItemText).forEach(cat => allCategories.add(cat))

  // Build the final display groups (include empty categories from newItemText)
  // Always ensure at least the uncategorized group exists so the add-item input is visible
  const displayGroups = [...grouped]
  if (!allCategories.has('')) {
    displayGroups.push({ category: '', items: [], checkedCount: 0, totalCount: 0 })
  }
  for (const cat of allCategories) {
    if (!grouped.find(g => g.category === cat)) {
      displayGroups.push({ category: cat, items: [], checkedCount: 0, totalCount: 0 })
    }
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

  if (!list) {
    return (
      <div className="min-h-screen bg-pastel-cream flex items-center justify-center">
        <p className="text-gray-400">Lijst niet gevonden</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pastel-cream overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="p-2.5 rounded-xl hover:bg-white/60 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex-1 text-center mx-2">
            {editingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleTitleSave()
                  if (e.key === 'Escape') {
                    setEditingTitle(false)
                    setTitleValue(list.title)
                  }
                }}
                className="text-lg font-semibold text-gray-800 bg-transparent border-b-2 border-accent-mint outline-none text-center w-full"
                autoFocus
              />
            ) : (
              <h1
                className="text-lg font-semibold text-gray-800 cursor-pointer"
                onClick={() => {
                  setEditingTitle(true)
                  setTimeout(() => titleInputRef.current?.focus(), 0)
                }}
              >
                {list.title}
              </h1>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {list.type === 'packing' ? 'Paklijst' : 'Notities'}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            {list.type === 'packing' && (
              <button
                onClick={() => setShowImport(true)}
                className="p-2.5 rounded-xl hover:bg-white/60 transition-colors"
                title="Importeren"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-32">
          <div className="space-y-5">
            {displayGroups.map(group => {
              const isCollapsed = collapsedCategories[group.category]

              return (
                <div key={group.category || '__uncategorized'}>
                  {/* Category header */}
                  {group.category ? (
                    <button
                      onClick={() => toggleCollapse(group.category)}
                      className="flex items-center gap-2 mb-2 px-1 w-full text-left"
                    >
                      <svg
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        {group.category}
                      </h2>
                      {group.totalCount > 0 && (
                        <span className="text-xs text-gray-300">
                          {group.checkedCount}/{group.totalCount}
                        </span>
                      )}
                    </button>
                  ) : displayGroups.length > 1 ? (
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                      Overig
                    </h2>
                  ) : null}

                  {!isCollapsed && (
                    <div className="space-y-1">
                      {/* Items */}
                      {group.items.map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100 group"
                        >
                          <button
                            onClick={() => handleToggleItem(item)}
                            className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                              item.checked
                                ? 'bg-accent-mint border-accent-mint'
                                : 'border-gray-300 hover:border-accent-mint'
                            }`}
                          >
                            {item.checked ? (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : null}
                          </button>
                          <span className={`flex-1 text-sm ${
                            item.checked ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}>
                            {item.title}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {list.type === 'notes' && !item.checked && (
                              <button
                                onClick={() => handleItemToTask(item)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Maak taak"
                              >
                                <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                              title="Verwijderen"
                            >
                              <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add item input */}
                      <div className="flex items-center gap-2 px-1 mt-1">
                        <input
                          type="text"
                          value={newItemText[group.category] || ''}
                          onChange={e => setNewItemText(prev => ({ ...prev, [group.category]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddItem(group.category)
                          }}
                          placeholder="Item toevoegen..."
                          className="flex-1 text-sm bg-transparent border-b border-gray-200 py-1.5 outline-none focus:border-accent-mint text-gray-600 placeholder:text-gray-300 transition-colors"
                        />
                        {(newItemText[group.category] || '').trim() && (
                          <button
                            onClick={() => handleAddItem(group.category)}
                            className="p-1 rounded-lg text-accent-mint hover:bg-mint-50 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add new category */}
            {addingCategory ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddCategory()
                    if (e.key === 'Escape') {
                      setAddingCategory(false)
                      setNewCategoryName('')
                    }
                  }}
                  placeholder="Naam categorie..."
                  className="input-field flex-1"
                  autoFocus
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-3 py-2 rounded-xl text-sm font-medium bg-accent-mint text-white disabled:opacity-50"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => {
                    setAddingCategory(false)
                    setNewCategoryName('')
                  }}
                  className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100"
                >
                  Annuleren
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingCategory(true)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 px-1 py-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Categorie toevoegen
              </button>
            )}
          </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <ListImportModal
          listId={listId}
          onClose={() => setShowImport(false)}
          onImported={loadList}
        />
      )}

      {/* "To task" modal */}
      {toTaskItem && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-50" onClick={() => setToTaskItem(null)}>
          <div
            className="bg-white rounded-t-3xl w-full shadow-soft-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Maak taak</h2>
                <button onClick={() => setToTaskItem(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-700">{toTaskItem.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Datum</label>
                <input
                  type="date"
                  value={taskDate}
                  onChange={e => setTaskDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <button
                onClick={confirmItemToTask}
                className="btn-primary w-full py-4 text-base"
              >
                Taak aanmaken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
