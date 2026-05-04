export type LeadsEnrichPhonesInput = {
  leadIds: number[]
}

export type LeadsEnrichPhonesOutput = {
  success: boolean
  enqueuedCount: number
  skippedCount: number
  enqueued: number[]
  skipped: Array<{
    leadId: number
    reason: string
  }>
}
