import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  sessionAuth,
  mockOidcConfig
} from '../../../../common/test-helpers/mock-auth.js'
import {
  addressBookApi,
  runInRealMode,
  serveCountries
} from '../../../../common/test-helpers/real-mode.js'
import { config } from '../../../../../config/config.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ORG_ID = '5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88'
const ADDRESSES_PATH = `/organisation/${ORG_ID}/addresses`
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

const validPayload = {
  name: 'Highland Livestock Ltd',
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

describe.sequential('#addressBookAddController', () => {
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
    config.set('csrf.enabled', false)
    serveCountries(mockCountries)
  })

  test('GET renders the add address details form', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('add-get')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Add address details')
    expect(result).toContain('Enter address details')
    expect(result).toContain('Enter contact details')
    expect(result).toContain('Name or organisation name')
    expect(result).toContain('Postcode or Zip code')
    expect(result).toContain('Phone number')
    expect(result).toContain(
      'For international numbers include the country code'
    )
    expect(result).toContain('Save and continue')
    expect(result).toContain('Cancel and return to address book')
    expect(result).not.toContain('operator')
    expect(result).not.toContain('Save changes')
  })

  test('GET renders country select options from reference data', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add',
      auth: sessionAuth('add-get-countries')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('value="GB"')
    expect(result).toContain('United Kingdom')
    expect(result).toContain('value="FR"')
    expect(result).toContain('France')
  })

  test('POST re-renders form when API returns 400 validation errors', async () => {
    const scope = addressBookApi()
      .post(ADDRESSES_PATH)
      .reply(400, {
        type: 'https://api.cdp.defra.cloud/problems/validation-error',
        errors: {
          email: ['Enter an email address in the correct format']
        }
      })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-api-400'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Enter an email address in the correct format')
    expect(scope.isDone()).toBe(true)
  })

  test('POST creates address and redirects with success banner', async () => {
    let posted
    const scope = addressBookApi()
      .post(ADDRESSES_PATH, (body) => {
        posted = body
        return true
      })
      .matchHeader(ORGANISATION_ID_HEADER, ORG_ID)
      .reply(201, {
        id: '665f1c2ab3e4d51a2c9d0e77',
        name: 'Highland Livestock Ltd'
      })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-success'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
    expect(scope.isDone()).toBe(true)
    expect(posted).toMatchObject(validPayload)
  })

  test('POST with invalid data re-renders form with errors', async () => {
    // No address-book interceptor: a request would be refused by nock and
    // surface as a 500, not the 400 asserted here.
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-invalid'),
      payload: {
        name: '',
        addressLine1: '',
        townOrCity: '',
        postcode: '',
        countryCode: '',
        phone: '',
        email: 'bad'
      }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
  })

  test('Cancel returns to list without creating an address', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/address-book/add',
      auth: sessionAuth('add-post-cancel'),
      payload: { cancel: 'true' }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/address-book')
  })
})
