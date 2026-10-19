import { CALORIES_PER_KG_FAT } from './nutrition'

export type DatedWeight = { day: string; weightKg: number }
export type TrendPoint = DatedWeight & { trendKg: number }

const MS_PER_DAY = 86_400_000
/** 10 % daily smoothing — the "Hacker's Diet" trend line, robust to day-to-day water swings. */
export const DEFAULT_TREND_ALPHA = 0.1

function dayIndex(day: string): number {
  const [year, month, date] = day.split('-').map((part) => Number.parseInt(part, 10))
  return Math.round(Date.UTC(year, (month ?? 1) - 1, date ?? 1) / MS_PER_DAY)
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

/** Least-squares slope of weight over time (kg/day), or null with fewer than two distinct days. */
export function weightSlopeKgPerDay(points: readonly DatedWeight[]): number | null {
  if (points.length < 2) return null
  const xs = points.map((point) => dayIndex(point.day))
  const ys = points.map((point) => point.weightKg)
  const meanX = xs.reduce((sum, x) => sum + x, 0) / xs.length
  const meanY = ys.reduce((sum, y) => sum + y, 0) / ys.length
  let numerator = 0
  let denominator = 0
  for (let i = 0; i < xs.length; i += 1) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY)
    denominator += (xs[i] - meanX) ** 2
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
 */
export function estimateAdaptiveTdee(input: {
  intakeByDay: ReadonlyMap<string, number>
  weights: readonly DatedWeight[]
  formulaTdee: number
  /** Days excluded from intake (usually today, which is still in progress). */
  excludeDays?: readonly string[]
}): AdaptiveTdee | null {
  const excluded = new Set(input.excludeDays ?? [])
  const loggedDays = [...input.intakeByDay.entries()].filter(([day, kcal]) => !excluded.has(day) && kcal > 0)
  if (loggedDays.length < ADAPTIVE_MIN_LOGGED_DAYS || input.formulaTdee <= 0) return null
  if (input.weights.length < ADAPTIVE_MIN_WEIGH_INS) return null
  const sortedWeights = [...input.weights].sort((a, b) => a.day.localeCompare(b.day))
  const spanDays = dayIndex(sortedWeights[sortedWeights.length - 1].day) - dayIndex(sortedWeights[0].day)
  if (spanDays < ADAPTIVE_MIN_SPAN_DAYS) return null
  const slope = weightSlopeKgPerDay(sortedWeights)
  if (slope == null) return null

  const meanIntake = loggedDays.reduce((sum, [, kcal]) => sum + kcal, 0) / loggedDays.length
  const rawObserved = meanIntake - slope * CALORIES_PER_KG_FAT
  const observedTdee = Math.round(
    Math.min(input.formulaTdee * 1.35, Math.max(input.formulaTdee * 0.65, rawObserved)),
  )
  const confidence =
    Math.min(1, loggedDays.length / FULL_CONFIDENCE_DAYS) * Math.min(1, spanDays / FULL_CONFIDENCE_DAYS)
  const tdee = Math.round((confidence * observedTdee + (1 - confidence) * input.formulaTdee) / 10) * 10
  return {
    tdee,
    observedTdee,
    formulaTdee: input.formulaTdee,
    confidence: Math.round(confidence * 100) / 100,
    loggedDays: loggedDays.length,
    spanDays,
    weeklyChangeKg: Math.round(slope * 7 * 100) / 100,
  }
}
