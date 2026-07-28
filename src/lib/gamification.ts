import type { MealDocument } from './meals';

export function calculateStreak(allMeals: MealDocument[]): number {
  if (allMeals.length === 0) return 0;

  // Extract unique local dates (YYYY-MM-DD) from meals
  const mealDates = new Set<string>();
  for (const meal of allMeals) {
    const d = new Date(meal.$createdAt);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    mealDates.add(dateStr);
  }

  const today = new Date();
  const getFormattedDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  let streak = 0;
  let currentDate = new Date(today);

  // Check if there's a meal today. If not, check yesterday to see if streak is still active.
  const todayStr = getFormattedDate(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getFormattedDate(yesterday);

  if (!mealDates.has(todayStr) && !mealDates.has(yesterdayStr)) {
    return 0; // Streak broken
  }

  // If there's no meal today but there is one yesterday, start checking from yesterday
  if (!mealDates.has(todayStr) && mealDates.has(yesterdayStr)) {
    currentDate = yesterday;
  }

  // Count backwards
  while (true) {
    const checkStr = getFormattedDate(currentDate);
    if (mealDates.has(checkStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

export function calculateXP(
  todayMealsCount: number,
  todayWaterCount: number,
  waterTargetHit: boolean,
  kcalHit: boolean,
  proteinHit: boolean,
  carbsHit: boolean,
  fatHit: boolean
) {
  let xp = 0;
  xp += Math.min(5, todayMealsCount) * 10; // max 50 XP
  xp += Math.min(5, todayWaterCount) * 10; // max 50 XP
  if (waterTargetHit) xp += 20;
  if (kcalHit) xp += 30;
  if (proteinHit) xp += 25;
  if (carbsHit) xp += 25;
  if (fatHit) xp += 25;

  const xpPerLevel = 100;
  const level = Math.floor(xp / xpPerLevel) + 1;
  const xpInCurrentLevel = xp % xpPerLevel;
  const xpNeeded = xpPerLevel;

  return {
    xp,
    level,
    xpInCurrentLevel,
    xpNeeded,
  };
}
