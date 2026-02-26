const BASE_URL = 'https://api.getbring.com/rest'
const API_KEY = 'cof4Nc6D8saplXjE3h3HXqHH8m7VU2i1Gs0g85Sp'

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

  async getItems(listUuid) {
    const data = await this._request('GET', `/v2/bringlists/${listUuid}`)
    return {
      purchase: data.items?.purchase || [],
      recently: data.items?.recently || [],
    }
  }

  async addItem(listUuid, itemName, specification = '') {
    const uuid = crypto.randomUUID()
    return this._request('PUT', `/v2/bringlists/${listUuid}/items`, {
      json: {
        changes: [{
          itemId: itemName,
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
    return this._request('PUT', `/v2/bringlists/${listUuid}/items`, {
      json: {
        changes: [{
          itemId: itemName,
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
    return this._request('PUT', `/v2/bringlists/${listUuid}/items`, {
      json: {
        changes: [{
          itemId: itemName,
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
