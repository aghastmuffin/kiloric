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

export type BmrFormula = 'mifflin_st_jeor' | 'katch_mcardle'

export const NUTRITION_FORMULA_VERSION = 5

/** Energy density of adipose tissue — widely used clinical approximation (kcal/kg). */
export const CALORIES_PER_KG_FAT = 7700

export const BODY_FAT_PCT_RANGE = { min: 3, max: 60 } as const

export function isValidBodyFatPct(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= BODY_FAT_PCT_RANGE.min && value <= BODY_FAT_PCT_RANGE.max
}

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
  { value: 'sedentary', label: 'Sedentary', description: 'Desk job, under ~5,000 steps, little exercise' },
  { value: 'light', label: 'Lightly active', description: 'Light exercise 1–3 days a week or ~5–7,500 steps' },
  { value: 'moderate', label: 'Moderately active', description: 'Moderate exercise 3–5 days a week or ~7,500–10,000 steps' },
  { value: 'active', label: 'Very active', description: 'Hard exercise 6–7 days a week or 10,000+ steps' },
  { value: 'very_active', label: 'Extra active', description: 'Physical job or twice-daily training' },
]

export const GOAL_OPTIONS: { value: FitnessGoal; label: string; description: string }[] = [
  { value: 'lose', label: 'Lose weight', description: 'Calorie deficit to reduce body fat' },
  { value: 'maintain', label: 'Maintain weight', description: 'Stay at your current weight' },
  { value: 'gain', label: 'Build muscle', description: 'Small surplus to support strength gains' },
]

export const PACE_OPTIONS: { value: GoalPace; label: string; description: string }[] = [
  { value: 'gentle', label: 'Gentle', description: 'Easiest to sustain' },
  { value: 'moderate', label: 'Moderate', description: 'A steady, reliable pace' },
  { value: 'aggressive', label: 'Focused', description: 'Fastest pace we recommend' },
]

/** Fallback weekly rate (kg/week) when body weight is unknown. Kept for legacy goal rows. */
export const GOAL_PACE_KG_PER_WEEK: Record<GoalPace, number> = {
  gentle: 0.25,
  moderate: 0.5,
  aggressive: 0.75,
}

/**
 * Weekly change as a fraction of body weight. Loss: 0.5–1 %/week preserves lean mass
 * (Helms 2014, Garthe 2011). Gain: 0.25–0.5 %/week limits fat gain (Iraki 2019).
 */
export const GOAL_PACE_BODY_WEIGHT_FRACTION: Record<'lose' | 'gain', Record<GoalPace, number>> = {
  lose: { gentle: 0.005, moderate: 0.0075, aggressive: 0.01 },
  gain: { gentle: 0.0015, moderate: 0.0025, aggressive: 0.005 },
}

/** Absolute ceilings so heavy bodies don't get extreme rates (NIH: ≤ ~1 kg/week loss). */
export const MAX_LOSS_KG_PER_WEEK = 1
export const MAX_GAIN_KG_PER_WEEK = 0.5

export const DIET_OPTIONS: { value: DietStyle; label: string; description: string }[] = [
  { value: 'balanced', label: 'Balanced', description: 'Flexible mix of protein, carbs, and fats' },
  { value: 'high_protein', label: 'High protein', description: 'Extra protein for satiety and muscle' },
  { value: 'low_carb', label: 'Lower carb', description: 'Fewer carbs, more fat and protein' },
  { value: 'mediterranean', label: 'Mediterranean', description: 'Whole foods, olive oil, lean protein' },
  { value: 'plant_forward', label: 'Plant-forward', description: 'Vegetables, legumes, and whole grains' },
  { value: 'custom', label: 'Custom plan', description: 'Start balanced, then set every target yourself' },
]

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export type NutritionPlan = {
  age: number
  bmr: number
  bmrFormula: BmrFormula
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

/** Mifflin–St Jeor (1990): the most accurate general-population RMR equation (Frankenfield 2005). */
export function calculateMifflinBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function leanMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (1 - bodyFatPct / 100)
}

/** Katch–McArdle: RMR from fat-free mass, preferred when body-fat % is measured. */
export function calculateKatchMcArdleBmr(weightKg: number, bodyFatPct: number): number {
  return Math.round(370 + 21.6 * leanMassKg(weightKg, bodyFatPct))
}

