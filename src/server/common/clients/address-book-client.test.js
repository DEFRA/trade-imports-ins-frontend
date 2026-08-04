import nock from 'nock'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  addressBookClient,
  mapApiErrorsToFormErrors,
  ORGANISATION_ID_HEADER
} from './address-book-client.js'

vi.mock('#/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsAddressBookApi.baseUrl') {
        return 'http://localhost:8089'
      }
      if (key === 'tracing.header') {
        return 'x-cdp-request-id'
      }
      return undefined
    })
  }
}))

vi.mock('#/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ error: vi.fn() })
}))

describe('#addressBookClient', () => {
  const orgId = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
  const traceId = 'trace-123'

  beforeEach(() => {
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('listAddresses', () => {
    test('GETs org path with organisation header and parses camelCase envelope', async () => {
      const scope = nock('http://localhost:8089')
        .get(`/organisation/${orgId}/addresses`)
        .query({ page: '1' })
        .matchHeader(ORGANISATION_ID_HEADER, orgId)
        .matchHeader('x-cdp-request-id', traceId)
        .reply(200, {
          items: [{ id: 'abc', name: 'Farm', addressLine1: '1 Road' }],
          page: 1,
          pageSize: 25,
          totalItems: 1,
          totalPages: 1
        })

      const result = await addressBookClient.listAddresses(orgId, traceId, {
        page: 1
      })

      expect(result.pageSize).toBe(25)
      expect(result.totalItems).toBe(1)
      expect(result.items[0].addressLine1).toBe('1 Road')
      expect(scope.isDone()).toBe(true)
    })

    test('forwards q and countryCode query params', async () => {
      const scope = nock('http://localhost:8089')
        .get(`/organisation/${orgId}/addresses`)
        .query({ page: '1', q: 'France', countryCode: 'FR' })
        .matchHeader(ORGANISATION_ID_HEADER, orgId)
        .reply(200, {
          items: [],
          page: 1,
          pageSize: 25,
          totalItems: 0,
          totalPages: 0
        })

      await addressBookClient.listAddresses(orgId, traceId, {
        page: 1,
        q: 'France',
        countryCode: 'FR'
      })

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('createAddress', () => {
    test('POSTs camelCase body with org header and returns created address', async () => {
      const body = {
        name: 'Highland Livestock Ltd',
        addressLine1: "14 Drover's Way",
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH',
        countryCode: 'GB',
        phone: '+44 1463 234567',
        email: 'exports@example.com'
      }

      const scope = nock('http://localhost:8089')
        .post(`/organisation/${orgId}/addresses`, body)
        .matchHeader(ORGANISATION_ID_HEADER, orgId)
        .reply(201, { id: '665f1c2ab3e4d51a2c9d0e77', ...body })

      const result = await addressBookClient.createAddress(orgId, traceId, body)

      expect(result.id).toBe('665f1c2ab3e4d51a2c9d0e77')
      expect(scope.isDone()).toBe(true)
    })

    test('throws 400 validation problem with status and body.errors', async () => {
      const body = {
        name: 'Highland Livestock Ltd',
        addressLine1: "14 Drover's Way",
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH',
        countryCode: 'GB',
        phone: '+44 1463 234567',
        email: 'bad'
      }

      nock('http://localhost:8089')
        .post(`/organisation/${orgId}/addresses`, body)
        .matchHeader(ORGANISATION_ID_HEADER, orgId)
        .reply(400, {
          type: 'https://api.cdp.defra.cloud/problems/validation-error',
          errors: {
            email: ['Enter an email address in the correct format']
          }
        })

      await expect(
        addressBookClient.createAddress(orgId, traceId, body)
      ).rejects.toMatchObject({
        status: 400,
        body: {
          errors: {
            email: ['Enter an email address in the correct format']
          }
        }
      })
    })
  })

  describe('getAddress', () => {
    test('GETs by-id path with organisation header', async () => {
      const addressId = '665f1c2ab3e4d51a2c9d0e77'
      const scope = nock('http://localhost:8089')
        .get(`/organisation/${orgId}/addresses/${addressId}`)
        .matchHeader(ORGANISATION_ID_HEADER, orgId)
        .matchHeader('x-cdp-request-id', traceId)
        .reply(200, {
          id: addressId,
          name: 'Highland Livestock Ltd',
          addressLine1: "14 Drover's Way",
          townOrCity: 'Inverness',
          postcode: 'IV2 3JH',
          countryCode: 'GB',
          phone: '+44 1463 234567',
          email: 'exports@example.com',
          deleted: false
        })

      const result = await addressBookClient.getAddress(
        orgId,
        traceId,
        addressId
      )

      expect(result.name).toBe('Highland Livestock Ltd')
      expect(result.deleted).toBe(false)
      expect(scope.isDone()).toBe(true)
    })
  })

  describe('updateAddress', () => {
    test('PUTs camelCase body with org header and returns updated address', async () => {
      const addressId = '665f1c2ab3e4d51a2c9d0e77'
      const body = {
        name: 'Highland Livestock Ltd',
        addressLine1: "14 Drover's Way",
        addressLine2: '',
        townOrCity: 'Inverness',
        county: '',
        postcode: 'IV2 3JH',
        countryCode: 'GB',
        phone: '+44 1463 234567',
        email: 'exports@example.com'
      }

      const scope = nock('http://localhost:8089')
        .put(`/organisation/${orgId}/addresses/${addressId}`, body)
        .matchHeader(ORGANISATION_ID_HEADER, orgId)
        .reply(200, { id: addressId, ...body })

      const result = await addressBookClient.updateAddress(
        orgId,
        traceId,
        addressId,
        body
      )

      expect(result.id).toBe(addressId)
      expect(scope.isDone()).toBe(true)
    })

    test('throws 400 validation problem with status and body.errors', async () => {
      const addressId = '665f1c2ab3e4d51a2c9d0e77'
      const body = {
        name: 'Highland Livestock Ltd',
        addressLine1: "14 Drover's Way",
        addressLine2: '',
        townOrCity: 'Inverness',
        county: '',
        postcode: 'IV2 3JH',
        countryCode: 'GB',
        phone: '+44 1463 234567',
        email: 'bad'
      }

      nock('http://localhost:8089')
        .put(`/organisation/${orgId}/addresses/${addressId}`, body)
        .matchHeader(ORGANISATION_ID_HEADER, orgId)
        .reply(400, {
          type: 'https://api.cdp.defra.cloud/problems/validation-error',
          errors: {
            email: ['Enter an email address in the correct format']
          }
        })

      await expect(
        addressBookClient.updateAddress(orgId, traceId, addressId, body)
      ).rejects.toMatchObject({
        status: 400,
        body: {
          errors: {
            email: ['Enter an email address in the correct format']
          }
        }
      })
    })
  })

  describe('deleteAddress', () => {
    test('DELETEs by-id path with organisation header', async () => {
      const addressId = '665f1c2ab3e4d51a2c9d0e77'
      const scope = nock('http://localhost:8089')
        .delete(`/organisation/${orgId}/addresses/${addressId}`)
        .matchHeader(ORGANISATION_ID_HEADER, orgId)
        .reply(204)

      await addressBookClient.deleteAddress(orgId, traceId, addressId)

      expect(scope.isDone()).toBe(true)
    })
  })

  describe('error handling', () => {
    test('surfaces Spring Boot 404 message when detail is absent', async () => {
      nock('http://localhost:8089')
        .get(`/organisation/${orgId}/addresses`)
        .query({ page: '1' })
        .reply(404, {
          message: 'No static resource organisation/5900001/addresses.'
        })

      await expect(
        addressBookClient.listAddresses(orgId, traceId)
      ).rejects.toMatchObject({
        message: 'No static resource organisation/5900001/addresses.',
        status: 404
      })
    })
  })

  describe('mapApiErrorsToFormErrors', () => {
    test('maps camelCase problem errors to form errors', () => {
      const result = mapApiErrorsToFormErrors({
        errors: {
          addressLine1: ['Enter address line 1'],
          email: ['Enter an email address in the correct format']
        }
      })

      expect(result.errorList).toEqual([
        { text: 'Enter address line 1', href: '#addressLine1' },
        {
          text: 'Enter an email address in the correct format',
          href: '#email'
        }
      ])
      expect(result.fieldErrors.email.text).toBe(
        'Enter an email address in the correct format'
      )
    })
  })
})
