// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi } from 'vitest'
import { activeWorkoutMinutes, activityAllowanceKcal, exerciseCreditKcal, netStrengthKcal, strengthIntensity } from './exercise'
import {
  bmrFormulaFor,
  buildNutritionPlan,
  calculateBmr,
  calculateDailyCalories,
  calculateKatchMcArdleBmr,
  calculateMacros,
  goalPaceKgPerWeek,
  proteinReferenceMassKg,
} from './nutrition'
import { resolvePlanInputs } from './planInputs'
import { createDefaultPlanPreferences } from './planPreferences'
import { estimateAdaptiveTdee, weightSlopeKgPerDay, weightTrend } from './weightTrend'

vi.mock('./serverData', () => ({ account: {}, databases: {}, storage: {} }))
vi.mock('@/lib/serverTypes', () => ({ ID: { unique: () => 'id' }, Query: {}, Permission: {}, Role: {} }))

function kcalOf(macros: { protein: number; carbs: number; fat: number }) {
  return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9
}

describe('resting energy', () => {
  it('uses Katch–McArdle only when a plausible body-fat % is known', () => {
    expect(calculateKatchMcArdleBmr(80, 20)).toBe(1752)
    expect(calculateBmr(80, 180, 30, 'male', 20)).toBe(1752)
    expect(calculateBmr(80, 180, 30, 'male', null)).toBe(1780)
    expect(calculateBmr(80, 180, 30, 'male', 85)).toBe(1780)
    expect(bmrFormulaFor(20)).toBe('katch_mcardle')
    expect(bmrFormulaFor(undefined)).toBe('mifflin_st_jeor')
  })
})

describe('goal pace and energy targets', () => {
  it('scales pace with body weight and caps it', () => {
    expect(goalPaceKgPerWeek('lose', 'moderate', 80)).toBe(-0.6)
    expect(goalPaceKgPerWeek('lose', 'aggressive', 160)).toBe(-1)
    expect(goalPaceKgPerWeek('gain', 'aggressive', 70)).toBe(0.35)
    expect(goalPaceKgPerWeek('gain', 'gentle', 70)).toBe(0.11)
    expect(goalPaceKgPerWeek('maintain', 'aggressive', 70)).toBe(0)
    expect(goalPaceKgPerWeek('lose', 'moderate')).toBe(-0.5)
  })

  it('applies sex-based floors without pushing a small maintenance above TDEE', () => {
    expect(calculateDailyCalories(2400, 'lose', 'moderate', 'male', 80)).toBe(1740)
    expect(calculateDailyCalories(1500, 'lose', 'aggressive', 'female', 60)).toBe(1200)
    expect(calculateDailyCalories(1150, 'lose', 'gentle', 'female', 45)).toBe(1150)
  })

  it('records the pace the floor actually allows', () => {
    const plan = buildNutritionPlan({
      dateOfBirth: new Date(1990, 0, 1),
      sex: 'female',
      heightCm: 152,
      weightKg: 50,
      activity: 'sedentary',
      goal: 'lose',
      pace: 'aggressive',
      diet: 'balanced',
    })
    expect(plan.targetKcal).toBe(1200)
    expect(Math.abs(plan.goalPaceKgPerWeek)).toBeLessThan(0.5)
    expect(plan.goalPaceKgPerWeek).toBeLessThan(0)
  })
})

describe('macro targets', () => {
  it('caps the protein reference mass at BMI 25 and uses lean mass when known', () => {
    expect(proteinReferenceMassKg(120, { heightCm: 175 })).toBeCloseTo(76.6, 1)
    expect(proteinReferenceMassKg(60, { heightCm: 175 })).toBe(60)
    expect(proteinReferenceMassKg(100, { bodyFatPct: 30 })).toBeCloseTo(87.5, 1)
  })

  it('sets protein by goal, keeps a fat floor and makes carbs the remainder', () => {
    const macros = calculateMacros(2000, 70, 'balanced', { goal: 'lose', heightCm: 175 })
    expect(macros.protein).toBe(140)
    expect(macros.fat).toBe(67)
    expect(macros.carbs).toBe(210)
    expect(Math.abs(kcalOf(macros) - 2000)).toBeLessThan(10)
  })

  it('never lets protein exceed 35 % of energy', () => {
    const macros = calculateMacros(1200, 110, 'high_protein', { goal: 'lose' })
    expect(macros.protein * 4).toBeLessThanOrEqual(1200 * 0.35)
  })

  it('caps low-carb at 130 g / 26 % and moves the rest to fat', () => {
    const macros = calculateMacros(2600, 80, 'low_carb', { goal: 'maintain', heightCm: 180 })
    expect(macros.carbs).toBeLessThanOrEqual(130)
    expect(Math.abs(kcalOf(macros) - 2600)).toBeLessThan(10)
  })

  it('keeps fat at 20 % of energy or more', () => {
    const macros = calculateMacros(1800, 70, 'plant_forward', { goal: 'maintain' })
    expect(macros.fat * 9).toBeGreaterThanOrEqual(1800 * 0.2 - 9)
  })
})

