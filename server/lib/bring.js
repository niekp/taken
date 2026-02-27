const BASE_URL = 'https://api.getbring.com/rest'
const API_KEY = 'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Sp'
const CATALOG_URL = 'https://web.getbring.com/locale/articles'
const IMAGE_BASE = 'https://web.getbring.com/assets/images/items'

// In-memory translation cache: locale -> { deToLocale: Map, localeToDe: Map, fetchedAt: number }
const translationCache = {}
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Normalize a German item name to an image path segment.
 * Mirrors Bring!'s BringItem.normalizeStringPath from their web app.
 */
function normalizeImagePath(name) {
  const replacements = {
    ' ': '_', '-': '_', '!': '',
    '\u00E4': 'ae', '\u00F6': 'oe', '\u00FC': 'ue', '\u00E9': 'e',
  }
  const re = new RegExp(Object.keys(replacements).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi')
  return name.toLowerCase().replace(re, m => replacements[m.toLowerCase()] || '')
}

/**
 * Build a Bring! image URL from a German item ID.
 */
export function bringImageUrl(germanItemId) {
  if (!germanItemId) return null
  return `${IMAGE_BASE}/${normalizeImagePath(germanItemId)}.png`
}

async function loadTranslations(locale) {
  const cached = translationCache[locale]
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached
  }

  try {
    const res = await fetch(`${CATALOG_URL}.${locale}.json`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    const deToLocale = new Map()
    const localeToDe = new Map()
    // catalog: array of { name (localized), de (german key), imageUrl }
    const catalog = []

    // Known category keys (German) that appear in the Bring! catalog as section headers
    const knownCategories = new Set([
      'Getränke & Tabak', 'Brot & Gebäck', 'Fertig- & Tiefkühlprodukte',
      'Früchte & Gemüse', 'Getreideprodukte', 'Haushalt & Gesundheit',
      'Zutaten & Gewürze', 'Fleisch & Fisch', 'Milch & Käse',
      'Tierbedarf', 'Snacks & Süsswaren', 'Eigene Artikel', 'Zuletzt verwendet',
    ])

    for (const [de, localized] of Object.entries(data)) {
      deToLocale.set(de, localized)
      localeToDe.set(localized.toLowerCase(), de)

      if (!knownCategories.has(de)) {
        catalog.push({
          name: localized,
          de,
          imageUrl: bringImageUrl(de),
        })
      }
    }

    translationCache[locale] = { deToLocale, localeToDe, catalog, fetchedAt: Date.now() }
    return translationCache[locale]
  } catch (err) {
    console.error(`Failed to load Bring! translations for ${locale}:`, err.message)
    // Return empty maps so items show as-is
    return { deToLocale: new Map(), localeToDe: new Map(), catalog: [] }
  }
}

export class BringClient {
  constructor({ email, password, uuid, publicUuid, accessToken, refreshToken, expiresAt, country }) {
    this.email = email
    this.password = password
    this.uuid = uuid || null
    this.publicUuid = publicUuid || null
    this.accessToken = accessToken || null
    this.refreshToken = refreshToken || null
    this.expiresAt = expiresAt || null
    this.country = country || 'NL'
    this.onTokenUpdate = null // callback to persist new tokens
  }

  get headers() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'X-BRING-API-KEY': API_KEY,
      'X-BRING-CLIENT': 'android',
      'X-BRING-APPLICATION': 'bring',
      'X-BRING-COUNTRY': this.country,
      'X-BRING-USER-UUID': this.uuid || '',
      'X-BRING-PUBLIC-USER-UUID': this.publicUuid || '',
    }
  }

  async login() {
    const res = await fetch(`${BASE_URL}/v2/bringauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: this.email, password: this.password }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Login failed (${res.status}): ${text}`)
    }

    const data = await res.json()
    this.uuid = data.uuid
    this.publicUuid = data.publicUuid
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token
    this.expiresAt = Date.now() + data.expires_in * 1000

    // Fetch country from user profile
    try {
      const user = await this._request('GET', `/v2/bringusers/${this.uuid}`)
      if (user.userLocale?.country) {
        this.country = user.userLocale.country
      }
    } catch (e) {
      // keep default country
    }

    if (this.onTokenUpdate) {
      this.onTokenUpdate(this.getTokenData())
    }

    return data
  }

  async refreshAccessToken() {
    const res = await fetch(`${BASE_URL}/v2/bringauth/token`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      }),
    })

    if (!res.ok) {
      // Refresh failed — try full login
      return this.login()
    }

    const data = await res.json()
    this.accessToken = data.access_token
    this.refreshToken = data.refresh_token
    this.expiresAt = Date.now() + data.expires_in * 1000

    if (this.onTokenUpdate) {
      this.onTokenUpdate(this.getTokenData())
    }

    return data
  }

  getTokenData() {
    return {
      uuid: this.uuid,
      public_uuid: this.publicUuid,
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      expires_at: this.expiresAt,
      country: this.country,
    }
  }

  async _request(method, path, options = {}) {
    // Auto-refresh if expired
    if (this.expiresAt && Date.now() >= this.expiresAt) {
      await this.refreshAccessToken()
    }

    const url = `${BASE_URL}${path}`
    const fetchOpts = {
      method,
      headers: {
        ...this.headers,
        ...(options.json ? { 'Content-Type': 'application/json' } : {}),
      },
    }
    if (options.json) fetchOpts.body = JSON.stringify(options.json)

    let res = await fetch(url, fetchOpts)

    // Retry on 401
    if (res.status === 401) {
      await this.refreshAccessToken()
      fetchOpts.headers = {
        ...this.headers,
        ...(options.json ? { 'Content-Type': 'application/json' } : {}),
      }
      res = await fetch(url, fetchOpts)
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Bring API ${method} ${path} failed (${res.status}): ${text}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      return res.json()
    }
    return null
  }

  async getLists() {
    const data = await this._request('GET', `/bringusers/${this.uuid}/lists`)
    return data.lists || []
  }

  get locale() {
    // Map country to Bring! locale
    const countryToLocale = {
      'NL': 'nl-NL', 'BE': 'nl-NL', 'DE': 'de-DE', 'AT': 'de-AT', 'CH': 'de-CH',
      'US': 'en-US', 'GB': 'en-GB', 'AU': 'en-AU', 'CA': 'en-CA',
      'FR': 'fr-FR', 'IT': 'it-IT', 'ES': 'es-ES', 'PT': 'pt-BR',
      'NO': 'nb-NO', 'SE': 'sv-SE', 'PL': 'pl-PL', 'HU': 'hu-HU',
      'RU': 'ru-RU', 'TR': 'tr-TR',
    }
    return countryToLocale[this.country] || 'nl-NL'
  }

  async _getTranslations() {
    return loadTranslations(this.locale)
  }

  _translateToLocale(itemId, translations) {
    return translations.deToLocale.get(itemId) || itemId
  }

  _translateFromLocale(localizedName, translations) {
    // Try exact match (case-insensitive) first
    const de = translations.localeToDe.get(localizedName.toLowerCase())
    return de || localizedName
  }

  async getItems(listUuid) {
    // Fetch items and details in parallel
    const [data, details] = await Promise.all([
      this._request('GET', `/v2/bringlists/${listUuid}`),
      this._request('GET', `/v2/bringlists/${listUuid}/details`).catch(() => []),
    ])
    const translations = await this._getTranslations()

    // Build itemId -> detail lookup for icon mapping
    // Details use itemId (the German/custom name) as the stable key, not uuid
    // (uuids change each time an item is re-added)
    const detailMap = new Map()
    if (Array.isArray(details)) {
      for (const d of details) {
        detailMap.set(d.itemId, d)
      }
    }

    const enrichItem = (item) => {
      const detail = detailMap.get(item.itemId)
      // userIconItemId is a German catalog key for the icon (e.g., "Spinat" for custom "Diepvries spinazie").
      // For standard catalog items, item.itemId is already a German key (e.g., "Pommes Chips").
      // For unknown custom items, imageUrl stays null and the frontend shows a fallback.
      const iconId = detail?.userIconItemId || null
      const germanId = iconId || item.itemId
      const isKnownItem = translations.deToLocale.has(germanId)
      return {
        ...item,
        itemId: this._translateToLocale(item.itemId, translations),
        imageUrl: isKnownItem || iconId ? bringImageUrl(germanId) : null,
      }
    }

    const purchase = (data.items?.purchase || []).map(enrichItem)
    const recently = (data.items?.recently || []).map(enrichItem)

    return { purchase, recently }
  }

  /**
   * Get the full catalog of known Bring! items (for autocomplete).
   * Returns an array of { name, de, imageUrl }.
   */
  async getCatalog() {
    const translations = await this._getTranslations()
    return translations.catalog || []
  }

  async addItem(listUuid, itemName, specification = '') {
    const translations = await this._getTranslations()
    const deItemName = this._translateFromLocale(itemName, translations)

    const uuid = crypto.randomUUID()
    return this._request('PUT', `/v2/bringlists/${listUuid}/items`, {
      json: {
        changes: [{
          itemId: deItemName,
          spec: specification,
          uuid,
          operation: 'TO_PURCHASE',
          accuracy: '0.0',
          altitude: '0.0',
          latitude: '0.0',
          longitude: '0.0',
        }],
        sender: '',
      },
    })
  }

  async completeItem(listUuid, itemName, itemUuid) {
    const translations = await this._getTranslations()
    const deItemName = this._translateFromLocale(itemName, translations)

    return this._request('PUT', `/v2/bringlists/${listUuid}/items`, {
      json: {
        changes: [{
          itemId: deItemName,
          spec: '',
          uuid: itemUuid,
          operation: 'TO_RECENTLY',
          accuracy: '0.0',
          altitude: '0.0',
          latitude: '0.0',
          longitude: '0.0',
        }],
        sender: '',
      },
    })
  }

  async removeItem(listUuid, itemName, itemUuid) {
    const translations = await this._getTranslations()
    const deItemName = this._translateFromLocale(itemName, translations)

    return this._request('PUT', `/v2/bringlists/${listUuid}/items`, {
      json: {
        changes: [{
          itemId: deItemName,
          spec: '',
          uuid: itemUuid,
          operation: 'REMOVE',
          accuracy: '0.0',
          altitude: '0.0',
          latitude: '0.0',
          longitude: '0.0',
        }],
        sender: '',
      },
    })
  }
}
