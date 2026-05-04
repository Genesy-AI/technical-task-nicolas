export type PhoneEnrichmentStatus = 'running' | 'found' | 'not_found' | 'failed'

export interface PhoneProviderLeadInput {
  id: number
  firstName: string
  lastName: string
  email: string
  jobTitle: string | null
  companyName: string | null
  companyWebsite: string | null
}

export interface PhoneProviderResult {
  phone: string | null
}

export interface PhoneProvider<TRequest = unknown> {
  readonly name: string
  buildRequest(lead: PhoneProviderLeadInput): TRequest | null
  call(request: TRequest): Promise<PhoneProviderResult>
}
