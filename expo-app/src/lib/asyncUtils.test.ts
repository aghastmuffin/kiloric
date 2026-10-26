// eslint-disable-next-line import/no-unresolved
import { describe, expect, it } from 'vitest'
import { withTimeout } from './asyncUtils'

describe('withTimeout', () => {
  it('resolves when the promise completes before the timeout', async () => {
    const fastPromise = Promise.resolve('success')
    const result = await withTimeout(fastPromise, 1000)
    expect(result).toBe('success')
  })

  it('rejects with timeout message when promise takes longer than ms', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 50))
    await expect(withTimeout(slowPromise, 10, 'Custom timeout message')).rejects.toThrow(
      'Custom timeout message',
    )
  })

  it('preserves promise rejection if promise fails before timeout', async () => {
    const failingPromise = Promise.reject(new Error('Original error'))
    await expect(withTimeout(failingPromise, 1000)).rejects.toThrow('Original error')
  })
})