describe('exercise energy', () => {
  it('derives intensity from set density', () => {
    expect(strengthIntensity(20, 45)).toBe('vigorous')
    expect(strengthIntensity(12, 40)).toBe('moderate')
    expect(strengthIntensity(6, 60)).toBe('light')
  })

  it('bounds duration by the completed sets', () => {
    expect(activeWorkoutMinutes(300, 6)).toBe(29)
    expect(activeWorkoutMinutes(40, 15)).toBe(40)
    expect(activeWorkoutMinutes(40, 0)).toBe(0)
  })

  it('counts net energy, (MET − 1) × kg × h', () => {
    expect(netStrengthKcal({ elapsedMinutes: 60, completedSets: 18, bodyWeightKg: 80 })).toMatchObject({
      kcal: 320,
      intensity: 'moderate',
      met: 5,
    })
    expect(netStrengthKcal({ elapsedMinutes: 30, completedSets: 0, bodyWeightKg: 80 }).kcal).toBe(0)
  })

  it('only credits exercise beyond what the activity level already assumes', () => {
    expect(activityAllowanceKcal(1920, 'sedentary')).toBe(0)
    expect(activityAllowanceKcal(2480, 'moderate')).toBe(560)
    expect(exerciseCreditKcal(300, 1920, 'sedentary')).toBe(300)
    expect(exerciseCreditKcal(300, 2480, 'moderate')).toBe(0)
    expect(exerciseCreditKcal(800, 2480, 'moderate')).toBe(240)
    expect(exerciseCreditKcal(300, null, 'moderate')).toBe(300)
  })
})

describe('weight trend', () => {
  it('smooths with a gap-aware EWMA', () => {
    const trend = weightTrend([
      { day: '2026-01-01', weightKg: 80 },
      { day: '2026-01-02', weightKg: 81 },
      { day: '2026-01-12', weightKg: 79 },
    ])
    expect(trend[0].trendKg).toBe(80)
    expect(trend[1].trendKg).toBe(80.1)
    expect(trend[2].trendKg).toBeCloseTo(79.38, 2)
  })

  it('computes a least-squares slope', () => {
    expect(weightSlopeKgPerDay([{ day: '2026-01-01', weightKg: 80 }, { day: '2026-01-11', weightKg: 79 }])).toBeCloseTo(-0.1, 5)
    expect(weightSlopeKgPerDay([{ day: '2026-01-01', weightKg: 80 }])).toBeNull()
  })
})

describe('adaptive maintenance', () => {
  const intake = new Map(Array.from({ length: 28 }, (_, i) => [`2026-02-${String(i + 1).padStart(2, '0')}`, 2000]))
  const losing = [
    { day: '2026-02-01', weightKg: 80 },
    { day: '2026-02-08', weightKg: 79.75 },
    { day: '2026-02-15', weightKg: 79.5 },
    { day: '2026-02-22', weightKg: 79.25 },
    { day: '2026-03-01', weightKg: 79 },
  ]

  it('back-calculates maintenance from intake and the weight slope', () => {
    const estimate = estimateAdaptiveTdee({ intakeByDay: intake, weights: losing, formulaTdee: 2400 })
    expect(estimate).not.toBeNull()
    expect(estimate!.observedTdee).toBe(2275)
    expect(estimate!.confidence).toBe(1)
    expect(estimate!.tdee).toBe(2280)
    expect(estimate!.weeklyChangeKg).toBe(-0.25)
  })

  it('needs enough logged days and a two-week weight span', () => {
    const short = new Map([...intake].slice(0, 5))
    expect(estimateAdaptiveTdee({ intakeByDay: short, weights: losing, formulaTdee: 2400 })).toBeNull()
    expect(estimateAdaptiveTdee({ intakeByDay: intake, weights: losing.slice(0, 2), formulaTdee: 2400 })).toBeNull()
  })

  it('bounds the observed value so under-logging cannot produce an unsafe estimate', () => {
    const tiny = new Map([...intake].map(([day]) => [day, 600]))
    const estimate = estimateAdaptiveTdee({ intakeByDay: tiny, weights: losing.map((p) => ({ ...p, weightKg: 80 })), formulaTdee: 2400 })
    expect(estimate!.observedTdee).toBe(1560)
  })
})

describe('plan inputs', () => {
  it('prefers profile columns, then account prefs', () => {
    const prefs = { ...createDefaultPlanPreferences(), sex: 'male' as const, activity: 'light' as const, bodyFatPct: 18 }
    expect(resolvePlanInputs({ TDEE: 2300 }, prefs)).toMatchObject({ sex: 'male', activity: 'light', bodyFatPct: 18, tdee: 2300 })
    expect(resolvePlanInputs({ sex: 'female', activity_level: 'active', body_fat_pct: 25 }, prefs)).toMatchObject({
      sex: 'female',
      activity: 'active',
      bodyFatPct: 25,
      tdee: null,
    })
    expect(resolvePlanInputs(null, null)).toMatchObject({ sex: 'female', activity: 'moderate', goal: 'maintain' })
  })
})
