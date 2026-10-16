import { getBarcodeFromProduct, getNestedValue, getProductTitle, unwrapProduct } from '@/lib/productDisplay'

export type Macros = {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 }

/** A loggable food, normalized from the food database or a saved entry. */
export type FoodItem = {
  name: string
  brand: string | null
  barcode: string | null
  /** Grams in one serving. Falls back to 100 g when the label has no serving size. */
  servingGrams: number
  servingLabel: string
  /** Nutrition for one serving. */
  perServing: Macros
}

export type AmountMode = 'servings' | 'grams'

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed || /^unknown$/i.test(trimmed)) return null
    const parsed = Number.parseFloat(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function firstNumber(product: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = parseNumber(getNestedValue(product, key))
    if (value != null) return value
  }
  return null
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || /^unknown$/i.test(trimmed)) return null
  return trimmed
}

export function roundMacro(value: number): number {
  return Math.round(value * 10) / 10
}

export function scaleMacros(macros: Macros, factor: number): Macros {
  return {
    kcal: Math.round(macros.kcal * factor),
    protein: roundMacro(macros.protein * factor),
    carbs: roundMacro(macros.carbs * factor),
    fat: roundMacro(macros.fat * factor),
  }
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: roundMacro(a.protein + b.protein),
    carbs: roundMacro(a.carbs + b.carbs),
    fat: roundMacro(a.fat + b.fat),
  }
}

export function sumMacros(list: readonly Partial<Macros>[]): Macros {
  return list.reduce<Macros>(
    (total, item) => ({
      kcal: total.kcal + (item.kcal ?? 0),
      protein: roundMacro(total.protein + (item.protein ?? 0)),
      carbs: roundMacro(total.carbs + (item.carbs ?? 0)),
      fat: roundMacro(total.fat + (item.fat ?? 0)),
    }),
    { ...ZERO_MACROS },
  )
}

const KJ_PER_KCAL = 4.184
/** Pure fat is ~900 kcal / 100 g; anything above that is a kJ value stored in the kcal column. */
const MAX_KCAL_PER_100G = 900
/**
 * Below this Atwater estimate, unlisted energy (alcohol, sugar alcohols) can dominate the label,
 * so the macro cross-check isn't trustworthy.
 */
const MIN_MACRO_KCAL_FOR_CHECK = 15

function looksLikeKilojoules(kcal: number, macroKcal: number): boolean {
  if (kcal > MAX_KCAL_PER_100G) return true
  if (macroKcal < MIN_MACRO_KCAL_FOR_CHECK) return false
  const ratio = kcal / macroKcal
  return ratio >= 3.5 && ratio <= 5
}

function kcalPer100g(product: Record<string, unknown>, macros: Omit<Macros, 'kcal'>): number {
  const kcal = firstNumber(product, ['energy_kcal_100g', 'energy-kcal_100g', 'energy-kcal', 'energy_kcal', 'calories'])
  const macroKcal = atwaterKcal(macros)
  const missing = (value: number | null) => value == null || (value === 0 && macroKcal >= MIN_MACRO_KCAL_FOR_CHECK)
  if (!missing(kcal)) return looksLikeKilojoules(kcal!, macroKcal) ? Math.round(kcal! / KJ_PER_KCAL) : kcal!
  const kj = firstNumber(product, ['energy_kj_100g', 'energy-kj_100g', 'energy-kj', 'energy_kj'])
  if (!missing(kj)) return Math.round(kj! / KJ_PER_KCAL)
  return Math.round(macroKcal)
}

/** General Atwater factors: 4 kcal/g protein and carbohydrate, 9 kcal/g fat. */
export function atwaterKcal(macros: Pick<Macros, 'protein' | 'carbs' | 'fat'>): number {
  return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9
}

/** Normalize a food-database product (ORDS or legacy shape) into a FoodItem. */
export function foodItemFromProduct(raw: Record<string, unknown>): FoodItem {
  const product = unwrapProduct(raw)
  const servingQuantity = firstNumber(product, ['serving_quantity'])
  const servingGrams = servingQuantity && servingQuantity > 0 ? servingQuantity : 100
  const servingSize = cleanString(product.serving_size)

  const macros = {
    protein: firstNumber(product, ['proteins_100g', 'proteins', 'protein']) ?? 0,
    carbs: firstNumber(product, ['carbohydrates_100g', 'carbohydrates', 'carbs']) ?? 0,
    fat: firstNumber(product, ['fat_100g', 'fat']) ?? 0,
  }
  const per100g: Macros = { kcal: kcalPer100g(product, macros), ...macros }

  const servingLabel = servingSize
    ? `1 serving = ${servingSize}`
    : `1 serving = ${Math.round(servingGrams)} g`

  return {
    name: getProductTitle(product, 'Food'),
    brand: cleanString(product.brands) ?? cleanString(product.brand),
    barcode: getBarcodeFromProduct(product) ?? getBarcodeFromProduct(raw),
    servingGrams,
    servingLabel,
    perServing: scaleMacros(per100g, servingGrams / 100),
  }
}

/** Nutrition for an amount expressed in servings or grams. */
export function macrosForAmount(item: Pick<FoodItem, 'perServing' | 'servingGrams'>, mode: AmountMode, amount: number): Macros {
  const servings = mode === 'servings' ? amount : amount / (item.servingGrams || 100)
  return scaleMacros(item.perServing, Math.max(0, servings))
}

export function servingsForAmount(item: Pick<FoodItem, 'servingGrams'>, mode: AmountMode, amount: number): number {
  return mode === 'servings' ? amount : amount / (item.servingGrams || 100)
}

export function formatAmount(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(value < 10 ? 1 : 0).replace(/\.0$/, '')
}

export function formatGrams(value: number): string {
  const rounded = roundMacro(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function formatKcal(value: number): string {
  return Math.round(value).toLocaleString('en-US')
}
