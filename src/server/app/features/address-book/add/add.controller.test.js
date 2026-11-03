import { load } from 'cheerio'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADD_ADDRESS_PATH,
  ADDRESS_BOOK_PATH,
  ADDRESS_FORM_LABELS,
  ADDRESS_ID,
  ADDRESS_TYPE_START_PATH,
  BACK_LINK,
  addressesApiPath,
  ADDRESS_TYPE_PATH,
  cookieAfterChoosingAddressType,
  cookieHeaderOf,
  COUNTRIES,
  COUNTRY_OPTIONS,
  expectRedirectTo,
  getPage,
  INVALID_ADDRESS_PAYLOAD,
  postPage,
  serveAddressCreated,
  serveAddressCreationCapturingBody,
  STORED_ADDRESS,
  VALID_ADDRESS_FIELDS,
  VALID_ADDRESS_PAYLOAD
} from '../../../../common/test-helpers/address-book-requests.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { expectDraftJourneyStrip } from '../../../../common/test-helpers/expect-draft-journey-strip.js'
import { JOURNEY_STRIP } from '../../../../common/test-helpers/journey-strip.js'
import { expectAddressFormAutocomplete } from '../../../../common/test-helpers/expect-address-form-autocomplete.js'
import { expectAddressFormWidths } from '../../../../common/test-helpers/expect-address-form-widths.js'
import {
  ANIMALS_BASE_URL,
  ANY_COUNTRY_ROLES,
  CONSIGNMENT_CONTACT_HANDSHAKE,
  JOURNEY_HANDSHAKES_BY_ROLE,
  returnUrlFor,
  UNITED_KINGDOM_ROLES
} from '../../../../common/test-helpers/journey-handshake.js'
import { captureInfoLogs } from '../../../../common/test-helpers/capture-info-logs.js'
import {
  addressTypeRequiresUnitedKingdom,
  ADDRESS_TYPES,
  USES_BY_ADDRESS_TYPE
} from '../../../services/address-book/index.js'
import { GB_COUNTRY } from '../address-countries.js'
import { ADDRESS_LANDING } from '../journey-registry.js'
import {
  expectPlaceholderFirstWithUnitedKingdomSelected,
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
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { config } from '../../../../../config/config.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const SERVED_COUNTRY_NAMES = [
  'France',
  'Germany',
  'Switzerland',
  GB_COUNTRY.name
]
const EMAIL_FORMAT_ERROR = 'Enter an email address in the correct format'

const { consignor: CONSIGNOR_HANDSHAKE, consignee: CONSIGNEE_HANDSHAKE } =
  JOURNEY_HANDSHAKES_BY_ROLE
const HAND_BACK_MESSAGE = 'Address handed back to the journey'
const CANCEL_HAND_BACK_MESSAGE = 'Cancel handed back to the journey'
const CAPTION_SELECTOR = '.govuk-caption-l'
const FORM_LABELS = 'form label'
const FORM_LINK = 'form a.govuk-link'
const ADD_TITLE = 'Add address and contact details'

const postAdd = (server, sessionId, payload) =>
  postPage(server, ADD_ADDRESS_PATH, sessionId, payload)

const getAdd = (server, sessionId, query, cookie) =>
  getPage(
    server,
    `${ADD_ADDRESS_PATH}?${new URLSearchParams(query)}`,
    sessionId,
    cookie
  )

const getAddWithTypeChosen = async (server, sessionId, addressType) => {
  const cookie = await cookieAfterChoosingAddressType(server, sessionId, {
    addressType
  })
  return getAdd(server, sessionId, undefined, cookie)
}

const postAddWithTypeChosen = async (
  server,
  sessionId,
  payload,
  addressType
) => {
  const cookie = await cookieAfterChoosingAddressType(server, sessionId, {
    addressType
  })
  return postPage(server, ADD_ADDRESS_PATH, sessionId, payload, cookie)
}

const ORIGIN_OR_CONSIGNOR_LIST_PATH = `${ADDRESS_BOOK_PATH}?addressType=${ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR}`
const ERROR_SUMMARY_LINKS = '.govuk-error-summary a'
const USES_ERROR = 'Select what this address can be used for'
const USES_LEGEND = 'What can this address be used for?'
const ADDRESS_TYPE_LEGEND = 'Address type'
const UNITED_KINGDOM_ADDRESS_TYPES = Object.values(ADDRESS_TYPES).filter(
  addressTypeRequiresUnitedKingdom
)
const USES_HINT = 'Select where this address can be used'

