import { describe, expect, it } from 'vitest'
import {
  appendDisplayUnitsToGoalPlain,
  defaultDisplayUnits,
  parseDisplayUnitsPreference,
  prefersImperialDisplay,
} from './units'

describe('units utilities', () => {
  describe('prefersImperialDisplay & defaultDisplayUnits', () => {
    it('returns imperial for imperial-default countries', () => {
      expect(prefersImperialDisplay('US')).toBe(true)
      expect(prefersImperialDisplay('us')).toBe(true)
      expect(defaultDisplayUnits('US')).toBe('imperial')
    })

    it('returns metric for non-imperial countries or empty input', () => {
      expect(prefersImperialDisplay('CA')).toBe(false)
      expect(prefersImperialDisplay(null)).toBe(false)
      expect(defaultDisplayUnits('CA')).toBe('metric')
      expect(defaultDisplayUnits(undefined)).toBe('metric')
    })
  })

  describe('parseDisplayUnitsPreference', () => {
    it('parses explicit metric preference from goalPlain', () => {
      const goalPlain = 'Lose weight · Balanced plan · units:metric'
      expect(parseDisplayUnitsPreference(goalPlain, 'US')).toBe('metric')
    })

    it('parses explicit imperial preference from goalPlain', () => {
      const goalPlain = 'Lose weight · Balanced plan · units:imperial'
      expect(parseDisplayUnitsPreference(goalPlain, 'CA')).toBe('imperial')
    })

    it('falls back to default units based on country if units suffix is missing', () => {
      const goalPlain = 'Lose weight · Balanced plan'
      expect(parseDisplayUnitsPreference(goalPlain, 'US')).toBe('imperial')
      expect(parseDisplayUnitsPreference(goalPlain, 'CA')).toBe('metric')
    })

    it('handles null or undefined goalPlain gracefully', () => {
      expect(parseDisplayUnitsPreference(null, 'US')).toBe('imperial')
      expect(parseDisplayUnitsPreference(undefined, 'FR')).toBe('metric')
    })
  })

  describe('appendDisplayUnitsToGoalPlain', () => {
    it('appends units suffix to base goal plain text', () => {
      const base = 'Lose weight · Balanced plan'
      expect(appendDisplayUnitsToGoalPlain(base, 'imperial')).toBe(
        'Lose weight · Balanced plan · units:imperial',
      )
    })

    it('replaces existing metric suffix with new preference', () => {
      const existing = 'Lose weight · Balanced plan · units:metric'
      expect(appendDisplayUnitsToGoalPlain(existing, 'imperial')).toBe(
        'Lose weight · Balanced plan · units:imperial',
      )
    })

    it('replaces existing imperial suffix with new preference', () => {
      const existing = 'Lose weight · Balanced plan · units:imperial'
      expect(appendDisplayUnitsToGoalPlain(existing, 'metric')).toBe(
        'Lose weight · Balanced plan · units:metric',
      )
    })
  })
})
