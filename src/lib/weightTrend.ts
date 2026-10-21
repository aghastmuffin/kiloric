import { CALORIES_PER_KG_FAT } from './nutrition'

export type DatedWeight = { day: string; weightKg: number }
export type TrendPoint = DatedWeight & { trendKg: number }

const MS_PER_DAY = 86_400_000
/** 10 % daily smoothing — the "Hacker's Diet" trend line, robust to day-to-day water swings. */
export const DEFAULT_TREND_ALPHA = 0.1

/**
 * ⚡ Bolt: Fast ISO date string index parser avoiding .split('-') and .map() array allocations.
 */
function dayIndex(day: string): number {
  const dash1 = day.indexOf('-')
  if (dash1 === -1) return 0
  const dash2 = day.indexOf('-', dash1 + 1)
  const year = Number.parseInt(day.slice(0, dash1), 10)
  const month = dash2 === -1 ? 1 : Number.parseInt(day.slice(dash1 + 1, dash2), 10)
  const date = dash2 === -1 ? 1 : Number.parseInt(day.slice(dash2 + 1), 10)
  return Math.round(Date.UTC(year, (month || 1) - 1, date || 1) / MS_PER_DAY)
}

/**
 * Exponentially weighted moving average that respects gaps: a weigh-in after n days
 * without data gets weight 1 − (1 − α)^n, as if the missing days carried the last trend.
 */
export function weightTrend(points: readonly DatedWeight[], alpha = DEFAULT_TREND_ALPHA): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day))
  const result: TrendPoint[] = []
  let trend: number | null = null
  let lastIndex = 0
  for (const point of sorted) {
    const index = dayIndex(point.day)
    if (trend == null) {
      trend = point.weightKg
    } else {
      const gap = Math.max(1, index - lastIndex)
      const weight = 1 - Math.pow(1 - alpha, gap)
      trend += weight * (point.weightKg - trend)
    }
    lastIndex = index
    result.push({ ...point, trendKg: Math.round(trend * 100) / 100 })
  }
  return result
}

/**
 * Least-squares slope of weight over time (kg/day), or null with fewer than two distinct days.
 *
 * ⚡ Bolt: Optimized to single-pass sum computation for mean calculation, avoiding points.map
 * array allocations and reduce calls.
 */
export function weightSlopeKgPerDay(points: readonly DatedWeight[]): number | null {
  const len = points.length
  if (len < 2) return null

  let sumX = 0
  let sumY = 0
  for (let i = 0; i < len; i += 1) {
    sumX += dayIndex(points[i].day)
    sumY += points[i].weightKg
  }
  const meanX = sumX / len
  const meanY = sumY / len

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < len; i += 1) {
    const xDiff = dayIndex(points[i].day) - meanX
    const yDiff = points[i].weightKg - meanY
    numerator += xDiff * yDiff
    denominator += xDiff * xDiff
  }
  return denominator === 0 ? null : numerator / denominator
}

export type AdaptiveTdee = {
  /** Blended maintenance estimate (kcal/day). */
  tdee: number
  /** Maintenance implied by logs alone: intake − weight change × energy density. */
  observedTdee: number
  formulaTdee: number
  /** 0–1 share of the estimate that comes from the user's own data. */
  confidence: number
  loggedDays: number
  spanDays: number
  weeklyChangeKg: number
}

export const ADAPTIVE_MIN_LOGGED_DAYS = 10
export const ADAPTIVE_MIN_SPAN_DAYS = 14
export const ADAPTIVE_MIN_WEIGH_INS = 3
const FULL_CONFIDENCE_DAYS = 28

/**
 * Energy-balance back-calculation (as used by adaptive coaching apps): over a window,
 * maintenance ≈ mean logged intake − (weight slope × 7,700 kcal/kg). Blended with the
 * formula estimate in proportion to how much data there is, and bounded to ±35 % of the
 * formula so a stretch of under-logging can't produce an unsafe number.
 *
 * ⚡ Bolt: Optimized to a single-pass loop over intakeByDay without allocating entries/filter/reduce arrays.
 */
export function estimateAdaptiveTdee(input: {
  intakeByDay: ReadonlyMap<string, number>
  weights: readonly DatedWeight[]
  formulaTdee: number
  /** Days excluded from intake (usually today, which is still in progress). */
  excludeDays?: readonly string[]
}): AdaptiveTdee | null {
  const excluded = input.excludeDays && input.excludeDays.length > 0 ? new Set(input.excludeDays) : null
  let loggedDaysCount = 0
  let totalIntake = 0
  for (const [day, kcal] of input.intakeByDay) {
    if ((!excluded || !excluded.has(day)) && kcal > 0) {
      loggedDaysCount += 1
      totalIntake += kcal
    }
  }
  if (loggedDaysCount < ADAPTIVE_MIN_LOGGED_DAYS || input.formulaTdee <= 0) return null
  if (input.weights.length < ADAPTIVE_MIN_WEIGH_INS) return null
  const sortedWeights = [...input.weights].sort((a, b) => a.day.localeCompare(b.day))
  const spanDays = dayIndex(sortedWeights[sortedWeights.length - 1].day) - dayIndex(sortedWeights[0].day)
  if (spanDays < ADAPTIVE_MIN_SPAN_DAYS) return null
  const slope = weightSlopeKgPerDay(sortedWeights)
  if (slope == null) return null

  const meanIntake = totalIntake / loggedDaysCount
  const rawObserved = meanIntake - slope * CALORIES_PER_KG_FAT
  const observedTdee = Math.round(
    Math.min(input.formulaTdee * 1.35, Math.max(input.formulaTdee * 0.65, rawObserved)),
  )
  const confidence =
    Math.min(1, loggedDaysCount / FULL_CONFIDENCE_DAYS) * Math.min(1, spanDays / FULL_CONFIDENCE_DAYS)
  const tdee = Math.round((confidence * observedTdee + (1 - confidence) * input.formulaTdee) / 10) * 10
  return {
    tdee,
    observedTdee,
    formulaTdee: input.formulaTdee,
    confidence: Math.round(confidence * 100) / 100,
    loggedDays: loggedDaysCount,
    spanDays,
    weeklyChangeKg: Math.round(slope * 7 * 100) / 100,
  }
}
