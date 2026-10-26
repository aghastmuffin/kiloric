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

export function isValidUserId(value: string): boolean {
  if (typeof value !== 'string') return false
  return /^[a-zA-Z0-9._-]{1,128}$/.test(value.trim())
}

export function isValidSecret(value: string): boolean {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 512
}

export function isValidUsername(value: string): boolean {
  const trimmed = value.trim()
  return /^[a-zA-Z0-9_]{3,32}$/.test(trimmed)
}

export function isValidIdentity(value: string): boolean {
  return isValidEmail(value) || isValidUsername(value)
}

export function validateSignInInput(identity: string, password: string): void {
  if (!isValidIdentity(identity)) throw new Error('Invalid email format.')
  if (!isValidPassword(password)) throw new Error('Password must be between 8 and 128 characters.')
}

export function validateSignUpInput(email: string, password: string): void {
  if (!isValidEmail(email)) throw new Error('Invalid email format.')
  if (!isValidPassword(password)) throw new Error('Password must be between 8 and 128 characters.')
}

export function validateSendPasswordResetInput(email: string): void {
  if (!isValidEmail(email)) throw new Error('Invalid email format.')
}

export function validateConfirmPasswordResetInput(
  userId: string,
  secret: string,
  password: string,
): void {
  if (!isValidUserId(userId)) throw new Error('Invalid user ID.')
  if (!isValidSecret(secret)) throw new Error('Invalid recovery secret.')
  if (!isValidPassword(password)) throw new Error('Password must be between 8 and 128 characters.')
}