export function bmrFormulaFor(bodyFatPct?: number | null): BmrFormula {
  return isValidBodyFatPct(bodyFatPct) ? 'katch_mcardle' : 'mifflin_st_jeor'
}

export function calculateBmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  bodyFatPct?: number | null,
): number {
  return isValidBodyFatPct(bodyFatPct)
    ? calculateKatchMcArdleBmr(weightKg, bodyFatPct)
    : calculateMifflinBmr(weightKg, heightCm, age, sex)
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

/**
 * Signed weekly body-mass change for a goal. With a body weight the rate scales with the
 * body (percent per week, capped); without one it falls back to the legacy fixed table.
 */
export function goalPaceKgPerWeek(goal: FitnessGoal, pace: GoalPace, weightKg?: number | null): number {
  if (goal === 'maintain') return 0
  if (weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0) {
    const magnitude = GOAL_PACE_KG_PER_WEEK[pace]
    return goal === 'lose' ? -magnitude : magnitude
  }
  const fraction = GOAL_PACE_BODY_WEIGHT_FRACTION[goal][pace]
  const cap = goal === 'lose' ? MAX_LOSS_KG_PER_WEEK : MAX_GAIN_KG_PER_WEEK
  const magnitude = Math.round(Math.min(weightKg * fraction, cap) * 100) / 100
  return goal === 'lose' ? -magnitude : magnitude
}

/** Convert a signed weekly body-mass change rate into a daily energy adjustment (kcal/day). */
export function calculateDailyCalorieAdjustmentFromPace(paceKgPerWeek: number): number {
  return Math.round((paceKgPerWeek * CALORIES_PER_KG_FAT) / 7)
}

/** Unsupervised low-calorie floors (NHLBI obesity guidelines: ≥1,200 women, ≥1,500 men). */
export function calorieFloor(sex: Sex): number {
  return sex === 'female' ? 1200 : 1500
}

export function calculateDailyCalories(
  tdee: number,
  goal: FitnessGoal,
  pace: GoalPace | number,
  sex: Sex,
  weightKg?: number | null,
): number {
  const paceKg = typeof pace === 'string' ? goalPaceKgPerWeek(goal, pace, weightKg) : pace
  const target = tdee + calculateDailyCalorieAdjustmentFromPace(paceKg)
  const floor = Math.min(calorieFloor(sex), tdee)
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

/**
 * Protein per kg of reference mass by goal. Morton 2018: 1.6 g/kg (to 2.2) maximises
 * resistance-training gains; deficits need more to spare lean mass (Hector & Phillips 2018).
 */
export const PROTEIN_G_PER_KG: Record<FitnessGoal, number> = { lose: 2.0, maintain: 1.6, gain: 1.8 }

const DIET_PROTEIN_BONUS: Partial<Record<DietStyle, number>> = { high_protein: 0.4, low_carb: 0.2 }

/** Share of energy from fat per eating style; AMDR fat range is 20–35 % (40 % for low carb). */
const DIET_FAT_FRACTION: Record<DietStyle, number> = {
  balanced: 0.3,
  high_protein: 0.27,
  low_carb: 0.4,
  mediterranean: 0.35,
  plant_forward: 0.27,
  custom: 0.3,
}

const FAT_FLOOR_FRACTION = 0.2
const FAT_FLOOR_G_PER_KG = 0.5
const PROTEIN_CEILING_FRACTION = 0.35
/** "Low carbohydrate" is < 26 % of energy or < 130 g/day (Feinman 2015). */
const LOW_CARB_FRACTION = 0.26
const LOW_CARB_MAX_G = 130
/** Lean mass makes up ~80 % of a typical adult reference body, so g/kg LBM = g/kg ÷ 0.8. */
const LEAN_REFERENCE_FRACTION = 0.8
const REFERENCE_BMI = 25

export type MacroOptions = {
  goal?: FitnessGoal
  heightCm?: number | null
  bodyFatPct?: number | null
}

/**
 * Mass that protein and fat floors are scaled to. Lean mass when body fat is known;
 * otherwise body weight capped at BMI 25, so larger bodies don't get inflated targets.
 */
export function proteinReferenceMassKg(weightKg: number, options: MacroOptions = {}): number {
  if (isValidBodyFatPct(options.bodyFatPct)) {
    return leanMassKg(weightKg, options.bodyFatPct) / LEAN_REFERENCE_FRACTION
  }
  if (options.heightCm && options.heightCm > 0) {
    const heightM = options.heightCm / 100
    return Math.min(weightKg, REFERENCE_BMI * heightM * heightM)
  }
  return weightKg
}

export function calculateMacros(
  targetKcal: number,
  weightKgOrDiet: number | DietStyle,
  diet?: DietStyle,
  options: MacroOptions = {},
): { protein: number; carbs: number; fat: number } {
  if (typeof weightKgOrDiet === 'string') {
    const dietVal = weightKgOrDiet as DietStyle
    const pcts = DIET_MACRO_PERCENTAGES[dietVal] || DIET_MACRO_PERCENTAGES.balanced
    const protein = Math.round((targetKcal * (pcts.protein / 100)) / 4)
    const carbs = Math.round((targetKcal * (pcts.carbs / 100)) / 4)
    const fat = Math.round((targetKcal * (pcts.fat / 100)) / 9)
    return { protein, carbs, fat }
  }

  const dietVal = diet ?? 'balanced'
  const referenceKg = proteinReferenceMassKg(weightKgOrDiet, options)
  const perKg = PROTEIN_G_PER_KG[options.goal ?? 'maintain'] + (DIET_PROTEIN_BONUS[dietVal] ?? 0)
  const protein = Math.round(Math.min(referenceKg * perKg, (targetKcal * PROTEIN_CEILING_FRACTION) / 4))

  const fatFloor = Math.max((targetKcal * FAT_FLOOR_FRACTION) / 9, referenceKg * FAT_FLOOR_G_PER_KG)
  let fat = Math.max((targetKcal * DIET_FAT_FRACTION[dietVal]) / 9, fatFloor)
  let carbs = (targetKcal - protein * 4 - fat * 9) / 4

  if (dietVal === 'low_carb') {
    const carbCap = Math.min((targetKcal * LOW_CARB_FRACTION) / 4, LOW_CARB_MAX_G)
    if (carbs > carbCap) {
      fat += ((carbs - carbCap) * 4) / 9
      carbs = carbCap
    }
  }

  if (carbs < 0) {
    fat = Math.max(0, (targetKcal - protein * 4) / 9)
    carbs = 0
  }

  return { protein, carbs: Math.round(carbs), fat: Math.round(fat) }
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
  const floor = calorieFloor(input.sex)
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

// ⚡ Bolt: Module-level Maps for O(1) label lookups, replacing linear Array.prototype.find searches.
const DIET_LABEL_MAP = new Map<DietStyle, string>(
  DIET_OPTIONS.map((option) => [option.value, option.label]),
)

const GOAL_LABEL_MAP = new Map<FitnessGoal, string>(
  GOAL_OPTIONS.map((option) => [option.value, option.label]),
)

function getDietLabel(diet: DietStyle): string {
  return DIET_LABEL_MAP.get(diet) ?? 'Balanced'
}

function getGoalLabel(goal: FitnessGoal): string {
  return GOAL_LABEL_MAP.get(goal) ?? 'Maintain weight'
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
  bodyFatPct?: number | null
}): NutritionPlan {
  const age = calculateAge(input.dateOfBirth)
  const bmrFormula = bmrFormulaFor(input.bodyFatPct)
  const bmr = calculateBmr(input.weightKg, input.heightCm, age, input.sex, input.bodyFatPct)
  const tdee = calculateTdee(bmr, input.activity)
  const targetWeight =
    input.targetWeight ?? suggestTargetWeight(input.weightKg, input.heightCm, input.goal)
  const paceKgPerWeek = goalPaceKgPerWeek(input.goal, input.pace, input.weightKg)
  const targetKcal = calculateDailyCalories(tdee, input.goal, paceKgPerWeek, input.sex)
  const weeklyDeficit = calculateWeeklyDeficit(tdee, targetKcal)
  const estimatedWeeklyChangeKg = estimateWeeklyWeightChangeKg(weeklyDeficit)
  const macros = calculateMacros(targetKcal, input.weightKg, input.diet, {
    goal: input.goal,
    heightCm: input.heightCm,
    bodyFatPct: input.bodyFatPct,
  })
  const effectivePace = input.goal === 'maintain' ? 0 : -estimatedWeeklyChangeKg

  return {
    age,
    bmr,
    bmrFormula,
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
    goalPaceKgPerWeek: effectivePace,
    estimatedWeeks: estimateWeeksToGoal(input.weightKg, targetWeight, effectivePace),
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
  return sanitized || 'kiloric_user'
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
