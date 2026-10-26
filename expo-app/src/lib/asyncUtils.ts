/**
 * Resolves with the result of `promise` if it completes within `ms` milliseconds,
 * otherwise rejects with an Error containing `message`.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms = 10000,
  message = 'Operation timed out.',
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message))
    }, ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  })
}
