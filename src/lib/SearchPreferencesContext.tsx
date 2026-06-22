import {
  DEFAULT_SEARCH_MODE,
  loadDefaultSearchMode,
  saveDefaultSearchMode,
  type DefaultSearchMode,
} from '@/lib/searchPreferences'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type SearchPreferencesContextValue = {
  defaultSearchMode: DefaultSearchMode
  loading: boolean
  setDefaultSearchMode: (mode: DefaultSearchMode) => Promise<void>
}

const SearchPreferencesContext = createContext<SearchPreferencesContextValue | null>(null)

export function SearchPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [defaultSearchMode, setDefaultSearchModeState] = useState<DefaultSearchMode>(DEFAULT_SEARCH_MODE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDefaultSearchMode()
      .then(setDefaultSearchModeState)
      .finally(() => setLoading(false))
  }, [])

  const setDefaultSearchMode = useCallback(async (mode: DefaultSearchMode) => {
    setDefaultSearchModeState(mode)
    try {
      await saveDefaultSearchMode(mode)
    } catch (err) {
      console.error('[searchPreferences] save failed', err)
    }
  }, [])

  return (
    <SearchPreferencesContext.Provider
      value={{ defaultSearchMode, loading, setDefaultSearchMode }}
    >
      {children}
    </SearchPreferencesContext.Provider>
  )
}

export function useSearchPreferences(): SearchPreferencesContextValue {
  const context = useContext(SearchPreferencesContext)
  if (!context) {
    throw new Error('useSearchPreferences must be used within SearchPreferencesProvider')
  }
  return context
}
