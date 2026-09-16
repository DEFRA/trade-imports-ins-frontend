import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../../server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../common/test-helpers/session-auth.js'
import {
  insBackendApi,
  runInRealMode,
  serveCountries
} from '../../../common/test-helpers/real-mode.js'

vi.mock('../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const NOTIFICATIONS_PATH = '/notifications'
const DEFAULT_QUERY = { page: '1', sort: 'arrivalDate,desc' }
const REFERENCE_NUMBER = 'GBN-AG-26-000001'
const OTHER_REFERENCE_NUMBER = 'GBN-AG-26-000002'
const ARRIVAL_DATE = '2026-09-10T00:00:00Z'

const pageOf = (content, overrides = {}) => ({
  content,
  page: 1,
  size: 25,
  numberOfElements: content.length,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  ...overrides
})

describe('#dashboard', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    serveCountries([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' }
    ])
  })

  test('renders notifications with reference, status, origin, commodity and arrival date', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: REFERENCE_NUMBER,
            status: 'SUBMITTED',
            originCountry: 'FR',
            commodity: null,
            arrivalDate: ARRIVAL_DATE
          }
        ])
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-with-notifications')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('govuk-grid-column-full')
    expect(result).toContain('Dashboard')
    expect(result).toContain(REFERENCE_NUMBER)
    expect(result).toContain('SUBMITTED')
    expect(result).toContain('France')
    expect(result).not.toContain('>FR<')
    expect(result).toContain('10 Sep 2026')
    expect(result).toContain('Showing 1-1 of 1')
  })

  test('notifications from more than one status all appear in the same list (AC2)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf(
          [
            {
              referenceNumber: REFERENCE_NUMBER,
              status: 'SUBMITTED',
              originCountry: 'GB',
              arrivalDate: ARRIVAL_DATE
            },
            {
              referenceNumber: OTHER_REFERENCE_NUMBER,
              status: 'DRAFT',
              originCountry: 'GB',
              arrivalDate: '2026-09-11T00:00:00Z'
            }
          ],
          { totalElements: 2, totalPages: 1 }
        )
      )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-two-statuses')
    })

    expect(result).toContain(REFERENCE_NUMBER)
    expect(result).toContain(OTHER_REFERENCE_NUMBER)
  })

  test('selecting a submitted notification links into the notification-view page (AC3)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: REFERENCE_NUMBER,
            status: 'SUBMITTED',
            originCountry: 'GB',
            arrivalDate: ARRIVAL_DATE
          }
        ])
      )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-submitted-link')
    })

    expect(result).toContain(
      `href="http://localhost:3000/notifications/${REFERENCE_NUMBER}/notification-view"`
    )
  })

  test('selecting a draft notification links back into the journey hub, not notification-view (AC3)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: OTHER_REFERENCE_NUMBER,
            status: 'DRAFT',
            originCountry: 'GB',
            arrivalDate: ARRIVAL_DATE
          }
        ])
      )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-draft-link')
    })

    expect(result).toContain(
      `href="http://localhost:3000/notifications/${OTHER_REFERENCE_NUMBER}"`
    )
    expect(result).not.toContain('notification-view')
  })
})

describe('#dashboard — search, sort and errors', () => {
  let server

  runInRealMode()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    serveCountries([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' }
    ])
  })

  test('searching by complete reference returns only the matching notification (AC4)', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ ...DEFAULT_QUERY, referenceNumber: REFERENCE_NUMBER })
      .reply(
        200,
        pageOf([
          {
            referenceNumber: REFERENCE_NUMBER,
            status: 'SUBMITTED',
            originCountry: 'GB',
            arrivalDate: ARRIVAL_DATE
          }
        ])
      )

    const { result } = await server.inject({
      method: 'GET',
      url: `/?referenceNumber=${REFERENCE_NUMBER}`,
      auth: sessionAuth('dashboard-search-match')
    })

    expect(scope.isDone()).toBe(true)
    expect(result).toContain(REFERENCE_NUMBER)
  })

  test('no matching notification shows "No notifications found" (AC5)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ ...DEFAULT_QUERY, referenceNumber: 'GBN-AG-26-999999' })
      .reply(200, pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/?referenceNumber=GBN-AG-26-999999',
      auth: sessionAuth('dashboard-search-no-match')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No notifications found')
  })

  test('empty aggregated store shows an empty state with a way to start a new notification (AC6)', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(200, pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-empty-store')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('There are no notifications yet.')
    expect(result).toContain('Start a new notification')
    expect(result).toContain('href="http://localhost:3000"')
    expect(result).not.toContain('No notifications found')
  })

  test('sort and referenceNumber are forwarded to the backend', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({
        page: '1',
        sort: 'lastUpdated,asc',
        referenceNumber: REFERENCE_NUMBER
      })
      .reply(200, pageOf([]))

    await server.inject({
      method: 'GET',
      url: `/?sort=lastUpdated,asc&referenceNumber=${REFERENCE_NUMBER}`,
      auth: sessionAuth('dashboard-sort-forward')
    })

    expect(scope.isDone()).toBe(true)
  })

  test('an unrecognised sort value falls back to the default rather than reaching the backend', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(200, pageOf([]))

    await server.inject({
      method: 'GET',
      url: '/?sort=not-a-real-option',
      auth: sessionAuth('dashboard-sort-invalid')
    })

    expect(scope.isDone()).toBe(true)
  })

  test('shows the recoverable-error banner when the backend call fails', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(500, { title: 'Internal Server Error' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-error')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(result).not.toContain('govuk-error-summary')
  })
})
