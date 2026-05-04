import type { PhoneProvider, PhoneProviderLeadInput, PhoneProviderResult } from './types'
import { requireEnv } from '../../config/env'

interface AstraDialerRequest {
  email: string
}

interface AstraDialerResponse {
  phoneNmbr?: string | null
}

const URL = 'https://api.enginy.ai/api/tmp/astraDialer'
const AUTH_HEADER = 'apiKey'

export const astraDialer: PhoneProvider<AstraDialerRequest> = {
  name: 'astraDialer',

  buildRequest(lead: PhoneProviderLeadInput): AstraDialerRequest | null {
    if (!lead.email) {
      return null
    }
    return { email: lead.email }
  },

  async call(request: AstraDialerRequest): Promise<PhoneProviderResult> {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [AUTH_HEADER]: requireEnv('ASTRA_DIALER_API_KEY'),
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`astraDialer: HTTP ${response.status}`)
    }

    const data = (await response.json()) as AstraDialerResponse
    return { phone: data.phoneNmbr ?? null }
  },
}
