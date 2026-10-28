import { load } from 'cheerio'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressesApiPath,
  INVALID_ADDRESS_PAYLOAD,
  ORGANISATION_ID_HEADER
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import {
  ORGANISATION_ID,
  sessionAuth
} from '../../../../common/test-helpers/session-auth.js'
import { expectAddressFormWidths } from '../../../../common/test-helpers/expect-address-form-widths.js'
import { expectSummaryLinks } from '../../../../common/test-helpers/expect-address-summary-links.js'
import { openEmptyAddressBookWithCookiesFrom } from '../../../../common/test-helpers/open-empty-address-book-with-cookies.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { config } from '../../../../../config/config.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ADDRESS_BOOK_PATH = '/address-book'
const ADD_ADDRESS_URL = `${ADDRESS_BOOK_PATH}/add`
const COUNTRY_OPTIONS = '#countryCode option'
const BUSINESS_NAME = 'Highland Livestock Ltd'
const EMAIL_FORMAT_ERROR = 'Enter an email address in the correct format'

const mockCountries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'DE', name: 'Germany' }
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
const handshakeFields = {
  'journey-type': 'gbn-ag',
  'notification-id': 'GBN-AG-26-4F7K2P',
  'fulfilment-id': '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d',
  'handshake-token': 'handshake-token-value'
}
const RETURN_URL = `${ANIMALS_BASE_URL}/live-animals/notifications/GBN-AG-26-4F7K2P/address-return?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d&handshake-token=handshake-token-value`

const postAdd = (server, session, payload) =>
  server.inject({
    method: 'POST',
    url: ADD_ADDRESS_URL,
    auth: sessionAuth(session),
    payload
  })

const getAdd = (server, session, query = {}) =>
  server.inject({
    method: 'GET',
    url: `${ADD_ADDRESS_URL}?${new URLSearchParams(query)}`,
    auth: sessionAuth(session)
  })

const SUCCESS_BANNER = '.govuk-notification-banner--success'

const textsOf = ($, selector) =>
  $(selector)
    .map((_, element) => $(element).text().trim())
    .get()

beforeEach(() => {
  config.set('csrf.enabled', false)
  config.set('tradeImportsAnimalsFrontend.baseUrl', ANIMALS_BASE_URL)
})

