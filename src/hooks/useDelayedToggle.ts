import { useEffect, useRef, useState } from 'react'

export function useDelayedToggle(delayMs: number) {
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const [visible, setVisible] = useState(false)

  function clearPendingTimeout() {
    const timeoutId = timeoutRef.current

    if (timeoutId === null) {
      return
    }

    window.clearTimeout(timeoutId)
    timeoutRef.current = null
  }

  function hide() {
    clearPendingTimeout()
    setVisible(false)
  }

  function showImmediately() {
    clearPendingTimeout()
    setVisible(true)
  }

  function scheduleShow() {
    clearPendingTimeout()
    setVisible(false)
    timeoutRef.current = window.setTimeout(() => {
      setVisible(true)
      timeoutRef.current = null
    }, delayMs)
  }

  useEffect(() => () => clearPendingTimeout(), [])

  return {
    hide,
    scheduleShow,
    showImmediately,
    visible,
  }
}
