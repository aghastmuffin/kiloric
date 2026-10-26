import { describe, expect, it } from 'vitest'
import {
  appendDisplayUnitsToGoalPlain,
  defaultDisplayUnits,
  flOzToMl,
  formatFluid,
  formatHeightImperial,
  formatHeightMetric,
  formatWeightImperial,
  formatWeightMetric,
  kgToLbs,
  lbsToKg,
  mlToFlOz,
  parseDisplayUnitsPreference,
  prefersImperialDisplay,
} from './units'

describe('units', () => {
  it('correctly converts ml to US fluid ounces and back', () => {
    // 2632 ml is ~89 fl oz
    expect(mlToFlOz(2632)).toBe(89)
    expect(flOzToMl(89)).toBe(2632)

    // 1000 ml is ~34 fl oz
    expect(mlToFlOz(1000)).toBe(34)
    expect(flOzToMl(34)).toBe(1006)

    // 250 ml (1 glass) is ~8 fl oz
    expect(mlToFlOz(250)).toBe(8)
    expect(flOzToMl(8)).toBe(237)
  })

  it('formats fluid according to preference', () => {
    expect(formatFluid('imperial', 2632)).toBe('89 fl oz')
    expect(formatFluid('metric', 2632)).toBe('2632 ml')
  })

  it('determines imperial display by country', () => {
    expect(prefersImperialDisplay('US')).toBe(true)
    expect(prefersImperialDisplay('GB')).toBe(false)
    expect(prefersImperialDisplay('CA')).toBe(false)
    expect(defaultDisplayUnits('US')).toBe('imperial')
    expect(defaultDisplayUnits('DE')).toBe('metric')
  })

  it('parses and appends display units preference from goal plain text', () => {
    const plain = 'Reach 70 kg · Balanced plan'
    const updated = appendDisplayUnitsToGoalPlain(plain, 'imperial')
    expect(updated).toBe('Reach 70 kg · Balanced plan · units:imperial')
    expect(parseDisplayUnitsPreference(updated, 'US')).toBe('imperial')
    expect(parseDisplayUnitsPreference(plain, 'DE')).toBe('metric')
  })

  it('formats height and weight', () => {
    expect(formatHeightMetric(175)).toBe('175 cm')
    expect(formatWeightMetric(70)).toBe('70 kg')
    expect(formatHeightImperial(175)).toBe('5\'9"')
    expect(formatWeightImperial(70)).toBe('154.3 lb')
  })

  it('preserves decimal precision when converting imperial weight', () => {
    const lbs = 179.5
    const kg = lbsToKg(lbs) // ~81.4 kg
    expect(kgToLbs(kg)).toBe(179.5)
    expect(formatWeightImperial(kg)).toBe('179.5 lb')
  })
})
