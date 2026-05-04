import { describe, it, expect, vi, afterEach } from 'vitest'
import { verifyEmail } from './utils'

describe('verifyEmail', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for john.doe emails', async () => {
    expect(await verifyEmail('john.doe@example.com')).toBe(false)
  })

  it('returns false for emails containing a + sign', async () => {
    expect(await verifyEmail('user+tag@example.com')).toBe(false)
  })

  it('returns true for regular emails', async () => {
    expect(await verifyEmail('alice@example.com')).toBe(true)
  })

  it('resolves true for jane.smith emails after the simulated delay', async () => {
    vi.useFakeTimers()
    const promise = verifyEmail('jane.smith@gmail.com')
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await promise).toBe(true)
  })

  it('does not resolve before the full 20-second delay', async () => {
    vi.useFakeTimers()
    let resolved = false
    const promise = verifyEmail('jane.smith@gmail.com').then((v) => { resolved = true; return v })
    await vi.advanceTimersByTimeAsync(19_999)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await promise).toBe(true)
  })
})
