export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  // RFC 5321 / RFC 5322: Maximum email length is 254 characters
  if (trimmed.length > 254) {
    return false
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(trimmed)
}

export function isValidPassword(value: string): boolean {
  // Prevent hashing Denial of Service (DoS) attacks from extremely long passwords
  return value.length >= 8 && value.length <= 128
}
