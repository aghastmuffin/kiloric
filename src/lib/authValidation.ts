export function isValidEmail(value: string): boolean {
  const trimmed = value.trim()
  // Mitigate resource exhaustion / DoS attacks by restricting input length (RFC 5321/5322)
  if (trimmed.length > 254) {
    return false
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(trimmed)
}

export function isValidPassword(value: string): boolean {
  // Mitigate resource exhaustion / bcrypt database hashing DoS by restricting password length
  return value.length >= 8 && value.length <= 128
}
