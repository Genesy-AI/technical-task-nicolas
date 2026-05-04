import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nimbusLookup } from './nimbusLookup'
import type { PhoneProviderLeadInput } from './types'

const baseLead: PhoneProviderLeadInput = {
  id: 1,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  jobTitle: 'CTO',
  companyName: 'Analytical Engine Co.',
  companyWebsite: 'example.com',
}

describe('nimbusLookup.buildRequest', () => {
  it('returns the right shape when email and jobTitle are present', () => {
    expect(nimbusLookup.buildRequest(baseLead)).toEqual({
      email: 'ada@example.com',
      jobTitle: 'CTO',
    })
  })

  it('returns null when email is missing', () => {
    expect(nimbusLookup.buildRequest({ ...baseLead, email: '' })).toBeNull()
  })

  it('returns null when jobTitle is missing', () => {
    expect(nimbusLookup.buildRequest({ ...baseLead, jobTitle: null })).toBeNull()
  })
})

describe('nimbusLookup.call', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch')
    vi.stubEnv('NIMBUS_LOOKUP_API_KEY', 'test-api-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('concatenates +countryCode + number when both present', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ number: 5551234567, countryCode: '1' }), { status: 200 })
    )
    const result = await nimbusLookup.call({ email: 'ada@example.com', jobTitle: 'CTO' })
    expect(result).toEqual({ phone: '+15551234567' })
  })

  it('falls back to String(number) when countryCode is missing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ number: 5551234567 }), { status: 200 })
    )
    const result = await nimbusLookup.call({ email: 'ada@example.com', jobTitle: 'CTO' })
    expect(result).toEqual({ phone: '5551234567' })
  })

  it('returns null phone when number is null', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ number: null, countryCode: '1' }), { status: 200 })
    )
    const result = await nimbusLookup.call({ email: 'ada@example.com', jobTitle: 'CTO' })
    expect(result).toEqual({ phone: null })
  })

  it('returns null phone when number is missing entirely', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    )
    const result = await nimbusLookup.call({ email: 'ada@example.com', jobTitle: 'CTO' })
    expect(result).toEqual({ phone: null })
  })

  it('hits the URL with the api query-string auth', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ number: null }), { status: 200 })
    )
    await nimbusLookup.call({ email: 'ada@example.com', jobTitle: 'CTO' })
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.enginy.ai/api/tmp/numbusLookup?api=test-api-key')
  })

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('boom', { status: 502 }))
    await expect(
      nimbusLookup.call({ email: 'ada@example.com', jobTitle: 'CTO' })
    ).rejects.toThrow(/HTTP 502/)
  })
})
