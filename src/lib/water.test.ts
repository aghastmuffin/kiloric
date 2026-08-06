import { describe, expect, it } from 'vitest'
import { localDayBounds, totalWaterMl } from './waterUtils'

describe('water', () => {
  it('groups entries into local calendar days', () => {
    const date = new Date(2026, 6, 9, 15, 30)
    const { start, end } = localDayBounds(date)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(6)
    expect(start.getDate()).toBe(9)
    expect(start.getHours()).toBe(0)
    expect(end.getDate()).toBe(10)
    expect(end.getHours()).toBe(0)
  })

  it('sums valid water amounts and ignores invalid rows', () => {
    expect(
      totalWaterMl([
        { amount_ml: 250 },
        { amount_ml: 500 },
        { amount_ml: 10 },
        { amount_ml: Number.NaN },
      ]),
    ).toBe(750)
  })
})
