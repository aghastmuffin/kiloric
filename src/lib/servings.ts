export const DEFAULT_SERVINGS = 1

export const SERVING_PRESETS = [1, 1.5, 2] as const

export type ServingPreset = (typeof SERVING_PRESETS)[number]

export function formatServings(servings: number): string {
  if (servings === 1) return '1'
  if (servings === 1.5) return '1½'
  if (servings === 2) return '2'
  if (Number.isInteger(servings)) return String(servings)
  const rounded = Math.round(servings * 100) / 100
  return String(rounded)
}

export function parseServingsInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (!trimmed) return null

  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) return null
  return parsed
}

export function isServingPreset(servings: number): servings is ServingPreset {
  return (SERVING_PRESETS as readonly number[]).includes(servings)
}

export function scaleNutrient(value: number | null, servings: number): number | null {
  if (value == null) return null
  if (servings === 1) return value
  return Math.round(value * servings)
}
