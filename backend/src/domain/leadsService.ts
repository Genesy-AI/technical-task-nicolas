import type { PrismaClient } from '@prisma/client'
import type { Client as TemporalClient } from '@temporalio/client'
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import { enrichPhoneWorkflow } from '../workflows'

export interface EnrichPhonesResult {
  enqueuedCount: number
  skippedCount: number
  enqueued: number[]
  skipped: Array<{ leadId: number; reason: string }>
}

export class NoLeadsFoundError extends Error {
  constructor() {
    super('No leads found with the provided IDs')
    this.name = 'NoLeadsFoundError'
  }
}

export class LeadsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly getTemporalClient: () => Promise<TemporalClient>,
    private readonly taskQueue: string = 'myQueue'
  ) {}

  async enrichPhones(leadIds: number[]): Promise<EnrichPhonesResult> {
    const numericIds = leadIds.map((id) => Number(id))

    const leads = await this.prisma.lead.findMany({
      where: { id: { in: numericIds } },
      select: { id: true },
    })

    if (leads.length === 0) {
      throw new NoLeadsFoundError()
    }

    const foundIds = leads.map((l) => l.id)

    await this.prisma.lead.updateMany({
      where: { id: { in: foundIds } },
      data: { phoneEnrichmentStatus: 'running' },
    })

    const client = await this.getTemporalClient()

    const settled = await Promise.allSettled(
      foundIds.map((id) =>
        client.workflow
          .start(enrichPhoneWorkflow, {
            taskQueue: this.taskQueue,
            workflowId: `enrich-phone-${id}`,
            args: [id],
          })
          .then(() => id)
      )
    )

    const enqueued: number[] = []
    const skipped: Array<{ leadId: number; reason: string }> = []
    const otherFailureIds: number[] = []

    settled.forEach((outcome, idx) => {
      const leadId = foundIds[idx]
      if (outcome.status === 'fulfilled') {
        enqueued.push(leadId)
      } else if (outcome.reason instanceof WorkflowExecutionAlreadyStartedError) {
        skipped.push({ leadId, reason: 'already_running' })
      } else {
        const message =
          outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
        skipped.push({ leadId, reason: message })
        otherFailureIds.push(leadId)
      }
    })

    if (otherFailureIds.length > 0) {
      await this.prisma.lead.updateMany({
        where: { id: { in: otherFailureIds } },
        data: { phoneEnrichmentStatus: 'failed' },
      })
    }

    return {
      enqueuedCount: enqueued.length,
      skippedCount: skipped.length,
      enqueued,
      skipped,
    }
  }
}
