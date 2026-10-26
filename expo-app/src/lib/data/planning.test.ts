// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/serverData', () => ({ account: {}, databases: {} }))
vi.mock('@/lib/serverTypes', () => ({
  PersistenceError: class extends Error {},
  ID: { unique: () => 'id' },
  Permission: { read: () => 'read', update: () => 'update', delete: () => 'delete' },
  Role: { user: (id: string) => `user:${id}` },
  Query: {},
}))

const { frequentFoods, loggingStreak, recentFoods } = await import('./foodLog')
const { autofillWeek, planCandidatesFrom } = await import('./mealPlan')
const { averageLoggedIntake, buildDayBars } = await import('./overview')
const { currentExerciseIndex, formatElapsed, groupSets } = await import('./workouts')
const { dailyWeightSeries, weightDelta } = await import('./weight')

function entry(name: string, loggedAt: string, extra: Record<string, unknown> = {}) {
  return {
    $id: `${name}-${loggedAt}`,
    $createdAt: loggedAt,
    $updatedAt: loggedAt,
    owner: 'u1',
    meal_type: 'Lunch' as const,
    name,
    servings: 1,
    kcal: 400,
    protein: 30,
    carbs: 40,
    fat: 10,
    day: loggedAt.slice(0, 10),
    logged_at: loggedAt,
    ...extra,
  }
}

describe('recent and frequent foods', () => {
  const entries = [
    entry('Chicken bowl', '2026-10-14T12:00:00Z'),
    entry('Chicken bowl', '2026-10-15T12:00:00Z'),
    entry('Apple', '2026-10-15T15:00:00Z', { meal_type: 'Snack' }),
    entry('Chicken bowl', '2026-10-16T12:00:00Z'),
  ]

  it('dedupes recent foods, newest first', () => {
    expect(recentFoods(entries).map((item) => item.name)).toEqual(['Chicken bowl', 'Apple'])
  })

  it('only counts foods logged more than once', () => {
    const frequent = frequentFoods(entries)
    expect(frequent).toHaveLength(1)
    expect(frequent[0].count).toBe(3)
    expect(frequent[0].entry.logged_at).toBe('2026-10-16T12:00:00Z')
  })
})

describe('loggingStreak', () => {
  const today = new Date(2026, 9, 16, 9)

  it('counts back from today', () => {
    expect(loggingStreak(new Set(['2026-10-16', '2026-10-15', '2026-10-14', '2026-10-12']), today)).toBe(3)
  })

  it('keeps yesterday’s streak alive before today is logged', () => {
    expect(loggingStreak(new Set(['2026-10-15', '2026-10-14']), today)).toBe(2)
    expect(loggingStreak(new Set(['2026-10-13']), today)).toBe(0)
  })
})

describe('autofillWeek', () => {
  const weekStart = new Date(2026, 9, 12)
  const candidates = planCandidatesFrom(
    [
      {
        $id: 'm1',
        $createdAt: '',
        $updatedAt: '',
        owner: 'u1',
        name: 'Overnight oats',
        meal_type: 'Breakfast',
        items_json: '[]',
        item_count: 2,
        kcal: 350,
        protein: 20,
        carbs: 50,
        fat: 8,
      },
    ],
    [],
    [entry('Chicken bowl', '2026-10-10T12:00:00Z'), entry('Salmon', '2026-10-09T19:00:00Z', { meal_type: 'Dinner', kcal: 600 })],
  )

  it('fills empty slots from today onward using the user’s own foods', () => {
    const additions = autofillWeek(weekStart, [{ day: '2026-10-16', meal_type: 'Lunch' }], candidates, new Date(2026, 9, 16))
    const days = new Set(additions.map((addition) => addition.day))
    expect([...days].sort()).toEqual(['2026-10-16', '2026-10-17', '2026-10-18'])
    expect(additions.some((addition) => addition.day === '2026-10-16' && addition.meal_type === 'Lunch')).toBe(false)
    expect(additions.filter((addition) => addition.meal_type === 'Breakfast')).toHaveLength(3)
    expect(additions.find((addition) => addition.meal_type === 'Dinner')?.name).toBe('Salmon')
    expect(additions.every((addition) => addition.prepped === false)).toBe(true)
  })

  it('reuses meals already on the plan as candidates', () => {
    const planned = [
      { day: '2026-10-16', meal_type: 'Dinner' as const, name: 'Chicken rice bowl', kcal: 620, protein: 45, carbs: 70, fat: 14, prepped: true, logged: false },
    ]
    const fromPlan = planCandidatesFrom([], [], [], planned)
    const additions = autofillWeek(weekStart, planned, fromPlan, new Date(2026, 9, 16))
    expect(additions.map((addition) => `${addition.day} ${addition.name}`)).toEqual(['2026-10-17 Chicken rice bowl', '2026-10-18 Chicken rice bowl'])
  })

  it('adds nothing without candidates', () => {
    expect(autofillWeek(weekStart, [], new Map(), new Date(2026, 9, 12))).toEqual([])
  })
})

describe('progress helpers', () => {
  it('averages only fully logged past days', () => {
    const totals = new Map([
      ['2026-10-14', 2000],
      ['2026-10-15', 1800],
      ['2026-10-16', 500],
    ])
    expect(averageLoggedIntake(totals, ['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16'], '2026-10-16')).toBe(1900)
    expect(averageLoggedIntake(new Map(), ['2026-10-16'], '2026-10-16')).toBeNull()
  })

  it('builds 7 day bars ending today', () => {
    const bars = buildDayBars(new Map([['2026-10-16', 900]]), 7, new Date(2026, 9, 16))
    expect(bars).toHaveLength(7)
    expect(bars[0].day).toBe('2026-10-10')
    expect(bars[6]).toEqual({ day: '2026-10-16', kcal: 900, isToday: true })
  })

  it('keeps the latest weigh-in per day and reports the delta', () => {
    const series = dailyWeightSeries([
      { weight_kg: 80, day: '2026-10-01', logged_at: '2026-10-01T07:00:00Z' },
      { weight_kg: 79.6, day: '2026-10-01', logged_at: '2026-10-01T20:00:00Z' },
      { weight_kg: 78.9, day: '2026-10-15', logged_at: '2026-10-15T07:00:00Z' },
    ])
    expect(series).toEqual([
      { day: '2026-10-01', weightKg: 79.6 },
      { day: '2026-10-15', weightKg: 78.9 },
    ])
    expect(weightDelta(series)).toBe(-0.7)
    expect(weightDelta(series.slice(0, 1))).toBeNull()
  })
})

describe('workout helpers', () => {
  const set = (order: number, number: number, done: boolean) => ({
    $id: `${order}-${number}`,
    $createdAt: '',
    $updatedAt: '',
    owner: 'u1',
    workout_id: 'w1',
    exercise_name: order === 0 ? 'Bench press' : 'Row',
    exercise_order: order,
    set_number: number,
    target_reps: 8,
    target_weight: 60,
    done,
  })

  it('groups sets by exercise and finds the current exercise', () => {
    const groups = groupSets([set(1, 1, false), set(0, 2, true), set(0, 1, true)])
    expect(groups.map((group) => group.name)).toEqual(['Bench press', 'Row'])
    expect(groups[0].sets.map((item) => item.set_number)).toEqual([1, 2])
    expect(currentExerciseIndex(groups)).toBe(1)
    expect(currentExerciseIndex(groupSets([set(0, 1, true)]))).toBe(0)
  })

  it('formats elapsed time', () => {
    expect(formatElapsed(1122)).toBe('18:42')
    expect(formatElapsed(3725)).toBe('1:02:05')
  })
})
