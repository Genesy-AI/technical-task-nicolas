import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { astraDialer } from './astraDialer'
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

describe('astraDialer.buildRequest', () => {
  it('returns the right shape when email is present', () => {
    expect(astraDialer.buildRequest(baseLead)).toEqual({ email: 'ada@example.com' })
  })

  it('returns null when email is missing', () => {
    expect(astraDialer.buildRequest({ ...baseLead, email: '' })).toBeNull()
  })
})

describe('astraDialer.call', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch')
    vi.stubEnv('ASTRA_DIALER_API_KEY', 'test-api-key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('maps phoneNmbr → phone on a successful response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ phoneNmbr: '+15551234567' }), { status: 200 })
    )
    const result = await astraDialer.call({ email: 'ada@example.com' })
    expect(result).toEqual({ phone: '+15551234567' })
  })

  it('maps missing phoneNmbr to null phone', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 })
    )
    const result = await astraDialer.call({ email: 'ada@example.com' })
    expect(result).toEqual({ phone: null })
  })

  it('maps explicit null phoneNmbr to null phone', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ phoneNmbr: null }), { status: 200 })
    )
    const result = await astraDialer.call({ email: 'ada@example.com' })
    expect(result).toEqual({ phone: null })
  })

  it('sends the apiKey header and JSON body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ phoneNmbr: null }), { status: 200 })
    )
    await astraDialer.call({ email: 'ada@example.com' })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.enginy.ai/api/tmp/astraDialer')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers['apiKey']).toBe('test-api-key')
    expect(init?.body).toBe(JSON.stringify({ email: 'ada@example.com' }))
  })

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('boom', { status: 503 }))
    await expect(astraDialer.call({ email: 'ada@example.com' })).rejects.toThrow(/HTTP 503/)
  })
})
