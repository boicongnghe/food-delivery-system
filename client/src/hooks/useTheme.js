import { useEffect, useState } from 'react'

const THEME_KEY = 'theme'

const readIsDark = () => {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' || document.documentElement.classList.contains('dark')
  } catch {
    return document.documentElement.classList.contains('dark')
  }
}

// Light / dark mode on <html class="dark">, same storage key as the customer Navbar so both portals share the choice
export default function useTheme() {
  const [isDark, setIsDark] = useState(readIsDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
    } catch {
      // Storage blocked (private mode): the theme still applies for this visit
    }
  }, [isDark])

  return { isDark, toggleTheme: () => setIsDark((prev) => !prev) }
}
