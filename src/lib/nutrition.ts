export type Sex = 'male' | 'female'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export type FitnessGoal = 'lose' | 'maintain' | 'gain'

export type GoalPace = 'gentle' | 'moderate' | 'aggressive'

export type DietStyle =
  | 'balanced'
  | 'high_protein'
  | 'low_carb'
  | 'mediterranean'
  | 'plant_forward'

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel
  label: string
  description: string
}[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Mostly sitting — desk job, little exercise' },
  { value: 'light', label: 'Lightly active', description: 'Light exercise 1–3 days per week' },
  { value: 'moderate', label: 'Moderately active', description: 'Moderate exercise 3–5 days per week' },
  { value: 'active', label: 'Very active', description: 'Hard exercise 6–7 days per week' },
  { value: 'very_active', label: 'Extra active', description: 'Physical job or twice-daily training' },
]

export const GOAL_OPTIONS: { value: FitnessGoal; label: string; description: string }[] = [
  { value: 'lose', label: 'Lose weight', description: 'Calorie deficit to reduce body fat' },
  { value: 'maintain', label: 'Maintain weight', description: 'Stay at your current weight' },
  { value: 'gain', label: 'Build muscle', description: 'Small surplus to support strength gains' },
]

export const PACE_OPTIONS: { value: GoalPace; label: string; description: string }[] = [
  { value: 'gentle', label: 'Gentle', description: '~0.25 kg / week' },
  { value: 'moderate', label: 'Moderate', description: '~0.5 kg / week' },
  { value: 'aggressive', label: 'Focused', description: '~0.75 kg / week' },
]

export const DIET_OPTIONS: { value: DietStyle; label: string; description: string }[] = [
  { value: 'balanced', label: 'Balanced', description: 'Flexible mix of protein, carbs, and fats' },
  { value: 'high_protein', label: 'High protein', description: 'Extra protein for satiety and muscle' },
  { value: 'low_carb', label: 'Lower carb', description: 'Fewer carbs, more fat and protein' },
  { value: 'mediterranean', label: 'Mediterranean', description: 'Whole foods, olive oil, lean protein' },
  { value: 'plant_forward', label: 'Plant-forward', description: 'Vegetables, legumes, and whole grains' },
]

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const PACE_DEFICIT: Record<GoalPace, number> = {
  gentle: 250,
  moderate: 500,
  aggressive: 750,
}

const PACE_SURPLUS: Record<GoalPace, number> = {
  gentle: 250,
  moderate: 350,
  aggressive: 500,
}

export type NutritionPlan = {
  age: number
  bmr: number
  tdee: number
  targetKcal: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
  dailyFluid: number
  weeklyDeficit: number
  targetWeight: number
  goalPlain: string
  mealsLabel: string
  estimatedWeeklyChangeKg: number
}

export function calculateAge(dateOfBirth: Date, referenceDate = new Date()): number {
  let age = referenceDate.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = referenceDate.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dateOfBirth.getDate())) {
    age -= 1
  }
  return Math.max(age, 13)
}

/** Mifflin–St Jeor equation */
export function calculateBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function calculateTdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
}

export function suggestTargetWeight(
  weightKg: number,
  heightCm: number,
  goal: FitnessGoal,
): number {
  const heightM = heightCm / 100
  const currentBmi = weightKg / (heightM * heightM)

  if (goal === 'maintain') {
    return Math.round(weightKg * 10) / 10
  }

  if (goal === 'lose') {
    const healthyMidBmi = 22.5
    const fromBmi = healthyMidBmi * heightM * heightM
    const suggested = Math.min(weightKg - 2, Math.max(fromBmi, weightKg * 0.92))
    const capped = currentBmi <= 22 ? weightKg - 2 : suggested
    return Math.round(Math.max(capped, 40) * 10) / 10
  }

  const gainBmi = Math.min(24.5, currentBmi + 0.8)
  const fromBmi = gainBmi * heightM * heightM
  return Math.round(Math.max(weightKg + 2, fromBmi) * 10) / 10
}

export function calculateDailyCalories(
  tdee: number,
  goal: FitnessGoal,
  pace: GoalPace,
  sex: Sex,
): number {
  let target = tdee
  if (goal === 'lose') {
    target = tdee - PACE_DEFICIT[pace]
  } else if (goal === 'gain') {
    target = tdee + PACE_SURPLUS[pace]
  }

  const floor = sex === 'female' ? 1200 : 1500
  return Math.round(Math.max(target, floor) / 10) * 10
}

export function calculateWeeklyDeficit(tdee: number, targetKcal: number): number {
  return (tdee - targetKcal) * 7
}

