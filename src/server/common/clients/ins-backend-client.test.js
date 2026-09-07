import nock from 'nock'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { insBackendClient } from './ins-backend-client.js'

vi.mock('#/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsInsBackendApi.baseUrl') {
        return 'http://localhost:8090'
      }
      if (key === 'tracing.header') {
        return 'x-cdp-request-id'
      }
      return undefined
    })
  }
}))

describe('#insBackendClient', () => {
  const traceId = 'trace-123'

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('listNotifications', () => {
    test('GETs /notifications with page and default headers, no organisation header', async () => {
      const scope = nock('http://localhost:8090')
        .get('/notifications')
        .query({ page: '1' })
        .matchHeader('x-cdp-request-id', traceId)
        .reply(200, {
          content: [{ referenceNumber: 'GBN-AG-26-000001' }],
          page: 1,
          size: 25,
          numberOfElements: 1,
          totalElements: 1,
          totalPages: 1
        })

      const result = await insBackendClient.listNotifications(traceId, {
        page: 1
      })

      expect(result.totalElements).toBe(1)
      expect(result.content[0].referenceNumber).toBe('GBN-AG-26-000001')
      expect(scope.isDone()).toBe(true)
    })

    test('forwards sort and referenceNumber query params', async () => {
      const scope = nock('http://localhost:8090')
        .get('/notifications')
        .query({ page: '2', sort: 'arrivalDate,asc', referenceNumber: 'GBN-AG-26-000002' })
        .reply(200, {
          content: [],
          page: 2,
          size: 25,
          numberOfElements: 0,
          totalElements: 0,
          totalPages: 0
        })

      await insBackendClient.listNotifications(traceId, {
        page: 2,
        sort: 'arrivalDate,asc',
        referenceNumber: 'GBN-AG-26-000002'
      })

      expect(scope.isDone()).toBe(true)
    })

    test('does not send an organisation header — the dashboard is deliberately unscoped', async () => {
      const scope = nock('http://localhost:8090')
        .get('/notifications')
        .query({ page: '1' })
        .reply(function replyFn() {
          expect(this.req.headers['trade-imports-organisation-id']).toBeUndefined()
          return [200, { content: [], page: 1, size: 25, numberOfElements: 0, totalElements: 0, totalPages: 0 }]
        })

      await insBackendClient.listNotifications(traceId, { page: 1 })

      expect(scope.isDone()).toBe(true)
    })

    test('throws with status and message on a non-2xx response', async () => {
      nock('http://localhost:8090')
        .get('/notifications')
        .query({ page: '1' })
        .reply(500, { title: 'Internal Server Error' })

      await expect(
        insBackendClient.listNotifications(traceId, { page: 1 })
      ).rejects.toMatchObject({ status: 500, message: 'Internal Server Error' })
    })
  })
})
