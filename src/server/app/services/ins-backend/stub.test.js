import { describe, expect, test } from 'vitest'

import { listNotifications } from './stub.js'

const STUB_1 = 'agg-stub-1'
const STUB_2 = 'agg-stub-2'
const STUB_3 = 'agg-stub-3'

describe('#listNotifications (stub)', () => {
  describe('listNotifications sorting', () => {
    test.each([
      ['arrivalDate,desc', [STUB_2, STUB_1, STUB_3]],
      ['arrivalDate,asc', [STUB_3, STUB_1, STUB_2]],
      ['lastUpdated,desc', [STUB_3, STUB_2, STUB_1]],
      ['lastUpdated,asc', [STUB_1, STUB_2, STUB_3]]
    ])('sorts by %s', async (sort, expectedOrder) => {
      const { content } = await listNotifications({
        page: 1,
        sort
      })

      expect(content.map((n) => n.aggregateId)).toEqual(expectedOrder)
    })

    test('falls back to the arrivalDate,desc default when sort is omitted', async () => {
      const { content } = await listNotifications({
        page: 1
      })

      expect(content.map((n) => n.aggregateId)).toEqual([
        STUB_2,
        STUB_1,
        STUB_3
      ])
    })
  })

  describe('listNotifications date shapes', () => {
    test('returns arrivalDate as an ISO date and lastUpdated as a UTC instant', async () => {
      const { content } = await listNotifications({ page: 1 })

      expect(
        content.map(({ arrivalDate, lastUpdated }) => ({
          arrivalDate,
          lastUpdated
        }))
      ).toEqual([
        { arrivalDate: '2026-09-12', lastUpdated: '2026-09-04T11:30:00Z' },
        { arrivalDate: '2026-09-10', lastUpdated: '2026-09-03T09:00:00Z' },
        { arrivalDate: '2026-09-08', lastUpdated: '2026-09-06T08:15:00Z' }
      ])
    })
  })

  describe('listNotifications visibility', () => {
    test('excludes DELETED-status rows from the results and totals', async () => {
      const result = await listNotifications({
        page: 1
      })

      expect(result.content.some((n) => n.status === 'DELETED')).toBe(false)
      expect(result.totalElements).toBe(3)
    })
  })

  describe('listNotifications pagination', () => {
    test('returns all visible rows on page 1 when under one page size', async () => {
      const result = await listNotifications({
        page: 1
      })

      expect(result.numberOfElements).toBe(3)
      expect(result.totalElements).toBe(3)
      expect(result.totalPages).toBe(1)
    })

    test('returns an empty page past the last page, preserving totals', async () => {
      const result = await listNotifications({
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
