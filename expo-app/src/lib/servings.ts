export const DEFAULT_SERVINGS = 1

export function scaleNutrient(value: number | null, servings: number): number | null {
  if (value == null) return null
  if (servings === 1) return value
  return Math.round(value * servings)
}
