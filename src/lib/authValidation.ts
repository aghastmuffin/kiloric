export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  // Mitigate resource-exhaustion and DoS risks by enforcing a 254-character limit (RFC 5321/5322 compliant)
  if (trimmed.length > 254) {
    return false
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(trimmed)
}

export function isValidPassword(value: string): boolean {
  // Mitigate bcrypt/argon2 hashing Denial of Service (DoS) risks by enforcing a 128-character limit
  return value.length >= 8 && value.length <= 128
}
