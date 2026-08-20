import { describe, expect, it } from 'vitest'
import { calculateEnergyTrend } from './nutritionTrends'

describe('calculateEnergyTrend', () => {
  it('does not count missing days as zero intake', () => {
    const trend = calculateEnergyTrend([
      { kcal: 1800, hasLog: true }, { kcal: 0, hasLog: false },
      { kcal: 1800, hasLog: true }, { kcal: 0, hasLog: false },
    ])
    expect(trend.averageKcal).toBe(1800)
    expect(trend.confidence).toBe('medium')
    expect(trend.direction).toBe('insufficient')
  })

  it('compares equal adjacent logged-day windows', () => {
    const trend = calculateEnergyTrend([
      1800, 1850, 1820, 1810, 2100, 2150, 2120, 2110,
    ].map((kcal) => ({ kcal, hasLog: true })), 4)
    expect(trend.previousAverageKcal).toBe(1820)
    expect(trend.recentAverageKcal).toBe(2120)
    expect(trend.changeKcal).toBe(300)
    expect(trend.direction).toBe('up')
    expect(trend.confidence).toBe('high')
  })

  it('labels small changes as steady', () => {
    const trend = calculateEnergyTrend([
      2000, 2000, 2000, 2000, 2050, 2050, 2050, 2050,
    ].map((kcal) => ({ kcal, hasLog: true })), 4)
    expect(trend.direction).toBe('steady')
  })
})
