import { describe, expect, it } from 'vitest'

import {
  ageOnDate,
  isEligibleOnboardingAge,
  MINIMUM_ONBOARDING_AGE,
} from './ageEligibility'

describe('onboarding age eligibility', () => {
  const today = new Date(2026, 7, 20)

  it('accepts a user on their eighteenth birthday', () => {
    const birthday = new Date(2008, 7, 20)
    expect(ageOnDate(birthday, today)).toBe(MINIMUM_ONBOARDING_AGE)
    expect(isEligibleOnboardingAge(birthday, today)).toBe(true)
  })

  it('rejects a user who turns eighteen tomorrow', () => {
    const birthday = new Date(2008, 7, 21)
    expect(ageOnDate(birthday, today)).toBe(17)
    expect(isEligibleOnboardingAge(birthday, today)).toBe(false)
  })

  it('handles birthdays earlier in the year', () => {
    expect(ageOnDate(new Date(1990, 0, 1), today)).toBe(36)
  })
})
