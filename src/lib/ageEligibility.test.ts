import { describe, expect, it } from 'vitest'

import { ageOnDate, isEligibleOnboardingAge } from './ageEligibility'

describe('adult eligibility', () => {
  const today = new Date(2026, 7, 25)

  it('accepts a user on their eighteenth birthday', () => {
    const dateOfBirth = new Date(2008, 7, 25)

    expect(ageOnDate(dateOfBirth, today)).toBe(18)
    expect(isEligibleOnboardingAge(dateOfBirth, today)).toBe(true)
  })

  it('rejects a user one day before their eighteenth birthday', () => {
    expect(isEligibleOnboardingAge(new Date(2008, 7, 26), today)).toBe(false)
  })

  it('accepts a user after their eighteenth birthday', () => {
    expect(isEligibleOnboardingAge(new Date(2008, 7, 24), today)).toBe(true)
  })
})
