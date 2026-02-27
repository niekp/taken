import { BringClient } from '../lib/bring.js'
import * as bringRepo from '../repositories/bringRepository.js'

// Singleton client, lazily initialized
let client = null

function getClient() {
  const config = bringRepo.getConfig()
  if (!config || !config.email) return null

  if (!client || client.email !== config.email) {
    client = new BringClient({
      email: config.email,
      password: config.password,
      uuid: config.uuid,
      publicUuid: config.public_uuid,
      accessToken: config.access_token,
      refreshToken: config.refresh_token,
      expiresAt: config.expires_at,
      country: config.country,
    })
    client.onTokenUpdate = (tokens) => {
      bringRepo.updateTokens(tokens)
    }
  }

  return client
}

async function ensureLoggedIn(c) {
  if (!c.accessToken || !c.uuid) {
    await c.login()
  }
}

// GET /api/bring/status — is Bring configured + which list?
export function status(req, res) {
  const config = bringRepo.getConfig()
  if (!config || !config.email) {
    return res.json({ configured: false })
  }
  res.json({
    configured: true,
    email: config.email,
    list_uuid: config.list_uuid,
    list_name: config.list_name,
  })
}

// GET /api/bring/items — get shopping list items
export async function getItems(req, res) {
  try {
    const c = getClient()
    if (!c) return res.status(400).json({ error: 'Bring! niet geconfigureerd' })

    const config = bringRepo.getConfig()
    if (!config.list_uuid) return res.status(400).json({ error: 'Geen lijst geselecteerd' })

    await ensureLoggedIn(c)
    const items = await c.getItems(config.list_uuid)
    res.json(items)
  } catch (err) {
    console.error('Bring getItems error:', err.message)
    res.status(502).json({ error: 'Kon boodschappenlijst niet ophalen' })
  }
}

// POST /api/bring/items — add item { name, specification? }
export async function addItem(req, res) {
  try {
    const c = getClient()
    if (!c) return res.status(400).json({ error: 'Bring! niet geconfigureerd' })

    const config = bringRepo.getConfig()
    if (!config.list_uuid) return res.status(400).json({ error: 'Geen lijst geselecteerd' })

    const { name, specification, uuid } = req.body
    if (!name) return res.status(400).json({ error: 'Naam is verplicht' })

    await ensureLoggedIn(c)
    await c.addItem(config.list_uuid, name, specification || '', uuid || null)
    res.json({ success: true })
  } catch (err) {
    console.error('Bring addItem error:', err.message)
    res.status(502).json({ error: 'Kon item niet toevoegen' })
  }
}

// POST /api/bring/items/complete — complete item { name, uuid }
export async function completeItem(req, res) {
  try {
    const c = getClient()
    if (!c) return res.status(400).json({ error: 'Bring! niet geconfigureerd' })

    const config = bringRepo.getConfig()
    if (!config.list_uuid) return res.status(400).json({ error: 'Geen lijst geselecteerd' })

    const { name, uuid } = req.body
    if (!name || !uuid) return res.status(400).json({ error: 'name en uuid zijn verplicht' })

    await ensureLoggedIn(c)
    await c.completeItem(config.list_uuid, name, uuid)
    res.json({ success: true })
  } catch (err) {
    console.error('Bring completeItem error:', err.message)
    res.status(502).json({ error: 'Kon item niet afvinken' })
  }
}

// POST /api/bring/items/remove — remove item { name, uuid }
export async function removeItem(req, res) {
  try {
    const c = getClient()
    if (!c) return res.status(400).json({ error: 'Bring! niet geconfigureerd' })

    const config = bringRepo.getConfig()
    if (!config.list_uuid) return res.status(400).json({ error: 'Geen lijst geselecteerd' })

    const { name, uuid } = req.body
    if (!name || !uuid) return res.status(400).json({ error: 'name en uuid zijn verplicht' })

    await ensureLoggedIn(c)
    await c.removeItem(config.list_uuid, name, uuid)
    res.json({ success: true })
  } catch (err) {
    console.error('Bring removeItem error:', err.message)
    res.status(502).json({ error: 'Kon item niet verwijderen' })
  }
}

// GET /api/bring/lists — get all available lists (for config)
export async function getLists(req, res) {
  try {
    const c = getClient()
    if (!c) return res.status(400).json({ error: 'Bring! niet geconfigureerd' })

    await ensureLoggedIn(c)
    const lists = await c.getLists()
    res.json(lists)
  } catch (err) {
    console.error('Bring getLists error:', err.message)
    res.status(502).json({ error: 'Kon lijsten niet ophalen' })
  }
}

// GET /api/bring/catalog — get full item catalog for autocomplete
export async function getCatalog(req, res) {
  try {
    const c = getClient()
    if (!c) return res.status(400).json({ error: 'Bring! niet geconfigureerd' })

    await ensureLoggedIn(c)
    const catalog = await c.getCatalog()
    // Cache for 24h since catalog rarely changes
    res.set('Cache-Control', 'public, max-age=86400')
    res.json(catalog)
  } catch (err) {
    console.error('Bring getCatalog error:', err.message)
    res.status(502).json({ error: 'Kon catalogus niet ophalen' })
  }
}
