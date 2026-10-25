import { useState } from 'react'
import useInterval from './useInterval.js'

// Current timestamp (ms) refreshed every `intervalMs` - for live timers like "Bếp nấu 08:35"
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useInterval(() => setNow(Date.now()), intervalMs)
  return now
}

export default useNow
