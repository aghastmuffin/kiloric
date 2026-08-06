import {
  ApiRequestError,
  formatOracleError,
  isApiRequestError,
  showApiError,
} from '@/lib/apiErrors'
import { getCachedResponse, getCacheTtl, normalizeCacheKey, setCachedResponse } from '@/lib/apiCache'
import {
  resolveApiBackendChoice,
  resolveBackendRequest,
} from '@/lib/apiBackendPreferences'
import { getAccessToken } from '@/lib/getAccessToken'
import { normalizeOrdsResponse } from '@/lib/ordsNormalize'

type RequestOptions = RequestInit & {
  headers?: Record<string, string>
}

const inflightRequests = new Map<string, Promise<unknown>>()

async function performBackendRequest(
  logicalEndpoint: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const choice = await resolveApiBackendChoice()
  const { url, requiresAuth } = resolveBackendRequest(choice, logicalEndpoint)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (requiresAuth) {
    const token = await getAccessToken()
    if (!token) {
      const message = 'No active login session found. Please log in.'
      showApiError(message, 'oracle')
      throw new ApiRequestError(message)
    }
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message = formatOracleError(response.status, data)
    showApiError(message, 'oracle')
    throw new ApiRequestError(message)
  }

  if (choice === 'ords') {
    return normalizeOrdsResponse(logicalEndpoint, data)
  }

  return data
}

/**
 * Fetch wrapper for food lookup backends (Oracle ORDS or legacy FastAPI).
 * Call sites keep using logical paths like `/api/barcode/:code` and `/api/fuzzy/:query`.
 * GET requests to those endpoints are cached on-device, scoped by selected backend.
 */
export const authenticatedRequest = async (
  endpoint: string,
  options: RequestOptions = {},
): Promise<unknown> => {
  const method = (options.method ?? 'GET').toUpperCase()
  const cacheTtl = method === 'GET' ? getCacheTtl(endpoint) : null

  if (cacheTtl !== null) {
    const choice = await resolveApiBackendChoice()
    const cached = await getCachedResponse(endpoint, choice)
    if (cached !== null) {
      return cached
    }

    const cacheKey = normalizeCacheKey(endpoint, choice)
    const inflight = inflightRequests.get(cacheKey)
    if (inflight) {
      return inflight
    }

    const promise = (async () => {
      try {
        const data = await performBackendRequest(endpoint, options)
        if (data !== null && data !== undefined) {
          // Persistence happens in the background so callers get network data immediately.
          void setCachedResponse(endpoint, data, cacheTtl, choice).catch((err) => {
            console.warn('[apiUtils] background cache persistence failed', err)
          })
        }
        return data
      } catch (err) {
        if (isApiRequestError(err)) throw err

        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('API Request failed:', message)
        showApiError(message, 'oracle')
        throw new ApiRequestError(message)
      } finally {
        inflightRequests.delete(cacheKey)
      }
    })()

    inflightRequests.set(cacheKey, promise)
    return promise
  }

  try {
    return await performBackendRequest(endpoint, options)
  } catch (err) {
    if (isApiRequestError(err)) throw err

    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('API Request failed:', message)
    showApiError(message, 'oracle')
    throw new ApiRequestError(message)
  }
}

export { account } from '@/lib/appwrite'
