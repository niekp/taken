import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

// Generate 15-minute interval time options
const TIME_OPTIONS = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export default function NotificationSettings({ currentUser, onClose }) {
  const [loading, setLoading] = useState(true)
  const [supported, setSupported] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [vapidKey, setVapidKey] = useState(null)
  const [permission, setPermission] = useState('default')
  const [subscribed, setSubscribed] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [notifyTime, setNotifyTime] = useState('08:00')
  const [subscription, setSubscription] = useState(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Check browser support
      const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window
      setSupported(pushSupported)
      if (!pushSupported) {
        setLoading(false)
        return
      }

      setPermission(Notification.permission)

      // Check server VAPID config
      const vapidData = await api.getVapidKey()
      setConfigured(vapidData.configured)
      setVapidKey(vapidData.key)
      if (!vapidData.configured) {
        setLoading(false)
        return
      }

      // Check current subscription
      const reg = await navigator.serviceWorker.ready
      const existingSub = await reg.pushManager.getSubscription()
      setSubscription(existingSub)

      if (existingSub) {
        const status = await api.getPushStatus(existingSub.endpoint)
        setSubscribed(status.subscribed)
        if (status.subscribed) {
          setEnabled(status.enabled)
          setNotifyTime(status.notify_time || '08:00')
        }
      }
    } catch (err) {
      console.error('Failed to load notification status:', err)
      setError('Kon notificatiestatus niet laden')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  async function handleEnable() {
    setError('')
    setSaving(true)
    try {
      // Request permission
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setError('Notificaties zijn geblokkeerd in je browser. Sta ze toe in je browserinstellingen.')
        setSaving(false)
        return
      }

      // Subscribe to push
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      setSubscription(sub)

      // Register on server
      await api.subscribePush(currentUser.id, sub.toJSON(), notifyTime)
      setSubscribed(true)
      setEnabled(true)
      setSuccess('Notificaties ingeschakeld')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('Failed to enable notifications:', err)
      setError('Kon notificaties niet inschakelen')
    }
    setSaving(false)
  }

  async function handleDisable() {
    setError('')
    setSaving(true)
    try {
      if (subscription) {
        await api.unsubscribePush(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setSubscription(null)
      setSubscribed(false)
      setEnabled(false)
      setSuccess('Notificaties uitgeschakeld')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('Failed to disable notifications:', err)
      setError('Kon notificaties niet uitschakelen')
    }
    setSaving(false)
  }

  async function handleTimeChange(newTime) {
    setNotifyTime(newTime)
    if (!subscription || !subscribed) return
    setError('')
    try {
      await api.updatePushSettings(subscription.endpoint, { notify_time: newTime })
    } catch (err) {
      console.error('Failed to update time:', err)
      setError('Kon tijd niet opslaan')
    }
  }

  async function handleTest() {
    setError('')
    setTesting(true)
    try {
      await api.testPush(currentUser.id)
      setSuccess('Testnotificatie verzonden')
      setTimeout(() => setSuccess(''), 2000)
    } catch (err) {
      console.error('Failed to send test:', err)
      setError(err.message || 'Kon testnotificatie niet verzenden')
    }
    setTesting(false)
  }

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-[60]" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto absolute bottom-0 shadow-soft-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Notificaties</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin w-6 h-6 text-accent-mint" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : !supported ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <p className="text-gray-500">Push notificaties worden niet ondersteund in deze browser.</p>
            </div>
          ) : !configured ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-gray-500">Push notificaties zijn niet geconfigureerd op de server.</p>
              <p className="text-gray-400 text-sm mt-1">Voer <code className="bg-gray-100 px-1.5 py-0.5 rounded">generate-vapid-keys</code> uit via manage.sh</p>
            </div>
          ) : (
            <>
              {/* Description */}
              <div className="bg-pastel-sky/20 rounded-2xl p-4">
                <p className="text-sm text-gray-600">
                  Ontvang elke dag een melding met het aantal taken en wat er gegeten wordt.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 py-2 px-4 rounded-xl">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 py-2 px-4 rounded-xl">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {success}
                </div>
              )}

              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Dagelijkse melding</p>
                  <p className="text-sm text-gray-400">
                    {subscribed && enabled ? 'Ingeschakeld' : 'Uitgeschakeld'}
                  </p>
                </div>
                <button
                  onClick={subscribed ? handleDisable : handleEnable}
                  disabled={saving}
                  className={`w-12 h-7 rounded-full transition-colors relative ${
                    subscribed && enabled ? 'bg-green-400' : 'bg-gray-300'
                  } ${saving ? 'opacity-50' : ''}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform shadow-sm ${
                    subscribed && enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Time picker */}
              {subscribed && enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Tijdstip</label>
                    <select
                      value={notifyTime}
                      onChange={e => handleTimeChange(e.target.value)}
                      className="input-field text-sm"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Test button */}
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="w-full p-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {testing ? (
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    )}
                    Testnotificatie versturen
                  </button>
                </>
              )}

              {/* Permission denied warning */}
              {permission === 'denied' && (
                <div className="bg-red-50 rounded-xl p-4">
                  <p className="text-sm text-red-600">
                    Notificaties zijn geblokkeerd. Ga naar je browserinstellingen om ze toe te staan voor deze site.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
