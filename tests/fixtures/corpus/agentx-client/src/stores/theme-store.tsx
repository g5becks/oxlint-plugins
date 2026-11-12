import type { Accessor, ParentProps } from 'solid-js'
import { createPrefersDark } from '@solid-primitives/media'
import { createContext, createEffect, createSignal, useContext } from 'solid-js'

type ThemeMode = 'light' | 'dark' | 'system'

type ThemeContextValue = Readonly<{
  mode: Accessor<ThemeMode>
  setMode: (mode: ThemeMode) => void
  isDark: Accessor<boolean>
}>

const ThemeContext = createContext<ThemeContextValue>()

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined')
    return 'system'
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system')
    return stored
  return 'system'
}

const ThemeProvider = (props: ParentProps) => {
  const [mode, setMode] = createSignal<ThemeMode>(getStoredTheme())
  const systemPrefersDark = createPrefersDark()

  const isDark = (): boolean => {
    const currentMode = mode()
    if (currentMode === 'system')
      return systemPrefersDark()
    return currentMode === 'dark'
  }

  // Apply theme to document and persist to localStorage
  createEffect(() => {
    const dark = isDark()
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.setAttribute('data-kb-theme', dark ? 'dark' : 'light')
    root.style.colorScheme = dark ? 'dark' : 'light'
    localStorage.setItem('theme', mode())
  })

  const value: ThemeContextValue = {
    mode,
    setMode,
    isDark,
  }

  return (
    <ThemeContext.Provider value={value}>
      {props.children}
    </ThemeContext.Provider>
  )
}

const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) {
    console.error('useTheme must be used within ThemeProvider')
    const defaultMode: ThemeMode = 'system'
    return {
      mode: () => defaultMode,
      setMode: () => {},
      isDark: () => false,
    }
  }
  return context
}

export { ThemeProvider, useTheme }

export type { ThemeMode }
