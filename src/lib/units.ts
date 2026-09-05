export type DisplayUnits = 'metric' | 'imperial'

/** Countries where people typically think in feet, pounds, and fluid ounces. */
const IMPERIAL_DISPLAY_COUNTRIES = new Set(['US', 'PR', 'GU', 'VI', 'AS', 'MP', 'LR', 'MM'])

const KG_TO_LBS = 2.2046226218
const CM_TO_INCHES = 0.3937007874
const LITER_TO_FL_OZ = 33.814

export function prefersImperialDisplay(country: string | null | undefined): boolean {
  if (!country) return false
  return IMPERIAL_DISPLAY_COUNTRIES.has(country.trim().toUpperCase())
}

export function defaultDisplayUnits(country: string | null | undefined): DisplayUnits {
  return prefersImperialDisplay(country) ? 'imperial' : 'metric'
}

export function roundMetric(value: number): number {
  return Math.round(value * 10) / 10
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS)
}

export function lbsToKg(lbs: number): number {
  return roundMetric(lbs / KG_TO_LBS)
}

export function cmToTotalInches(cm: number): number {
  return Math.round(cm * CM_TO_INCHES)
}

export function totalInchesToCm(inches: number): number {
  return roundMetric(inches / CM_TO_INCHES)
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToTotalInches(cm)
  return {
    feet: Math.floor(totalInches / 12),
    inches: totalInches % 12,
  }
}

export function feetInchesToCm(feet: number, inches: number): number {
  return totalInchesToCm(feet * 12 + inches)
}

export function mlToFlOz(ml: number): number {
  return Math.round(ml / LITER_TO_FL_OZ)
}

export function kgPerWeekToLbsPerWeek(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 10) / 10
}

export function formatHeightMetric(cm: number): string {
  return `${roundMetric(cm)} cm`
}

export function formatWeightMetric(kg: number): string {
  return `${roundMetric(kg)} kg`
}

export function formatHeightImperial(cm: number): string {
  const { feet, inches } = cmToFeetInches(cm)
  return `${feet}'${inches}"`
}

export function formatWeightImperial(kg: number): string {
  return `${kgToLbs(kg)} lb`
}

export function formatFluid(units: DisplayUnits, ml: number): string {
  return units === 'imperial' ? `${mlToFlOz(ml)} fl oz` : `${ml} ml`
}

export function formatPaceRate(units: DisplayUnits, kgPerWeek: number): string {
  return units === 'imperial'
    ? `~${Math.abs(kgPerWeekToLbsPerWeek(kgPerWeek))} lb / week`
    : `~${Math.abs(kgPerWeek)} kg / week`
}

/**
 * Profiles always store cm + kg. This migrates older US rows that were saved
 * in inches/pounds before metric standardization.
 */
export function normalizeStoredMetricsToMetric(
  country: string | null | undefined,
  storedHeight: number,
  storedWeight: number,
): { heightCm: number; weightKg: number } {
  const heightCm = roundMetric(storedHeight)
  const weightKg = roundMetric(storedWeight)

  if (!prefersImperialDisplay(country)) {
    return { heightCm, weightKg }
  }

  if (storedHeight <= 100 && storedWeight >= 50 && storedWeight <= 600) {
    return {
      heightCm: totalInchesToCm(storedHeight),
      weightKg: lbsToKg(storedWeight),
    }
  }

  return { heightCm, weightKg }
}

export function normalizeStoredTargetWeightKg(
  country: string | null | undefined,
  storedTarget: number | null | undefined,
  storedHeight: number,
): number | null {
  if (storedTarget == null) return null

  if (!prefersImperialDisplay(country)) {
    return roundMetric(storedTarget)
  }

  if (storedHeight <= 100 && storedTarget >= 50 && storedTarget <= 600) {
    return lbsToKg(storedTarget)
  }

  return roundMetric(storedTarget)
}

const METRIC_SUFFIX = ' · units:metric'
const IMPERIAL_SUFFIX = ' · units:imperial'

export function appendDisplayUnitsToGoalPlain(goalPlain: string, displayUnits: DisplayUnits): string {
  let base = goalPlain
  if (goalPlain.endsWith(METRIC_SUFFIX)) {
    base = goalPlain.slice(0, -METRIC_SUFFIX.length)
  } else if (goalPlain.endsWith(IMPERIAL_SUFFIX)) {
    base = goalPlain.slice(0, -IMPERIAL_SUFFIX.length)
  }
  return `${base} · units:${displayUnits}`
}

/** @deprecated meals is a Relationship column — use goal_plain metadata instead */
export function appendDisplayUnitsToMeals(mealsLabel: string, displayUnits: DisplayUnits): string {
  return appendDisplayUnitsToGoalPlain(mealsLabel, displayUnits)
}

/**
 * Parses user display units preference from goal_plain metadata.
 * Uses fast string `.endsWith()` checks instead of regex pattern matching
 * to eliminate per-call RegExp allocations and V8 match array creations.
 */
export function parseDisplayUnitsPreference(
  goalPlain: string | null | undefined,
  country: string | null | undefined,
): DisplayUnits {
  if (goalPlain) {
    if (goalPlain.endsWith(METRIC_SUFFIX)) {
      return 'metric'
    }
    if (goalPlain.endsWith(IMPERIAL_SUFFIX)) {
      return 'imperial'
    }
  }
  return defaultDisplayUnits(country)
}

/** @deprecated use parseDisplayUnitsPreference */
export function parseDisplayUnitsFromMeals(
  meals: string | null | undefined,
  country: string | null | undefined,
): DisplayUnits {
  return parseDisplayUnitsPreference(meals, country)
}

/** @deprecated use prefersImperialDisplay */
export function usesImperialStorage(country: string | null | undefined): boolean {
  return prefersImperialDisplay(country)
}

/** @deprecated profiles always store metric now */
export function loadBodyMetrics(
  country: string | null | undefined,
  storedHeight: number,
  storedWeight: number,
) {
  const normalized = normalizeStoredMetricsToMetric(country, storedHeight, storedWeight)
  return { heightCm: normalized.heightCm, weightKg: normalized.weightKg }
}

/** @deprecated profiles always store metric now */
export function loadTargetWeightKg(
  country: string | null | undefined,
  storedTarget: number | null | undefined,
  storedHeight: number,
): number | null {
  return normalizeStoredTargetWeightKg(country, storedTarget, storedHeight)
}

/** @deprecated profiles always store metric now */
export function saveBodyMetrics(
  _country: string | null | undefined,
  heightCm: number,
  weightKg: number,
) {
  return { height: roundMetric(heightCm), weight: roundMetric(weightKg) }
}

/** @deprecated profiles always store metric now */
export function saveTargetWeight(_country: string | null | undefined, targetKg: number): number {
  return roundMetric(targetKg)
}

// Legacy aliases used during conversion in pickers
export const cmToInches = cmToTotalInches
export const inchesToCm = totalInchesToCm
