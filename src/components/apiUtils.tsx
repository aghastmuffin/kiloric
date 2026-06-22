import {
  ApiRequestError,
  formatOracleError,
  isApiRequestError,
  showApiError,
} from '@/lib/apiErrors'
import { getCachedResponse, getCacheTtl, normalizeCacheKey, setCachedResponse } from '@/lib/apiCache'
import { getAccessToken } from '@/lib/getAccessToken'

const BACKEND_URL = 'https://calcount.taeson.co'

type RequestOptions = RequestInit & {
  headers?: Record<string, string>
}

const inflightRequests = new Map<string, Promise<unknown>>()

async function performAuthenticatedRequest(
  endpoint: string,
  options: RequestOptions = {},
): Promise<unknown> {
  const token = await getAccessToken()

  if (!token) {
    const message = 'No active login session found. Please log in.'
    showApiError(message, 'oracle')
    throw new ApiRequestError(message)
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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

  return data
}

/**
 * Authenticated fetch wrapper for the FastAPI backend.
 * GET requests to barcode, product, and fuzzy search endpoints are cached on-device.
 */
export const authenticatedRequest = async (
  endpoint: string,
  options: RequestOptions = {},
): Promise<unknown> => {
  const method = (options.method ?? 'GET').toUpperCase()
  const cacheTtl = method === 'GET' ? getCacheTtl(endpoint) : null

  if (cacheTtl !== null) {
    const cached = await getCachedResponse(endpoint)
    if (cached !== null) {
      return cached
    }

    const cacheKey = normalizeCacheKey(endpoint)
    const inflight = inflightRequests.get(cacheKey)
    if (inflight) {
      return inflight
    }

    const promise = (async () => {
      try {
        const data = await performAuthenticatedRequest(endpoint, options)
        await setCachedResponse(endpoint, data, cacheTtl)
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
    return await performAuthenticatedRequest(endpoint, options)
  } catch (err) {
    if (isApiRequestError(err)) throw err

    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('API Request failed:', message)
    showApiError(message, 'oracle')
    throw new ApiRequestError(message)
  }
}

export { account } from '@/lib/appwrite'