const SUCCESS_BANNER = '.govuk-notification-banner--success'

const expectNamePostcodeAndPhoneErrorsOnly = ($) => {
  expectSummaryAndFieldErrors($, [
    ['name', REQUIRED_MESSAGES.name],
    ['postcode', REQUIRED_MESSAGES.postcode],
    ['phone', REQUIRED_MESSAGES.phone]
  ])
  expectUnitedKingdomAloneSelected($)
}

const ORIGIN_USE_LABELS = ['Place of origin', 'Consignor']
const VALIDATION_PROBLEM_TYPE =
  'https://api.cdp.defra.cloud/problems/validation-error'

const tickedUsesOf = ($) =>
  $('input[name="uses"]:checked')
    .map((_, input) => $(input).attr('value'))
    .get()

beforeEach(() => {
  config.set('csrf.enabled', false)
  config.set('tradeImportsAnimalsFrontend.baseUrl', ANIMALS_BASE_URL)
})

describe('#addressBookAddController', { concurrent: false }, () => {
  const server = startRealModeServerServingCountries(COUNTRIES)

  test('GET sets Cache-Control: no-store', async () => {
    const { headers, statusCode } = await getAddWithTypeChosen(
      server(),
      'add-get-cache'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('GET renders the add address and contact details page with its caption, no status tag, Back linking to the address type page and Cancel linking to the address book', async () => {
    const saveAndContinue = 'Save and continue'
    const cancelToAddressBook = 'Cancel and return to address book'

    const { result, statusCode } = await getAddWithTypeChosen(
      server(),
      'add-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textsOf($, 'h1')).toEqual([ADD_TITLE])
    expect(textsOf($, CAPTION_SELECTOR)).toEqual(['Add new address'])
    expect($(CAPTION_SELECTOR).next().is('h1')).toBe(true)
    expect($(JOURNEY_STRIP)).toHaveLength(0)
    expect($('main .govuk-tag')).toHaveLength(0)
    expect($(BACK_LINK).attr('href')).toBe(ADDRESS_TYPE_PATH)
    expect(textsOf($, BACK_LINK)).toEqual(['Back'])
    expect(textsOf($, 'form h2')).toEqual(['Address', 'Contact details'])
    expect(textsOf($, FORM_LABELS)).toEqual([
      ...ADDRESS_FORM_LABELS,
      ...ORIGIN_USE_LABELS
    ])
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
    const { result, statusCode } = await getAddWithTypeChosen(
      server(),
      'add-get-countries'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain(`value="${GB_COUNTRY.code}"`)
    expect(result).toContain(GB_COUNTRY.name)
    expect(result).toContain('value="FR"')
    expect(result).toContain('France')
  })

  test('POST re-renders form when API returns 400 validation errors', async () => {
    const scope = addressBookApi()
      .post(addressesApiPath())
      .reply(400, {
        type: VALIDATION_PROBLEM_TYPE,
        errors: {
          email: [EMAIL_FORMAT_ERROR]
        }
      })

    const { result, statusCode, headers } = await postAddWithTypeChosen(
      server(),
      'add-post-api-400',
      VALID_ADDRESS_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain(EMAIL_FORMAT_ERROR)
    expect(scope.isDone()).toBe(true)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('POST sends the address to the address book for the organisation and redirects to the list of the chosen address type', async () => {
    const { scope, captured } = serveAddressCreationCapturingBody()

    const response = await postAddWithTypeChosen(
      server(),
      'add-post-success',
      VALID_ADDRESS_PAYLOAD
    )

    expectRedirectTo(response, ORIGIN_OR_CONSIGNOR_LIST_PATH)
    expect(scope.isDone()).toBe(true)
    expect(captured.body).toMatchObject(VALID_ADDRESS_FIELDS)
    expect(response.headers['cache-control']).not.toBe('no-store')
  })

  test('POST shows the address added banner on the address book', async () => {
    serveAddressCreated()

    const { headers } = await postAddWithTypeChosen(
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

    const { result, statusCode, headers } = await postAddWithTypeChosen(
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

  test('POST sends the trimmed form fields, the chosen address type and the ticked uses, and nothing else, to the address book', async () => {
    const { scope, captured } = serveAddressCreationCapturingBody()

    const { addressLine2, county, ...requiredFields } = VALID_ADDRESS_FIELDS

    const { statusCode } = await postAddWithTypeChosen(
      server(),
      'add-post-trimmed',
      {
        ...requiredFields,
        name: `  ${STORED_ADDRESS.name}  `,
        uses: 'PLACE_OF_ORIGIN',
        crumb: 'not-for-the-api'
      }
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(scope.isDone()).toBe(true)
    expect(captured.body).toEqual({
      ...requiredFields,
      addressLine2: '',
      county: '',
      addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
      uses: ['PLACE_OF_ORIGIN']
    })
  })

  test('POST with invalid data re-renders form with errors', async () => {
    const { result, statusCode, headers } = await postAddWithTypeChosen(
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
    const { result, statusCode } = await postAddWithTypeChosen(
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

describe(
  '#addressBookAddController — address type guard',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)
    const NO_TYPE_MESSAGE =
      'No address type chosen, sending the user to choose one'
    const loggedWith = captureInfoLogs()

    test('GET with no address type chosen redirects to the address type page and logs it once', async () => {
      const response = await getAdd(server(), 'add-get-no-type')

      expectRedirectTo(response, ADDRESS_TYPE_PATH)
      expect(loggedWith(NO_TYPE_MESSAGE)).toEqual([
        {
          fields: { organisationId: ORGANISATION_ID, path: ADD_ADDRESS_PATH },
          message: NO_TYPE_MESSAGE
        }
      ])
    })

    test('POST with valid fields and no address type chosen redirects to the address type page, logs it once and sends the address book nothing', async () => {
      const createScope = serveAddressCreated()

      const response = await postAdd(
        server(),
        'add-post-no-type',
        VALID_ADDRESS_PAYLOAD
      )

      expectRedirectTo(response, ADDRESS_TYPE_PATH)
      expect(createScope.isDone()).toBe(false)
      expect(loggedWith(NO_TYPE_MESSAGE)).toEqual([
        {
          fields: { organisationId: ORGANISATION_ID, path: ADD_ADDRESS_PATH },
          message: NO_TYPE_MESSAGE
        }
      ])
    })

    test('GET after a successful save redirects to the address type page', async () => {
      serveAddressCreated()
      const sessionId = 'add-get-after-save'
      const cookie = await cookieAfterChoosingAddressType(server(), sessionId)
      const saved = await postPage(
        server(),
        ADD_ADDRESS_PATH,
        sessionId,
        VALID_ADDRESS_PAYLOAD,
        cookie
      )

      const response = await getAdd(
        server(),
        sessionId,
        {},
        cookieHeaderOf(saved.headers)
      )

      expectRedirectTo(response, ADDRESS_TYPE_PATH)
    })
  }
)

describe(
  '#addressBookAddController — uses question',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)
    const loggedWith = captureInfoLogs()
    const DISCARDED_MESSAGE =
      'Posted uses the chosen address type does not offer were not saved'
    const FIRST_USE_OF = (addressType) => USES_BY_ADDRESS_TYPE[addressType][0]
    const USE_CHECKBOXES = 'input[name="uses"]'

    test('GET after Origin or Consignor is chosen shows a section break after the contact fields, then the uses question with Place of origin and Consignor unticked and without hints', async () => {
      const { result, statusCode } = await getAddWithTypeChosen(
        server(),
        'add-get-uses'
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect(result.indexOf('id="phone"')).toBeLessThan(
        result.indexOf('govuk-section-break--visible')
      )
      expect(
        textsOf($, 'hr.govuk-section-break--visible + .govuk-form-group legend')
      ).toEqual([USES_LEGEND])
      expect(textsOf($, '#uses-hint')).toEqual([USES_HINT])
      expect(textsOf($, '.govuk-checkboxes__label')).toEqual(ORIGIN_USE_LABELS)
      expect($('.govuk-checkboxes__hint')).toHaveLength(0)
      expect(tickedUsesOf($)).toEqual([])
      expect($(USE_CHECKBOXES).first().attr('id')).toBe('uses')
    })

    test.each([
      [
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        USES_LEGEND,
        ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
        ORIGIN_USE_LABELS
      ],
      [
        ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
        ADDRESS_TYPE_LEGEND,
        ['PLACE_OF_DESTINATION', 'CONSIGNEE', 'IMPORTER'],
        ['Place of destination', 'Consignee', 'Importer']
      ],
      [
        ADDRESS_TYPES.BRANCH,
        ADDRESS_TYPE_LEGEND,
        ['BRANCH_ADDRESS'],
        ['Branch address']
      ]
    ])(
      'GET after %s is chosen asks %j with the hint and offers unticked, without hints, exactly the uses that type holds, the place uses first',
      async (addressType, legend, values, labels) => {
        const { result } = await getAddWithTypeChosen(
          server(),
          `add-get-uses-${addressType}`,
          addressType
        )

        const $ = load(result)
        expect(
          textsOf(
            $,
            'hr.govuk-section-break--visible + .govuk-form-group legend'
          )
        ).toEqual([legend])
        expect(textsOf($, '#uses-hint')).toEqual([USES_HINT])
        expect(
          $(USE_CHECKBOXES)
            .map((_, input) => $(input).attr('value'))
            .get()
        ).toEqual(values)
        expect(textsOf($, '.govuk-checkboxes__label')).toEqual(labels)
        expect($('.govuk-checkboxes__hint')).toHaveLength(0)
        expect(tickedUsesOf($)).toEqual([])
        expect([...values].sort()).toEqual(
          [...USES_BY_ADDRESS_TYPE[addressType]].sort()
        )
      }
    )

    test.each(Object.values(ADDRESS_TYPES))(
      'POST after %s is chosen with valid fields and no use ticked shows the uses error inline and as the summary link to the first option, and sends nothing',
      async (addressType) => {
        const { uses: _noUse, ...fieldsOnly } = VALID_ADDRESS_PAYLOAD

        const { result, statusCode } = await postAddWithTypeChosen(
          server(),
          `add-post-no-use-${addressType}`,
          fieldsOnly,
          addressType
        )

        expect(statusCode).toBe(statusCodes.badRequest)
        const $ = load(result)
        expect(textsOf($, ERROR_SUMMARY_LINKS)).toEqual([USES_ERROR])
        expect($(ERROR_SUMMARY_LINKS).attr('href')).toBe('#uses')
        expect(textsOf($, '#uses-error')).toEqual([`Error: ${USES_ERROR}`])
        expect($(USE_CHECKBOXES).first().attr('id')).toBe('uses')
      }
    )

    test('POST with an invalid field and no use ticked shows only the field error', async () => {
      const { uses: _noUse, ...fieldsOnly } = VALID_ADDRESS_PAYLOAD

      const { result, statusCode } = await postAddWithTypeChosen(
        server(),
        'add-post-invalid-no-use',
        { ...fieldsOnly, name: '' }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      const $ = load(result)
      expect(textsOf($, ERROR_SUMMARY_LINKS)).toEqual([REQUIRED_MESSAGES.name])
      expect($('#uses-error')).toHaveLength(0)
    })

    test('POST with an invalid field keeps the ticks the user made', async () => {
      const { result, statusCode } = await postAddWithTypeChosen(
        server(),
        'add-post-invalid-keeps-ticks',
        {
          ...VALID_ADDRESS_PAYLOAD,
          name: '',
          uses: ['PLACE_OF_ORIGIN', 'CONSIGNOR']
        }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(tickedUsesOf(load(result))).toEqual([
        'PLACE_OF_ORIGIN',
        'CONSIGNOR'
      ])
    })

    test('POST with Consignor ticked and a use the type does not offer saves only Consignor, logs the discarded use and lands on the Origin and Consignor list', async () => {
      const { scope, captured } = serveAddressCreationCapturingBody()

      const response = await postAddWithTypeChosen(
        server(),
        'add-post-foreign-use',
        { ...VALID_ADDRESS_PAYLOAD, uses: ['CONSIGNOR', 'IMPORTER'] }
      )

      expectRedirectTo(response, ORIGIN_OR_CONSIGNOR_LIST_PATH)
      expect(scope.isDone()).toBe(true)
      expect(captured.body).toMatchObject({
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        uses: ['CONSIGNOR']
      })
      expect(loggedWith(DISCARDED_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
            discardedUses: ['IMPORTER']
          },
          message: DISCARDED_MESSAGE
        }
      ])
    })

    test('POST with only a use the type does not offer shows the uses error', async () => {
      const { result, statusCode } = await postAddWithTypeChosen(
        server(),
        'add-post-only-foreign-use',
        { ...VALID_ADDRESS_PAYLOAD, uses: 'IMPORTER' }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(textsOf(load(result), ERROR_SUMMARY_LINKS)).toEqual([USES_ERROR])
    })

    test.each(Object.values(ADDRESS_TYPES))(
      'POST after %s is chosen saves that type with the ticked use and lands on that type of the list',
      async (addressType) => {
        const { scope, captured } = serveAddressCreationCapturingBody()

        const response = await postAddWithTypeChosen(
          server(),
          `add-post-uses-${addressType}`,
          { ...VALID_ADDRESS_PAYLOAD, uses: FIRST_USE_OF(addressType) },
          addressType
        )

        expectRedirectTo(
          response,
          `${ADDRESS_BOOK_PATH}?addressType=${addressType}`
        )
        expect(scope.isDone()).toBe(true)
        expect(captured.body).toMatchObject({
          addressType,
          uses: [FIRST_USE_OF(addressType)]
        })
      }
    )
  }
)

describe(
  '#addressBookAddController — types that must be in the United Kingdom',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)

    test.each(UNITED_KINGDOM_ADDRESS_TYPES)(
      'GET after %s is chosen offers United Kingdom alone, selected',
      async (addressType) => {
        const { result } = await getAddWithTypeChosen(
          server(),
          `add-get-uk-alone-${addressType}`,
          addressType
        )

        expectUnitedKingdomAloneSelected(load(result))
      }
    )

    test.each(UNITED_KINGDOM_ADDRESS_TYPES)(
      'POST after %s is chosen with France posted saves United Kingdom',
      async (addressType) => {
        const { scope, captured } = serveAddressCreationCapturingBody()

        await postAddWithTypeChosen(
          server(),
          `add-post-uk-only-${addressType}`,
          {
            ...VALID_ADDRESS_PAYLOAD,
            countryCode: 'FR',
            uses: USES_BY_ADDRESS_TYPE[addressType][0]
          },
          addressType
        )

        expect(scope.isDone()).toBe(true)
        expect(captured.body.countryCode).toBe(GB_COUNTRY.code)
      }
    )

    test.each(UNITED_KINGDOM_ADDRESS_TYPES)(
      'POST after %s is chosen with the name, postcode and phone blank and France posted lists those three errors only',
      async (addressType) => {
        const { result, statusCode } = await postAddWithTypeChosen(
          server(),
          `add-post-uk-only-blanks-${addressType}`,
          {
            ...VALID_ADDRESS_PAYLOAD,
            name: '',
            postcode: '',
            phone: '',
            countryCode: 'FR'
          },
          addressType
        )

        expect(statusCode).toBe(statusCodes.badRequest)
        expectNamePostcodeAndPhoneErrorsOnly(load(result))
      }
    )
  }
)

describe(
  '#addressBookAddController — replaced country log',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)
    const loggedWith = captureInfoLogs()
    const REPLACED_MESSAGE =
      'Posted country was replaced with the country the address must be in'

    test.each(UNITED_KINGDOM_ADDRESS_TYPES)(
      'POST after %s is chosen with France posted logs the replaced country once, with the stored address id',
      async (addressType) => {
        serveAddressCreated()

        await postAddWithTypeChosen(
          server(),
          `add-log-replaced-${addressType}`,
          {
            ...VALID_ADDRESS_PAYLOAD,
            countryCode: 'FR',
            uses: USES_BY_ADDRESS_TYPE[addressType][0]
          },
          addressType
        )

        expect(loggedWith(REPLACED_MESSAGE)).toEqual([
          {
            fields: {
              organisationId: ORGANISATION_ID,
              addressId: ADDRESS_ID,
              addressType,
              postedCountryCode: 'FR'
            },
            message: REPLACED_MESSAGE
          }
        ])
      }
    )

    test('POST after Destination is chosen with the United Kingdom posted logs nothing, and Origin or Consignor saves France as posted', async () => {
      const destination = serveAddressCreationCapturingBody()
      await postAddWithTypeChosen(
        server(),
        'add-log-not-replaced-gb',
        {
          ...VALID_ADDRESS_PAYLOAD,
          uses: 'CONSIGNEE'
        },
        ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
      )
      const origin = serveAddressCreationCapturingBody()
      await postAddWithTypeChosen(server(), 'add-log-not-replaced-origin', {
        ...VALID_ADDRESS_PAYLOAD,
        countryCode: 'FR'
      })

      expect(destination.scope.isDone()).toBe(true)
      expect(origin.captured.body.countryCode).toBe('FR')
      expect(loggedWith(REPLACED_MESSAGE)).toEqual([])
    })

    test('POST from the consignee handshake with France posted logs the replaced country with the notification and fulfilment ids', async () => {
      serveAddressCreated()

      await postAdd(server(), 'add-log-replaced-consignee', {
        ...CONSIGNEE_HANDSHAKE,
        ...VALID_ADDRESS_PAYLOAD,
        countryCode: 'FR'
      })

      expect(loggedWith(REPLACED_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            addressId: ADDRESS_ID,
            notificationId: CONSIGNEE_HANDSHAKE['notification-id'],
            fulfilmentId: CONSIGNEE_HANDSHAKE['fulfilment-id'],
            postedCountryCode: 'FR'
          },
          message: REPLACED_MESSAGE
        }
      ])
    })

    test('POST with France posted that is refused for a field error, a missing use or the address book logs nothing and shows each refusal', async () => {
      const destination = ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
      const france = { ...VALID_ADDRESS_PAYLOAD, countryCode: 'FR' }
      const { uses: _noUse, ...franceWithoutUse } = france

      const fieldError = await postAddWithTypeChosen(
        server(),
        'add-log-refused-field',
        { ...france, name: '' },
        destination
      )
      const usesError = await postAddWithTypeChosen(
        server(),
        'add-log-refused-uses',
        franceWithoutUse,
        destination
      )
      addressBookApi()
        .post(addressesApiPath())
        .reply(statusCodes.badRequest, {
          type: VALIDATION_PROBLEM_TYPE,
          errors: { email: [EMAIL_FORMAT_ERROR] }
        })
      const refusedByAddressBook = await postAddWithTypeChosen(
        server(),
        'add-log-refused-address-book',
        { ...france, uses: 'CONSIGNEE' },
        destination
      )

      expect(textsOf(load(fieldError.result), ERROR_SUMMARY_LINKS)).toEqual([
        REQUIRED_MESSAGES.name
      ])
      expect(textsOf(load(usesError.result), ERROR_SUMMARY_LINKS)).toEqual([
        USES_ERROR
      ])
      expect(
        textsOf(load(refusedByAddressBook.result), ERROR_SUMMARY_LINKS)
      ).toEqual([EMAIL_FORMAT_ERROR])
      expect(loggedWith(REPLACED_MESSAGE)).toEqual([])
    })
  }
)

describe(
  '#addressBookAddController — add in progress',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)
    const ENTERED_FIELDS = {
      ...VALID_ADDRESS_FIELDS,
      addressLine2: 'Unit 2',
      county: 'Highland',
      email: 'not-an-email'
    }
    const TEXT_FIELDS = [
      'name',
      'addressLine1',
      'addressLine2',
      'townOrCity',
      'county',
      'postcode',
      'phone',
      'email'
    ]

    const enteredValuesOf = ($) =>
      Object.fromEntries(
        TEXT_FIELDS.map((field) => [field, $(`#${field}`).val()])
      )

    const postRefusedAddFor = async (sessionId, addressType, use) => {
      const typeCookie = await cookieAfterChoosingAddressType(
        server(),
        sessionId,
        { addressType }
      )
      const refused = await postPage(
        server(),
        ADD_ADDRESS_PATH,
        sessionId,
        { ...ENTERED_FIELDS, uses: use },
        typeCookie
      )
      expect(refused.statusCode).toBe(statusCodes.badRequest)
      return cookieHeaderOf(refused.headers) || typeCookie
    }

    const openAddAfterChoosing = async (sessionId, addressType, cookie) =>
      getAdd(
        server(),
        sessionId,
        undefined,
        await cookieAfterChoosingAddressType(server(), sessionId, {
          addressType,
          cookie
        })
      )

    test.each([
      [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, 'PLACE_OF_ORIGIN'],
      [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER, 'CONSIGNEE'],
      [ADDRESS_TYPES.BRANCH, 'BRANCH_ADDRESS']
    ])(
      'GET after a refused save of %s and choosing it again shows every field entered and the ticked use %s',
      async (addressType, use) => {
        const sessionId = `add-kept-${addressType}`
        const cookie = await postRefusedAddFor(sessionId, addressType, use)

        const { result } = await openAddAfterChoosing(
          sessionId,
          addressType,
          cookie
        )

        const $ = load(result)
        expect(enteredValuesOf($)).toEqual(
          Object.fromEntries(
            TEXT_FIELDS.map((field) => [field, ENTERED_FIELDS[field]])
          )
        )
        expect(tickedUsesOf($)).toEqual([use])
      }
    )

    test('GET after a refused save and choosing another type keeps the fields and shows no tick for a use the type does not offer', async () => {
      const sessionId = 'add-kept-other-type'
      const cookie = await postRefusedAddFor(
        sessionId,
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        'PLACE_OF_ORIGIN'
      )

      const { result } = await openAddAfterChoosing(
        sessionId,
        ADDRESS_TYPES.BRANCH,
        cookie
      )

      const $ = load(result)
      expect($('#name').val()).toBe(ENTERED_FIELDS.name)
      expect(tickedUsesOf($)).toEqual([])
    })

    test('GET after starting a new address opens empty text fields with United Kingdom selected', async () => {
      const sessionId = 'add-kept-cleared-by-start'
      const cookie = await postRefusedAddFor(
        sessionId,
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        'PLACE_OF_ORIGIN'
      )
      const started = await getPage(
        server(),
        ADDRESS_TYPE_START_PATH,
        sessionId,
        cookie
      )

      const { result } = await openAddAfterChoosing(
        sessionId,
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        cookieHeaderOf(started.headers) || cookie
      )

      const $ = load(result)
      expect(enteredValuesOf($)).toEqual(
        Object.fromEntries(TEXT_FIELDS.map((field) => [field, '']))
      )
      expectPlaceholderFirstWithUnitedKingdomSelected($, SERVED_COUNTRY_NAMES)
      expect(tickedUsesOf($)).toEqual([])
    })

    test('GET after a refused save, a successful save and choosing a type again opens empty text fields', async () => {
      const sessionId = 'add-kept-cleared-by-save'
      const cookie = await postRefusedAddFor(
        sessionId,
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        'PLACE_OF_ORIGIN'
      )
      serveAddressCreated()
      const saved = await postPage(
        server(),
        ADD_ADDRESS_PATH,
        sessionId,
        VALID_ADDRESS_PAYLOAD,
        cookie
      )

      const { result } = await openAddAfterChoosing(
        sessionId,
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        cookieHeaderOf(saved.headers) || cookie
      )

      expect(enteredValuesOf(load(result))).toEqual(
        Object.fromEntries(TEXT_FIELDS.map((field) => [field, '']))
      )
    })
  }
)

describe(
  '#addressBookAddController — journey handshake type and use',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)

    test.each([
      ['placeOfOrigin', ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, 'PLACE_OF_ORIGIN'],
      ['consignor', ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, 'CONSIGNOR'],
      [
        'consignee',
        ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
        'CONSIGNEE'
      ],
      ['importer', ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER, 'IMPORTER'],
      [
        'placeOfDestination',
        ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
        'PLACE_OF_DESTINATION'
      ]
    ])(
      'POST from the %s handshake saves the address with its type and exactly its one use, whatever uses are posted',
      async (role, addressType, use) => {
        const { scope, captured } = serveAddressCreationCapturingBody()

        await postAdd(server(), `add-post-handshake-type-${role}`, {
          ...JOURNEY_HANDSHAKES_BY_ROLE[role],
          ...VALID_ADDRESS_FIELDS,
          uses: ['BRANCH_ADDRESS']
        })

        expect(scope.isDone()).toBe(true)
        expect(captured.body).toMatchObject({ addressType, uses: [use] })
      }
    )

    test('POST from the consignment contact handshake saves the address as a Branch address', async () => {
      const { scope, captured } = serveAddressCreationCapturingBody()

      await postAdd(server(), 'add-post-handshake-type-contact', {
        ...CONSIGNMENT_CONTACT_HANDSHAKE,
        ...VALID_ADDRESS_FIELDS
      })

      expect(scope.isDone()).toBe(true)
      expect(captured.body).toMatchObject({
        addressType: ADDRESS_TYPES.BRANCH,
        uses: ['BRANCH_ADDRESS']
      })
    })

    test.each([
      ['a role', CONSIGNOR_HANDSHAKE],
      ['the consignment contact', CONSIGNMENT_CONTACT_HANDSHAKE]
    ])(
      'GET from %s handshake shows no uses question',
      async (_name, handshake) => {
        const { result } = await getAdd(
          server(),
          'add-get-handshake-no-uses',
          handshake
        )

        const $ = load(result)
        expect(textsOf($, 'form legend')).toEqual([])
        expect($('input[name="uses"]')).toHaveLength(0)
      }
    )
  }
)

const buttonsOf = ($) =>
  $('form button')
    .map((_, button) => ({
      text: textOf($, button),
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
        returnUrlFor(CONSIGNOR_HANDSHAKE, { landing: ADDRESS_LANDING.CANCEL })
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
      expect($(BACK_LINK).attr('href')).toBe(
        returnUrlFor(CONSIGNMENT_CONTACT_HANDSHAKE)
      )
    })

    test('GET arriving through a journey handshake shows the page title, the blue Draft status and notification id above the caption and heading, then the section headings and every field label', async () => {
      const { result, statusCode } = await getAdd(
        server(),
        'add-get-handshake-frame',
        CONSIGNOR_HANDSHAKE
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect(textOf($, 'head title')).toBe(
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
      expect(load(result)(BACK_LINK).attr('href')).toBe(
        returnUrlFor(CONSIGNOR_HANDSHAKE)
      )
    })
  }
)

describe(
  '#addressBookAddController — journey handshake',
  { concurrent: false },
  () => {
    const server = startRealModeServerServingCountries(COUNTRIES)
    const loggedWith = captureInfoLogs()

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
        returnUrlFor(CONSIGNOR_HANDSHAKE, {
          addressId: ADDRESS_ID,
          landing: ADDRESS_LANDING.SELECT
        })
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
        returnUrlFor(CONSIGNOR_HANDSHAKE, {
          addressId: ADDRESS_ID,
          landing: ADDRESS_LANDING.RETURN
        })
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
        returnUrlFor(CONSIGNMENT_CONTACT_HANDSHAKE, {
          addressId: ADDRESS_ID,
          landing: ADDRESS_LANDING.SELECT
        })
      )
    })

    test('POST from the consignee handshake keeps the journey, the Draft status, the notification id and United Kingdom alone on the form when the API rejects the address', async () => {
      addressBookApi()
        .post(addressesApiPath())
        .reply(statusCodes.badRequest, {
          type: VALIDATION_PROBLEM_TYPE,
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
        returnUrlFor(CONSIGNOR_HANDSHAKE, { landing: ADDRESS_LANDING.CANCEL })
      )
    })

    test('Cancel from the consignment contact handshake returns to the journey with no address and no landing, and logs the hand-back once', async () => {
      expectRedirectTo(
        await postAdd(server(), 'add-post-handshake-cancel', {
          cancel: 'true',
          ...CONSIGNMENT_CONTACT_HANDSHAKE
        }),
        returnUrlFor(CONSIGNMENT_CONTACT_HANDSHAKE)
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

        expectPlaceholderThenCountriesNoneSelected($, SERVED_COUNTRY_NAMES)
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
        returnUrlFor(CONSIGNEE_HANDSHAKE, {
          addressId: ADDRESS_ID,
          landing: ADDRESS_LANDING.SELECT
        })
      )
      expect(scope.isDone()).toBe(true)
      expect(captured.body.countryCode).toBe(GB_COUNTRY.code)
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
      expectNamePostcodeAndPhoneErrorsOnly(load(result))
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
      const { result } = await getAddWithTypeChosen(server(), 'add-get-widths')

      expectAddressFormWidths(result)
    })

    test('GET gives each personal-data field its browser autocomplete hint and none to County or Country', async () => {
      const { result } = await getAddWithTypeChosen(
        server(),
        'add-get-autocomplete'
      )

      expectAddressFormAutocomplete(result)
    })

    test('GET opens the Country select on its blank first option, Select a country, with United Kingdom selected', async () => {
      const { result, statusCode } = await getAddWithTypeChosen(
        server(),
        'add-get-select-one'
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($(COUNTRY_OPTIONS).first().attr('value')).toBe('')
      expectPlaceholderFirstWithUnitedKingdomSelected($, SERVED_COUNTRY_NAMES)
    })

    test('GET lists the countries by name, not by code, with United Kingdom in its place', async () => {
      const { result } = await getAddWithTypeChosen(server(), 'add-get-order')

      const $ = load(result)
      const codes = $(COUNTRY_OPTIONS)
        .map((_, option) => $(option).attr('value'))
        .get()
        .filter(Boolean)

      expect(codes).toEqual(['FR', 'DE', 'CH', GB_COUNTRY.code])
    })
  }
)
