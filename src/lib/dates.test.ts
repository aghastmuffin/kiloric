// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest'
import { localDayBounds, startOfLocalDay } from './dates'

describe('dates', () => {
  it('returns local midnight and the following midnight', () => {
    const date = new Date(2026, 5, 15, 18, 30, 0)
    const start = startOfLocalDay(date)
    const bounds = localDayBounds(date)

    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(bounds.start.getTime()).toBe(start.getTime())
    expect(bounds.end.getTime() - bounds.start.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})
