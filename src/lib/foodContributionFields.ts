/**
 * OFF ↔ storage field mapping and payload builders.
 * No Appwrite / network imports — safe for unit tests and Oracle swap.
 */

/** OFF canonical name → snake_case storage column key. */
export const OFF_TO_APPWRITE: Record<string, string> = {
  code: 'code',
  product_name: 'product_name',
  brands: 'brands',
  categories: 'categories',
  quantity: 'quantity',
  serving_size: 'serving_size',
  serving_quantity: 'serving_quantity',
  allergens: 'allergens',
  traces_tags: 'traces_tags',
  image_url: 'image_url',
  nova_group: 'nova_group',
  nutriscore_grade: 'nutriscore_grade',
  ecoscore_grade: 'ecoscore_grade',
  'carbon-footprint_100g': 'carbon_footprint_100g',
  additives_n: 'additives_n',
  'energy-kcal_100g': 'energy_kcal_100g',
  'energy-kj_100g': 'energy_kj_100g',
  proteins_100g: 'proteins_100g',
  carbohydrates_100g: 'carbohydrates_100g',
  fat_100g: 'fat_100g',
  fiber_100g: 'fiber_100g',
  sugars_100g: 'sugars_100g',
  'added-sugars_100g': 'added_sugars_100g',
  polyols_100g: 'polyols_100g',
  'saturated-fat_100g': 'saturated_fat_100g',
  'trans-fat_100g': 'trans_fat_100g',
  'monounsaturated-fat_100g': 'monounsaturated_fat_100g',
  'polyunsaturated-fat_100g': 'polyunsaturated_fat_100g',
  sodium_100g: 'sodium_100g',
  cholesterol_100g: 'cholesterol_100g',
  'vitamin-a_100g': 'vitamin_a_100g',
  'vitamin-c_100g': 'vitamin_c_100g',
  'vitamin-d_100g': 'vitamin_d_100g',
  'vitamin-b12_100g': 'vitamin_b12_100g',
  calcium_100g: 'calcium_100g',
  iron_100g: 'iron_100g',
  potassium_100g: 'potassium_100g',
  magnesium_100g: 'magnesium_100g',
  caffeine_100g: 'caffeine_100g',
  taurine_100g: 'taurine_100g',
}

export const STRING_OFF_FIELDS = [
  'code',
  'product_name',
  'brands',
  'categories',
  'quantity',
  'serving_size',
  'allergens',
  'traces_tags',
  'image_url',
  'nutriscore_grade',
  'ecoscore_grade',
] as const

export const NUMBER_OFF_FIELDS = [
  'serving_quantity',
  'nova_group',
  'additives_n',
  'carbon-footprint_100g',
  'energy-kcal_100g',
  'energy-kj_100g',
  'proteins_100g',
  'carbohydrates_100g',
  'fat_100g',
  'fiber_100g',
  'sugars_100g',
  'added-sugars_100g',
  'polyols_100g',
  'saturated-fat_100g',
  'trans-fat_100g',
  'monounsaturated-fat_100g',
  'polyunsaturated-fat_100g',
  'sodium_100g',
  'cholesterol_100g',
  'vitamin-a_100g',
  'vitamin-c_100g',
  'vitamin-d_100g',
  'vitamin-b12_100g',
  'calcium_100g',
  'iron_100g',
  'potassium_100g',
  'magnesium_100g',
  'caffeine_100g',
  'taurine_100g',
] as const

export type OffStringField = (typeof STRING_OFF_FIELDS)[number]
export type OffNumberField = (typeof NUMBER_OFF_FIELDS)[number]

export type FoodContributionFieldsInput = {
  product_name: string
  code?: string | null
  source_query?: string | null
  fields?: Partial<Record<OffStringField | OffNumberField, string | number | null | undefined>>
}

function trimOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length > 0 ? text : null
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(n)) {
    throw new Error(`Expected a number, got: ${String(value)}`)
  }
  return n
}

/** Maximum character limits for string fields to prevent DoS and buffer/payload overflow */
const MAX_PRODUCT_NAME_LENGTH = 256
const MAX_CODE_LENGTH = 128
const MAX_SOURCE_QUERY_LENGTH = 256
const MAX_STRING_FIELD_LENGTH = 512

/** Map OFF-shaped fields → storage document payload (no network). */
export function buildContributionPayload(
  input: FoodContributionFieldsInput & { photo_file_id: string; owner: string },
): Record<string, string | number> {
  const productName = trimOrNull(input.product_name)
  if (!productName) throw new Error('Product name is required.')
  if (productName.length > MAX_PRODUCT_NAME_LENGTH) {
    throw new Error(`Product name must be ${MAX_PRODUCT_NAME_LENGTH} characters or fewer.`)
  }

  const data: Record<string, string | number> = {
    owner: input.owner,
    status: 'pending',
    photo_file_id: input.photo_file_id,
    product_name: productName,
  }

  const sourceQuery = trimOrNull(input.source_query)
  if (sourceQuery) {
    if (sourceQuery.length > MAX_SOURCE_QUERY_LENGTH) {
      throw new Error(`Source query must be ${MAX_SOURCE_QUERY_LENGTH} characters or fewer.`)
    }
    data.source_query = sourceQuery
  }

  const code = trimOrNull(input.code ?? input.fields?.code)
  if (code) {
    if (code.length > MAX_CODE_LENGTH) {
      throw new Error(`Code must be ${MAX_CODE_LENGTH} characters or fewer.`)
    }
    data.code = code
  }

  const fields = input.fields ?? {}

  for (const offKey of STRING_OFF_FIELDS) {
    if (offKey === 'product_name' || offKey === 'code') continue
    const mapped = OFF_TO_APPWRITE[offKey]
    const value = trimOrNull(fields[offKey])
    if (value) {
      if (value.length > MAX_STRING_FIELD_LENGTH) {
        throw new Error(`${offKey} must be ${MAX_STRING_FIELD_LENGTH} characters or fewer.`)
      }
      data[mapped] = value
    }
  }

  for (const offKey of NUMBER_OFF_FIELDS) {
    const mapped = OFF_TO_APPWRITE[offKey]
    const raw = fields[offKey]
    if (raw === null || raw === undefined || raw === '') continue
    const value = toFiniteNumber(raw)
    if (value !== null) data[mapped] = value
  }

  return data
}
