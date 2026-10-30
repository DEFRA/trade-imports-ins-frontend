import { load } from 'cheerio'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADD_ADDRESS_PATH,
  ADDRESS_BOOK_PATH,
  ADDRESS_FORM_LABELS,
  ADDRESS_ID,
  BACK_LINK,
  addressesApiPath,
  COUNTRIES,
  COUNTRY_OPTIONS,
  expectRedirectTo,
  getPage,
  INVALID_ADDRESS_PAYLOAD,
  postPage,
  serveAddressCreated,
  SELECTED_COUNTRY,
  serveAddressCreationCapturingBody,
  STORED_ADDRESS,
  VALID_ADDRESS_PAYLOAD
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import {
  expectDraftJourneyStrip,
  JOURNEY_STRIP
} from '../../../../common/test-helpers/expect-draft-journey-strip.js'
import { expectAddressFormAutocomplete } from '../../../../common/test-helpers/expect-address-form-autocomplete.js'
import { expectAddressFormWidths } from '../../../../common/test-helpers/expect-address-form-widths.js'
import {
  ANIMALS_BASE_URL,
  ANY_COUNTRY_ROLES,
  CONSIGNMENT_CONTACT_HANDSHAKE,
  JOURNEY_HANDSHAKES_BY_ROLE,
  UNITED_KINGDOM_ROLES
} from '../../../../common/test-helpers/journey-handshake.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { ADDRESS_LANDING } from '../journey-registry.js'
import {
  expectPlaceholderThenCountriesNoneSelected,
  expectUnitedKingdomAloneSelected
} from '../../../../common/test-helpers/expect-add-form-country-select.js'
import {
  expectSummaryAndFieldErrors,
  expectSummaryLinks,
  REQUIRED_MESSAGES
} from '../../../../common/test-helpers/expect-address-form-errors.js'
import { openEmptyAddressBookWithCookiesFrom } from '../../../../common/test-helpers/open-empty-address-book-with-cookies.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { config } from '../../../../../config/config.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const EMAIL_FORMAT_ERROR = 'Enter an email address in the correct format'

const { consignor: CONSIGNOR_HANDSHAKE, consignee: CONSIGNEE_HANDSHAKE } =
  JOURNEY_HANDSHAKES_BY_ROLE
const NOTIFICATION_RETURN_PATH = `${ANIMALS_BASE_URL}/live-animals/notifications/GBN-AG-26-4F7K2P/address-return`
const CONSIGNOR_RETURN_URL = `${NOTIFICATION_RETURN_PATH}?fulfilment-id=9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d&handshake-token=handshake-token-value`
const CONSIGNEE_RETURN_URL = `${NOTIFICATION_RETURN_PATH}?fulfilment-id=abe2f3a4-b5c6-4d71-8e2d-af0a1b2c3d4e&handshake-token=handshake-token-value`
const CONTACT_RETURN_URL = `${NOTIFICATION_RETURN_PATH}?fulfilment-id=f037e8f9-a0b1-4c26-8d72-fe5f60718293&handshake-token=handshake-token-value`
const HAND_BACK_MESSAGE = 'Address handed back to the journey'
const CANCEL_HAND_BACK_MESSAGE = 'Cancel handed back to the journey'
const CAPTION_SELECTOR = '.govuk-caption-l'
const FORM_LABELS = 'form label'
const FORM_LINK = 'form a.govuk-link'
const ADD_TITLE = 'Add address and contact details'

const postAdd = (server, sessionId, payload) =>
  postPage(server, ADD_ADDRESS_PATH, sessionId, payload)

