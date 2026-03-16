import { getDb } from '../db.js'

/**
 * Get all cached grocery items, ordered by status then sort_order.
 * Returns { purchase: [...], recently: [...] }
 */
export function getItems() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT uuid, item_id, specification, image_url, status, sort_order
    FROM grocery_items
    ORDER BY status, sort_order
  `).all()

  const purchase = rows.filter(r => r.status === 'purchase').map(toItem)
  const recently = rows.filter(r => r.status === 'recently').map(toItem)
  return { purchase, recently }
}

/**
 * Check if we have any cached data at all.
 */
export function hasCachedData() {
  const db = getDb()
  const row = db.prepare('SELECT COUNT(*) as count FROM grocery_items').get()
  return row.count > 0
}

/**
 * Replace all cached items with fresh data from Bring.
 * This is a full sync — delete everything and re-insert.
 * Runs in a transaction for atomicity.
 */
export function replaceAll(purchase, recently) {
  const db = getDb()
  const now = new Date().toISOString()

  const insert = db.prepare(`
    INSERT INTO grocery_items (uuid, item_id, specification, image_url, status, sort_order, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  db.transaction(() => {
    db.prepare('DELETE FROM grocery_items').run()

    purchase.forEach((item, idx) => {
      insert.run(
        item.uuid || `purchase-${idx}`,
        item.itemId,
        item.specification || '',
        item.imageUrl || null,
        'purchase',
        idx,
        now
      )
    })

    recently.forEach((item, idx) => {
      insert.run(
        item.uuid || `recently-${idx}`,
        item.itemId,
        item.specification || '',
        item.imageUrl || null,
        'recently',
        idx,
        now
      )
    })
  })()
}

/**
 * Get the last sync timestamp (most recent synced_at).
 */
export function getLastSyncTime() {
  const db = getDb()
  const row = db.prepare('SELECT MAX(synced_at) as last_sync FROM grocery_items').get()
  return row?.last_sync || null
}

// Map DB row to item shape matching what the frontend expects
function toItem(row) {
  return {
    uuid: row.uuid,
    itemId: row.item_id,
    specification: row.specification,
    imageUrl: row.image_url,
  }
}
