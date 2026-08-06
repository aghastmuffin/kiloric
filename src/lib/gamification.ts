import type { MealDocument } from '@/lib/meals'

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function calculateStreak(meals: MealDocument[]): number {
  const dates = new Set(meals.map((meal) => localDateKey(new Date(meal.$createdAt))))
  const cursor = new Date()

  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1)

  let streak = 0
  while (dates.has(localDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
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
