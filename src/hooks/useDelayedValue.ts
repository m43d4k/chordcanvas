import { useEffect, useRef, useState } from 'react'

export function useDelayedValue<T>(delayMs: number) {
  const timeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const [value, setValue] = useState<T | null>(null)

  function clearPendingTimeout() {
    const timeoutId = timeoutRef.current

    if (timeoutId === null) {
      return
    }

    window.clearTimeout(timeoutId)
    timeoutRef.current = null
  }

  function hide(expectedValue?: T) {
    clearPendingTimeout()
    setValue((currentValue) => {
      if (
        expectedValue !== undefined &&
        currentValue !== null &&
        !Object.is(currentValue, expectedValue)
      ) {
        return currentValue
      }

      return null
    })
  }

  function showImmediately(nextValue: T) {
    clearPendingTimeout()
    setValue(nextValue)
  }

  function scheduleShow(nextValue: T) {
    clearPendingTimeout()
    setValue((currentValue) =>
      currentValue !== null && Object.is(currentValue, nextValue)
        ? currentValue
        : null,
    )
    timeoutRef.current = window.setTimeout(() => {
      setValue(nextValue)
      timeoutRef.current = null
    }, delayMs)
  }

  useEffect(() => () => clearPendingTimeout(), [])

  return {
    hide,
    scheduleShow,
    setValue,
    showImmediately,
    value,
  }
}
