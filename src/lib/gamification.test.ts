import { describe, expect, it } from 'vitest'
import { calculateStreak, calculateXP } from './gamification'
import type { MealDocument } from './meals'

function mockMeal(createdAtIso: string): MealDocument {
  return {
    $id: `meal-${Math.random()}`,
    $collectionId: 'meals',
    $databaseId: 'db',
    $createdAt: createdAtIso,
    $updatedAt: createdAtIso,
    $permissions: [],
    owner: 'user-1',
    kcal: 500,
  } as unknown as MealDocument
}

function getIsoDateOffset(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysOffset)
  return d.toISOString()
}

describe('gamification', () => {
  describe('calculateStreak', () => {
    it('returns 0 for empty meals array', () => {
      expect(calculateStreak([])).toBe(0)
    })

    it('returns 1 for a single meal logged today', () => {
      const meals = [mockMeal(getIsoDateOffset(0))]
      expect(calculateStreak(meals)).toBe(1)
    })

    it('returns 1 for a single meal logged yesterday when no meal today', () => {
      const meals = [mockMeal(getIsoDateOffset(1))]
      expect(calculateStreak(meals)).toBe(1)
    })

    it('returns 0 when most recent meal was 2 or more days ago', () => {
      const meals = [mockMeal(getIsoDateOffset(2))]
      expect(calculateStreak(meals)).toBe(0)
    })

    it('calculates a multi-day consecutive streak starting today', () => {
      const meals = [
        mockMeal(getIsoDateOffset(0)),
        mockMeal(getIsoDateOffset(1)),
        mockMeal(getIsoDateOffset(2)),
      ]
      expect(calculateStreak(meals)).toBe(3)
    })

    it('calculates a multi-day consecutive streak starting yesterday (no log today yet)', () => {
      const meals = [
        mockMeal(getIsoDateOffset(1)),
        mockMeal(getIsoDateOffset(2)),
        mockMeal(getIsoDateOffset(3)),
      ]
      expect(calculateStreak(meals)).toBe(3)
    })

    it('handles multiple meals on the same day correctly', () => {
      const meals = [
        mockMeal(getIsoDateOffset(0)),
        mockMeal(getIsoDateOffset(0)),
        mockMeal(getIsoDateOffset(1)),
        mockMeal(getIsoDateOffset(1)),
      ]
      expect(calculateStreak(meals)).toBe(2)
    })

    it('stops streak at the first missing day gap', () => {
      const meals = [
        mockMeal(getIsoDateOffset(0)),
        mockMeal(getIsoDateOffset(1)),
        // gap at offset 2
        mockMeal(getIsoDateOffset(3)),
        mockMeal(getIsoDateOffset(4)),
      ]
      expect(calculateStreak(meals)).toBe(2)
    })
  })

  describe('calculateXP', () => {
    it('calculates level and XP correctly for zero progress', () => {
      const res = calculateXP({
        meals: 0,
        water: 0,
        calorieTargetHit: false,
        proteinTargetHit: false,
      })
      expect(res).toEqual({
        xp: 0,
        level: 1,
        xpInCurrentLevel: 0,
        xpNeeded: 100,
      })
    })

    it('calculates XP correctly with full daily progress bonuses', () => {
      const res = calculateXP({
        meals: 3, // 3 * 12 = 36
        water: 8, // 8 * 4 = 32
        calorieTargetHit: true, // 30
        proteinTargetHit: true, // 25
      }) // total = 123
      expect(res).toEqual({
        xp: 123,
        level: 2,
        xpInCurrentLevel: 23,
        xpNeeded: 100,
      })
    })

    it('caps meal and water bonuses at max caps', () => {
      const res = calculateXP({
        meals: 10, // capped at 5 -> 5 * 12 = 60
        water: 15, // capped at 8 -> 8 * 4 = 32
        calorieTargetHit: false,
        proteinTargetHit: false,
      }) // total = 92
      expect(res).toEqual({
        xp: 92,
        level: 1,
        xpInCurrentLevel: 92,
        xpNeeded: 100,
      })
    })
  })
})