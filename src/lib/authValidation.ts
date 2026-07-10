export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  // Production-grade email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(trimmed)
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8
}
