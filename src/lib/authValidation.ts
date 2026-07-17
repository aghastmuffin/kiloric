/**
 * Validates whether the given string is a valid email format.
 * Security: Uses a robust, standard regular expression to validate the email structure
 * rather than a basic substring check, preventing invalid formats from reaching the database
 * or authentication providers.
 */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(trimmed)
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8
}
