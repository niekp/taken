import { useState, useEffect, useCallback } from 'react'
import { subscribeStatus, getStatus } from '../lib/offlineSync'

/**
 * React hook for offline status.
 *
 * Returns:
 * - online: boolean — whether the browser thinks we have network connectivity
 * - pendingCount: number — how many mutations are queued in the SW for retry
 * - syncing: boolean — whether the SW is currently replaying queued mutations
 *
 * The component re-renders whenever any of these values change.
 */
export default function useOfflineStatus() {
  const [status, setStatus] = useState(getStatus)

  useEffect(() => {
    return subscribeStatus(() => {
      setStatus(getStatus())
    })
  }, [])

  return status
}
