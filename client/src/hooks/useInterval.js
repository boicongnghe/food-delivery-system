import { useEffect, useRef } from 'react'

// Run `callback` every `delay` ms (pass null to pause). Always calls the latest callback.
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    if (delay === null) return undefined
    const timer = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(timer)
  }, [delay])
}

export default useInterval
