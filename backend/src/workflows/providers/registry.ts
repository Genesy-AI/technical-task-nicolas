import type { PhoneProvider } from './types'
import { orionConnect } from './orionConnect'
import { astraDialer } from './astraDialer'
import { nimbusLookup } from './nimbusLookup'

export const PROVIDER_ORDER = ['orionConnect', 'astraDialer', 'nimbusLookup'] as const

export type ProviderName = (typeof PROVIDER_ORDER)[number]

export const providerByName: Record<ProviderName, PhoneProvider> = {
  orionConnect,
  astraDialer,
  nimbusLookup,
}
