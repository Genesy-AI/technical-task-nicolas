export type PhoneEnrichmentStatus = 'running' | 'found' | 'not_found' | 'failed'

export type LeadsGetManyInput = undefined

export type LeadsGetManyOutput = {
  id: number
  createdAt: string
  updatedAt: string
  firstName: string
  lastName: string | null
  email: string | null
  jobTitle: string | null
  countryCode: string | null
  companyName: string | null
  message: string | null
  emailVerified: boolean | null
  companyWebsite: string | null
  phone: string | null
  phoneEnrichmentStatus: PhoneEnrichmentStatus | null
  phoneEnrichmentProvider: string | null
}[]
