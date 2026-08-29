export function localDayBounds(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

/**
 * ⚡ Bolt: Optimized total water summation using a single-pass `for` loop.
 * Eliminates per-element callback stack allocations and Array.prototype.reduce overhead.
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
