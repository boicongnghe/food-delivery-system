import { useEffect, useRef } from 'react'

const isTypingTarget = (element) =>
  element && (['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) || element.isContentEditable)

/**
 * Global keyboard shortcuts, e.g. { Escape: close, F4: print, 'Ctrl+Enter': confirm }.
 * - Ignored while typing in a form field (except Escape).
 * - Pass enabled=false to pause them (e.g. while a dialog is open on top).
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  const shortcutsRef = useRef(shortcuts)

  useEffect(() => {
    shortcutsRef.current = shortcuts
  })

  useEffect(() => {
    if (!enabled) return undefined

    const handleKeyDown = (event) => {
      const key = `${event.ctrlKey || event.metaKey ? 'Ctrl+' : ''}${event.key}`
      const handler = shortcutsRef.current[key]
      if (!handler) return
      if (event.key !== 'Escape' && isTypingTarget(document.activeElement)) return

      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
}

export default useKeyboardShortcuts
