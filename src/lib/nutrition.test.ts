import { describe, expect, it } from 'vitest'
import {
  calculateAge,
  calculateBmr,
  calculateDailyCalories,
  calculateDailyFluid,
  calculateMacros,
  calculateTdee,
  goalPaceKgPerWeek,
  macroReferenceWarnings,
  validateMacroPercentages,
} from './nutrition'

describe('nutrition calculations', () => {
  it('matches published Mifflin–St Jeor examples', () => {
    expect(calculateBmr(70, 170, 30, 'female')).toBe(1452)
    expect(calculateBmr(70, 170, 30, 'male')).toBe(1618)
  })

  it('applies the selected activity factor', () => {
    expect(calculateTdee(1600, 'sedentary')).toBe(1920)
    expect(calculateTdee(1600, 'moderate')).toBe(2480)
  })

  it('derives pace from weekly energy and retains safety floors', () => {
    expect(calculateDailyCalories(2200, 'lose', goalPaceKgPerWeek('lose', 'moderate'), 'female')).toBe(1650)
    expect(calculateDailyCalories(1600, 'lose', goalPaceKgPerWeek('lose', 'aggressive'), 'female')).toBe(1200)
    expect(calculateDailyCalories(2200, 'maintain', goalPaceKgPerWeek('maintain', 'gentle'), 'male')).toBe(2200)
  })

  it('converts AMDR percentages to macro grams', () => {
    expect(calculateMacros(2000, 'balanced')).toEqual({
      protein: 125,
      carbs: 225,
      fat: 67,
    })
  })

  it('validates custom macro percentages and reference ranges', () => {
    expect(validateMacroPercentages({ protein: 30, carbs: 40, fat: 30 })).toBeNull()
    expect(validateMacroPercentages({ protein: 30, carbs: 30, fat: 30 })).toMatch(/100%/)
    expect(macroReferenceWarnings({ protein: 30, carbs: 35, fat: 35 })).toEqual([
      'Carbohydrate is outside the adult AMDR of 45–65%.',
    ])
  })

  it('uses age- and sex-based beverage targets', () => {
    expect(calculateDailyFluid(70, 'female', 30)).toBe(2200)
    expect(calculateDailyFluid(70, 'male', 30)).toBe(3000)
    expect(calculateDailyFluid(70, 'female', 16)).toBe(1800)
  })

  it('calculates age without silently forcing a minimum', () => {
    expect(calculateAge(new Date(2000, 6, 10), new Date(2026, 6, 9))).toBe(25)
    expect(calculateAge(new Date(2030, 0, 1), new Date(2026, 0, 1))).toBe(0)
  })
})
