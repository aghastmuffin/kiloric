export function localDayBounds(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

export function totalWaterMl(entries: readonly { amount_ml: number }[]): number {
  return entries.reduce((sum, entry) => {
    if (!Number.isFinite(entry.amount_ml) || entry.amount_ml < 25 || entry.amount_ml > 4000) {
      return sum
    }
    return sum + Math.round(entry.amount_ml)
  }, 0)
}
