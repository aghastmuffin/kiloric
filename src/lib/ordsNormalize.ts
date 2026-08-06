/**
 * Normalize Oracle ORDS food responses into the shapes the app already expects.
 *
 * Code lookup (`/code?code=`) and friendly search (`/friendly-food/?search_arg=`)
 * both return collections of full products:
 *   { items: [{ code, product_name, brands, energy_kcal_100g, proteins_100g, …, relevance? }] }
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
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Map ORDS per-100g nutrient fields onto aliases used by meal/product helpers. */
export function normalizeOrdsProduct(item: Record<string, unknown>): Record<string, unknown> {
  const energy = parseNumber(item.energy_kcal_100g)
  const protein = parseNumber(item.proteins_100g)
  const carbs = parseNumber(item.carbohydrates_100g)
  const fat = parseNumber(item.fat_100g)

  const nutriments: Record<string, number> = {}
  if (energy != null) {
    nutriments['energy-kcal'] = energy
    nutriments.energy_kcal = energy
    nutriments.calories = energy
  }
  if (protein != null) {
    nutriments.proteins = protein
    nutriments.protein = protein
  }
  if (carbs != null) {
    nutriments.carbohydrates = carbs
    nutriments.carbs = carbs
  }
  if (fat != null) {
    nutriments.fat = fat
  }

  return {
    ...item,
    ...(energy != null ? { calories: energy, energy_kcal: energy, 'energy-kcal': energy } : {}),
    ...(protein != null ? { proteins: protein, protein } : {}),
    ...(carbs != null ? { carbohydrates: carbs, carbs } : {}),
    ...(fat != null ? { fat } : {}),
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
