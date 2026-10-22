import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

export type LoaderState<T> = {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => Promise<void>
}

/**
 * Loads data whenever the screen gains focus (and when `key` changes), keeping
 * the previous data visible while refreshing. Pass `null` as the key to skip.
 */
export function useFocusLoader<T>(load: () => Promise<T>, key: string | null): LoaderState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(key != null)
  const requestRef = useRef(0)
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  const reload = useCallback(async () => {
    if (key == null) {
      setLoading(false)
      return
    }
    const requestId = ++requestRef.current
    setLoading(true)
    try {
      const next = await loadRef.current()
      if (requestId !== requestRef.current) return
      setData(next)
      setError(null)
    } catch (err) {
      if (requestId !== requestRef.current) return
      console.warn('[useFocusLoader]', err)
      setError(err instanceof Error ? err.message : 'Something went wrong while loading.')
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [key])

  useFocusEffect(
    useCallback(() => {
      void reload()
      return () => {
        requestRef.current += 1
      }
    }, [reload]),
  )

  return { data, error, loading, reload }
}
