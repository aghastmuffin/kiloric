import { getOrdsFieldRank, isOrdsPresent } from './ordsNormalize'

const TITLE_KEYS = ['product_name', 'name', 'title', 'food_name', 'brands', 'brand']
const BARCODE_KEYS = ['code', 'barcode', 'barcode_id', 'upc', 'ean']
const UNWRAP_KEYS = ['product', 'product_data', 'data'] as const

const QUICK_FACT_KEYS = [
  'calories',
  'energy-kcal',
  'energy_kcal',
  'energy_kcal_100g',
  'protein',
  'proteins',
  'proteins_100g',
  'carbohydrates',
  'carbs',
  'carbohydrates_100g',
  'fat',
  'fat_100g',
  'fiber_100g',
  'sugars_100g',
  'quantity',
  'serving_size',
]

const NUMERIC_FACT_KEYS = new Set([
  'calories',
  'energy-kcal',
  'energy_kcal',
  'energy_kcal_100g',
  'protein',
  'proteins',
  'proteins_100g',
  'carbohydrates',
  'carbs',
  'carbohydrates_100g',
  'fat',
  'fat_100g',
  'fiber_100g',
  'sugars_100g',
])

export const PRODUCT_HIDDEN_KEYS = new Set([
  'product',
  'product_data',
  'data',
  'nutriments',
  'images',
  'selected_images',
  'image',
  'image_small_url',
  'image_thumb_url',
  'image_front_url',
  'image_front_small_url',
  'image_front_thumb_url',
  'image_nutrition_url',
  'image_ingredients_url',
  'ingredients',
  'ingredients_text',
  'ingredients_text_en',
  'languages',
  'languages_codes',
  'lang',
  'states',
  'states_tags',
  'states_hierarchy',
  'entry_dates_tags',
  'last_modified_t',
  'created_t',
  'last_updated_t',
  'completeness',
  'rev',
  'schema_version',
  'interface_version_created',
  'interface_version_modified',
  'calories',
  'energy-kcal',
  'energy_kcal',
  'energy-kj',
  'energy_kj',
  'proteins',
  'protein',
  'carbohydrates',
  'carbs',
  'fat',
  'fiber',
  'fibre',
  'sugars',
  'sugar',
  'sodium',
  'saturated-fat',
  'saturated_fat',
  'trans-fat',
  'trans_fat',
  'monounsaturated-fat',
  'monounsaturated_fat',
  'polyunsaturated-fat',
  'polyunsaturated_fat',
  'added-sugars',
  'added_sugars',
  'vitamin-a',
  'vitamin_a',
  'vitamin-c',
  'vitamin_c',
  'vitamin-d',
  'vitamin_d',
  'vitamin-b12',
  'vitamin_b12',
  'calcium',
  'iron',
  'potassium',
  'magnesium',
  'caffeine',
  'taurine',
  'carbon-footprint',
  'carbon_footprint',
])

export const PRODUCT_TITLE_SKIP = new Set([
  'name',
  'title',
  'food_name',
  'product_name',
  'description',
  'label',
])

export function unwrapProduct(item: Record<string, unknown>): Record<string, unknown> {
  for (const key of UNWRAP_KEYS) {
    const value = item[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
  }
  return item
}

export function getNestedValue(data: Record<string, unknown>, key: string): unknown {
  if (key in data) return data[key]

  const nutriments = data.nutriments
  if (nutriments && typeof nutriments === 'object' && !Array.isArray(nutriments)) {
    const n = nutriments as Record<string, unknown>
    if (key in n) return n[key]
    if (key === 'calories' && 'energy-kcal' in n) return n['energy-kcal']
    if (key === 'calories' && 'energy_kcal' in n) return n.energy_kcal
    if (key === 'protein' && 'proteins' in n) return n.proteins
    if (key === 'carbs' && 'carbohydrates' in n) return n.carbohydrates
  }

  return undefined
}

/**
 * ⚡ Bolt: In-memory cache for formatted product field labels.
 * Product property keys (e.g., 'energy_kcal_100g', 'proteins_100g', 'serving_size') are repeatedly
 * formatted across search results, detail cards, and fact summaries.
 * Caching formatted strings turns repeated label formatting into O(1) hash map lookups,
 * eliminating 4 regex evaluations per key per render.
 */
const FORMATTED_LABEL_CACHE = new Map<string, string>()

export function clearFormattedLabelCache(): void {
  FORMATTED_LABEL_CACHE.clear()
}

export function formatProductLabel(key: string): string {
  const cached = FORMATTED_LABEL_CACHE.get(key)
  if (cached !== undefined) return cached

  const formatted = key
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  FORMATTED_LABEL_CACHE.set(key, formatted)
  return formatted
}

export function formatProductValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : null))
      .filter(Boolean)
      .join(', ') || '—'
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function scaleFactValue(value: unknown, key: string, servings: number): unknown {
  if (servings === 1 || !NUMERIC_FACT_KEYS.has(key)) return value

  const numeric = parseNumericValue(value)
  if (numeric == null) return value

  const scaled = numeric * servings
  return Number.isInteger(scaled) ? scaled : Math.round(scaled * 10) / 10
}

export function getProductTitle(data: Record<string, unknown>, fallback: string): string {
  for (const key of TITLE_KEYS) {
    const value = getNestedValue(data, key)
    if (typeof value === 'string' && isOrdsPresent(value)) return value.trim()
  }
  return fallback
}

export function getBarcodeFromProduct(data: Record<string, unknown>): string | null {
  for (const key of BARCODE_KEYS) {
    const value = getNestedValue(data, key)
    if (isOrdsPresent(value)) {
      return String(value).trim()
    }
  }
  return null
}

export function listProductColumns(source: Record<string, unknown>): [string, unknown][] {
  const entries: [string, unknown][] = []
  for (const [key, value] of Object.entries(source)) {
    if (PRODUCT_HIDDEN_KEYS.has(key) || PRODUCT_TITLE_SKIP.has(key)) continue
    if (!isOrdsPresent(value)) continue
    if (typeof value === 'object' && !Array.isArray(value)) continue
    entries.push([key, value])
  }
  return entries.sort(([a], [b]) => {
    const scoreA = getOrdsFieldRank(a)
    const scoreB = getOrdsFieldRank(b)
    if (scoreA !== scoreB) return scoreA - scoreB
    return a.localeCompare(b)
  })
}

export function getQuickProductFacts(
  data: Record<string, unknown>,
  options?: { limit?: number; servings?: number },
): { label: string; value: string }[] {
  const limit = options?.limit ?? 4
  const servings = options?.servings ?? 1
  const facts: { label: string; value: string }[] = []
  const seen = new Set<string>()

  for (const key of QUICK_FACT_KEYS) {
    const rawValue = getNestedValue(data, key)
    if (!isOrdsPresent(rawValue)) continue
    if (typeof rawValue === 'object') continue

    const value = scaleFactValue(rawValue, key, servings)
    const label = formatProductLabel(key)
    if (seen.has(label)) continue
    seen.add(label)
    facts.push({ label, value: formatProductValue(value) })
    if (facts.length >= limit) break
  }

  return facts
}
