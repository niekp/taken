import { getDb, generateId } from '../db.js'

/**
 * Get all lists, optionally filtered by type.
 * Includes item counts (total and checked).
 */
export function findAll(type) {
  const db = getDb()
  let query = `
    SELECT l.*,
      COUNT(li.id) AS item_count,
      SUM(CASE WHEN li.checked = 1 THEN 1 ELSE 0 END) AS checked_count
    FROM lists l
    LEFT JOIN list_items li ON li.list_id = l.id
  `
  const params = []
  if (type) {
    query += ' WHERE l.type = ?'
    params.push(type)
  }
  query += ' GROUP BY l.id ORDER BY l.created_at DESC'
  return db.prepare(query).all(...params)
}

/**
 * Get a single list by ID, including all its items.
 */
export function findById(id) {
  const db = getDb()
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(id)
  if (!list) return null

  const items = db.prepare(`
    SELECT * FROM list_items
    WHERE list_id = ?
    ORDER BY category ASC, sort_order ASC, created_at ASC
  `).all(id)

  return { ...list, items }
}

/**
 * Create a new list.
 */
export function create({ title, type, created_by }) {
  const db = getDb()
  const id = generateId()
  db.prepare(`
    INSERT INTO lists (id, title, type, created_by)
    VALUES (?, ?, ?, ?)
  `).run(id, title, type, created_by || null)
  return findById(id)
}

/**
 * Update a list's title.
 */
export function update(id, { title }) {
  const db = getDb()
  db.prepare('UPDATE lists SET title = ? WHERE id = ?').run(title, id)
  return findById(id)
}

/**
 * Delete a list (items cascade).
 */
export function remove(id) {
  const db = getDb()
  const result = db.prepare('DELETE FROM lists WHERE id = ?').run(id)
  return result.changes > 0
}

/**
 * Copy a list: create a new list with all items unchecked.
 */
export function copy(id, newTitle) {
  const db = getDb()
  const original = findById(id)
  if (!original) return null

  const newId = generateId()
  db.prepare(`
    INSERT INTO lists (id, title, type, created_by)
    VALUES (?, ?, ?, ?)
  `).run(newId, newTitle, original.type, original.created_by)

  const insertItem = db.prepare(`
    INSERT INTO list_items (id, list_id, title, category, checked, sort_order)
    VALUES (?, ?, ?, ?, 0, ?)
  `)

  const copyAll = db.transaction(() => {
    for (const item of original.items) {
      insertItem.run(generateId(), newId, item.title, item.category, item.sort_order)
    }
  })
  copyAll()

  return findById(newId)
}

// ── Item operations ────────────────────────────────────────────────

/**
 * Add an item to a list.
 */
export function addItem(listId, { title, category, sort_order }) {
  const db = getDb()
  const id = generateId()

  // If no sort_order given, append at the end of the category
  let order = sort_order
  if (order === undefined || order === null) {
    const max = db.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) AS max_order
      FROM list_items WHERE list_id = ? AND category = ?
    `).get(listId, category || '')
    order = (max?.max_order ?? -1) + 1
  }

  db.prepare(`
    INSERT INTO list_items (id, list_id, title, category, checked, sort_order)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(id, listId, title, category || '', order)

  return db.prepare('SELECT * FROM list_items WHERE id = ?').get(id)
}

/**
 * Update an item (title, category, checked, sort_order).
 */