const getAdd = (server, sessionId, query = {}) =>
  getPage(
    server,
    `${ADD_ADDRESS_PATH}?${new URLSearchParams(query)}`,
    sessionId
  )

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
  const server = startRealModeServerServingCountries(COUNTRIES)

  test('GET sets Cache-Control: no-store', async () => {
    const { headers, statusCode } = await getAdd(server(), 'add-get-cache')

    expect(statusCode).toBe(statusCodes.ok)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('GET renders the add address and contact details page with its caption, no status tag, and Back and cancel linking to the address book', async () => {
    const saveAndContinue = 'Save and continue'
    const cancelToAddressBook = 'Cancel and return to address book'

    const { result, statusCode } = await getAdd(server(), 'add-get')

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textsOf($, 'h1')).toEqual([ADD_TITLE])
    expect(textsOf($, CAPTION_SELECTOR)).toEqual(['Add new address'])
    expect($(CAPTION_SELECTOR).next().is('h1')).toBe(true)
    expect($(JOURNEY_STRIP)).toHaveLength(0)
    expect($('main .govuk-tag')).toHaveLength(0)
    expect($(BACK_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
    expect(textsOf($, BACK_LINK)).toEqual(['Back'])
    expect(textsOf($, 'form h2')).toEqual(['Address', 'Contact details'])
    expect(textsOf($, FORM_LABELS)).toEqual(ADDRESS_FORM_LABELS)
    expect(textsOf($, '#phone-hint')).toEqual([
      'For international numbers include the country code'
    ])
    expect(textsOf($, 'form button')).toEqual([saveAndContinue])
    expect($(FORM_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
    expect(textsOf($, FORM_LINK)).toEqual([cancelToAddressBook])
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
      VALID_ADDRESS_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain(EMAIL_FORMAT_ERROR)
    expect(scope.isDone()).toBe(true)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('POST sends the address to the address book for the organisation and redirects to the address book', async () => {
    const { scope, captured } = serveAddressCreationCapturingBody()

    const response = await postAdd(
      server(),
      'add-post-success',
      VALID_ADDRESS_PAYLOAD
    )

    expectRedirectTo(response, ADDRESS_BOOK_PATH)
    expect(scope.isDone()).toBe(true)
    expect(captured.body).toMatchObject(VALID_ADDRESS_PAYLOAD)
    expect(response.headers['cache-control']).not.toBe('no-store')
  })

  test('POST shows the address added banner on the address book', async () => {
    serveAddressCreated()

    const { headers } = await postAdd(
      server(),
      'add-post-banner',
      VALID_ADDRESS_PAYLOAD
    )

    const listResponse = await openEmptyAddressBookWithCookiesFrom(
      server(),
      'add-post-banner',
      headers
    )
    expect(textsOf(load(listResponse.result), SUCCESS_BANNER)).toEqual([
      expect.stringContaining(
        `${STORED_ADDRESS.name} address added to your address book`
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
      VALID_ADDRESS_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expect(result).toContain(`value="${STORED_ADDRESS.name}"`)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('POST sends the trimmed form fields and nothing else to the address book', async () => {
    const { scope, captured } = serveAddressCreationCapturingBody()

    const { addressLine2, county, ...requiredFields } = VALID_ADDRESS_PAYLOAD

    const { statusCode } = await postAdd(server(), 'add-post-trimmed', {
      ...requiredFields,
      name: `  ${STORED_ADDRESS.name}  `,
      crumb: 'not-for-the-api'
    })

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(scope.isDone()).toBe(true)
    expect(captured.body).toEqual({
      ...requiredFields,
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
      `Error: ${ADD_TITLE} - Import notification service - GOV.UK`
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
        ...VALID_ADDRESS_PAYLOAD,
        countryCode: 'ZZ'
      }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toMatch(/href="#countryCode"[^>]*>\s*Select a country\s*</)
  })

  test('Cancel returns to list without creating an address', async () => {
    const response = await postAdd(server(), 'add-post-cancel', {
      cancel: 'true'
    })

    expectRedirectTo(response, ADDRESS_BOOK_PATH)
    expect(response.headers['cache-control']).not.toBe('no-store')
  })
})

const buttonsOf = ($) =>
  $('form button')
    .map((_, button) => ({
      text: $(button).text().trim(),
      name: $(button).attr('name') ?? null,
      value: $(button).attr('value') ?? null,
      secondary: $(button).hasClass('govuk-button--secondary')
    }))
    .get()

describe(
  '#addressBookAddController — journey handshake page',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)

    test('GET from a role handshake offers Save and select, Save and return to address page and a Cancel and return to hub link, and carries the journey forward in hidden fields', async () => {
      const { result, statusCode } = await getAdd(
        server(),
        'add-get-handshake',
        CONSIGNOR_HANDSHAKE
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect(buttonsOf($)).toEqual([
        {
          text: 'Save and select',
          name: 'action',
          value: ADDRESS_LANDING.SELECT,
          secondary: false
        },
        {
          text: 'Save and return to address page',
          name: 'action',
          value: ADDRESS_LANDING.RETURN,
          secondary: true
        }
      ])
      expect(textsOf($, FORM_LINK)).toEqual(['Cancel and return to hub'])
      expect($(FORM_LINK).attr('href')).toBe(
        `${CONSIGNOR_RETURN_URL}&landing=cancel`
      )
      expect(
        $('form input[type="hidden"]')
          .map((_, input) => [[$(input).attr('name'), $(input).attr('value')]])
          .get()
      ).toEqual([['crumb', ''], ...Object.entries(CONSIGNOR_HANDSHAKE)])
    })

    test('GET from the consignment contact handshake offers Save and continue and a Cancel and return to address page button, and a Back link to the journey return with no address and no landing', async () => {
      const { result, statusCode } = await getAdd(
        server(),
        'add-get-handshake-contact',
        CONSIGNMENT_CONTACT_HANDSHAKE
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect(buttonsOf($)).toEqual([
        {
          text: 'Save and continue',
          name: null,
          value: null,
          secondary: false
        },
        {
          text: 'Cancel and return to address page',
          name: 'cancel',
          value: 'true',
          secondary: true
        }
      ])
      expect($(FORM_LINK)).toHaveLength(0)
      expect($(BACK_LINK).attr('href')).toBe(CONTACT_RETURN_URL)
    })

    test('GET arriving through a journey handshake shows the page title, the blue Draft status and notification reference above the caption and heading, then the section headings and every field label', async () => {
      const { result, statusCode } = await getAdd(
        server(),
        'add-get-handshake-frame',
        CONSIGNOR_HANDSHAKE
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('head title').text().trim()).toBe(
        `${ADD_TITLE} - Import notification service - GOV.UK`
      )
      expectDraftJourneyStrip($, CONSIGNOR_HANDSHAKE['notification-id'])
      expect($(`${JOURNEY_STRIP} .govuk-tag`).hasClass('govuk-tag--blue')).toBe(
        true
      )
      expect($(JOURNEY_STRIP).nextAll(CAPTION_SELECTOR)).toHaveLength(1)
      expect(textsOf($, CAPTION_SELECTOR)).toEqual(['Add new address'])
      expect(textsOf($, 'h1')).toEqual([ADD_TITLE])
      expect(textsOf($, 'form h2')).toEqual(['Address', 'Contact details'])
      expect(textsOf($, FORM_LABELS)).toEqual(ADDRESS_FORM_LABELS)
    })

    test('GET from a role handshake links Back to the journey return with no address and no landing', async () => {
      const { result, statusCode } = await getAdd(
        server(),
        'add-get-handshake-back',
        CONSIGNOR_HANDSHAKE
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(load(result)(BACK_LINK).attr('href')).toBe(CONSIGNOR_RETURN_URL)
    })
  }
)

describe(
  '#addressBookAddController — journey handshake',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)
    const loggedEntries = []
    let infoSpy

    beforeEach(() => {
      loggedEntries.length = 0
      infoSpy = vi
        .spyOn(createLogger(), 'info')
        .mockImplementation((fields, message) => {
          loggedEntries.push({ fields, message })
        })
    })

    afterEach(() => {
      infoSpy.mockRestore()
    })

    const loggedWith = (message) =>
      loggedEntries.filter((entry) => entry.message === message)

    test('GET refuses an unrecognised journey type', async () => {
      const { statusCode } = await getAdd(server(), 'add-get-unknown-journey', {
        ...CONSIGNOR_HANDSHAKE,
        'journey-type': 'not-a-journey'
      })

      expect(statusCode).toBe(statusCodes.notFound)
    })

    test('GET rejects an incomplete handshake query', async () => {
      const { statusCode } = await getAdd(
        server(),
        'add-get-incomplete-handshake',
        {
          'journey-type': CONSIGNOR_HANDSHAKE['journey-type'],
          'notification-id': CONSIGNOR_HANDSHAKE['notification-id']
        }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
    })

    test('POST of Save and select returns to the journey with the new address id and the select landing, logs the hand-back once, and shows no address-book banner', async () => {
      const scope = serveAddressCreated()

      const response = await postAdd(server(), 'add-post-handshake', {
        ...CONSIGNOR_HANDSHAKE,
        ...VALID_ADDRESS_PAYLOAD,
        action: ADDRESS_LANDING.SELECT
      })

      expectRedirectTo(
        response,
        `${CONSIGNOR_RETURN_URL}&addressId=${ADDRESS_ID}&landing=select`
      )
      expect(scope.isDone()).toBe(true)
      expect(loggedWith(HAND_BACK_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            addressId: ADDRESS_ID,
            notificationId: CONSIGNOR_HANDSHAKE['notification-id'],
            fulfilmentId: CONSIGNOR_HANDSHAKE['fulfilment-id'],
            landing: ADDRESS_LANDING.SELECT
          },
          message: HAND_BACK_MESSAGE
        }
      ])

      const listResponse = await openEmptyAddressBookWithCookiesFrom(
        server(),
        'add-post-handshake',
        response.headers
      )
      expect(load(listResponse.result)(SUCCESS_BANNER)).toHaveLength(0)
    })

    test('POST of Save and return to address page returns to the journey with the new address id and the return landing', async () => {
      const scope = serveAddressCreated()

      const response = await postAdd(server(), 'add-post-handshake-return', {
        ...CONSIGNOR_HANDSHAKE,
        ...VALID_ADDRESS_PAYLOAD,
        action: ADDRESS_LANDING.RETURN
      })

      expectRedirectTo(
        response,
        `${CONSIGNOR_RETURN_URL}&addressId=${ADDRESS_ID}&landing=return`
      )
      expect(scope.isDone()).toBe(true)
    })

    test('POST of the consignment contact Save and continue, which carries no action, returns to the journey with the select landing', async () => {
      serveAddressCreated()

      const response = await postAdd(server(), 'add-post-handshake-contact', {
        ...CONSIGNMENT_CONTACT_HANDSHAKE,
        ...VALID_ADDRESS_PAYLOAD
      })

      expectRedirectTo(
        response,
        `${CONTACT_RETURN_URL}&addressId=${ADDRESS_ID}&landing=select`
      )
    })

    test('POST from the consignee handshake keeps the journey, the Draft status, the notification reference and United Kingdom alone on the form when the API rejects the address', async () => {
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
        { ...CONSIGNEE_HANDSHAKE, ...VALID_ADDRESS_PAYLOAD }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain(EMAIL_FORMAT_ERROR)
      expect(result).toContain('name="handshake-token"')
      const $ = load(result)
      expect(buttonsOf($).map(({ text }) => text)).toEqual([
        'Save and select',
        'Save and return to address page'
      ])
      expect(textsOf($, FORM_LINK)).toEqual(['Cancel and return to hub'])
      expectDraftJourneyStrip($, CONSIGNEE_HANDSHAKE['notification-id'])
      expectUnitedKingdomAloneSelected($)
    })

    test('Cancel from a role handshake returns to the journey with the cancel landing and no address', async () => {
      expectRedirectTo(
        await postAdd(server(), 'add-post-handshake-cancel-role', {
          cancel: 'true',
          ...CONSIGNOR_HANDSHAKE
        }),
        `${CONSIGNOR_RETURN_URL}&landing=cancel`
      )
    })

    test('Cancel from the consignment contact handshake returns to the journey with no address and no landing, and logs the hand-back once', async () => {
      expectRedirectTo(
        await postAdd(server(), 'add-post-handshake-cancel', {
          cancel: 'true',
          ...CONSIGNMENT_CONTACT_HANDSHAKE
        }),
        CONTACT_RETURN_URL
      )
      expect(loggedWith(CANCEL_HAND_BACK_MESSAGE)).toEqual([
        {
          fields: {
            notificationId: CONSIGNMENT_CONTACT_HANDSHAKE['notification-id'],
            fulfilmentId: CONSIGNMENT_CONTACT_HANDSHAKE['fulfilment-id']
          },
          message: CANCEL_HAND_BACK_MESSAGE
        }
      ])
    })
  }
)

describe(
  '#addressBookAddController — journey handshake by role',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)
    const openAddFrom = async (role) => {
      const { result, statusCode } = await getAdd(
        server(),
        `add-get-handshake-${role}`,
        JOURNEY_HANDSHAKES_BY_ROLE[role]
      )
      expect(statusCode).toBe(statusCodes.ok)
      return load(result)
    }

    test.each(UNITED_KINGDOM_ROLES)(
      'GET from the %s handshake offers United Kingdom alone, selected, with every field shown',
      async (role) => {
        const $ = await openAddFrom(role)

        expectUnitedKingdomAloneSelected($)
        expect(textsOf($, FORM_LABELS)).toEqual(ADDRESS_FORM_LABELS)
      }
    )

    test.each(ANY_COUNTRY_ROLES)(
      'GET from the %s handshake opens the Country select on Select a country, offers every served country and shows every field',
      async (role) => {
        const $ = await openAddFrom(role)

        expectPlaceholderThenCountriesNoneSelected($, [
          'France',
          'Germany',
          'Switzerland',
          'United Kingdom'
        ])
        expect(textsOf($, FORM_LABELS)).toEqual(ADDRESS_FORM_LABELS)
      }
    )

    test('POST from the consignee handshake shows the recoverable-error banner and United Kingdom alone, selected, when the address book fails', async () => {
      addressBookApi()
        .post(addressesApiPath())
        .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

      const { result, statusCode } = await postAdd(
        server(),
        'add-post-handshake-503',
        { ...CONSIGNEE_HANDSHAKE, ...VALID_ADDRESS_PAYLOAD }
      )

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toContain(
        'Sorry, there is a problem with the service. Try again in a few minutes.'
      )
      expectUnitedKingdomAloneSelected(load(result))
    })

    test('POST from the consignee handshake saves the address as United Kingdom whatever country is posted', async () => {
      const { scope, captured } = serveAddressCreationCapturingBody()

      const response = await postAdd(server(), 'add-post-consignee-france', {
        ...CONSIGNEE_HANDSHAKE,
        ...VALID_ADDRESS_PAYLOAD,
        countryCode: 'FR'
      })

      expectRedirectTo(
        response,
        `${CONSIGNEE_RETURN_URL}&addressId=${ADDRESS_ID}&landing=select`
      )
      expect(scope.isDone()).toBe(true)
      expect(captured.body.countryCode).toBe('GB')
    })

    test('POST from the consignee handshake with the name, postcode, country and phone blank lists the name, postcode and phone errors only, and keeps United Kingdom selected', async () => {
      const { result, statusCode } = await postAdd(
        server(),
        'add-post-consignee-blanks',
        {
          ...CONSIGNEE_HANDSHAKE,
          ...VALID_ADDRESS_PAYLOAD,
          name: '',
          postcode: '',
          countryCode: '',
          phone: ''
        }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      const $ = load(result)
      expectSummaryAndFieldErrors($, [
        ['name', REQUIRED_MESSAGES.name],
        ['postcode', REQUIRED_MESSAGES.postcode],
        ['phone', REQUIRED_MESSAGES.phone]
      ])
      expectUnitedKingdomAloneSelected($)
    })

    test.each([
      ['no country', ''],
      ['a country the list does not offer', 'ZZ']
    ])(
      'POST from the consignor handshake with %s shows Select a country and saves nothing',
      async (_name, countryCode) => {
        const { result, statusCode } = await postAdd(
          server(),
          `add-post-consignor-country-${countryCode || 'blank'}`,
          { ...CONSIGNOR_HANDSHAKE, ...VALID_ADDRESS_PAYLOAD, countryCode }
        )

        expect(statusCode).toBe(statusCodes.badRequest)
        expectSummaryAndFieldErrors(load(result), [
          ['countryCode', REQUIRED_MESSAGES.countryCode]
        ])
      }
    )

    test('POST from the consignor handshake with a 13-character postcode and a badly formed email shows both format errors and saves nothing', async () => {
      const { result, statusCode } = await postAdd(
        server(),
        'add-post-consignor-formats',
        {
          ...CONSIGNOR_HANDSHAKE,
          ...VALID_ADDRESS_PAYLOAD,
          postcode: 'A'.repeat(13),
          email: 'not-an-email'
        }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expectSummaryAndFieldErrors(load(result), [
        ['postcode', 'Postcode must be 12 characters or fewer'],
        ['email', EMAIL_FORMAT_ERROR]
      ])
    })
  }
)

describe(
  '#addressBookAddController — field layout',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)

    test('GET renders name, address lines and email full width, town, county, postcode and country at one half, and phone at two thirds', async () => {
      const { result } = await getAdd(server(), 'add-get-widths')

      expectAddressFormWidths(result)
    })

    test('GET gives each personal-data field its browser autocomplete hint and none to County or Country', async () => {
      const { result } = await getAdd(server(), 'add-get-autocomplete')

      expectAddressFormAutocomplete(result)
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
      expect($(SELECTED_COUNTRY)).toHaveLength(0)
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
