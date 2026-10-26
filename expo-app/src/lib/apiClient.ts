import AsyncStorage from '@react-native-async-storage/async-storage'

const ACCESS_TOKEN_KEY = '@kiloric/access_token'
const REFRESH_TOKEN_KEY = '@kiloric/refresh_token'

export const DEFAULT_API_URL = 'https://api.kiloric.co'

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
  }
  return DEFAULT_API_URL
}

async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key)
  } catch {
    return null
  }
}

async function safeSetItem(key: string, val: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, val)
  } catch {
    // Ignore in non-storage environments
  }
}

async function safeRemoveItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch {
    // Ignore
  }
}

let cachedAccessToken: string | null = null
let cachedRefreshToken: string | null = null
let isInitialized = false
let refreshPromise: Promise<string | null> | null = null

export async function initApiClient(): Promise<void> {
  if (isInitialized) return
  try {
    const [access, refresh] = await Promise.all([
      safeGetItem(ACCESS_TOKEN_KEY),
      safeGetItem(REFRESH_TOKEN_KEY),
    ])
    cachedAccessToken = access
    cachedRefreshToken = refresh
  } catch (err) {
    console.warn('[apiClient] Failed to load tokens:', err)
  } finally {
    isInitialized = true
  }
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken
}

export async function getAccessToken(): Promise<string | null> {
  if (!isInitialized) await initApiClient()
  return cachedAccessToken
}

export async function setTokens(access: string, refresh?: string | null): Promise<void> {
  cachedAccessToken = access
  isInitialized = true
  await safeSetItem(ACCESS_TOKEN_KEY, access)
  if (refresh) {
    cachedRefreshToken = refresh
    await safeSetItem(REFRESH_TOKEN_KEY, refresh)
  }
}

export async function revokeSession(): Promise<void> {
  if (!isInitialized) await initApiClient()
  if (cachedRefreshToken) {
    await request('/v1/auth/logout', {
      method: 'POST', body: { refresh_token: cachedRefreshToken }, skipAuth: true,
    })
  }
}

export async function clearTokens(): Promise<void> {
  cachedAccessToken = null
  cachedRefreshToken = null
  isInitialized = true
  await Promise.all([
    safeRemoveItem(ACCESS_TOKEN_KEY),
    safeRemoveItem(REFRESH_TOKEN_KEY),
  ])
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      if (!isInitialized) await initApiClient()
      if (!cachedRefreshToken) return null

      const baseUrl = getApiBaseUrl()
      const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: cachedRefreshToken }),
      })

      if (!res.ok) {
        await clearTokens()
        return null
      }

      const json = await res.json()
      if (json.access_token) {
        await setTokens(json.access_token, json.refresh_token)
        return json.access_token
      }
      return null
    } catch {
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | null | undefined>
  skipAuth?: boolean
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isInitialized) await initApiClient()

  const baseUrl = getApiBaseUrl()
  let url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`

  if (options.params) {
    const searchParams = new URLSearchParams()
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val))
      }
    }
    const query = searchParams.toString()
    if (query) {
      url += (url.includes('?') ? '&' : '?') + query
    }
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (!options.skipAuth && cachedAccessToken) {
    headers.Authorization = `Bearer ${cachedAccessToken}`
  }

  const reqBody =
    options.body instanceof FormData || typeof options.body === 'string' || options.body === undefined
      ? (options.body as BodyInit | undefined)
      : JSON.stringify(options.body)

  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: reqBody,
    })
  } catch (netErr) {
    throw new ApiError(0, netErr instanceof Error ? netErr.message : 'Network error')
  }

  // Handle 401 by attempting token refresh once
  if (response.status === 401 && !options.skipAuth && cachedRefreshToken) {
    const newAccess = await refreshAccessToken()
    if (newAccess) {
      headers.Authorization = `Bearer ${newAccess}`
      try {
        response = await fetch(url, {
          ...options,
          headers,
          body: reqBody,
        })
      } catch (netErr) {
        throw new ApiError(0, netErr instanceof Error ? netErr.message : 'Network error')
      }
    }
  }

  if (response.status === 204) {
    return null as T
  }

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    let message = 'An error occurred.'
    if (data && typeof data === 'object') {
      const errObj = data as Record<string, unknown>
      if (typeof errObj.detail === 'string') {
        message = errObj.detail
      } else if (typeof errObj.message === 'string') {
        message = errObj.message
      } else if (Array.isArray(errObj.detail) && errObj.detail[0]?.msg) {
        message = errObj.detail[0].msg
      }
    }
    throw new ApiError(response.status, message, data)
  }

  return data as T
}

export const apiClient = {
  get: <T = unknown>(path: string, params?: RequestOptions['params'], options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET', params }),
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
