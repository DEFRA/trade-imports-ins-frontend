import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '#/server/common/test-helpers/mock-auth.js'
import { insBackendClient } from '#/server/common/clients/ins-backend-client.js'

vi.mock('#/auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock(
  '#/server/common/clients/ins-backend-client.js',
  () => import('#/server/common/clients/__mocks__/ins-backend-client.js')
)

vi.mock('#/server/common/clients/countries-client.js', () => ({
  countriesClient: {
    getCountries: vi.fn().mockResolvedValue([
      { code: 'GB', name: 'United Kingdom' },
      { code: 'FR', name: 'France' }
    ])
  }
}))

function pageOf(content, overrides = {}) {
  return {
    content,
    page: 1,
    size: 25,
    numberOfElements: content.length,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...overrides
  }
}

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.mocked(insBackendClient.listNotifications).mockReset()
  })

  test('renders notifications with reference, status, origin, commodity and arrival date', async () => {
    insBackendClient.listNotifications.mockResolvedValue(
      pageOf([
        {
          referenceNumber: 'GBN-AG-26-000001',
          status: 'SUBMITTED',
          originCountry: 'FR',
          commodity: null,
          arrivalDate: '2026-09-10T00:00:00Z'
        }
      ])
    )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-with-notifications')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Dashboard')
    expect(result).toContain('GBN-AG-26-000001')
    expect(result).toContain('SUBMITTED')
    expect(result).toContain('France')
    expect(result).not.toContain('>FR<')
    expect(result).toContain('10 Sep 2026')
    expect(result).toContain('Showing 1-1 of 1')
  })

  test('notifications from more than one status all appear in the same list (AC2)', async () => {
    insBackendClient.listNotifications.mockResolvedValue(
      pageOf([
        {
          referenceNumber: 'GBN-AG-26-000001',
          status: 'SUBMITTED',
          originCountry: 'GB',
          arrivalDate: '2026-09-10T00:00:00Z'
        },
        {
          referenceNumber: 'GBN-AG-26-000002',
          status: 'DRAFT',
          originCountry: 'GB',
          arrivalDate: '2026-09-11T00:00:00Z'
        }
      ], { totalElements: 2, totalPages: 1 })
    )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-two-statuses')
    })

    expect(result).toContain('GBN-AG-26-000001')
    expect(result).toContain('GBN-AG-26-000002')
  })

  test('selecting a submitted notification links into the notification-view page (AC3)', async () => {
    insBackendClient.listNotifications.mockResolvedValue(
      pageOf([
        {
          referenceNumber: 'GBN-AG-26-000001',
          status: 'SUBMITTED',
          originCountry: 'GB',
          arrivalDate: '2026-09-10T00:00:00Z'
        }
      ])
    )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-submitted-link')
    })

    expect(result).toContain(
      'href="http://localhost:3000/notifications/GBN-AG-26-000001/notification-view"'
    )
  })

  test('selecting a draft notification links back into the journey hub, not notification-view (AC3)', async () => {
    insBackendClient.listNotifications.mockResolvedValue(
      pageOf([
        {
          referenceNumber: 'GBN-AG-26-000002',
          status: 'DRAFT',
          originCountry: 'GB',
          arrivalDate: '2026-09-10T00:00:00Z'
        }
      ])
    )

    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-draft-link')
    })

    expect(result).toContain('href="http://localhost:3000/notifications/GBN-AG-26-000002"')
    expect(result).not.toContain('notification-view')
  })

  test('searching by complete reference returns only the matching notification (AC4)', async () => {
    insBackendClient.listNotifications.mockResolvedValue(
      pageOf([
        {
          referenceNumber: 'GBN-AG-26-000001',
          status: 'SUBMITTED',
          originCountry: 'GB',
          arrivalDate: '2026-09-10T00:00:00Z'
        }
      ])
    )

    const { result } = await server.inject({
      method: 'GET',
      url: '/?referenceNumber=GBN-AG-26-000001',
      auth: sessionAuth('dashboard-search-match')
    })

    expect(insBackendClient.listNotifications).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ referenceNumber: 'GBN-AG-26-000001' })
    )
    expect(result).toContain('GBN-AG-26-000001')
  })

  test('no matching notification shows "No notifications found" (AC5)', async () => {
    insBackendClient.listNotifications.mockResolvedValue(pageOf([]))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/?referenceNumber=GBN-AG-26-999999',
      auth: sessionAuth('dashboard-search-no-match')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No notifications found')
  })

  test('empty aggregated store shows an empty state with a way to start a new notification (AC6)', async () => {
    insBackendClient.listNotifications.mockResolvedValue(pageOf([]))

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

  test('sort and referenceNumber are forwarded to the backend client', async () => {
    insBackendClient.listNotifications.mockResolvedValue(pageOf([]))

    await server.inject({
      method: 'GET',
      url: '/?sort=lastUpdated,asc&referenceNumber=GBN-AG-26-000001',
      auth: sessionAuth('dashboard-sort-forward')
    })

    expect(insBackendClient.listNotifications).toHaveBeenCalledWith(
      expect.any(String),
      { page: 1, sort: 'lastUpdated,asc', referenceNumber: 'GBN-AG-26-000001' }
    )
  })

  test('an unrecognised sort value falls back to the default rather than reaching the backend', async () => {
    insBackendClient.listNotifications.mockResolvedValue(pageOf([]))

    await server.inject({
      method: 'GET',
      url: '/?sort=not-a-real-option',
      auth: sessionAuth('dashboard-sort-invalid')
    })

    expect(insBackendClient.listNotifications).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sort: 'arrivalDate,desc' })
    )
  })

  test('shows an error page when the backend call fails', async () => {
    insBackendClient.listNotifications.mockRejectedValue(new Error('boom'))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-error')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('Something went wrong loading the dashboard')
  })
})
