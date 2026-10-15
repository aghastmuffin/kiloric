import { authenticatedRequest } from '@/lib/apiUtils'
import { resolveApiBackendChoice } from '@/lib/apiBackendPreferences'
import { getCachedResponse } from '@/lib/apiCache'
import { buildMealInputFromProduct } from '@/lib/mealFromProduct'
import type { MealType } from '@/lib/meals'
import { getProductTitle, getQuickProductFacts, unwrapProduct } from '@/lib/productDisplay'

export type MealItemPreview = {
  barcode: string
  title: string
  facts: { label: string; value: string }[]
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

const inflightPreviews = new Map<string, Promise<MealItemPreview>>()

function emptyPreview(barcode: string): MealItemPreview {
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

async function loadMealItemPreview(
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

  if (!data) return emptyPreview(barcode)

  const actualData = unwrapProduct(data)
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

export async function fetchMealItemPreview(
  barcode: string,
  mealType: MealType = 'Breakfast',
  servings = 1,
): Promise<MealItemPreview> {
  const key = `${barcode}:${mealType}:${servings}`
  const inflight = inflightPreviews.get(key)
  if (inflight) return inflight

  const promise = loadMealItemPreview(barcode, mealType, servings).finally(() => {
    inflightPreviews.delete(key)
  })
  inflightPreviews.set(key, promise)
  return promise
}
