import { getDb } from '../db.js'

export function getConfig() {
  const db = getDb()
  return db.prepare('SELECT * FROM bring_config WHERE id = 1').get() || null
}

export function saveConfig({ email, password, list_uuid, list_name }) {
  const db = getDb()
  const existing = getConfig()

  if (existing) {
    db.prepare(`
      UPDATE bring_config
      SET email = ?, password = ?, list_uuid = ?, list_name = ?
      WHERE id = 1
    `).run(email, password, list_uuid || null, list_name || null)
  } else {
    db.prepare(`
      INSERT INTO bring_config (id, email, password, list_uuid, list_name)
      VALUES (1, ?, ?, ?, ?)
    `).run(email, password, list_uuid || null, list_name || null)
  }

  return getConfig()
}

export function updateTokens({ uuid, public_uuid, access_token, refresh_token, expires_at, country }) {
  const db = getDb()
  db.prepare(`
    UPDATE bring_config
    SET uuid = ?, public_uuid = ?, access_token = ?, refresh_token = ?, expires_at = ?, country = ?
    WHERE id = 1
  `).run(uuid, public_uuid, access_token, refresh_token, expires_at, country)
}

export function setList(list_uuid, list_name) {
  const db = getDb()
  db.prepare('UPDATE bring_config SET list_uuid = ?, list_name = ? WHERE id = 1').run(list_uuid, list_name)
}

export function removeConfig() {
  const db = getDb()
  db.prepare('DELETE FROM bring_config WHERE id = 1').run()
}
