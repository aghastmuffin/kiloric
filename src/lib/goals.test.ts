import { describe, expect, it } from 'vitest'
import {
  buildGoalState,
  calculateGoalProgress,
  estimateWeeksToGoal,
  formatGoalProgress,
  resolveGoalState,
  weeklyEnergyDeltaKcal,
} from './goals'
import type { ProfileDocument } from './profile'

describe('goal state', () => {
  it('builds a signed pace from goal + preset', () => {
    const state = buildGoalState({
      goal: 'lose',
      pace: 'moderate',
      startWeightKg: 80,
      targetWeightKg: 70,
      startDate: new Date('2026-01-01'),
    })
    expect(state.type).toBe('lose')
    expect(state.paceKgPerWeek).toBe(-0.5)
    expect(state.estimatedWeeks).toBe(20)
  })

  it('rounds estimated weeks and handles maintenance', () => {
    const state = buildGoalState({
      goal: 'maintain',
      pace: 'gentle',
      startWeightKg: 70,
      targetWeightKg: 70,
    })
    expect(state.paceKgPerWeek).toBe(0)
    expect(state.estimatedWeeks).toBe(0)
  })

  it('converts pace to weekly energy delta', () => {
    expect(weeklyEnergyDeltaKcal(-0.5)).toBe(-3850)
    expect(weeklyEnergyDeltaKcal(0.75)).toBe(5775)
  })
})

describe('goal progress', () => {
  const baseProfile = {
    weight: 75,
    goal_type: 'lose',
    goal_pace_kg_per_week: -0.5,
    goal_start_weight_kg: 80,
    goal_target_weight_kg: 70,
    goal_start_date: '2026-01-01T00:00:00.000Z',
    goal_estimated_weeks: 20,
  } as unknown as ProfileDocument

  it('resolves from new machine-readable fields', () => {
    const goal = resolveGoalState(baseProfile)
    expect(goal).not.toBeNull()
    expect(goal?.paceKgPerWeek).toBe(-0.5)
    expect(goal?.estimatedWeeks).toBe(20)
  })

  it('falls back to legacy target_weight and weekly_deficit', () => {
    const legacy = {
      weight: 80,
      target_weight: 76,
      weekly_deficit: 3850,
    } as unknown as ProfileDocument
    const goal = resolveGoalState(legacy)
    expect(goal?.type).toBe('lose')
    expect(goal?.paceKgPerWeek).toBe(0.5)
    expect(goal?.targetWeightKg).toBe(76)
  })

  it('calculates progress at the halfway point', () => {
    const progress = calculateGoalProgress(baseProfile, new Date('2026-03-12T00:00:00.000Z'))
    expect(progress?.progress).toBe(0.5)
    expect(progress?.weeksRemaining).toBe(10)
    expect(progress?.isOnTrack).toBe(true)
  })

  it('formats progress for display', () => {
    const progress = calculateGoalProgress(baseProfile)
    const formatted = formatGoalProgress(progress, (kg) => `${kg} kg`)
    expect(formatted.label).toBe('Losing weight')
    expect(formatted.progressDisplay).toMatch(/^\d+%$/)
  })
})

describe('estimateWeeksToGoal', () => {
  it('rounds to whole weeks', () => {
    expect(estimateWeeksToGoal(80, 70, 0.5)).toBe(20)
    expect(estimateWeeksToGoal(70, 75, 0.25)).toBe(20)
  })

  it('returns 0 with no pace', () => {
    expect(estimateWeeksToGoal(80, 70, 0)).toBe(0)
  })
})
