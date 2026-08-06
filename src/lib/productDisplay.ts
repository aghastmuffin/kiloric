import { isOrdsPresent } from '@/lib/ordsNormalize'

const TITLE_KEYS = ['product_name', 'name', 'title', 'food_name', 'brands', 'brand']
const BARCODE_KEYS = ['code', 'barcode', 'barcode_id', 'upc', 'ean']

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

function getNestedValue(data: Record<string, unknown>, key: string): unknown {
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

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
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
    const label = formatLabel(key)
    if (seen.has(label)) continue
    seen.add(label)
    facts.push({ label, value: formatValue(value) })
    if (facts.length >= limit) break
  }

  return facts
}
