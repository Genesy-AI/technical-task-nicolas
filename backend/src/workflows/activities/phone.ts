import { PrismaClient } from '@prisma/client'
import type { ProviderName } from '../providers/registry'
import { providerByName } from '../providers/registry'
import type { PhoneEnrichmentStatus } from '../providers/types'

const prisma = new PrismaClient()

export interface LookupAttempt {
  providerName: ProviderName
  skipped: boolean
  phone: string | null
}

export async function lookupPhoneWith(input: {
  providerName: ProviderName
  leadId: number
}): Promise<LookupAttempt> {
  const { providerName, leadId } = input

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      companyName: true,
      companyWebsite: true,
    },
  })

  if (!lead) {
    throw new Error(`lookupPhoneWith: lead ${leadId} not found`)
  }

  const provider = providerByName[providerName]
  const request = provider.buildRequest(lead)
  if (request === null) {
    return { providerName, skipped: true, phone: null }
  }

  const result = await provider.call(request)
  return { providerName, skipped: false, phone: result.phone }
}

export async function persistPhoneResult(input: {
  leadId: number
  status: PhoneEnrichmentStatus
  phone: string | null
  providerName: ProviderName | null
}): Promise<void> {
  const { leadId, status, phone, providerName } = input
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      phoneEnrichmentStatus: status,
      phone,
      phoneEnrichmentProvider: providerName,
    },
  })
}
