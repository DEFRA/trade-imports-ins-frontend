import { describe, expect, test } from 'vitest'

import { insBackendClient } from './ins-backend-client.stub.js'

describe('#insBackendClient (stub)', () => {
  describe('listNotifications sorting', () => {
    test.each([
      ['arrivalDate,desc', ['agg-stub-2', 'agg-stub-1', 'agg-stub-3']],
      ['arrivalDate,asc', ['agg-stub-3', 'agg-stub-1', 'agg-stub-2']],
      ['lastUpdated,desc', ['agg-stub-3', 'agg-stub-1', 'agg-stub-2']],
      ['lastUpdated,asc', ['agg-stub-2', 'agg-stub-1', 'agg-stub-3']]
    ])('sorts by %s', async (sort, expectedOrder) => {
      const { content } = await insBackendClient.listNotifications('trace', {
        page: 1,
        sort
      })

      expect(content.map((n) => n.aggregateId)).toEqual(expectedOrder)
    })

    test('falls back to the arrivalDate,desc default when sort is omitted', async () => {
      const { content } = await insBackendClient.listNotifications('trace', {
        page: 1
      })

      expect(content.map((n) => n.aggregateId)).toEqual([
        'agg-stub-2',
        'agg-stub-1',
        'agg-stub-3'
      ])
    })
  })

  describe('listNotifications visibility', () => {
    test('excludes DELETED-status rows from the results and totals', async () => {
      const result = await insBackendClient.listNotifications('trace', {
        page: 1
      })

      expect(result.content.some((n) => n.status === 'DELETED')).toBe(false)
      expect(result.totalElements).toBe(3)
    })
  })

  describe('listNotifications pagination', () => {
    test('returns all visible rows on page 1 when under one page size', async () => {
      const result = await insBackendClient.listNotifications('trace', {
        page: 1
      })

      expect(result.numberOfElements).toBe(3)
      expect(result.totalElements).toBe(3)
      expect(result.totalPages).toBe(1)
    })

    test('returns an empty page past the last page, preserving totals', async () => {
      const result = await insBackendClient.listNotifications('trace', {
        page: 2
      })

      expect(result.content).toEqual([])
      expect(result.numberOfElements).toBe(0)
      expect(result.totalElements).toBe(3)
      expect(result.totalPages).toBe(1)
      expect(result.page).toBe(2)
    })
  })
})
