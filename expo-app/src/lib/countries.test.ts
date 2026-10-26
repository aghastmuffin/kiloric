import { describe, expect, it } from 'vitest'
import { COUNTRY_OPTIONS, getCountryName } from './countries'
import { isBarredResidency } from './residency'

describe('countries lib', () => {
  it('excludes EU member states, Russia, and Vietnam from COUNTRY_OPTIONS', () => {
    const optionValues = new Set(COUNTRY_OPTIONS.map((opt) => opt.value))

    // EU countries & territories
    expect(optionValues.has('DE')).toBe(false)
    expect(optionValues.has('FR')).toBe(false)
    expect(optionValues.has('AT')).toBe(false)
    expect(optionValues.has('SE')).toBe(false)
    expect(optionValues.has('GF')).toBe(false)

    // Russia and Vietnam
    expect(optionValues.has('RU')).toBe(false)
    expect(optionValues.has('VN')).toBe(false)

    // Verify all options in COUNTRY_OPTIONS satisfy !isBarredResidency
    for (const option of COUNTRY_OPTIONS) {
      expect(isBarredResidency(option.value)).toBe(false)
    }
  })

  it('includes allowed countries in COUNTRY_OPTIONS', () => {
    const optionValues = new Set(COUNTRY_OPTIONS.map((opt) => opt.value))

    expect(optionValues.has('US')).toBe(true)
    expect(optionValues.has('CA')).toBe(true)
    expect(optionValues.has('GB')).toBe(true)
    expect(optionValues.has('JP')).toBe(true)
    expect(optionValues.has('AU')).toBe(true)
  })

  it('resolves country names via getCountryName', () => {
    expect(getCountryName('US')).toBe('United States')
    expect(getCountryName('us')).toBe('United States')
    expect(getCountryName('FR')).toBe('France')
    expect(getCountryName('RU')).toBe('Russia')
    expect(getCountryName('VN')).toBe('Viet Nam')
    expect(getCountryName('XYZ')).toBe('XYZ')
  })
})
