import type { MealDocument } from '@/lib/meals'

/**
 * Formats a Date object into a YYYY-MM-DD local date string.
 * Optimized to avoid String.prototype.padStart string allocations.
 */
function localDateKey(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const mStr = month < 10 ? `0${month}` : `${month}`
  const dStr = day < 10 ? `0${day}` : `${day}`
  return `${date.getFullYear()}-${mStr}-${dStr}`
}

/**
 * Calculates consecutive daily meal logging streak ending today or yesterday.
 *
 * Performance optimizations:
 * 1. Early return for empty meal arrays.
 * 2. Single-pass for loop populates Set without intermediate array allocation from Array.map.
 * 3. Local variable caching of current cursor date key prevents redundant re-computations inside loop checks.
 */
export function calculateStreak(meals: MealDocument[]): number {
  if (meals.length === 0) return 0

  const dates = new Set<string>()
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i]
    if (meal?.$createdAt) {
      dates.add(localDateKey(new Date(meal.$createdAt)))
    }
  }

  const cursor = new Date()
  let key = localDateKey(cursor)

  // If no meals were logged today, check if streak is active starting yesterday
  if (!dates.has(key)) {
    cursor.setDate(cursor.getDate() - 1)
    key = localDateKey(cursor)
  }

  let streak = 0
  while (dates.has(key)) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
    key = localDateKey(cursor)
  }

  return streak
}

export type DailyProgress = {
  meals: number
  water: number
  calorieTargetHit: boolean
  proteinTargetHit: boolean
}

export function calculateXP(progress: DailyProgress) {
  const xp =
    Math.min(progress.meals, 5) * 12 +
    Math.min(progress.water, 8) * 4 +
    (progress.calorieTargetHit ? 30 : 0) +
    (progress.proteinTargetHit ? 25 : 0)
  const xpPerLevel = 100

  return {
    xp,
    level: Math.floor(xp / xpPerLevel) + 1,
    xpInCurrentLevel: xp % xpPerLevel,
    xpNeeded: xpPerLevel,
  }
}
