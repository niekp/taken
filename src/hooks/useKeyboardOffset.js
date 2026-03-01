import { useEffect, useRef } from 'react'

/**
 * Tracks the mobile virtual keyboard height via the visualViewport API
 * and applies matching paddingBottom to the referenced element so that
 * bottom-sheet content (save buttons etc.) stays above the keyboard.
 *
 * Returns a ref to attach to the scrollable panel element.
 */
export default function useKeyboardOffset() {
  const panelRef = useRef(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function onResize() {
      const panel = panelRef.current
      if (!panel) return
      const keyboardOffset = window.innerHeight - vv.height
      panel.style.paddingBottom = keyboardOffset > 0 ? `${keyboardOffset}px` : ''
    }

    vv.addEventListener('resize', onResize)
    onResize()
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  return panelRef
}
