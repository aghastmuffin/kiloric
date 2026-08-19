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
 */
export function calculateEnergyTrend(
  days: DailyEnergyPoint[],
  windowSize = 7,
): EnergyTrend {
  const logged = days.filter((day) => day.hasLog && Number.isFinite(day.kcal) && day.kcal >= 0)
  const averageKcal = logged.length
    ? logged.reduce((sum, day) => sum + day.kcal, 0) / logged.length
    : null
  const completeness = days.length ? logged.length / days.length : 0
  const confidence = completeness >= 0.8 ? 'high' : completeness >= 0.5 ? 'medium' : 'low'

  if (logged.length < 4) {
    return {
      loggedDays: logged.length,
      averageKcal,
      recentAverageKcal: null,
      previousAverageKcal: null,
      changeKcal: null,
      changePercent: null,
      direction: 'insufficient',
      confidence,
    }
  }

  const sampleSize = Math.min(windowSize, Math.floor(logged.length / 2))
  const recent = logged.slice(-sampleSize)
  const previous = logged.slice(-sampleSize * 2, -sampleSize)
  const mean = (values: DailyEnergyPoint[]) =>
    values.reduce((sum, day) => sum + day.kcal, 0) / values.length
  const recentAverageKcal = mean(recent)
  const previousAverageKcal = mean(previous)
  const changeKcal = recentAverageKcal - previousAverageKcal
  const changePercent = previousAverageKcal > 0 ? (changeKcal / previousAverageKcal) * 100 : null
  // Changes smaller than 5% (or 75 kcal when the baseline is tiny) are noise, not a trend.
  const steadyThreshold = Math.max(75, previousAverageKcal * 0.05)

  return {
    loggedDays: logged.length,
    averageKcal,
    recentAverageKcal,
    previousAverageKcal,
    changeKcal,
    changePercent,
    direction: Math.abs(changeKcal) < steadyThreshold ? 'steady' : changeKcal > 0 ? 'up' : 'down',
    confidence,
  }
}
