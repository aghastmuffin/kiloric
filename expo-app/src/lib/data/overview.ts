import { account } from '@/lib/appwrite'
import { exerciseCreditKcal } from '@/lib/exercise'
import { getTodayMeals, type MealDocument } from '@/lib/meals'
import { resolvePlanInputs, type PlanInputs } from '@/lib/planInputs'
import { planPreferencesFromUser, type PlanPreferences } from '@/lib/planPreferences'
import { getProfile, type ProfileDocument } from '@/lib/profile'
import { kgToLbs, parseDisplayUnitsPreference, type DisplayUnits } from '@/lib/units'
import { addDays, dayKey, lastNDayKeys, startOfDay, startOfWeek, weekDayKeys } from './dateKeys'
import { dailyKcalByDay, listEntriesForDay, listMealsSince, loggingStreak, mealTotals, type FoodEntry } from './foodLog'
import type { Macros } from './foodItem'
import { getPrepSession, listGroceryItems, listPlanEntries, parsePrepItems, type GroceryItem, type PlanEntry, type PrepItem, type PrepSession } from './mealPlan'
import { burnedOn, listWorkoutsBetween, type Workout } from './workouts'
import { dailyWeightSeries, listWeightsSince, type WeightPoint } from './weight'
import { estimateAdaptiveTdee, weightTrend, type AdaptiveTdee, type TrendPoint } from '@/lib/weightTrend'

export type Targets = Macros & { fluidMl: number | null }

export type GoalInfo = {
  targetWeightKg: number | null
  targetDate: Date | null
}

export type ProfileSummary = {
  profile: ProfileDocument | null
  targets: Targets
  units: DisplayUnits
  firstName: string
  goal: GoalInfo
  currentWeightKg: number | null
  plan: PlanInputs
}

export function targetsFromProfile(profile: ProfileDocument | null): Targets {
  return {
    kcal: profile?.target_kcal ?? 0,
    protein: profile?.target_protein ?? 0,
    carbs: profile?.target_carbs ?? 0,
    fat: profile?.target_fat ?? 0,
    fluidMl: profile?.daily_fluid ?? null,
  }
}

export function goalFromProfile(profile: ProfileDocument | null): GoalInfo {
  if (!profile) return { targetWeightKg: null, targetDate: null }
  const targetWeightKg = profile.goal_target_weight_kg ?? profile.target_weight ?? null
  let targetDate: Date | null = null
  if (profile.goal_start_date && profile.goal_estimated_weeks && profile.goal_type !== 'maintain') {
    targetDate = addDays(new Date(profile.goal_start_date), profile.goal_estimated_weeks * 7)
  }
  return { targetWeightKg, targetDate }
}

function firstNameFrom(profile: ProfileDocument | null, fallbackName: string | undefined): string {
  const source = fallbackName?.trim() || profile?.username || ''
  const first = source.split(/[\s._-]+/)[0] ?? ''
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : ''
}

async function loadPrefs(userId: string): Promise<PlanPreferences | null> {
  try {
    const user = await account.get()
    return user.$id === userId ? planPreferencesFromUser(user) : null
  } catch {
    return null
  }
}

export async function loadProfileSummary(userId: string, accountName?: string): Promise<ProfileSummary> {
  const [profile, prefs] = await Promise.all([getProfile(userId), loadPrefs(userId)])
  return {
    plan: resolvePlanInputs(profile, prefs),
    profile,
    targets: targetsFromProfile(profile),
    units: parseDisplayUnitsPreference(profile?.goal_plain, profile?.country),
    firstName: firstNameFrom(profile, accountName),
    goal: goalFromProfile(profile),
    currentWeightKg: profile?.weight ?? null,
  }
}

export function displayWeight(kg: number, units: DisplayUnits): number {
  return Math.round((units === 'imperial' ? kgToLbs(kg) : kg) * 10) / 10
}

export function weightUnitLabel(units: DisplayUnits): string {
  return units === 'imperial' ? 'lb' : 'kg'
}

export type TodayOverview = {
  summary: ProfileSummary
  eaten: Macros
  /** Net workout energy logged today. */
  burned: number
  /** The part of `burned` added back to the budget (beyond the activity-level allowance). */
  exerciseCredit: number
  remaining: number
  meals: MealDocument[]
  entries: FoodEntry[]
  plan: PlanEntry[]
  workouts: Workout[]
  streak: number
}

const STREAK_LOOKBACK_DAYS = 365

export function exerciseCreditFor(summary: ProfileSummary, burned: number): number {
  return exerciseCreditKcal(burned, summary.plan.tdee, summary.plan.activity)
}

export async function loadStreak(userId: string): Promise<number> {
  const since = addDays(startOfDay(), -STREAK_LOOKBACK_DAYS)
  const meals = await listMealsSince(userId, since)
  const days = new Set<string>()
  for (const [day, kcal] of dailyKcalByDay(meals)) if (kcal > 0) days.add(day)
  return loggingStreak(days)
}

export async function loadToday(userId: string, accountName?: string): Promise<TodayOverview> {
  const today = dayKey()
  const [summary, meals, entries, plan, workouts, streak] = await Promise.all([
    loadProfileSummary(userId, accountName),
    getTodayMeals(userId),
    listEntriesForDay(userId, today),
    listPlanEntries(userId, today, today),
    listWorkoutsBetween(userId, today, today),
    loadStreak(userId),
  ])
  const eaten = mealTotals(meals)
  const burned = burnedOn(workouts, today)
  const exerciseCredit = exerciseCreditFor(summary, burned)
  return {
    summary,
    eaten,
    burned,
    exerciseCredit,
    remaining: summary.targets.kcal - eaten.kcal + exerciseCredit,
    meals,
    entries,
    plan,
    workouts,
    streak,
  }
}

