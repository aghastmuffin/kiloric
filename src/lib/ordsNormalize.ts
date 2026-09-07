/**
 * Normalize Oracle ORDS food responses into the shapes the app already expects.
 *
 * Code lookup (`/code?code=`) and friendly search (`/friendly-food/?search_arg=`)
 * both return collections of full products:
 *   { items: [{ code, product_name, brands, energy_kcal_100g, proteins_100g, …, relevance? }] }
 *
 * Missing ORDS cells arrive as the string `"Unknown"` — treat those as absent.
 *
 * - Barcode / product → first item as a single product (null if empty)
 * - Fuzzy search → { items, hasMore, offset, limit, count } (items sorted by relevance)
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()
    if (/^unknown$/i.test(trimmed)) return null
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** ORDS sentinel for empty cells. */
export function isOrdsUnknown(value: unknown): boolean {
  return typeof value === 'string' && /^unknown$/i.test(value.trim())
}

/** True when a value is usable (not null/empty/Unknown). */
export function isOrdsPresent(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 && !/^unknown$/i.test(trimmed)
  }
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

/**
 * Catalog fields users can usually fill from a package photo.
 * Missing any of these → recommend snapping nutrition facts + ingredients.
 */
export const ORDS_LABEL_PHOTO_FIELDS = [
  'brands',
  'categories',
  'quantity',
  'serving_size',
  'serving_quantity',
  'allergens',
  'traces_tags',
  'image_url',
  'energy_kcal_100g',
  'proteins_100g',
  'carbohydrates_100g',
  'fat_100g',
  'fiber_100g',
  'sugars_100g',
  'sodium_100g',
  'saturated_fat_100g',
] as const

export type MissingOrdsLabelField =
  | (typeof ORDS_LABEL_PHOTO_FIELDS)[number]
  | 'ingredients'

export function missingOrdsLabelFields(
  product: Record<string, unknown>,
): MissingOrdsLabelField[] {
  const missing: MissingOrdsLabelField[] = ORDS_LABEL_PHOTO_FIELDS.filter(
    (key) => !isOrdsPresent(product[key]),
  )
  const hasIngredients =
    isOrdsPresent(product.ingredients_text) || isOrdsPresent(product.ingredients)
  if (!hasIngredients) missing.push('ingredients')
  return missing
}

/** True when package/label details are incomplete (Unknown scrubbed away or absent). */
export function productHasUnknownDetails(product: Record<string, unknown>): boolean {
  return missingOrdsLabelFields(product).length > 0
}

/**
 * Snake_case ORDS / Appwrite nutrient columns → nutriment + root aliases
 * used by meal helpers and older OFF-shaped code.
 */
const NUTRIENT_ALIASES: Record<string, string[]> = {
  energy_kcal_100g: ['energy-kcal', 'energy_kcal', 'calories', 'energy-kcal_100g'],
  energy_kj_100g: ['energy-kj', 'energy_kj', 'energy-kj_100g'],
  proteins_100g: ['proteins', 'protein'],
  carbohydrates_100g: ['carbohydrates', 'carbs'],
  fat_100g: ['fat'],
  fiber_100g: ['fiber', 'fibre'],
  sugars_100g: ['sugars', 'sugar'],
  added_sugars_100g: ['added-sugars', 'added_sugars', 'added-sugars_100g'],
  polyols_100g: ['polyols'],
  saturated_fat_100g: ['saturated-fat', 'saturated_fat', 'saturated-fat_100g'],
  trans_fat_100g: ['trans-fat', 'trans_fat', 'trans-fat_100g'],
  monounsaturated_fat_100g: [
    'monounsaturated-fat',
    'monounsaturated_fat',
    'monounsaturated-fat_100g',
  ],
  polyunsaturated_fat_100g: [
    'polyunsaturated-fat',
    'polyunsaturated_fat',
    'polyunsaturated-fat_100g',
  ],
  sodium_100g: ['sodium'],
  cholesterol_100g: ['cholesterol'],
  vitamin_a_100g: ['vitamin-a', 'vitamin_a', 'vitamin-a_100g'],
  vitamin_c_100g: ['vitamin-c', 'vitamin_c', 'vitamin-c_100g'],
  vitamin_d_100g: ['vitamin-d', 'vitamin_d', 'vitamin-d_100g'],
  vitamin_b12_100g: ['vitamin-b12', 'vitamin_b12', 'vitamin-b12_100g'],
  calcium_100g: ['calcium'],
  iron_100g: ['iron'],
  potassium_100g: ['potassium'],
  magnesium_100g: ['magnesium'],
  caffeine_100g: ['caffeine'],
  taurine_100g: ['taurine'],
  carbon_footprint_100g: ['carbon-footprint', 'carbon_footprint', 'carbon-footprint_100g'],
}

