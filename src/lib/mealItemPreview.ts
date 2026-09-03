import { authenticatedRequest } from '../components/apiUtils'
import { resolveApiBackendChoice } from './apiBackendPreferences'
import { getCachedResponse } from './apiCache'
import { buildMealInputFromProduct } from './mealFromProduct'
import type { MealType } from './meals'
import { getProductTitle, getQuickProductFacts } from './productDisplay'

export type MealItemPreview = {
  barcode: string
  title: string
  facts: { label: string; value: string }[]
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

// ⚡ Bolt: In-memory cache & inflight request deduplication for meal item previews
// Prevents redundant API requests and JSON parsing when rendering logged meal items.
const previewCache = new Map<string, MealItemPreview>()
const inflightPreviewPromises = new Map<string, Promise<MealItemPreview>>()

/**
 * Clears the in-memory meal item preview cache.
 * Useful when logging out or forcing a complete refresh.
 */
export function clearMealItemPreviewCache(): void {
  previewCache.clear()
  inflightPreviewPromises.clear()
}

function unwrapProductData(data: Record<string, unknown>): Record<string, unknown> {
  if ('data' in data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data as Record<string, unknown>
  }
  if ('product' in data && data.product && typeof data.product === 'object' && !Array.isArray(data.product)) {
    return data.product as Record<string, unknown>
  }
  return data
}

async function performFetchMealItemPreview(
  barcode: string,
  mealType: MealType,
  servings: number,
): Promise<MealItemPreview> {
  const endpoint = `/api/barcode/${encodeURIComponent(barcode)}`
  let data: Record<string, unknown> | null = null

  try {
    const fetched = await authenticatedRequest(endpoint)
    if (fetched && typeof fetched === 'object' && !Array.isArray(fetched)) {
      data = fetched as Record<string, unknown>
    }
  } catch {
    const choice = await resolveApiBackendChoice()
    const cached = await getCachedResponse(endpoint, choice)
    if (cached && typeof cached === 'object' && !Array.isArray(cached)) {
      data = cached as Record<string, unknown>
    }
  }

  if (!data) {
    return {
      barcode,
      title: `Barcode: ${barcode}`,
      facts: [],
      kcal: null,
      protein: null,
      carbs: null,
      fat: null,
    }
  }

  const actualData = unwrapProductData(data)
  const input = buildMealInputFromProduct('preview', actualData, mealType, barcode, servings)
  const displayFacts = [...getQuickProductFacts(actualData, { servings })]

  if (input.kcal != null) displayFacts.push({ label: 'Calories', value: `${Math.round(input.kcal)} kcal` })
  if (input.protein != null) displayFacts.push({ label: 'Protein', value: `${input.protein.toFixed(1)}g` })
  if (input.carbs != null) displayFacts.push({ label: 'Carbs', value: `${input.carbs.toFixed(1)}g` })
  if (input.fat != null) displayFacts.push({ label: 'Fat', value: `${input.fat.toFixed(1)}g` })

  return {
    barcode,
    title: getProductTitle(actualData, barcode),
    facts: displayFacts,
    kcal: input.kcal ?? null,
    protein: input.protein ?? null,
    carbs: input.carbs ?? null,
    fat: input.fat ?? null,
  }
}

export function fetchMealItemPreview(
  barcode: string,
  mealType: MealType = 'Breakfast',
  servings = 1,
): Promise<MealItemPreview> {
  const cacheKey = `${barcode}:${mealType}:${servings}`

  const cached = previewCache.get(cacheKey)
  if (cached) {
    return Promise.resolve(cached)
  }

  const existingPromise = inflightPreviewPromises.get(cacheKey)
  if (existingPromise) {
    return existingPromise
  }

  const promise = performFetchMealItemPreview(barcode, mealType, servings)
    .then((result) => {
      previewCache.set(cacheKey, result)
      return result
    })
    .finally(() => {
      inflightPreviewPromises.delete(cacheKey)
    })

  inflightPreviewPromises.set(cacheKey, promise)
  return promise
}
