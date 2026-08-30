export type DailyEnergyPoint = {
  kcal: number
  hasLog: boolean
}

export type EnergyTrend = {
  loggedDays: number
  averageKcal: number | null
  recentAverageKcal: number | null
  previousAverageKcal: number | null
  changeKcal: number | null
  changePercent: number | null
  direction: 'up' | 'down' | 'steady' | 'insufficient'
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Compares equally sized, chronologically adjacent logged-day windows.
 * Missing days are never treated as zero calories; confidence exposes incomplete logging.
 *
 * ⚡ Bolt: Optimized to single-pass filtering and index pointer arithmetic for window sums,
 * eliminating redundant Array.prototype.filter, slice, and reduce allocations on stats renders.
 */
export function calculateEnergyTrend(
  days: DailyEnergyPoint[],
  windowSize = 7,
): EnergyTrend {
  const loggedKcal: number[] = []
  let totalKcal = 0

  for (let i = 0; i < days.length; i++) {
    const day = days[i]
    if (day.hasLog && Number.isFinite(day.kcal) && day.kcal >= 0) {
      loggedKcal.push(day.kcal)
      totalKcal += day.kcal
    }
  }

  const loggedCount = loggedKcal.length
  const averageKcal = loggedCount > 0 ? totalKcal / loggedCount : null
  const completeness = days.length > 0 ? loggedCount / days.length : 0
  const confidence = completeness >= 0.8 ? 'high' : completeness >= 0.5 ? 'medium' : 'low'

  if (loggedCount < 4) {
    return {
      loggedDays: loggedCount,
      averageKcal,
      recentAverageKcal: null,
      previousAverageKcal: null,
      changeKcal: null,
      changePercent: null,
      direction: 'insufficient',
      confidence,
    }
  }

  const sampleSize = Math.min(windowSize, Math.floor(loggedCount / 2))

  let recentSum = 0
  const recentStart = loggedCount - sampleSize
  for (let i = recentStart; i < loggedCount; i++) {
    recentSum += loggedKcal[i]
  }

  let previousSum = 0
  const previousStart = loggedCount - sampleSize * 2
  for (let i = previousStart; i < recentStart; i++) {
    previousSum += loggedKcal[i]
  }

  const recentAverageKcal = recentSum / sampleSize
  const previousAverageKcal = previousSum / sampleSize
  const changeKcal = recentAverageKcal - previousAverageKcal
  const changePercent = previousAverageKcal > 0 ? (changeKcal / previousAverageKcal) * 100 : null
  // Changes smaller than 5% (or 75 kcal when the baseline is tiny) are noise, not a trend.
  const steadyThreshold = Math.max(75, previousAverageKcal * 0.05)

  return {
    loggedDays: loggedCount,
    averageKcal,
    recentAverageKcal,
    previousAverageKcal,
    changeKcal,
    changePercent,
    direction: Math.abs(changeKcal) < steadyThreshold ? 'steady' : changeKcal > 0 ? 'up' : 'down',
    confidence,
  }
}
