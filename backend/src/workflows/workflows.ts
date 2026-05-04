import { proxyActivities } from '@temporalio/workflow'
import type * as activities from './activities'
import { PROVIDER_ORDER, ProviderName } from './providers/registry'

const { verifyEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 second',
})

const { lookupPhoneWith, persistPhoneResult } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
})

export async function verifyEmailWorkflow(email: string): Promise<boolean> {
  return await verifyEmail(email)
}

export interface EnrichPhoneResult {
  status: 'found' | 'not_found' | 'failed'
  phone: string | null
  providerName: ProviderName | null
}

export async function enrichPhoneWorkflow(leadId: number): Promise<EnrichPhoneResult> {
  try {
    for (const providerName of PROVIDER_ORDER) {
      const attempt = await lookupPhoneWith({ providerName, leadId })
      if (attempt.skipped) continue
      if (attempt.phone) {
        await persistPhoneResult({
          leadId,
          status: 'found',
          phone: attempt.phone,
          providerName,
        })
        return { status: 'found', phone: attempt.phone, providerName }
      }
    }

    await persistPhoneResult({
      leadId,
      status: 'not_found',
      phone: null,
      providerName: null,
    })
    return { status: 'not_found', phone: null, providerName: null }
  } catch (err) {
    await persistPhoneResult({
      leadId,
      status: 'failed',
      phone: null,
      providerName: null,
    })
    throw err
  }
}
