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
  | 'custom'

export const NUTRITION_FORMULA_VERSION = 4

/** Energy density of adipose tissue — widely used clinical approximation (kcal/kg). */
export const CALORIES_PER_KG_FAT = 7700

export type MacroPercentages = {
  protein: number
  carbs: number
  fat: number
}

export const DIET_MACRO_PERCENTAGES: Record<DietStyle, MacroPercentages> = {
  balanced: { protein: 25, carbs: 45, fat: 30 },
  high_protein: { protein: 30, carbs: 40, fat: 30 },
  low_carb: { protein: 30, carbs: 20, fat: 50 },
  mediterranean: { protein: 20, carbs: 40, fat: 40 },
  plant_forward: { protein: 20, carbs: 50, fat: 30 },
  custom: { protein: 25, carbs: 45, fat: 30 },
}

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

/** Industry-standard weekly body-mass change rate per pace setting (kg/week). */
export const GOAL_PACE_KG_PER_WEEK: Record<GoalPace, number> = {
  gentle: 0.25,
  moderate: 0.5,
  aggressive: 0.75,
}

export const DIET_OPTIONS: { value: DietStyle; label: string; description: string }[] = [
  { value: 'balanced', label: 'Balanced', description: 'Flexible mix of protein, carbs, and fats' },
  { value: 'high_protein', label: 'High protein', description: 'Extra protein for satiety and muscle' },
  { value: 'low_carb', label: 'Lower carb', description: 'Fewer carbs, more fat and protein' },
  { value: 'mediterranean', label: 'Mediterranean', description: 'Whole foods, olive oil, lean protein' },
  { value: 'plant_forward', label: 'Plant-forward', description: 'Vegetables, legumes, and whole grains' },
  { value: 'custom', label: 'Custom plan', description: 'Start balanced, then set every target yourself' },
]

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
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
  /** Signed weekly body-mass change: negative for loss, positive for gain, zero for maintenance. */
  goalPaceKgPerWeek: number
  /** Estimated whole weeks to reach the target weight at the selected pace. */
  estimatedWeeks: number
}

export function calculateAge(dateOfBirth: Date, referenceDate = new Date()): number {
  let age = referenceDate.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = referenceDate.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dateOfBirth.getDate())) {
    age -= 1
  }
  return age < 0 ? 0 : age
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

export function goalPaceKgPerWeek(goal: FitnessGoal, pace: GoalPace): number {
  const magnitude = GOAL_PACE_KG_PER_WEEK[pace]
  if (goal === 'lose') return -magnitude
  if (goal === 'gain') return magnitude
  return 0
}

/** Convert a signed weekly body-mass change rate into a daily energy adjustment (kcal/day). */
export function calculateDailyCalorieAdjustmentFromPace(paceKgPerWeek: number): number {
  return Math.round((paceKgPerWeek * CALORIES_PER_KG_FAT) / 7)
}

export function calculateDailyCalories(
  tdee: number,
  goal: FitnessGoal,
  pace: GoalPace | number,
  sex: Sex,
): number {
  const paceKg = typeof pace === 'string' ? goalPaceKgPerWeek(goal, pace) : pace
  const target = tdee + calculateDailyCalorieAdjustmentFromPace(paceKg)
  const floor = sex === 'female' ? 1200 : 1500
  return Math.round(Math.max(target, floor) / 10) * 10
}

export function calculateWeeklyDeficit(tdee: number, targetKcal: number): number {
  return (tdee - targetKcal) * 7
}

export function estimateWeeklyWeightChangeKg(weeklyDeficit: number): number {
  return Math.round((weeklyDeficit / CALORIES_PER_KG_FAT) * 100) / 100
}

export function estimateWeeksToGoal(
  startWeightKg: number,
  targetWeightKg: number,
  paceKgPerWeek: number,
): number {
  const diffKg = Math.abs(targetWeightKg - startWeightKg)
  const absPace = Math.abs(paceKgPerWeek)
  if (absPace === 0) return 0
  return Math.max(0, Math.round(diffKg / absPace))
}

