import AsyncStorage from '@react-native-async-storage/async-storage'
import { readStoredPreference } from '@/lib/storedPreference'

/** Food lookup backend. `legacy` is the FastAPI proxy (deprecated). */
export type ApiBackendChoice = 'ords' | 'legacy'

const STORAGE_KEY = '@kiloric/api_backend'
const LEGACY_STORAGE_KEY = '@calcount/api_backend'

/** Prefer the Oracle ORDS endpoints; FastAPI remains available as deprecated. */
export const DEFAULT_API_BACKEND: ApiBackendChoice = 'ords'

export const API_BACKEND_LABELS: Record<ApiBackendChoice, string> = {
  ords: 'Oracle ORDS',
  legacy: 'Legacy (deprecated)',
}

const LEGACY_BACKEND_URL = 'https://kiloric.co'
const ORDS_BACKEND_URL =
  'https://gba34651847beaf-caloriecount.adb.ca-montreal-1.oraclecloudapps.com/ords/admin/v1'

let cachedBackend: ApiBackendChoice | null = null

export function isApiBackendChoice(value: unknown): value is ApiBackendChoice {
  return value === 'ords' || value === 'legacy'
}

export async function loadApiBackendChoice(): Promise<ApiBackendChoice> {
  try {
    const value = await readStoredPreference(STORAGE_KEY, LEGACY_STORAGE_KEY)
    if (isApiBackendChoice(value)) {
      cachedBackend = value
      return value
    }
  } catch (err) {
    console.error('[apiBackendPreferences] load failed', err)
  }
  cachedBackend = DEFAULT_API_BACKEND
  return DEFAULT_API_BACKEND
}

export async function saveApiBackendChoice(choice: ApiBackendChoice): Promise<void> {
  cachedBackend = choice
  await AsyncStorage.setItem(STORAGE_KEY, choice)
}

/** Sync read of the in-memory preference (populated by load/save). */
export function getCachedApiBackendChoice(): ApiBackendChoice {
  return cachedBackend ?? DEFAULT_API_BACKEND
}

export function setCachedApiBackendChoice(choice: ApiBackendChoice): void {
  cachedBackend = choice
}

export async function resolveApiBackendChoice(): Promise<ApiBackendChoice> {
  if (cachedBackend) return cachedBackend
  return loadApiBackendChoice()
}

export function getBackendBaseUrl(choice: ApiBackendChoice): string {
  return choice === 'ords' ? ORDS_BACKEND_URL : LEGACY_BACKEND_URL
}

/**
 * Map the app's stable logical paths onto the selected backend URL.
 * Call sites keep using `/api/barcode/:code`, `/api/fuzzy/:query`, `/api/product/:code`.
 */
export function resolveBackendRequest(
  choice: ApiBackendChoice,
  logicalEndpoint: string,
): { url: string; requiresAuth: boolean } {
  if (choice === 'legacy') {
    return {
      url: `${LEGACY_BACKEND_URL}${logicalEndpoint}`,
      requiresAuth: true,
    }
  }

  const [path] = logicalEndpoint.split('?')

  const barcodeMatch = path.match(/^\/api\/barcode\/(.+)$/i)
  if (barcodeMatch) {
    const code = decodeURIComponent(barcodeMatch[1])
    return {
      url: `${ORDS_BACKEND_URL}/code?code=${encodeURIComponent(code)}`,
      requiresAuth: false,
    }
  }

  const productMatch = path.match(/^\/api\/product\/(.+)$/i)
  if (productMatch) {
    const code = decodeURIComponent(productMatch[1])
    return {
      url: `${ORDS_BACKEND_URL}/code?code=${encodeURIComponent(code)}`,
      requiresAuth: false,
    }
  }

  const fuzzyMatch = path.match(/^\/api\/fuzzy\/(.+)$/i)
  if (fuzzyMatch) {
    const query = decodeURIComponent(fuzzyMatch[1])
    const params = new URLSearchParams()
    params.set('search_arg', query)

    const qIndex = logicalEndpoint.indexOf('?')
    if (qIndex >= 0) {
      const incoming = new URLSearchParams(logicalEndpoint.slice(qIndex + 1))
      const offset = incoming.get('offset')
      const limit = incoming.get('limit')
      if (offset != null && offset !== '') params.set('offset', offset)
      if (limit != null && limit !== '') params.set('limit', limit)
    }

    return {
      url: `${ORDS_BACKEND_URL}/friendly-food/?${params.toString()}`,
      requiresAuth: false,
    }
  }

  return {
    url: `${ORDS_BACKEND_URL}${logicalEndpoint}`,
    requiresAuth: false,
  }
}
