export { localDayBounds, startOfLocalDay } from './dates'

/**
 * Sum valid water log amounts in a single pass.
 */
export function totalWaterMl(entries: readonly { amount_ml: number }[]): number {
  let sum = 0
  for (let i = 0; i < entries.length; i++) {
    const ml = entries[i].amount_ml
    if (Number.isFinite(ml) && ml >= 25 && ml <= 4000) {
      sum += Math.round(ml)
    }
  }
  return sum
}