export type TodayBudget = {
  summary: ProfileSummary
  eaten: Macros
  burned: number
  exerciseCredit: number
  remaining: number
}

export async function loadTodayBudget(userId: string, accountName?: string): Promise<TodayBudget> {
  const today = dayKey()
  const [summary, meals, workouts] = await Promise.all([
    loadProfileSummary(userId, accountName),
    getTodayMeals(userId),
    listWorkoutsBetween(userId, today, today),
  ])
  const eaten = mealTotals(meals)
  const burned = burnedOn(workouts, today)
  const exerciseCredit = exerciseCreditFor(summary, burned)
  return { summary, eaten, burned, exerciseCredit, remaining: summary.targets.kcal - eaten.kcal + exerciseCredit }
}

export type DayBar = { day: string; kcal: number; isToday: boolean }

export function buildDayBars(totals: Map<string, number>, days = 7, today: Date = new Date()): DayBar[] {
  const todayKey = dayKey(today)
  return lastNDayKeys(days, today).map((day) => ({ day, kcal: totals.get(day) ?? 0, isToday: day === todayKey }))
}

export type ProgressRange = 'week' | 'month' | 'quarter' | 'year'

export const RANGE_DAYS: Record<ProgressRange, number> = { week: 7, month: 30, quarter: 90, year: 365 }

export type ProgressData = {
  summary: ProfileSummary
  weights: WeightPoint[]
  /** Smoothed weight for each point in `weights`. */
  trend: TrendPoint[]
  adaptive: AdaptiveTdee | null
  /** Data collected toward the adaptive estimate, for the "keep logging" state. */
  adaptiveInputs: { loggedDays: number; weighIns: number }
  bars: DayBar[]
  avgIntake: number | null
  workoutsDone: number
  workoutsPlanned: number
}

export function averageLoggedIntake(totals: Map<string, number>, dayKeys: readonly string[], todayKey: string): number | null {
  const logged = dayKeys.filter((day) => day !== todayKey && (totals.get(day) ?? 0) > 0)
  if (logged.length === 0) return null
  return Math.round(logged.reduce((sum, day) => sum + (totals.get(day) ?? 0), 0) / logged.length)
}

/** Window used for the adaptive maintenance estimate, independent of the chart range. */
export const ADAPTIVE_WINDOW_DAYS = 28

export async function loadProgress(userId: string, range: ProgressRange, accountName?: string): Promise<ProgressData> {
  const days = RANGE_DAYS[range]
  const since = addDays(startOfDay(), -(days - 1))
  const lookbackDays = Math.max(days, ADAPTIVE_WINDOW_DAYS + 1, 7)
  const lookbackStart = addDays(startOfDay(), -(lookbackDays - 1))
  const weekStart = startOfWeek()
  const weekKeys = weekDayKeys(weekStart)
  const [summary, meals, weightLogs, weekWorkouts] = await Promise.all([
    loadProfileSummary(userId, accountName),
    listMealsSince(userId, lookbackStart),
    listWeightsSince(userId, lookbackStart),
    listWorkoutsBetween(userId, weekKeys[0], weekKeys[6]),
  ])
  const totals = dailyKcalByDay(meals)
  const allWeights = dailyWeightSeries(weightLogs)
  const sinceKey = dayKey(since)
  const trend = weightTrend(allWeights).filter((point) => point.day >= sinceKey)
  const adaptiveStart = dayKey(addDays(startOfDay(), -ADAPTIVE_WINDOW_DAYS))
  const todayKey = dayKey()
  const windowTotals = new Map([...totals].filter(([day]) => day >= adaptiveStart && day !== todayKey))
  const windowWeights = allWeights.filter((point) => point.day >= adaptiveStart)
  const adaptive = summary.plan.tdee
    ? estimateAdaptiveTdee({
        intakeByDay: windowTotals,
        weights: windowWeights,
        formulaTdee: summary.plan.tdee,
        excludeDays: [todayKey],
      })
    : null
  return {
    summary,
    weights: allWeights.filter((point) => point.day >= sinceKey),
    trend,
    adaptive,
    adaptiveInputs: {
      loggedDays: [...windowTotals.values()].filter((kcal) => kcal > 0).length,
      weighIns: windowWeights.length,
    },
    bars: buildDayBars(totals),
    avgIntake: averageLoggedIntake(totals, lastNDayKeys(days), dayKey()),
    workoutsDone: weekWorkouts.filter((workout) => workout.status === 'done').length,
    workoutsPlanned: weekWorkouts.length,
  }
}

export type PrepOverview = {
  weekStart: string
  session: PrepSession | null
  items: PrepItem[]
  groceries: GroceryItem[]
  preppedMeals: number
}

export async function loadPrepOverview(userId: string, weekStartDate: Date = startOfWeek()): Promise<PrepOverview> {
  const weekKeys = weekDayKeys(weekStartDate)
  const weekStart = weekKeys[0]
  const [session, groceries, plan] = await Promise.all([
    getPrepSession(userId, weekStart),
    listGroceryItems(userId, weekStart),
    listPlanEntries(userId, weekKeys[0], weekKeys[6]),
  ])
  return {
    weekStart,
    session,
    items: parsePrepItems(session),
    groceries,
    preppedMeals: plan.filter((entry) => entry.prepped).length,
  }
}

export type DashboardData = {
  today: TodayOverview
  progress: ProgressData
  prep: PrepOverview
}

export async function loadDashboard(userId: string, accountName?: string): Promise<DashboardData> {
  const [today, progress, prep] = await Promise.all([
    loadToday(userId, accountName),
    loadProgress(userId, 'month', accountName),
    loadPrepOverview(userId),
  ])
  return { today, progress, prep }
}