export function estimateWeeklyWeightChangeKg(weeklyDeficit: number): number {
  return Math.round((weeklyDeficit / 7700) * 100) / 100
}

export function calculateMacros(
  targetKcal: number,
  weightKg: number,
  diet: DietStyle,
): { protein: number; carbs: number; fat: number } {
  let proteinPerKg = 1.8
  let fatPercent = 0.3

  switch (diet) {
    case 'high_protein':
      proteinPerKg = 2.2
      fatPercent = 0.25
      break
    case 'low_carb':
      proteinPerKg = 2
      fatPercent = 0.4
      break
    case 'mediterranean':
      proteinPerKg = 1.6
      fatPercent = 0.35
      break
    case 'plant_forward':
      proteinPerKg = 1.6
      fatPercent = 0.25
      break
    default:
      break
  }

  const protein = Math.round(weightKg * proteinPerKg)
  let fat = Math.round((targetKcal * fatPercent) / 9)
  let carbs = Math.round((targetKcal - protein * 4 - fat * 9) / 4)

  if (diet === 'low_carb') {
    carbs = Math.min(Math.max(carbs, 60), 120)
    fat = Math.round((targetKcal - protein * 4 - carbs * 4) / 9)
  }

  if (carbs < 0) {
    carbs = 0
    fat = Math.round((targetKcal - protein * 4) / 9)
  }

  return { protein, carbs, fat }
}

export function calculateDailyFluid(weightKg: number): number {
  return Math.round((weightKg * 35) / 50) * 50
}

function getDietLabel(diet: DietStyle): string {
  return DIET_OPTIONS.find((option) => option.value === diet)?.label ?? 'Balanced'
}

function getGoalLabel(goal: FitnessGoal): string {
  return GOAL_OPTIONS.find((option) => option.value === goal)?.label ?? 'Maintain weight'
}

export function buildGoalPlainText(params: {
  goal: FitnessGoal
  diet: DietStyle
  targetWeight: number
  currentWeight: number
  estimatedWeeklyChangeKg: number
}): string {
  const dietLabel = getDietLabel(params.diet)
  const goalLabel = getGoalLabel(params.goal)

  if (params.goal === 'maintain') {
    return `${goalLabel} with a ${dietLabel.toLowerCase()} eating pattern`
  }

  const direction = params.goal === 'lose' ? 'Reach' : 'Build toward'
  const pace =
    params.estimatedWeeklyChangeKg === 0
      ? ''
      : ` (~${Math.abs(params.estimatedWeeklyChangeKg)} kg/week)`

  return `${direction} ${params.targetWeight} kg from ${params.currentWeight} kg${pace} · ${dietLabel} plan`
}

export function buildMealsLabel(diet: DietStyle): string {
  return `${getDietLabel(diet)} · 3 meals/day`
}

export function buildNutritionPlan(input: {
  dateOfBirth: Date
  sex: Sex
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  goal: FitnessGoal
  pace: GoalPace
  diet: DietStyle
  targetWeight?: number | null
}): NutritionPlan {
  const age = calculateAge(input.dateOfBirth)
  const bmr = calculateBmr(input.weightKg, input.heightCm, age, input.sex)
  const tdee = calculateTdee(bmr, input.activity)
  const targetWeight =
    input.targetWeight ?? suggestTargetWeight(input.weightKg, input.heightCm, input.goal)
  const targetKcal = calculateDailyCalories(tdee, input.goal, input.pace, input.sex)
  const weeklyDeficit = calculateWeeklyDeficit(tdee, targetKcal)
  const estimatedWeeklyChangeKg = estimateWeeklyWeightChangeKg(weeklyDeficit)
  const macros = calculateMacros(targetKcal, input.weightKg, input.diet)

  return {
    age,
    bmr,
    tdee,
    targetKcal,
    targetProtein: macros.protein,
    targetCarbs: macros.carbs,
    targetFat: macros.fat,
    dailyFluid: calculateDailyFluid(input.weightKg),
    weeklyDeficit,
    targetWeight,
    mealsLabel: buildMealsLabel(input.diet),
    estimatedWeeklyChangeKg,
    goalPlain: buildGoalPlainText({
      goal: input.goal,
      diet: input.diet,
      targetWeight,
      currentWeight: input.weightKg,
      estimatedWeeklyChangeKg,
    }),
  }
}

export function usernameFromEmail(email: string): string {
  const local = email.split('@')[0]?.trim() ?? ''
  const sanitized = local.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 64)
  return sanitized || 'calcount_user'
}

export function guessCountryCode(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale
    const region = locale.split('-')[1]?.toUpperCase()
    if (region && region.length === 2) return region
  } catch {
    // ignore
  }
  return 'US'
}
