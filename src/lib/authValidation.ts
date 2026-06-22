export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.includes('@') && trimmed.includes('.') && trimmed.length >= 5
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8
}
