import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { sessionAuth } from '../../../../common/test-helpers/session-auth.js'
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
const ADD_ADDRESS_URL = '/address-book/add'
const BUSINESS_NAME = 'Highland Livestock Ltd'
const EMAIL_FORMAT_ERROR = 'Enter an email address in the correct format'

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

const validPayload = {
  name: BUSINESS_NAME,
  addressLine1: "14 Drover's Way",
  townOrCity: 'Inverness',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  phone: '+44 1463 234567',
  email: 'exports@example.com'
}

const ANIMALS_BASE_URL = 'http://localhost:3000'
const HANDSHAKE_QUERY =
  '?journey-type=gbn-ag&notification-id=GBN-AG-26-4F7K2P&fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d&handshake-token=handshake-token-value'
const handshakeFields = {
  'journey-type': 'gbn-ag',
  'notification-id': 'GBN-AG-26-4F7K2P',
  'fulfilment-id': '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d',
  'handshake-token': 'handshake-token-value'
}
const RETURN_URL = `${ANIMALS_BASE_URL}/live-animals/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d&handshake-token=handshake-token-value`

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
    config.set('tradeImportsAnimalsFrontend.baseUrl', ANIMALS_BASE_URL)
    serveCountries(mockCountries)
  })

  test('GET sets Cache-Control: no-store', async () => {
    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-get-cache')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('GET renders the add address details form', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: ADD_ADDRESS_URL,
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
      url: ADD_ADDRESS_URL,
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
          email: [EMAIL_FORMAT_ERROR]
        }
      })

    const { result, statusCode, headers } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-post-api-400'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain(EMAIL_FORMAT_ERROR)
    expect(scope.isDone()).toBe(true)
    expect(headers['cache-control']).toBe('no-store')
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
        name: BUSINESS_NAME
      })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-post-success'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe('/address-book')
    expect(scope.isDone()).toBe(true)
    expect(posted).toMatchObject(validPayload)
    expect(headers['cache-control']).not.toBe('no-store')
  })

  test('POST shows the recoverable-error banner when the address book rejects the save with a server error', async () => {
    addressBookApi()
      .post(ADDRESSES_PATH)
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode, headers } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-post-500'),
      payload: validPayload
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(result).toContain('value="Highland Livestock Ltd"')
    expect(headers['cache-control']).toBe('no-store')
  })

  test('POST sends the trimmed form fields and nothing else to the address book', async () => {
    let posted
    const scope = addressBookApi()
      .post(ADDRESSES_PATH, (body) => {
        posted = body
        return true
      })
      .reply(201, {
        id: '665f1c2ab3e4d51a2c9d0e77',
        name: BUSINESS_NAME
      })

    const { statusCode } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-post-trimmed'),
      payload: {
        ...validPayload,
        name: '  Highland Livestock Ltd  ',
        crumb: 'not-for-the-api'
      }
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(scope.isDone()).toBe(true)
    expect(posted).toEqual({
      ...validPayload,
      addressLine2: '',
      county: ''
    })
  })

  test('POST with invalid data re-renders form with errors', async () => {
    // No address-book interceptor: a request would be refused by nock and
    // surface as a 500, not the 400 asserted here.
    const { result, statusCode, headers } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
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
    expect(result).toContain(
      'Error: Add address details | Import notification service'
    )
    expect(result).toContain('href="#name"')
    expect(result).toContain('Enter a name')
    expect(result).toContain('href="#email"')
    expect(result).toContain(EMAIL_FORMAT_ERROR)
    expect(result).toContain('govuk-error-message')
    expect(headers['cache-control']).toBe('no-store')
  })

  test('Cancel returns to list without creating an address', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-post-cancel'),
      payload: { cancel: 'true' }
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe('/address-book')
    expect(headers['cache-control']).not.toBe('no-store')
  })
})

describe.sequential('#addressBookAddController — journey handshake', () => {
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
    config.set('tradeImportsAnimalsFrontend.baseUrl', ANIMALS_BASE_URL)
    serveCountries(mockCountries)
  })

  test('GET arriving through a journey handshake carries the journey forward in hidden fields and the cancel label', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/address-book/add${HANDSHAKE_QUERY}`,
      auth: sessionAuth('add-get-handshake')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Add address details')
    expect(result).toContain('name="journey-type"')
    expect(result).toContain('value="gbn-ag"')
    expect(result).toContain('name="notification-id"')
    expect(result).toContain('name="fulfilment-id"')
    expect(result).toContain('name="handshake-token"')
    expect(result).toContain('Cancel and return to address page')
    expect(result).not.toContain('Cancel and return to address book')
  })

  test('GET refuses an unrecognised journey type', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add?journey-type=not-a-journey&notification-id=GBN-AG-26-4F7K2P&fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d&handshake-token=handshake-token-value',
      auth: sessionAuth('add-get-unknown-journey')
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('GET rejects an incomplete handshake query', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/add?journey-type=gbn-ag&notification-id=GBN-AG-26-4F7K2P',
      auth: sessionAuth('add-get-incomplete-handshake')
    })

    expect(statusCode).toBe(statusCodes.badRequest)
  })

  test('POST from a handshake returns to the journey with the new address id and no address-book banner', async () => {
    const scope = addressBookApi().post(ADDRESSES_PATH).reply(201, {
      id: '665f1c2ab3e4d51a2c9d0e77',
      name: BUSINESS_NAME
    })

    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-post-handshake'),
      payload: { ...handshakeFields, ...validPayload }
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(
      `${RETURN_URL}&addressId=665f1c2ab3e4d51a2c9d0e77`
    )
    expect(scope.isDone()).toBe(true)
  })

  test('POST from a handshake keeps the journey on the form when the API rejects the address', async () => {
    addressBookApi()
      .post(ADDRESSES_PATH)
      .reply(statusCodes.badRequest, {
        type: 'https://api.cdp.defra.cloud/problems/validation-error',
        errors: {
          email: [EMAIL_FORMAT_ERROR]
        }
      })

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-post-handshake-api-400'),
      payload: { ...handshakeFields, ...validPayload }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain(EMAIL_FORMAT_ERROR)
    expect(result).toContain('name="handshake-token"')
    expect(result).toContain('Cancel and return to address page')
  })

  test('Cancel from a handshake returns to the journey without creating an address', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: ADD_ADDRESS_URL,
      auth: sessionAuth('add-post-handshake-cancel'),
      payload: { cancel: 'true', ...handshakeFields }
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(RETURN_URL)
  })
})
