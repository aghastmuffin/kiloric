export const MINIMUM_ONBOARDING_AGE = 18

export function ageOnDate(dateOfBirth: Date, today = new Date()): number {
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const birthdayHasPassed =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate())
  if (!birthdayHasPassed) age -= 1
  return age
}

export function isEligibleOnboardingAge(dateOfBirth: Date, today = new Date()): boolean {
  return ageOnDate(dateOfBirth, today) >= MINIMUM_ONBOARDING_AGE
}
