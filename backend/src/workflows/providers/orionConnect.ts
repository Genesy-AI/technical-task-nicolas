import type { PhoneProvider, PhoneProviderLeadInput, PhoneProviderResult } from './types'
import { requireEnv } from '../../config/env'

interface OrionConnectRequest {
  fullName: string
  companyWebsite: string
}

interface OrionConnectResponse {
  phone: string | null
}

const URL = 'https://api.enginy.ai/api/tmp/orionConnect'
const AUTH_HEADER = 'x-auth-me'

export const orionConnect: PhoneProvider<OrionConnectRequest> = {
  name: 'orionConnect',

  buildRequest(lead: PhoneProviderLeadInput): OrionConnectRequest | null {
    if (!lead.firstName || !lead.lastName || !lead.companyWebsite) {
      return null
    }
    return {
      fullName: `${lead.firstName} ${lead.lastName}`,
      companyWebsite: lead.companyWebsite,
    }
  },

  async call(request: OrionConnectRequest): Promise<PhoneProviderResult> {
    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [AUTH_HEADER]: requireEnv('ORION_CONNECT_AUTH_KEY'),
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`orionConnect: HTTP ${response.status}`)
    }

    const data = (await response.json()) as OrionConnectResponse
    return { phone: data.phone ?? null }
  },
}
