import {
  DEFAULT_API_BACKEND,
  loadApiBackendChoice,
  saveApiBackendChoice,
  setCachedApiBackendChoice,
  type ApiBackendChoice,
} from '@/lib/apiBackendPreferences'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type ApiBackendPreferencesContextValue = {
  apiBackend: ApiBackendChoice
  loading: boolean
  setApiBackend: (choice: ApiBackendChoice) => Promise<void>
}

const ApiBackendPreferencesContext = createContext<ApiBackendPreferencesContextValue | null>(null)

export function ApiBackendPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [apiBackend, setApiBackendState] = useState<ApiBackendChoice>(DEFAULT_API_BACKEND)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadApiBackendChoice()
      .then((choice) => {
        setCachedApiBackendChoice(choice)
        setApiBackendState(choice)
      })
      .finally(() => setLoading(false))
  }, [])

  const setApiBackend = useCallback(async (choice: ApiBackendChoice) => {
    setApiBackendState(choice)
    setCachedApiBackendChoice(choice)
    try {
      await saveApiBackendChoice(choice)
    } catch (err) {
      console.error('[apiBackendPreferences] save failed', err)
    }
  }, [])

  return (
    <ApiBackendPreferencesContext.Provider value={{ apiBackend, loading, setApiBackend }}>
      {children}
    </ApiBackendPreferencesContext.Provider>
  )
}

export function useApiBackendPreferences(): ApiBackendPreferencesContextValue {
  const context = useContext(ApiBackendPreferencesContext)
  if (!context) {
    throw new Error('useApiBackendPreferences must be used within ApiBackendPreferencesProvider')
  }
  return context
}
