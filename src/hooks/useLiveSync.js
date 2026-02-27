import { useEffect, useRef } from 'react'
import { subscribe } from '../lib/liveSync'

/**
 * React hook to subscribe to live sync events for a channel.
 * When another client modifies data on the given channel, the
 * onSync callback is invoked so the view can refetch.
 *
 * @param {string} channel - e.g. 'tasks', 'grocery', 'meals', 'schedules'
 * @param {() => void} onSync - callback to run when sync event fires
 */
export default function useLiveSync(channel, onSync) {
  // Use a ref so we always call the latest callback without re-subscribing
  const callbackRef = useRef(onSync)
  callbackRef.current = onSync

  useEffect(() => {
    const unsubscribe = subscribe(channel, () => {
      callbackRef.current()
    })
    return unsubscribe
  }, [channel])
}