/** Display order for ORDS / product detail columns. */
export const ORDS_FIELD_PRIORITY = [
  'product_name',
  'brands',
  'brand',
  'code',
  'barcode',
  'categories',
  'quantity',
  'serving_size',
  'serving_quantity',
  'energy_kcal_100g',
  'energy-kcal_100g',
  'calories',
  'energy-kcal',
  'energy_kcal',
  'energy_kj_100g',
  'proteins_100g',
  'proteins',
  'protein',
  'carbohydrates_100g',
  'carbohydrates',
  'carbs',
  'fat_100g',
  'fat',
  'fiber_100g',
  'fiber',
  'sugars_100g',
  'sugars',
  'added_sugars_100g',
  'saturated_fat_100g',
  'trans_fat_100g',
  'monounsaturated_fat_100g',
  'polyunsaturated_fat_100g',
  'polyols_100g',
  'sodium_100g',
  'sodium',
  'cholesterol_100g',
  'vitamin_a_100g',
  'vitamin_c_100g',
  'vitamin_d_100g',
  'vitamin_b12_100g',
  'calcium_100g',
  'iron_100g',
  'potassium_100g',
  'magnesium_100g',
  'caffeine_100g',
  'taurine_100g',
  'allergens',
  'traces_tags',
  'nutriscore_grade',
  'nova_group',
  'ecoscore_grade',
  'carbon_footprint_100g',
  'additives_n',
  'image_url',
  'relevance',
  'trust_and_completion_score',
  'updated_timestamp',
] as const

/**
 * Module-level O(1) Map lookup for ORDS field priority ranks.
 * Avoids O(N) linear array searches via .indexOf() during field sorting loops.
 */
const ORDS_FIELD_PRIORITY_MAP = new Map<string, number>(
  ORDS_FIELD_PRIORITY.map((key, index) => [key, index]),
)

/** Returns the O(1) priority rank for a given ORDS key (lower is higher priority). */
export function getOrdsFieldRank(key: string): number {
  return ORDS_FIELD_PRIORITY_MAP.get(key) ?? ORDS_FIELD_PRIORITY.length
}

/** Strip Unknown sentinels; keep real zeros and other scalars. */
export function scrubOrdsProduct(item: Record<string, unknown>): Record<string, unknown> {
  const scrubbed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(item)) {
    if (!isOrdsPresent(value)) continue
    scrubbed[key] = typeof value === 'string' ? value.trim() : value
  }
  return scrubbed
}

/** Map ORDS per-100g nutrient fields onto aliases used by meal/product helpers. */
export function normalizeOrdsProduct(item: Record<string, unknown>): Record<string, unknown> {
  const scrubbed = scrubOrdsProduct(item)
  const nutriments: Record<string, number> = {}
  const aliases: Record<string, number> = {}

  for (const [sourceKey, aliasKeys] of Object.entries(NUTRIENT_ALIASES)) {
    const numeric = parseNumber(scrubbed[sourceKey])
    if (numeric == null) continue
    nutriments[sourceKey] = numeric
    for (const alias of aliasKeys) {
      nutriments[alias] = numeric
      aliases[alias] = numeric
    }
  }

  return {
    ...scrubbed,
    ...aliases,
    ...(Object.keys(nutriments).length > 0 ? { nutriments } : {}),
  }
}

export function isOrdsCollection(data: unknown): data is { items: unknown[] } {
  const record = asRecord(data)
  return !!record && Array.isArray(record.items)
}

function relevanceOf(item: Record<string, unknown>): number {
  const value = parseNumber(item.relevance)
  return value ?? 0
}

/**
 * Normalize an ORDS response for a logical app endpoint.
 * Returns null when a code lookup finds no matching product.
 */
export function normalizeOrdsResponse(logicalEndpoint: string, data: unknown): unknown {
  const [path] = logicalEndpoint.split('?')
  const isCodeLookup =
    /^\/api\/barcode\//i.test(path) || /^\/api\/product\//i.test(path)
  const isFuzzy = /^\/api\/fuzzy\//i.test(path)

  if (!isOrdsCollection(data)) {
    return data
  }

  if (isCodeLookup) {
    const first = data.items[0]
    const record = asRecord(first)
    if (!record) return null
    return normalizeOrdsProduct(record)
  }

  if (isFuzzy) {
    const collection = asRecord(data)
    const products = data.items
      .map((item) => {
        const record = asRecord(item)
        return record ? normalizeOrdsProduct(record) : null
      })
      .filter((item): item is Record<string, unknown> => item != null)

    products.sort((a, b) => relevanceOf(b) - relevanceOf(a))

    const offset = parseNumber(collection?.offset) ?? 0
    const limit = parseNumber(collection?.limit) ?? products.length
    const count = parseNumber(collection?.count) ?? products.length

    return {
      items: products,
      hasMore: Boolean(collection?.hasMore),
      offset,
      limit,
      count,
    }
  }

  return data.items
}
