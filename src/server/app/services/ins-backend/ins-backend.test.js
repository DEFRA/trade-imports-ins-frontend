import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import {
  insBackendApi,
  refuseOutboundHttp,
  runInRealMode
} from '../../../common/test-helpers/real-mode.js'
import { listNotifications } from './index.js'

const getTraceIdMock = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: getTraceIdMock
}))

const TRACING_HEADER = config.get('tracing.header')
const TRACE_ID = 'trace-123'
const NOTIFICATIONS_PATH = '/notifications'
const REFERENCE_NUMBER = 'GBN-AG-26-000001'
const OTHER_REFERENCE_NUMBER = 'GBN-AG-26-000002'

const emptyPage = (page) => ({
  content: [],
  page,
  size: 25,
  numberOfElements: 0,
  totalElements: 0,
  totalPages: 0
})

describe('against the real INS backend', () => {
  runInRealMode()

  beforeEach(() => {
    getTraceIdMock.mockReturnValue(TRACE_ID)
  })

  test('Should GET /notifications with the page and the trace header', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ page: '1' })
      .matchHeader(TRACING_HEADER, TRACE_ID)
      .reply(200, {
        content: [{ referenceNumber: REFERENCE_NUMBER }],
        page: 1,
        size: 25,
        numberOfElements: 1,
        totalElements: 1,
        totalPages: 1
      })

    const result = await listNotifications({ page: 1 })

    expect(result.totalElements).toBe(1)
    expect(result.content[0].referenceNumber).toBe(REFERENCE_NUMBER)
    expect(scope.isDone()).toBe(true)
  })

  test('Should forward sort and referenceNumber as query parameters', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({
        page: '2',
        sort: 'arrivalDate,asc',
        referenceNumber: OTHER_REFERENCE_NUMBER
      })
      .reply(200, emptyPage(2))

    await listNotifications({
      page: 2,
      sort: 'arrivalDate,asc',
      referenceNumber: OTHER_REFERENCE_NUMBER
    })

    expect(scope.isDone()).toBe(true)
  })

  test('Should not send an organisation header — the dashboard is deliberately unscoped', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ page: '1' })
      .reply(function replyFn() {
        expect(
          this.req.headers['trade-imports-organisation-id']
        ).toBeUndefined()
        return [200, emptyPage(1)]
      })

    await listNotifications({ page: 1 })

    expect(scope.isDone()).toBe(true)
  })

  test('Should throw with the status and message on a non-2xx response', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ page: '1' })
      .reply(500, { title: 'Internal Server Error' })

    await expect(listNotifications({ page: 1 })).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error'
    })
  })
})

describe('in stub mode', () => {
  refuseOutboundHttp()

  test('Should serve the canned notifications without a request', async () => {
    const { content, totalElements } = await listNotifications({ page: 1 })

    expect(totalElements).toBe(3)
    expect(content.map((n) => n.referenceNumber)).toEqual([
      OTHER_REFERENCE_NUMBER,
      REFERENCE_NUMBER,
      'GBN-AG-26-000003'
    ])
  })
})
