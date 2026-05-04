import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WorkflowExecutionAlreadyStartedError } from '@temporalio/client'
import type { PrismaClient } from '@prisma/client'
import type { Client as TemporalClient } from '@temporalio/client'
import { LeadsService, NoLeadsFoundError } from './leadsService'

type FindManyMock = ReturnType<typeof vi.fn<(...args: any[]) => Promise<Array<{ id: number }>>>>
type UpdateManyMock = ReturnType<typeof vi.fn<(...args: any[]) => Promise<{ count: number }>>>
type StartMock = ReturnType<typeof vi.fn<(...args: any[]) => Promise<unknown>>>

interface Mocks {
  prisma: PrismaClient
  findMany: FindManyMock
  updateMany: UpdateManyMock
  startWorkflow: StartMock
  service: LeadsService
}

function makeMocks(): Mocks {
  const findMany: FindManyMock = vi.fn()
  const updateMany: UpdateManyMock = vi.fn().mockResolvedValue({ count: 0 })
  const startWorkflow: StartMock = vi.fn()

  const prisma = {
    lead: { findMany, updateMany },
  } as unknown as PrismaClient

  const temporalClient = {
    workflow: { start: startWorkflow },
  } as unknown as TemporalClient

  const service = new LeadsService(prisma, async () => temporalClient, 'test-queue')

  return { prisma, findMany, updateMany, startWorkflow, service }
}

describe('LeadsService.enrichPhones', () => {
  let m: Mocks

  beforeEach(() => {
    m = makeMocks()
  })

  it('throws NoLeadsFoundError when prisma returns no matching leads', async () => {
    m.findMany.mockResolvedValueOnce([])
    await expect(m.service.enrichPhones([1, 2, 3])).rejects.toBeInstanceOf(NoLeadsFoundError)
    expect(m.updateMany).not.toHaveBeenCalled()
    expect(m.startWorkflow).not.toHaveBeenCalled()
  })

  it('marks found leads as running and returns enqueued list when all workflows start successfully', async () => {
    m.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
    m.startWorkflow.mockResolvedValue({})

    const result = await m.service.enrichPhones([1, 2, 99])

    expect(m.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { phoneEnrichmentStatus: 'running' },
    })
    expect(m.startWorkflow).toHaveBeenCalledTimes(2)
    expect(m.startWorkflow).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        taskQueue: 'test-queue',
        workflowId: 'enrich-phone-1',
        args: [1],
      })
    )
    expect(m.startWorkflow).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ workflowId: 'enrich-phone-2', args: [2] })
    )
    expect(result).toEqual({
      enqueuedCount: 2,
      skippedCount: 0,
      enqueued: [1, 2],
      skipped: [],
    })
  })

  it('classifies WorkflowExecutionAlreadyStartedError as skipped with reason "already_running" and does not roll back', async () => {
    m.findMany.mockResolvedValueOnce([{ id: 7 }])
    m.startWorkflow.mockRejectedValueOnce(
      new WorkflowExecutionAlreadyStartedError('already running', 'enrich-phone-7', 'enrichPhoneWorkflow')
    )

    const result = await m.service.enrichPhones([7])

    expect(result).toEqual({
      enqueuedCount: 0,
      skippedCount: 1,
      enqueued: [],
      skipped: [{ leadId: 7, reason: 'already_running' }],
    })
    // Only the initial "running" updateMany — no second rollback call
    expect(m.updateMany).toHaveBeenCalledTimes(1)
  })

  it('rolls back generic errors to phoneEnrichmentStatus="failed" and surfaces the error message', async () => {
    m.findMany.mockResolvedValueOnce([{ id: 5 }])
    m.startWorkflow.mockRejectedValueOnce(new Error('temporal connection lost'))

    const result = await m.service.enrichPhones([5])

    expect(result).toEqual({
      enqueuedCount: 0,
      skippedCount: 1,
      enqueued: [],
      skipped: [{ leadId: 5, reason: 'temporal connection lost' }],
    })
    expect(m.updateMany).toHaveBeenCalledTimes(2)
    expect(m.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: [5] } },
      data: { phoneEnrichmentStatus: 'failed' },
    })
  })

  it('handles non-Error rejection reasons by stringifying them', async () => {
    m.findMany.mockResolvedValueOnce([{ id: 9 }])
    m.startWorkflow.mockRejectedValueOnce('something weird')

    const result = await m.service.enrichPhones([9])

    expect(result.skipped).toEqual([{ leadId: 9, reason: 'something weird' }])
  })

  it('classifies a mixed batch correctly and only rolls back the generic-failure subset', async () => {
    m.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }])
    m.startWorkflow
      .mockResolvedValueOnce({}) // 1 → fulfilled
      .mockRejectedValueOnce(
        new WorkflowExecutionAlreadyStartedError('already', 'enrich-phone-2', 'enrichPhoneWorkflow')
      ) // 2 → already_running
      .mockRejectedValueOnce(new Error('boom')) // 3 → other failure
      .mockResolvedValueOnce({}) // 4 → fulfilled

    const result = await m.service.enrichPhones([1, 2, 3, 4])

    expect(result.enqueued.sort()).toEqual([1, 4])
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { leadId: 2, reason: 'already_running' },
        { leadId: 3, reason: 'boom' },
      ])
    )
    expect(result.enqueuedCount).toBe(2)
    expect(result.skippedCount).toBe(2)

    // Two updateMany calls: initial running batch, then rollback only for lead 3
    expect(m.updateMany).toHaveBeenCalledTimes(2)
    expect(m.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: [3] } },
      data: { phoneEnrichmentStatus: 'failed' },
    })
  })

  it('coerces string leadIds to numeric before querying prisma', async () => {
    m.findMany.mockResolvedValueOnce([{ id: 1 }])
    m.startWorkflow.mockResolvedValue({})

    await m.service.enrichPhones(['1' as unknown as number, '2' as unknown as number])

    expect(m.findMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      select: { id: true },
    })
  })
})