describe('#addressBookAddController', { concurrent: false }, () => {
  const server = startRealModeServerServingCountries(mockCountries)

  test('GET sets Cache-Control: no-store', async () => {
    const { headers, statusCode } = await getAdd(server(), 'add-get-cache')

    expect(statusCode).toBe(statusCodes.ok)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('GET renders the add address details form with Back and cancel linking to the address book', async () => {
    const saveAndContinue = 'Save and continue'
    const cancelToAddressBook = 'Cancel and return to address book'

    const { result, statusCode } = await getAdd(server(), 'add-get')

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textsOf($, 'h1')).toEqual(['Add address details'])
    expect($('.govuk-back-link').attr('href')).toBe(ADDRESS_BOOK_PATH)
    expect(textsOf($, '.govuk-back-link')).toEqual(['Back'])
    expect(textsOf($, 'form h2')).toEqual(['Address', 'Contact details'])
    expect(textsOf($, 'form label')).toEqual([
      'Name or organisation',
      'Address line 1',
      'Address line 2 (optional)',
      'Town or city',
      'County (optional)',
      'Postcode or Zip code',
      'Country',
      'Email address',
      'Phone number'
    ])
    expect(textsOf($, '#phone-hint')).toEqual([
      'For international numbers include the country code'
    ])
    expect(textsOf($, 'form button')).toEqual([saveAndContinue])
    expect($('form a.govuk-link').attr('href')).toBe(ADDRESS_BOOK_PATH)
    expect(textsOf($, 'form a.govuk-link')).toEqual([cancelToAddressBook])
    expect(result.indexOf(saveAndContinue)).toBeLessThan(
      result.indexOf(cancelToAddressBook)
    )
  })

  test('GET renders country select options from reference data', async () => {
    const { result, statusCode } = await getAdd(server(), 'add-get-countries')

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('value="GB"')
    expect(result).toContain('United Kingdom')
    expect(result).toContain('value="FR"')
    expect(result).toContain('France')
  })

  test('POST re-renders form when API returns 400 validation errors', async () => {
    const scope = addressBookApi()
      .post(addressesApiPath())
      .reply(400, {
        type: 'https://api.cdp.defra.cloud/problems/validation-error',
        errors: {
          email: [EMAIL_FORMAT_ERROR]
        }
      })

    const { result, statusCode, headers } = await postAdd(
      server(),
      'add-post-api-400',
      validPayload
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain(EMAIL_FORMAT_ERROR)
    expect(scope.isDone()).toBe(true)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('POST sends the address to the address book for the organisation and redirects to the address book', async () => {
    let posted
    const scope = addressBookApi()
      .post(addressesApiPath(), (body) => {
        posted = body
        return true
      })
      .matchHeader(ORGANISATION_ID_HEADER, ORGANISATION_ID)
      .reply(201, {
        id: '665f1c2ab3e4d51a2c9d0e77',
        name: BUSINESS_NAME
      })

    const { statusCode, headers } = await postAdd(
      server(),
      'add-post-success',
      validPayload
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
    expect(scope.isDone()).toBe(true)
    expect(posted).toMatchObject(validPayload)
    expect(headers['cache-control']).not.toBe('no-store')
  })

  test('POST shows the address added banner on the address book', async () => {
    addressBookApi().post(addressesApiPath()).reply(201, {
      id: '665f1c2ab3e4d51a2c9d0e77',
      name: BUSINESS_NAME
    })

    const { headers } = await postAdd(server(), 'add-post-banner', validPayload)

    const listResponse = await openEmptyAddressBookWithCookiesFrom(
      server(),
      'add-post-banner',
      headers
    )
    expect(textsOf(load(listResponse.result), SUCCESS_BANNER)).toEqual([
      expect.stringContaining(
        `${BUSINESS_NAME} address added to your address book`
      )
    ])
  })

  test('POST shows the recoverable-error banner when the address book rejects the save with a server error', async () => {
    addressBookApi()
      .post(addressesApiPath())
      .reply(503, { title: 'Service Unavailable' })

    const { result, statusCode, headers } = await postAdd(
      server(),
      'add-post-500',
      validPayload
    )

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
      .post(addressesApiPath(), (body) => {
        posted = body
        return true
      })
      .reply(201, {
        id: '665f1c2ab3e4d51a2c9d0e77',
        name: BUSINESS_NAME
      })

    const { statusCode } = await postAdd(server(), 'add-post-trimmed', {
      ...validPayload,
      name: '  Highland Livestock Ltd  ',
      crumb: 'not-for-the-api'
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
    const { result, statusCode, headers } = await postAdd(
      server(),
      'add-post-invalid',
      INVALID_ADDRESS_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
    expect(result).toContain(
      'Error: Add address details - Import notification service - GOV.UK'
    )
    expect(result).toContain('href="#name"')
    expectSummaryLinks(result)
    expect(result).toContain('href="#email"')
    expect(result).toContain(EMAIL_FORMAT_ERROR)
    expect(result).toContain('govuk-error-message')
    expect(headers['cache-control']).toBe('no-store')
  })

  test('POST with a country the reference data does not list shows the select-a-country error', async () => {
    const { result, statusCode } = await postAdd(
      server(),
      'add-post-unlisted-country',
      {
        ...validPayload,
        countryCode: 'ZZ'
      }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toMatch(/href="#countryCode"[^>]*>\s*Select a country\s*</)
  })

  test('Cancel returns to list without creating an address', async () => {
    const { statusCode, headers } = await postAdd(server(), 'add-post-cancel', {
      cancel: 'true'
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(headers.location).toBe(ADDRESS_BOOK_PATH)
    expect(headers['cache-control']).not.toBe('no-store')
  })
})

describe(
  '#addressBookAddController — journey handshake',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(mockCountries)

    test('GET arriving through a journey handshake carries the journey forward in hidden fields and the cancel label', async () => {
      const { result, statusCode } = await getAdd(
        server(),
        'add-get-handshake',
        handshakeFields
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Add address details')
      expect(result).toContain('name="journey-type"')
      expect(result).toContain('value="gbn-ag"')
      expect(result).toContain('name="notification-id"')
      expect(result).toContain('name="fulfilment-id"')
      expect(result).toContain('name="handshake-token"')
      expect(result).toContain('Cancel and return to address page')
      expect(result).toContain('name="cancel"')
      expect(result).not.toContain('Cancel and return to address book')
      expect(load(result)('#countryCode option[selected]')).toHaveLength(0)
    })

    test('GET through a handshake opens the form without a Back link to the address book', async () => {
      const { result, statusCode } = await getAdd(
        server(),
        'add-get-handshake-no-back',
        handshakeFields
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toContain('govuk-back-link')
    })

    test('GET refuses an unrecognised journey type', async () => {
      const { statusCode } = await getAdd(server(), 'add-get-unknown-journey', {
        ...handshakeFields,
        'journey-type': 'not-a-journey'
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    test('GET rejects an incomplete handshake query', async () => {
      const { statusCode } = await getAdd(
        server(),
        'add-get-incomplete-handshake',
        {
          'journey-type': handshakeFields['journey-type'],
          'notification-id': handshakeFields['notification-id']
        }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
    })

    test('POST from a handshake returns to the journey with the new address id and no address-book banner', async () => {
      const scope = addressBookApi().post(addressesApiPath()).reply(201, {
        id: '665f1c2ab3e4d51a2c9d0e77',
        name: BUSINESS_NAME
      })

      const { statusCode, headers } = await postAdd(
        server(),
        'add-post-handshake',
        { ...handshakeFields, ...validPayload }
      )

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe(
        `${RETURN_URL}&addressId=665f1c2ab3e4d51a2c9d0e77`
      )
      expect(scope.isDone()).toBe(true)

      const listResponse = await openEmptyAddressBookWithCookiesFrom(
        server(),
        'add-post-handshake',
        headers
      )
      expect(load(listResponse.result)(SUCCESS_BANNER)).toHaveLength(0)
    })

    test('POST from a handshake keeps the journey on the form when the API rejects the address', async () => {
      addressBookApi()
        .post(addressesApiPath())
        .reply(statusCodes.badRequest, {
          type: 'https://api.cdp.defra.cloud/problems/validation-error',
          errors: {
            email: [EMAIL_FORMAT_ERROR]
          }
        })

      const { result, statusCode } = await postAdd(
        server(),
        'add-post-handshake-api-400',
        { ...handshakeFields, ...validPayload }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain(EMAIL_FORMAT_ERROR)
      expect(result).toContain('name="handshake-token"')
      expect(result).toContain('Cancel and return to address page')
    })

    test('Cancel from a handshake returns to the journey without creating an address', async () => {
      const { statusCode, headers } = await postAdd(
        server(),
        'add-post-handshake-cancel',
        { cancel: 'true', ...handshakeFields }
      )

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe(RETURN_URL)
    })
  }
)

describe(
  '#addressBookAddController — field layout',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(mockCountries)

    test('GET renders name, address lines and email full width, town, county, postcode and country at one half, and phone at two thirds', async () => {
      const { result } = await getAdd(server(), 'add-get-widths')

      expectAddressFormWidths(result)
    })

    test('GET opens the Country select on its blank first option, Select a country, with nothing selected', async () => {
      const { result, statusCode } = await getAdd(
        server(),
        'add-get-select-one'
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      const firstOption = $(COUNTRY_OPTIONS).first()
      expect(firstOption.attr('value')).toBe('')
      expect(firstOption.text().trim()).toBe('Select a country')
      expect($(COUNTRY_OPTIONS).length).toBeGreaterThan(1)
      expect($('#countryCode option[selected]')).toHaveLength(0)
    })

    test('GET lists the countries by name, not by code, with United Kingdom in its place', async () => {
      const { result } = await getAdd(server(), 'add-get-order')

      const $ = load(result)
      const codes = $(COUNTRY_OPTIONS)
        .map((_, option) => $(option).attr('value'))
        .get()
        .filter(Boolean)

      expect(codes).toEqual(['FR', 'DE', 'CH', 'GB'])
    })
  }
)
