import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { orionConnect } from './orionConnect'
import type { PhoneProviderLeadInput } from './types'

const baseLead: PhoneProviderLeadInput = {
  id: 1,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  jobTitle: 'Mathematician',
  companyName: 'Analytical Engine Co.',
  companyWebsite: 'example.com',
}

describe('orionConnect.buildRequest', () => {
  it('returns the right shape when all required fields are present', () => {
    const request = orionConnect.buildRequest(baseLead)
    expect(request).toEqual({
      fullName: 'Ada Lovelace',
      companyWebsite: 'example.com',
    })
  })

  it('returns null when companyWebsite is missing', () => {
    expect(orionConnect.buildRequest({ ...baseLead, companyWebsite: null })).toBeNull()
  })

  it('returns null when firstName is missing', () => {
    expect(orionConnect.buildRequest({ ...baseLead, firstName: '' })).toBeNull()
  })

  it('returns null when lastName is missing', () => {
    expect(orionConnect.buildRequest({ ...baseLead, lastName: '' })).toBeNull()
  })
})

describe('orionConnect.call', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch')
    vi.stubEnv('ORION_CONNECT_AUTH_KEY', 'test-auth-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('normalizes a successful response with a phone', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ phone: '+15551234567' }), { status: 200 })
    )
    const result = await orionConnect.call({ fullName: 'Ada Lovelace', companyWebsite: 'example.com' })
    expect(result).toEqual({ phone: '+15551234567' })
  })

  it('normalizes a successful response with null phone', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ phone: null }), { status: 200 })
    )
    const result = await orionConnect.call({ fullName: 'Ada Lovelace', companyWebsite: 'example.com' })
    expect(result).toEqual({ phone: null })
  })

  it('sends the auth header and JSON body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ phone: null }), { status: 200 })
    )
    await orionConnect.call({ fullName: 'Ada Lovelace', companyWebsite: 'example.com' })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.enginy.ai/api/tmp/orionConnect')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers['x-auth-me']).toBe('test-auth-key')
    expect(headers['Content-Type']).toBe('application/json')
    expect(init?.body).toBe(JSON.stringify({ fullName: 'Ada Lovelace', companyWebsite: 'example.com' }))
  })

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('boom', { status: 500 }))
    await expect(
      orionConnect.call({ fullName: 'Ada Lovelace', companyWebsite: 'example.com' })
    ).rejects.toThrow(/HTTP 500/)
  })
})
