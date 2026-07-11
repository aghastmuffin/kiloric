export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8
}