export function calculateMacros(
  targetKcal: number,
  weightKgOrDiet: number | DietStyle,
  diet?: DietStyle,
): { protein: number; carbs: number; fat: number } {
  if (typeof weightKgOrDiet === 'string') {
    const dietVal = weightKgOrDiet as DietStyle
    const pcts = DIET_MACRO_PERCENTAGES[dietVal] || DIET_MACRO_PERCENTAGES.balanced
    const protein = Math.round((targetKcal * (pcts.protein / 100)) / 4)
    const carbs = Math.round((targetKcal * (pcts.carbs / 100)) / 4)
    const fat = Math.round((targetKcal * (pcts.fat / 100)) / 9)
    return { protein, carbs, fat }
  }

  const weightKg = weightKgOrDiet
  const dietVal = diet ?? 'balanced'

  let proteinPerKg = 1.8
  let fatPercent = 0.3

  switch (dietVal) {
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

  if (dietVal === 'low_carb') {
    carbs = Math.min(Math.max(carbs, 60), 120)
    fat = Math.round((targetKcal - protein * 4 - carbs * 4) / 9)
  }

  if (carbs < 0) {
    carbs = 0
    fat = Math.round((targetKcal - protein * 4) / 9)
  }

  return { protein, carbs, fat }
}

export function calculateMacroCalories(macros: { protein: number; carbs: number; fat: number }): number {
  return macros.protein * 4 + macros.carbs * 4 + macros.fat * 9
}

export type NutritionPlanAudit = {
  formulaVersion: number
  macroCalories: number
  macroDifferenceKcal: number
  warnings: string[]
}

/** Checks the final targets users actually see, including custom overrides. */
export function auditNutritionTargets(input: {
  targetKcal: number
  protein: number
  carbs: number
  fat: number
  tdee: number
  sex: Sex
}): NutritionPlanAudit {
  const macroCalories = calculateMacroCalories(input)
  const macroDifferenceKcal = macroCalories - input.targetKcal
  const warnings: string[] = []
  const floor = input.sex === 'female' ? 1200 : 1500
  if (input.targetKcal < floor) warnings.push(`Energy is below the ${floor} kcal planning floor.`)
  if (Math.abs(macroDifferenceKcal) > Math.max(50, input.targetKcal * 0.05)) {
    warnings.push(`Macros account for ${macroCalories} kcal, ${Math.abs(macroDifferenceKcal)} kcal ${macroDifferenceKcal > 0 ? 'above' : 'below'} the energy target.`)
  }
  if (input.targetKcal > input.tdee * 1.5) warnings.push('Energy is more than 50% above estimated maintenance.')
  return { formulaVersion: NUTRITION_FORMULA_VERSION, macroCalories, macroDifferenceKcal, warnings }
}

export function calculateDailyFluid(
  weightKg: number,
  sex?: Sex,
  age?: number,
): number {
  if (sex !== undefined && age !== undefined) {
    if (age < 18) {
      return sex === 'female' ? 1800 : 2000
    }
    return sex === 'female' ? 2200 : 3000
  }
  return Math.round((weightKg * 35) / 50) * 50
}

export function validateMacroPercentages(pcts: MacroPercentages): string | null {
  const sum = pcts.protein + pcts.carbs + pcts.fat
  if (sum !== 100) {
    return `Macro percentages must sum to 100%. Currently they sum to ${sum}%.`
  }
  return null
}

export function macroReferenceWarnings(pcts: MacroPercentages): string[] {
  const warnings: string[] = []
  if (pcts.carbs < 45 || pcts.carbs > 65) {
    warnings.push('Carbohydrate is outside the adult AMDR of 45–65%.')
  }
  if (pcts.protein < 10 || pcts.protein > 35) {
    warnings.push('Protein is outside the adult AMDR of 10–35%.')
  }
  if (pcts.fat < 20 || pcts.fat > 35) {
    warnings.push('Fat is outside the adult AMDR of 20–35%.')
  }
  return warnings
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
  const paceKgPerWeek = goalPaceKgPerWeek(input.goal, input.pace)
  const targetKcal = calculateDailyCalories(tdee, input.goal, paceKgPerWeek, input.sex)
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
    dailyFluid: calculateDailyFluid(input.weightKg, input.sex, age),
    weeklyDeficit,
    targetWeight,
    mealsLabel: buildMealsLabel(input.diet),
    estimatedWeeklyChangeKg,
    goalPaceKgPerWeek: paceKgPerWeek,
    estimatedWeeks: estimateWeeksToGoal(input.weightKg, targetWeight, paceKgPerWeek),
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
