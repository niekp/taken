import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { api, isMutationQueued } from '../lib/api'
import { useToast } from '../lib/toast'
import useLiveSync from '../hooks/useLiveSync'
import ListImportModal from './ListImportModal'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  MeasuringStrategy,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'

// ── Droppable category wrapper (makes empty categories droppable) ───
function DroppableCategory({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`space-y-1 min-h-[8px] rounded-lg transition-colors ${isOver ? 'bg-accent-mint/5' : ''}`}
    >
      {children}
    </div>
  )
}

// ── Sortable item component ────────────────────────────────────────
function SortableItem({ item, listType, onToggle, onDelete, onToTask, isDragMode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: 'item', item },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-100 group touch-manipulation"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 -ml-1 rounded-lg text-gray-300 hover:text-gray-500 touch-manipulation cursor-grab active:cursor-grabbing flex-shrink-0"
        aria-label="Versleep item"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </button>

      <button
        onClick={() => onToggle(item)}
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
        {listType === 'notes' && !item.checked && (
          <button
            onClick={() => onToTask(item)}
            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            title="Maak taak"
          >
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        )}
        <button
          onClick={() => onDelete(item)}
          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          title="Verwijderen"
        >
          <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Drag overlay item (shown while dragging) ───────────────────────
function DragOverlayItem({ item }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border-2 border-accent-mint shadow-lg opacity-90">
      <div className="p-1 -ml-1 text-gray-400">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
          <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
        </svg>
      </div>
      <div className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${
        item.checked ? 'bg-accent-mint border-accent-mint' : 'border-gray-300'
      }`}>
        {item.checked ? (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </div>
      <span className={`flex-1 text-sm ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
        {item.title}
      </span>
    </div>
  )
}