export function updateItem(itemId, updates) {
  const db = getDb()
  const fields = []
  const values = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title)
  }
  if (updates.category !== undefined) {
    fields.push('category = ?')
    values.push(updates.category)
  }
  if (updates.checked !== undefined) {
    fields.push('checked = ?')
    values.push(updates.checked ? 1 : 0)
  }
  if (updates.sort_order !== undefined) {
    fields.push('sort_order = ?')
    values.push(updates.sort_order)
  }

  if (fields.length === 0) return db.prepare('SELECT * FROM list_items WHERE id = ?').get(itemId)

  values.push(itemId)
  db.prepare(`UPDATE list_items SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  return db.prepare('SELECT * FROM list_items WHERE id = ?').get(itemId)
}

/**
 * Delete an item.
 */
export function removeItem(itemId) {
  const db = getDb()
  const result = db.prepare('DELETE FROM list_items WHERE id = ?').run(itemId)
  return result.changes > 0
}

/**
 * Rename a category: update the category field on all items in a list
 * that belong to the old category.
 */
export function renameCategory(listId, oldName, newName) {
  const db = getDb()
  db.prepare(`
    UPDATE list_items SET category = ?
    WHERE list_id = ? AND category = ?
  `).run(newName, listId, oldName)
  return findById(listId)
}

/**
 * Delete a category: either delete all its items or move them to another category.
 */
export function deleteCategory(listId, category, moveTo) {
  const db = getDb()
  if (moveTo !== undefined && moveTo !== null) {
    // Move items to another category (append at end of that category's sort_order)
    const max = db.prepare(`
      SELECT COALESCE(MAX(sort_order), -1) AS max_order
      FROM list_items WHERE list_id = ? AND category = ?
    `).get(listId, moveTo)
    let nextOrder = (max?.max_order ?? -1) + 1

    const items = db.prepare(`
      SELECT id FROM list_items
      WHERE list_id = ? AND category = ?
      ORDER BY sort_order ASC
    `).all(listId, category)

    const updateStmt = db.prepare('UPDATE list_items SET category = ?, sort_order = ? WHERE id = ?')
    const doMove = db.transaction(() => {
      for (const item of items) {
        updateStmt.run(moveTo, nextOrder++, item.id)
      }
    })
    doMove()
  } else {
    // Delete all items in the category
    db.prepare('DELETE FROM list_items WHERE list_id = ? AND category = ?').run(listId, category)
  }
  return findById(listId)
}

/**
 * Bulk reorder items: accepts an array of { id, category, sort_order }.
 * Used for drag-and-drop reordering within and between categories.
 */
export function reorderItems(listId, items) {
  const db = getDb()
  const updateStmt = db.prepare('UPDATE list_items SET category = ?, sort_order = ? WHERE id = ? AND list_id = ?')
  const doReorder = db.transaction(() => {
    for (const item of items) {
      updateStmt.run(item.category, item.sort_order, item.id, listId)
    }
  })
  doReorder()
  return findById(listId)
}

/**
 * Import markdown text into a list.
 * Parses # and ## headings as categories, and - [ ] / - [x] as items.
 * Returns the updated list.
 */
export function importMarkdown(listId, markdown) {
  const db = getDb()
  const lines = markdown.split('\n')
  let currentCategory = ''
  let sortOrder = 0

  // Get current max sort_order per category so we append
  const existingMax = db.prepare(`
    SELECT category, MAX(sort_order) AS max_order
    FROM list_items WHERE list_id = ?
    GROUP BY category
  `).all(listId)
  const maxOrders = {}
  for (const row of existingMax) {
    maxOrders[row.category] = row.max_order
  }

  const insertItem = db.prepare(`
    INSERT INTO list_items (id, list_id, title, category, checked, sort_order)
    VALUES (?, ?, ?, ?, 0, ?)
  `)

  const doImport = db.transaction(() => {
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      // Heading: # or ## -> category
      const headingMatch = trimmed.match(/^#{1,2}\s+(.+)$/)
      if (headingMatch) {
        currentCategory = headingMatch[1].trim()
        if (maxOrders[currentCategory] === undefined) {
          maxOrders[currentCategory] = -1
        }
        continue
      }

      // Checklist item: - [ ] or - [x]
      const checkMatch = trimmed.match(/^-\s*\[[ xX]?\]\s*(.+)$/)
      if (checkMatch) {
        const itemTitle = checkMatch[1].trim()
        if (!itemTitle) continue
        maxOrders[currentCategory] = (maxOrders[currentCategory] ?? -1) + 1
        insertItem.run(generateId(), listId, itemTitle, currentCategory, maxOrders[currentCategory])
        continue
      }

      // Plain list item: - text
      const listMatch = trimmed.match(/^-\s+(.+)$/)
      if (listMatch) {
        const itemTitle = listMatch[1].trim()
        if (!itemTitle) continue
        maxOrders[currentCategory] = (maxOrders[currentCategory] ?? -1) + 1
        insertItem.run(generateId(), listId, itemTitle, currentCategory, maxOrders[currentCategory])
        continue
      }
    }
  })
  doImport()

  return findById(listId)
}
