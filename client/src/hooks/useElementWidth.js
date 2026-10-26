import { useEffect, useRef, useState } from 'react'

// [ref, width]: width of the element in px, updated when it resizes (charts draw at the real size)
export function useElementWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return undefined

    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

export default useElementWidth
