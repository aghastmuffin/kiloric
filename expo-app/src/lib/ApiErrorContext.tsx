import { ApiErrorToast, type ApiErrorToastPayload } from '@/components/ApiErrorToast'
import { registerApiErrorListener } from '@/lib/apiErrors'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type ApiErrorContextValue = {
  showError: (payload: Omit<ApiErrorToastPayload, 'id'>) => void
}

const ApiErrorContext = createContext<ApiErrorContextValue | null>(null)

export function ApiErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<ApiErrorToastPayload | null>(null)

  const showError = useCallback((payload: Omit<ApiErrorToastPayload, 'id'>) => {
    setError({
      ...payload,
      id: Date.now(),
    })
  }, [])

  useEffect(() => {
    registerApiErrorListener((payload) => setError(payload))
    return () => registerApiErrorListener(null)
  }, [])

  const handleDismiss = useCallback(() => {
    setError(null)
  }, [])

  const value = useMemo(() => ({ showError }), [showError])

  return (
    <ApiErrorContext.Provider value={value}>
      {children}
      <ApiErrorToast error={error} onDismiss={handleDismiss} />
    </ApiErrorContext.Provider>
  )
}

export function useApiError(): ApiErrorContextValue {
  const context = useContext(ApiErrorContext)
  if (!context) {
    throw new Error('useApiError must be used within ApiErrorProvider')
  }
  return context
}
