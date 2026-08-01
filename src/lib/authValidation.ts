export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length > 254) {
    return false
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(trimmed)
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 128
}