// ── Main ListView component ────────────────────────────────────────
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
  const [toTaskItem, setToTaskItem] = useState(null)
  const [taskDate, setTaskDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  // Category editing state
  const [editingCategory, setEditingCategory] = useState(null) // category name being edited
  const [editCategoryValue, setEditCategoryValue] = useState('')
  const [categoryMenu, setCategoryMenu] = useState(null) // category name whose menu is open
  const [deletingCategory, setDeletingCategory] = useState(null) // category being confirmed for deletion
  const [deleteMoveTarget, setDeleteMoveTarget] = useState('__delete__') // where to move items on delete

  // Drag state
  const [activeId, setActiveId] = useState(null)
  // Local item order for optimistic drag updates
  const [localItems, setLocalItems] = useState(null)

  const toast = useToast()
  const titleInputRef = useRef(null)
  const editCategoryRef = useRef(null)

  // Sensors: pointer with 5px activation distance, touch with 250ms delay
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  useEffect(() => {
    loadList()
  }, [listId])

  async function loadList() {
    try {
      const data = await api.getList(listId)
      setList(data)
      setTitleValue(data.title)
      // Only reset local items if we're not currently dragging
      if (!activeId) {
        setLocalItems(null)
      }
    } catch (err) {
      console.error('Failed to load list:', err)
    }
    setLoading(false)
  }

  useLiveSync('lists', loadList)

  // Use localItems during drag, otherwise use list.items
  const currentItems = localItems || list?.items || []

  // Group items by category
  const grouped = useMemo(() => {
    const groups = {}
    const order = []

    for (const item of currentItems) {
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
  }, [currentItems])

  // Build display groups including empty categories
  const displayGroups = useMemo(() => {
    const allCategories = new Set(grouped.map(g => g.category))
    Object.keys(newItemText).forEach(cat => allCategories.add(cat))

    const result = [...grouped]
    if (!allCategories.has('')) {
      result.push({ category: '', items: [], checkedCount: 0, totalCount: 0 })
    }
    for (const cat of allCategories) {
      if (!grouped.find(g => g.category === cat)) {
        result.push({ category: cat, items: [], checkedCount: 0, totalCount: 0 })
      }
    }
    return result
  }, [grouped, newItemText])

  // All item IDs for the current category (for SortableContext)
  const allItemIds = useMemo(() => currentItems.map(i => i.id), [currentItems])

  // Find the active item for DragOverlay
  const activeItem = activeId ? currentItems.find(i => i.id === activeId) : null

  // ── Handlers ─────────────────────────────────────────────────────

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
      if (isMutationQueued(err)) toast.info('Wordt gesynchroniseerd wanneer online')
      else toast.error('Naam opslaan mislukt')
    }
  }

  async function handleToggleItem(item) {
    try {
      await api.updateListItem(listId, item.id, { checked: !item.checked })
      loadList()
    } catch (err) {
      console.error('Failed to toggle item:', err)
      if (isMutationQueued(err)) toast.info('Wordt gesynchroniseerd wanneer online')
      else toast.error('Bijwerken mislukt')
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
      if (isMutationQueued(err)) toast.info('Wordt gesynchroniseerd wanneer online')
      else toast.error('Toevoegen mislukt')
    }
  }

  async function handleDeleteItem(item) {
    try {
      await api.deleteListItem(listId, item.id)
      loadList()
    } catch (err) {
      console.error('Failed to delete item:', err)
      if (isMutationQueued(err)) toast.info('Wordt gesynchroniseerd wanneer online')
      else toast.error('Verwijderen mislukt')
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
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
      if (isMutationQueued(err)) toast.info('Wordt gesynchroniseerd wanneer online')
      else toast.error('Taak aanmaken mislukt')
    }
  }

  function toggleCollapse(category) {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  // ── Category editing handlers ────────────────────────────────────

  function startRenameCategory(category) {
    setEditingCategory(category)
    setEditCategoryValue(category)
    setCategoryMenu(null)
    setTimeout(() => editCategoryRef.current?.focus(), 0)
  }

  async function handleRenameCategorySave() {
    const newName = editCategoryValue.trim()
    const oldName = editingCategory
    setEditingCategory(null)

    if (!newName || newName === oldName) return

    try {
      await api.renameListCategory(listId, oldName, newName)
      loadList()
    } catch (err) {
      console.error('Failed to rename category:', err)
      if (isMutationQueued(err)) toast.info('Wordt gesynchroniseerd wanneer online')
      else toast.error('Hernoemen mislukt')
    }
  }

  function startDeleteCategory(category) {
    setDeletingCategory(category)
    setDeleteMoveTarget('__delete__')
    setCategoryMenu(null)
  }

  async function confirmDeleteCategory() {
    const category = deletingCategory
    setDeletingCategory(null)

    try {
      if (deleteMoveTarget === '__delete__') {
        await api.deleteListCategory(listId, category)
      } else {
        await api.deleteListCategory(listId, category, deleteMoveTarget)
      }
      // Clean up local state
      setNewItemText(prev => {
        const next = { ...prev }
        delete next[category]
        return next
      })
      loadList()
    } catch (err) {
      console.error('Failed to delete category:', err)
      if (isMutationQueued(err)) toast.info('Wordt gesynchroniseerd wanneer online')
      else toast.error('Verwijderen mislukt')
    }
  }

  // ── Drag and drop handlers ──────────────────────────────────────

  function findCategoryForItem(itemId) {
    for (const group of grouped) {
      if (group.items.some(i => i.id === itemId)) {
        return group.category
      }
    }
    return null
  }

  // Check if an ID is a category droppable (prefixed with 'category:')
  function isCategoryDroppable(id) {
    return typeof id === 'string' && id.startsWith('category:')
  }

  function getCategoryFromDroppable(id) {
    return id.slice('category:'.length)
  }

  function handleDragStart(event) {
    setActiveId(event.active.id)
    // Snapshot current items for local manipulation
    setLocalItems([...currentItems])
  }

  function handleDragOver(event) {
    const { active, over } = event
    if (!over || !localItems) return

    const activeItemId = active.id
    const overId = over.id

    // Find which category the dragged item is currently in
    const activeItem = localItems.find(i => i.id === activeItemId)
    if (!activeItem) return

    let targetCategory
    let targetIndex

    if (isCategoryDroppable(overId)) {
      // Dropped over a category container (empty or as fallback)
      targetCategory = getCategoryFromDroppable(overId)
      // Place at the end
      const categoryItems = localItems.filter(i => (i.category || '') === targetCategory)
      targetIndex = categoryItems.length
    } else {
      // Dropped over another item
      const overItem = localItems.find(i => i.id === overId)
      if (!overItem) return
      targetCategory = overItem.category || ''
      const categoryItems = localItems.filter(i => (i.category || '') === targetCategory)
      targetIndex = categoryItems.findIndex(i => i.id === overId)
    }

    const currentCategory = activeItem.category || ''

    if (currentCategory === targetCategory) {
      // Same category: reorder
      const categoryItems = localItems.filter(i => (i.category || '') === currentCategory)
      const oldIndex = categoryItems.findIndex(i => i.id === activeItemId)
      if (oldIndex === targetIndex) return

      const reordered = arrayMove(categoryItems, oldIndex, targetIndex)
      // Rebuild full items list
      setLocalItems(prev => {
        const others = prev.filter(i => (i.category || '') !== currentCategory)
        return [...others, ...reordered.map((item, idx) => ({ ...item, sort_order: idx }))]
      })
    } else {
      // Cross-category: move item
      setLocalItems(prev => {
        const updated = prev.map(i =>
          i.id === activeItemId ? { ...i, category: targetCategory } : i
        )
        // Now reorder within the target category
        const targetItems = updated.filter(i => (i.category || '') === targetCategory)
        const currentIdx = targetItems.findIndex(i => i.id === activeItemId)
        const reordered = arrayMove(targetItems, currentIdx, Math.min(targetIndex, targetItems.length - 1))
        const others = updated.filter(i => (i.category || '') !== targetCategory)
        return [...others, ...reordered.map((item, idx) => ({ ...item, sort_order: idx }))]
      })
    }
  }

  async function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)

    if (!over || !localItems) {
      setLocalItems(null)
      return
    }

    // Build the reorder payload: for each category, send items with their sort_order
    const reorderPayload = []
    const categoryGroups = {}

    for (const item of localItems) {
      const cat = item.category || ''
      if (!categoryGroups[cat]) categoryGroups[cat] = []
      categoryGroups[cat].push(item)
    }

    for (const [cat, items] of Object.entries(categoryGroups)) {
      items.forEach((item, idx) => {
        reorderPayload.push({ id: item.id, category: cat, sort_order: idx })
      })
    }

    try {
      await api.reorderListItems(listId, reorderPayload)
      setLocalItems(null)
      loadList()
    } catch (err) {
      console.error('Failed to reorder items:', err)
      setLocalItems(null)
      loadList()
      if (isMutationQueued(err)) toast.info('Wordt gesynchroniseerd wanneer online')
      else toast.error('Herschikken mislukt')
    }
  }

  function handleDragCancel() {
    setActiveId(null)
    setLocalItems(null)
  }

  // Custom collision detection: prefer items (pointerWithin), fall back to rect intersection for empty containers
  const collisionDetection = useCallback((args) => {
    // First try pointer within (precise for items)
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions

    // Fall back to rect intersection (catches empty droppable categories)
    return rectIntersection(args)
  }, [])

  // ── Render ───────────────────────────────────────────────────────

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

  // Get categories for delete modal dropdown (excluding the one being deleted)
  const categoriesForMove = displayGroups
    .map(g => g.category)
    .filter(c => c !== deletingCategory)

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
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        >
          <div className="space-y-5">
            {displayGroups.map(group => {
              const isCollapsed = collapsedCategories[group.category]
              const itemIds = group.items.map(i => i.id)
              const droppableId = `category:${group.category}`

              return (
                <div key={group.category || '__uncategorized'}>
                  {/* Category header */}
                  {group.category ? (
                    editingCategory === group.category ? (
                      /* Inline rename */
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <input
                          ref={editCategoryRef}
                          type="text"
                          value={editCategoryValue}
                          onChange={e => setEditCategoryValue(e.target.value)}
                          onBlur={handleRenameCategorySave}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameCategorySave()
                            if (e.key === 'Escape') setEditingCategory(null)
                          }}
                          className="text-sm font-semibold text-gray-600 uppercase tracking-wider bg-white border border-accent-mint rounded-lg px-2 py-1 outline-none flex-1"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-2 px-1 relative">
                        <button
                          onClick={() => toggleCollapse(group.category)}
                          className="flex items-center gap-2 flex-1 text-left"
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

                        {/* Category menu button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCategoryMenu(categoryMenu === group.category ? null : group.category)
                          }}
                          className="p-1 rounded-lg hover:bg-white/60 transition-colors"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="6" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="18" r="2" />
                          </svg>
                        </button>

                        {/* Category dropdown menu */}
                        {categoryMenu === group.category && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setCategoryMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 z-50 py-1 min-w-[160px]">
                              <button
                                onClick={() => startRenameCategory(group.category)}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Hernoemen
                              </button>
                              <button
                                onClick={() => startDeleteCategory(group.category)}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Verwijderen
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  ) : displayGroups.length > 1 ? (
                    <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                      Overig
                    </h2>
                  ) : null}

                  {!isCollapsed && (
                    <DroppableCategory id={droppableId}>
                      <SortableContext
                        items={itemIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {/* Items */}
                        {group.items.map(item => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            listType={list.type}
                            onToggle={handleToggleItem}
                            onDelete={handleDeleteItem}
                            onToTask={handleItemToTask}
                          />
                        ))}
                      </SortableContext>

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
                    </DroppableCategory>
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

          {/* Drag overlay */}
          <DragOverlay>
            {activeItem ? <DragOverlayItem item={activeItem} /> : null}
          </DragOverlay>
        </DndContext>
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

      {/* Delete category confirmation modal */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-end z-50" onClick={() => setDeletingCategory(null)}>
          <div
            className="bg-white rounded-t-3xl w-full shadow-soft-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Categorie verwijderen</h2>
                <button onClick={() => setDeletingCategory(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Wat wil je doen met de items in <strong>{deletingCategory}</strong>?
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="deleteAction"
                    checked={deleteMoveTarget === '__delete__'}
                    onChange={() => setDeleteMoveTarget('__delete__')}
                    className="text-accent-mint"
                  />
                  <span className="text-sm text-gray-700">Items verwijderen</span>
                </label>

                {categoriesForMove.map(cat => (
                  <label key={cat || '__uncategorized'} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="deleteAction"
                      checked={deleteMoveTarget === cat}
                      onChange={() => setDeleteMoveTarget(cat)}
                      className="text-accent-mint"
                    />
                    <span className="text-sm text-gray-700">
                      Verplaats naar <strong>{cat || 'Overig'}</strong>
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingCategory(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  onClick={confirmDeleteCategory}
                  className="flex-1 py-3 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
