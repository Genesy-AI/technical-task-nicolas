import { describe, it, expect } from 'vitest'
import { isValidCountryCode } from './validators'

describe('isValidCountryCode', () => {
  it('should return true for valid 2-letter codes', () => {
    expect(isValidCountryCode('US')).toBe(true)
    expect(isValidCountryCode('GB')).toBe(true)
    expect(isValidCountryCode('KI')).toBe(true)
  })

  it('should return false for codes with more than 2 letters', () => {
    expect(isValidCountryCode('XXX')).toBe(false)
    expect(isValidCountryCode('USA')).toBe(false)
  })

  it('should return false for numeric or mixed codes', () => {
    expect(isValidCountryCode('12')).toBe(false)
    expect(isValidCountryCode('U1')).toBe(false)
  })

  it('should be case-insensitive', () => {
    expect(isValidCountryCode('us')).toBe(true)
    expect(isValidCountryCode('Gb')).toBe(true)
  })
})
