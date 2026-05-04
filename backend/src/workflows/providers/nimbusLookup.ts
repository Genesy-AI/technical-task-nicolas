import type { PhoneProvider, PhoneProviderLeadInput, PhoneProviderResult } from './types'
import { requireEnv } from '../../config/env'

interface NimbusLookupRequest {
  email: string
  jobTitle: string
}

interface NimbusLookupResponse {
  number?: number | null
  countryCode?: string | null
}

const BASE_URL = 'https://api.enginy.ai/api/tmp/numbusLookup'

export const nimbusLookup: PhoneProvider<NimbusLookupRequest> = {
  name: 'nimbusLookup',

  buildRequest(lead: PhoneProviderLeadInput): NimbusLookupRequest | null {
    if (!lead.email || !lead.jobTitle) {
      return null
    }
    return { email: lead.email, jobTitle: lead.jobTitle }
  },

  async call(request: NimbusLookupRequest): Promise<PhoneProviderResult> {
    const url = `${BASE_URL}?api=${encodeURIComponent(requireEnv('NIMBUS_LOOKUP_API_KEY'))}`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`nimbusLookup: HTTP ${response.status}`)
    }

    const data = (await response.json()) as NimbusLookupResponse
    if (data.number == null) {
      return { phone: null }
    }
    const phone = data.countryCode
      ? `+${data.countryCode}${data.number}`
      : String(data.number)
    return { phone }
  },
}
