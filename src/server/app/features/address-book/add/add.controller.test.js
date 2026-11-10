import { load } from 'cheerio'
import { beforeEach, describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressAddPath,
  addressBookPath,
  ADDRESS_FORM_LABELS,
  ADDRESS_ID,
  addressTypeStartPath,
  BACK_LINK,
  addressesApiPath,
  addressTypePath,
  cookieAfterChoosingAddressType,
  cookieHeaderOf,
  COUNTRIES,
  COUNTRY_OPTIONS,
  expectRedirectTo,
  getPage,
  interceptAddressBookRequest,
  INVALID_ADDRESS_PAYLOAD,
  postPage,
  serveAddressCreated,
  serveAddressCreationCapturingBody,
  STORED_ADDRESS,
  VALID_ADDRESS_FIELDS,
  VALID_ADDRESS_PAYLOAD
} from '../../../../common/test-helpers/address-book-requests.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { expectDraftJourneyStrip } from '../../../../common/test-helpers/expect-draft-journey-strip.js'
import { JOURNEY_STRIP } from '../../../../common/test-helpers/journey-strip.js'
import { expectAddressFormAutocomplete } from '../../../../common/test-helpers/expect-address-form-autocomplete.js'
import { expectAddressFormWidths } from '../../../../common/test-helpers/expect-address-form-widths.js'
import {
  ANIMALS_BASE_URL,
  ANY_COUNTRY_PARTIES,
  CONSIGNMENT_CONTACT_HANDSHAKE,
  JOURNEY_HANDSHAKES_BY_PARTY,
  journeyRolesHintFor,
  returnUrlFor,
  UNITED_KINGDOM_PARTIES,
  UNREGISTERED_JOURNEY_TYPE,
  ROLES_BY_PARTY
} from '../../../../common/test-helpers/journey-handshake.js'
import { recordModuleLoggerInfo } from '../../../../common/test-helpers/module-logger-lines.js'
import {
  addressTypeRequiresUnitedKingdom,
  ADDRESS_FORM_TYPES,
  ADDRESS_TYPES,
  ROLES_BY_ADDRESS_TYPE
} from '../../../services/address-book/index.js'
import { GB_COUNTRY } from '../address-countries.js'
import { copy } from '../copy/copy.en.js'
import { ADDRESS_LANDING } from '../journey-registry.js'
import {
  expectPlaceholderThenCountriesUnitedKingdomSelected,
  expectPlaceholderThenCountriesNoneSelected,
  expectUnitedKingdomAloneSelected
} from '../../../../common/test-helpers/expect-add-form-country-select.js'
import {
  expectSummaryAndFieldErrors,
  INVALID_ADDRESS_PAYLOAD_ERRORS,
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

const SERVED_COUNTRY_NAMES = [
  'France',
  'Germany',
  'Switzerland',
  GB_COUNTRY.name
]
const EMAIL_FORMAT_ERROR = 'Enter an email address in the correct format'

const { consignor: CONSIGNOR_HANDSHAKE, consignee: CONSIGNEE_HANDSHAKE } =
  JOURNEY_HANDSHAKES_BY_PARTY
const HAND_BACK_MESSAGE = 'Address handed back to the journey'
const CANCEL_HAND_BACK_MESSAGE = 'Cancel handed back to the journey'
const CAPTION_SELECTOR = '.govuk-caption-l'
const FORM_LABEL_SELECTOR = 'form label'
const FORM_LINK = 'form a.govuk-link'
const ADD_TITLE = 'Add address and contact details'

const postAdd = (server, sessionId, payload) =>
  postPage(server, addressAddPath(), sessionId, payload)

const getAdd = (server, sessionId, query, cookie) =>
  getPage(
    server,
    `${addressAddPath()}?${new URLSearchParams(query)}`,
    sessionId,
    cookie
  )

const getAddWithTypeChosen = async (
  server,
  sessionId,
  { addressType, cookie } = {}
) => {
  const typeCookie = await cookieAfterChoosingAddressType(server, sessionId, {
    addressType,
    cookie
  })
  return getAdd(server, sessionId, undefined, typeCookie)
}

const postAddWithTypeChosen = async (
  server,
  sessionId,
  payload,
  { addressType, cookie } = {}
) => {
  const typeCookie = await cookieAfterChoosingAddressType(server, sessionId, {
    addressType,
    cookie
  })
  return postPage(server, addressAddPath(), sessionId, payload, typeCookie)
}

const ORIGIN_OR_CONSIGNOR_LIST_PATH = `${addressBookPath()}?addressType=${ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR}`
const ERROR_SUMMARY_LINKS = '.govuk-error-summary a'
const ROLES_ERROR = 'Select what this address can be used for'
const ROLES_LEGEND = 'What can this address be used for?'
const ADDRESS_TYPE_LEGEND = 'Address type'
const UNITED_KINGDOM_ADDRESS_TYPES = Object.values(ADDRESS_TYPES).filter(
  addressTypeRequiresUnitedKingdom
)
const ROLES_HINT = 'Select where this address can be used'

const SUCCESS_BANNER = '.govuk-notification-banner--success'

const expectNamePostcodeAndPhoneErrorsOnly = ($) => {
  expectSummaryAndFieldErrors($, [
    ['name', REQUIRED_MESSAGES.name],
    ['postcode', REQUIRED_MESSAGES.postcode],
    ['phone', REQUIRED_MESSAGES.phone]
  ])
  expectUnitedKingdomAloneSelected($)
}

const ORIGIN_ROLE_LABELS = ['Place of origin', 'Consignor']
const PLACE_OF_DESTINATION_LABEL = 'Place of destination'
const ROLES_LEGEND_SELECTOR =
  'hr.govuk-section-break--visible + .govuk-form-group legend'
const ROLES_HINT_SELECTOR = '#roles-hint'
const ROLE_LABEL_SELECTOR = '.govuk-checkboxes__label'
const JOURNEY_ROLES_LEGEND = 'What else should this address be used for?'
const DISCARDED_MESSAGE =
  'Posted roles the address page does not offer were not saved'
const otherRolesQuestionOf = (party) => {
  const { otherRoles } = ROLES_BY_PARTY[party]
  return {
    hint: journeyRolesHintFor(party),
    labels: otherRoles.map((role) => copy.roles.options[role].label)
  }
}
const VALIDATION_PROBLEM_TYPE =
  'https://api.cdp.defra.cloud/problems/validation-error'

const tickedRolesOf = ($) =>
  $('input[name="roles"]:checked')
    .map((_, input) => $(input).attr('value'))
    .get()

beforeEach(() => {
  config.set('tradeImportsAnimalsFrontend.baseUrl', ANIMALS_BASE_URL)
})

describe('#addressBookAddController', { concurrent: false }, () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test('GET sets Cache-Control: no-store', async () => {
    const { headers, statusCode } = await getAddWithTypeChosen(
      getServer(),
      'add-get-cache'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('GET renders the add address and contact details page with its caption, no status tag, Back linking to the address type page and Cancel linking to the address book', async () => {
    const saveAndContinue = 'Save and continue'
    const cancelToAddressBook = 'Cancel and return to address book'

    const { result, statusCode } = await getAddWithTypeChosen(
      getServer(),
      'add-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textsOf($, 'h1')).toEqual([ADD_TITLE])
    expect(textsOf($, CAPTION_SELECTOR)).toEqual(['Add new address'])
    expect($(CAPTION_SELECTOR).next().is('h1')).toBe(true)
    expect($(JOURNEY_STRIP)).toHaveLength(0)
    expect($('main .govuk-tag')).toHaveLength(0)
    expect($(BACK_LINK).attr('href')).toBe(addressTypePath())
    expect(textsOf($, BACK_LINK)).toEqual(['Back'])
    expect(textsOf($, 'form h2')).toEqual(['Address', 'Contact details'])
    expect(textsOf($, FORM_LABEL_SELECTOR)).toEqual([
      ...ADDRESS_FORM_LABELS,
      ...ORIGIN_ROLE_LABELS
    ])
    expect(textsOf($, '#phone-hint')).toEqual([
      'For international numbers include the country code'
    ])
    expect(textsOf($, 'form button')).toEqual([saveAndContinue])
    expect($(FORM_LINK).attr('href')).toBe(addressBookPath())
    expect(textsOf($, FORM_LINK)).toEqual([cancelToAddressBook])
    expect(result.indexOf(saveAndContinue)).toBeLessThan(
      result.indexOf(cancelToAddressBook)
    )
  })

  test('GET renders country select options from reference data', async () => {
    const { result, statusCode } = await getAddWithTypeChosen(
      getServer(),
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
      getServer(),
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
      getServer(),
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
      getServer(),
      'add-post-banner',
      VALID_ADDRESS_PAYLOAD
    )

    const listResponse = await openEmptyAddressBookWithCookiesFrom(
      getServer(),
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
      getServer(),
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

  test('POST sends the trimmed form fields and the ticked roles, and no address type or anything else, to the address book', async () => {
    const { scope, captured } = serveAddressCreationCapturingBody()

    const { addressLine2, county, ...requiredFields } = VALID_ADDRESS_FIELDS

    const { statusCode } = await postAddWithTypeChosen(
      getServer(),
      'add-post-trimmed',
      {
        ...requiredFields,
        name: `  ${STORED_ADDRESS.name}  `,
        roles: 'PLACE_OF_ORIGIN',
        crumb: 'not-for-the-api'
      }
    )

    expect(statusCode).toBe(statusCodes.redirectFound)
    expect(scope.isDone()).toBe(true)
    expect(captured.body).toEqual({
      ...requiredFields,
      addressLine2: '',
      county: '',
      roles: ['PLACE_OF_ORIGIN']
    })
  })

  test('POST with invalid data re-renders form with errors', async () => {
    const { result, statusCode, headers } = await postAddWithTypeChosen(
      getServer(),
      'add-post-invalid',
      { ...INVALID_ADDRESS_PAYLOAD, roles: VALID_ADDRESS_PAYLOAD.roles }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('There is a problem')
    expect(result).toContain(
      `Error: ${ADD_TITLE} - Import notification service - GOV.UK`
    )
    expectSummaryAndFieldErrors(load(result), INVALID_ADDRESS_PAYLOAD_ERRORS)
    expect(headers['cache-control']).toBe('no-store')
  })

  test('POST with a country the reference data does not list shows the select-a-country error', async () => {
    const creation = interceptAddressBookRequest('POST', addressesApiPath())

    const { result, statusCode } = await postAddWithTypeChosen(
      getServer(),
      'add-post-unlisted-country',
      {
        ...VALID_ADDRESS_PAYLOAD,
        countryCode: 'ZZ'
      }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expectSummaryAndFieldErrors(load(result), [
      ['countryCode', REQUIRED_MESSAGES.countryCode]
    ])
    creation.expectNotSent()
  })

  test('Cancel returns to list without creating an address', async () => {
    const creation = interceptAddressBookRequest('POST', addressesApiPath())
    const response = await postAdd(getServer(), 'add-post-cancel', {
      cancel: 'true'
    })

    expectRedirectTo(response, addressBookPath())
    expect(response.headers['cache-control']).not.toBe('no-store')
    creation.expectNotSent()
  })
})

describe(
  '#addressBookAddController — address type guard',
  { concurrent: false },
  () => {
    const getServer = startRealModeServerServingCountries(COUNTRIES)
    const NO_TYPE_MESSAGE =
      'No address type chosen that this form serves, sending the user to choose one'
    const { entriesWith: loggedWith } = recordModuleLoggerInfo()

    test('GET with no address type chosen redirects to the address type page and logs it once', async () => {
      const response = await getAdd(getServer(), 'add-get-no-type')

      expectRedirectTo(response, addressTypePath())
      expect(loggedWith(NO_TYPE_MESSAGE)).toEqual([
        {
          fields: { organisationId: ORGANISATION_ID, path: addressAddPath() },
          message: NO_TYPE_MESSAGE
        }
      ])
    })

    test('POST with valid fields and no address type chosen redirects to the address type page, logs it once and sends the address book nothing', async () => {
      const createScope = serveAddressCreated()

      const response = await postAdd(
        getServer(),
        'add-post-no-type',
        VALID_ADDRESS_PAYLOAD
      )

      expectRedirectTo(response, addressTypePath())
      expect(createScope.isDone()).toBe(false)
      expect(loggedWith(NO_TYPE_MESSAGE)).toEqual([
        {
          fields: { organisationId: ORGANISATION_ID, path: addressAddPath() },
          message: NO_TYPE_MESSAGE
        }
      ])
    })

    test('GET with the Transporter type stored (which this form does not serve) redirects to the address type page and logs the stored type', async () => {
      const cookie = await cookieAfterChoosingAddressType(
        getServer(),
        'add-get-transporter-type',
        { addressType: ADDRESS_TYPES.TRANSPORTER }
      )

      const response = await getAdd(
        getServer(),
        'add-get-transporter-type',
        undefined,
        cookie
      )

      expectRedirectTo(response, addressTypePath())
      expect(loggedWith(NO_TYPE_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            path: addressAddPath(),
            storedAddressType: ADDRESS_TYPES.TRANSPORTER
          },
          message: NO_TYPE_MESSAGE
        }
      ])
    })

    test('GET after a successful save redirects to the address type page', async () => {
      serveAddressCreated()
      const sessionId = 'add-get-after-save'
      const saved = await postAddWithTypeChosen(
        getServer(),
        sessionId,
        VALID_ADDRESS_PAYLOAD
      )

      const response = await getAdd(
        getServer(),
        sessionId,
        {},
        cookieHeaderOf(saved.headers)
      )

      expectRedirectTo(response, addressTypePath())
    })
  }
)

describe(
  '#addressBookAddController — roles question',
  { concurrent: false },
  () => {
    const getServer = startRealModeServerServingCountries(COUNTRIES)
    const { entriesWith: loggedWith } = recordModuleLoggerInfo()
    const FIRST_ROLE_OF = (addressType) => ROLES_BY_ADDRESS_TYPE[addressType][0]
    const ROLE_CHECKBOXES = 'input[name="roles"]'

    test('GET after Origin or Consignor is chosen shows a section break after the contact fields, then the roles question with Place of origin and Consignor unticked and without hints', async () => {
      const { result, statusCode } = await getAddWithTypeChosen(
        getServer(),
        'add-get-roles'
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect(result.indexOf('id="phone"')).toBeLessThan(
        result.indexOf('govuk-section-break--visible')
      )
      expect(textsOf($, ROLES_LEGEND_SELECTOR)).toEqual([ROLES_LEGEND])
      expect(textsOf($, ROLES_HINT_SELECTOR)).toEqual([ROLES_HINT])
      expect(textsOf($, ROLE_LABEL_SELECTOR)).toEqual(ORIGIN_ROLE_LABELS)
      expect($('.govuk-checkboxes__hint')).toHaveLength(0)
      expect(tickedRolesOf($)).toEqual([])
      expect($(ROLE_CHECKBOXES).first().attr('id')).toBe('roles')
    })

    test.each([
      [
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        ROLES_LEGEND,
        ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
        ORIGIN_ROLE_LABELS
      ],
      [
        ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
        ADDRESS_TYPE_LEGEND,
        ['PLACE_OF_DESTINATION', 'CONSIGNEE', 'IMPORTER'],
        [PLACE_OF_DESTINATION_LABEL, 'Consignee', 'Importer']
      ],
      [
        ADDRESS_TYPES.BRANCH,
        ADDRESS_TYPE_LEGEND,
        ['BRANCH_ADDRESS'],
        ['Branch address']
      ]
    ])(
      'GET after %s is chosen asks %j with the hint and offers unticked, without hints, exactly the roles that type holds, the place roles first',
      async (addressType, legend, values, labels) => {
        const { result } = await getAddWithTypeChosen(
          getServer(),
          `add-get-roles-${addressType}`,
          { addressType }
        )

        const $ = load(result)
        expect(textsOf($, ROLES_LEGEND_SELECTOR)).toEqual([legend])
        expect(textsOf($, ROLES_HINT_SELECTOR)).toEqual([ROLES_HINT])
        expect(
          $(ROLE_CHECKBOXES)
            .map((_, input) => $(input).attr('value'))
            .get()
        ).toEqual(values)
        expect(textsOf($, ROLE_LABEL_SELECTOR)).toEqual(labels)
        expect($('.govuk-checkboxes__hint')).toHaveLength(0)
        expect(tickedRolesOf($)).toEqual([])
        expect([...values].sort()).toEqual(
          [...ROLES_BY_ADDRESS_TYPE[addressType]].sort()
        )
      }
    )

    test.each(ADDRESS_FORM_TYPES)(
      'POST after %s is chosen with valid fields and no role ticked shows the roles error inline and as the summary link to the first option, and sends nothing',
      async (addressType) => {
        const { roles: _noUse, ...fieldsOnly } = VALID_ADDRESS_PAYLOAD

        const { result, statusCode } = await postAddWithTypeChosen(
          getServer(),
          `add-post-no-role-${addressType}`,
          fieldsOnly,
          { addressType }
        )

        expect(statusCode).toBe(statusCodes.badRequest)
        const $ = load(result)
        expect(textsOf($, ERROR_SUMMARY_LINKS)).toEqual([ROLES_ERROR])
        expect($(ERROR_SUMMARY_LINKS).attr('href')).toBe('#roles')
        expect(textsOf($, '#roles-error')).toEqual([`Error: ${ROLES_ERROR}`])
        expect($(ROLE_CHECKBOXES).first().attr('id')).toBe('roles')
      }
    )

    test('POST with an invalid field and no role ticked shows the field error and the roles error together, in page order', async () => {
      const { roles: _noRole, ...fieldsOnly } = VALID_ADDRESS_PAYLOAD

      const { result, statusCode } = await postAddWithTypeChosen(
        getServer(),
        'add-post-invalid-no-role',
        { ...fieldsOnly, name: '' }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expectSummaryAndFieldErrors(load(result), [
        ['name', REQUIRED_MESSAGES.name],
        ['roles', ROLES_ERROR]
      ])
    })

    test('POST with an invalid field keeps the ticks the user made', async () => {
      const { result, statusCode } = await postAddWithTypeChosen(
        getServer(),
        'add-post-invalid-keeps-ticks',
        {
          ...VALID_ADDRESS_PAYLOAD,
          name: '',
          roles: ['PLACE_OF_ORIGIN', 'CONSIGNOR']
        }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(tickedRolesOf(load(result))).toEqual([
        'PLACE_OF_ORIGIN',
        'CONSIGNOR'
      ])
    })

    test('POST with Place of origin and Consignor ticked sends both roles to the address book, Place of origin first', async () => {
      const { scope, captured } = serveAddressCreationCapturingBody()

      const response = await postAddWithTypeChosen(
        getServer(),
        'add-post-both-origin-roles',
        { ...VALID_ADDRESS_PAYLOAD, roles: ['PLACE_OF_ORIGIN', 'CONSIGNOR'] }
      )

      expectRedirectTo(response, ORIGIN_OR_CONSIGNOR_LIST_PATH)
      expect(scope.isDone()).toBe(true)
      expect(captured.body.roles).toEqual(['PLACE_OF_ORIGIN', 'CONSIGNOR'])
    })

    test('POST with Consignor ticked and a role the type does not offer saves only Consignor, logs the discarded role and lands on the Origin and Consignor list', async () => {
      const { scope, captured } = serveAddressCreationCapturingBody()

      const response = await postAddWithTypeChosen(
        getServer(),
        'add-post-foreign-role',
        { ...VALID_ADDRESS_PAYLOAD, roles: ['CONSIGNOR', 'IMPORTER'] }
      )

      expectRedirectTo(response, ORIGIN_OR_CONSIGNOR_LIST_PATH)
      expect(scope.isDone()).toBe(true)
      expect(captured.body).toMatchObject({ roles: ['CONSIGNOR'] })
      expect(loggedWith(DISCARDED_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
            discardedRoles: ['IMPORTER']
          },
          message: DISCARDED_MESSAGE
        }
      ])
    })

    test('POST with only a role the type does not offer shows the roles error', async () => {
      const { result, statusCode } = await postAddWithTypeChosen(
        getServer(),
        'add-post-only-foreign-role',
        { ...VALID_ADDRESS_PAYLOAD, roles: 'IMPORTER' }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(textsOf(load(result), ERROR_SUMMARY_LINKS)).toEqual([ROLES_ERROR])
    })

    test.each(ADDRESS_FORM_TYPES)(
      'POST after %s is chosen saves the ticked role and lands on that type of the list',
      async (addressType) => {
        const { scope, captured } = serveAddressCreationCapturingBody()

        const response = await postAddWithTypeChosen(
          getServer(),
          `add-post-roles-${addressType}`,
          { ...VALID_ADDRESS_PAYLOAD, roles: FIRST_ROLE_OF(addressType) },
          { addressType }
        )

        expectRedirectTo(
          response,
          `${addressBookPath()}?addressType=${addressType}`
        )
        expect(scope.isDone()).toBe(true)
        expect(captured.body).toMatchObject({
          roles: [FIRST_ROLE_OF(addressType)]
        })
      }
    )
  }
)

describe(
  '#addressBookAddController — types that must be in the United Kingdom',
  { concurrent: false },
  () => {
    const getServer = startRealModeServerServingCountries(COUNTRIES)

    test.each(UNITED_KINGDOM_ADDRESS_TYPES)(
      'GET after %s is chosen offers United Kingdom alone, selected',
      async (addressType) => {
        const { result } = await getAddWithTypeChosen(
          getServer(),
          `add-get-uk-alone-${addressType}`,
          { addressType }
        )

        expectUnitedKingdomAloneSelected(load(result))
      }
    )

    test.each(UNITED_KINGDOM_ADDRESS_TYPES)(
      'POST after %s is chosen with France posted saves United Kingdom',
      async (addressType) => {
        const { scope, captured } = serveAddressCreationCapturingBody()

        await postAddWithTypeChosen(
          getServer(),
          `add-post-uk-only-${addressType}`,
          {
            ...VALID_ADDRESS_PAYLOAD,
            countryCode: 'FR',
            roles: ROLES_BY_ADDRESS_TYPE[addressType][0]
          },
          { addressType }
        )

        expect(scope.isDone()).toBe(true)
        expect(captured.body.countryCode).toBe(GB_COUNTRY.code)
      }
    )

    test.each(UNITED_KINGDOM_ADDRESS_TYPES)(
      'POST after %s is chosen with the name, postcode and phone blank and France posted lists those three errors only',
      async (addressType) => {
        const { result, statusCode } = await postAddWithTypeChosen(
          getServer(),
          `add-post-uk-only-blanks-${addressType}`,
          {
            ...VALID_ADDRESS_PAYLOAD,
            name: '',
            postcode: '',
            phone: '',
            countryCode: 'FR',
            roles: ROLES_BY_ADDRESS_TYPE[addressType][0]
          },
          { addressType }
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
    const getServer = startRealModeServerServingCountries(COUNTRIES)
    const { entriesWith: loggedWith } = recordModuleLoggerInfo()
    const REPLACED_MESSAGE =
      'Posted country was replaced with the country the address must be in'

    test.each(UNITED_KINGDOM_ADDRESS_TYPES)(
      'POST after %s is chosen with France posted logs the replaced country once, with the stored address id',
      async (addressType) => {
        serveAddressCreated()

        await postAddWithTypeChosen(
          getServer(),
          `add-log-replaced-${addressType}`,
          {
            ...VALID_ADDRESS_PAYLOAD,
            countryCode: 'FR',
            roles: ROLES_BY_ADDRESS_TYPE[addressType][0]
          },
          { addressType }
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
        getServer(),
        'add-log-not-replaced-gb',
        {
          ...VALID_ADDRESS_PAYLOAD,
          roles: 'CONSIGNEE'
        },
        { addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER }
      )
      const origin = serveAddressCreationCapturingBody()
      await postAddWithTypeChosen(getServer(), 'add-log-not-replaced-origin', {
        ...VALID_ADDRESS_PAYLOAD,
        countryCode: 'FR'
      })

      expect(destination.scope.isDone()).toBe(true)
      expect(origin.captured.body.countryCode).toBe('FR')
      expect(loggedWith(REPLACED_MESSAGE)).toEqual([])
    })

    test('POST from the consignee handshake with France posted logs the replaced country with the notification and fulfilment ids', async () => {
      serveAddressCreated()

      await postAdd(getServer(), 'add-log-replaced-consignee', {
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

    test('POST with France posted that is refused for a field error, a missing role or the address book logs nothing and shows each refusal', async () => {
      const destination = ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
      const france = {
        ...VALID_ADDRESS_PAYLOAD,
        countryCode: 'FR',
        roles: 'CONSIGNEE'
      }
      const { roles: _noRole, ...franceWithoutRole } = france

      const fieldError = await postAddWithTypeChosen(
        getServer(),
        'add-log-refused-field',
        { ...france, name: '' },
        { addressType: destination }
      )
      const rolesError = await postAddWithTypeChosen(
        getServer(),
        'add-log-refused-roles',
        franceWithoutRole,
        { addressType: destination }
      )
      addressBookApi()
        .post(addressesApiPath())
        .reply(statusCodes.badRequest, {
          type: VALIDATION_PROBLEM_TYPE,
          errors: { email: [EMAIL_FORMAT_ERROR] }
        })
      const refusedByAddressBook = await postAddWithTypeChosen(
        getServer(),
        'add-log-refused-address-book',
        france,
        { addressType: destination }
      )

      expect(textsOf(load(fieldError.result), ERROR_SUMMARY_LINKS)).toEqual([
        REQUIRED_MESSAGES.name
      ])
      expect(textsOf(load(rolesError.result), ERROR_SUMMARY_LINKS)).toEqual([
        ROLES_ERROR
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
    const getServer = startRealModeServerServingCountries(COUNTRIES)
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

    const postRefusedAddFor = async (sessionId, addressType, role) => {
      const refused = await postAddWithTypeChosen(
        getServer(),
        sessionId,
        { ...ENTERED_FIELDS, roles: role },
        { addressType }
      )
      expect(refused.statusCode).toBe(statusCodes.badRequest)
      return cookieHeaderOf(refused.headers)
    }

    test.each([
      [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, 'PLACE_OF_ORIGIN'],
      [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER, 'CONSIGNEE'],
      [ADDRESS_TYPES.BRANCH, 'BRANCH_ADDRESS']
    ])(
      'GET after a refused save of %s and choosing it again shows every field entered and the ticked role %s',
      async (addressType, role) => {
        const sessionId = `add-kept-${addressType}`
        const cookie = await postRefusedAddFor(sessionId, addressType, role)

        const { result } = await getAddWithTypeChosen(getServer(), sessionId, {
          addressType,
          cookie
        })

        const $ = load(result)
        expect(enteredValuesOf($)).toEqual(
          Object.fromEntries(
            TEXT_FIELDS.map((field) => [field, ENTERED_FIELDS[field]])
          )
        )
        expect(tickedRolesOf($)).toEqual([role])
      }
    )

    test('GET after a refused save and choosing another type shows every field entered', async () => {
      const sessionId = 'add-kept-other-type'
      const cookie = await postRefusedAddFor(
        sessionId,
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        'PLACE_OF_ORIGIN'
      )

      const { result } = await getAddWithTypeChosen(getServer(), sessionId, {
        addressType: ADDRESS_TYPES.BRANCH,
        cookie
      })

      expect(enteredValuesOf(load(result))).toEqual(
        Object.fromEntries(
          TEXT_FIELDS.map((field) => [field, ENTERED_FIELDS[field]])
        )
      )
    })

    test('GET after starting a new address opens empty text fields with United Kingdom selected', async () => {
      const sessionId = 'add-kept-cleared-by-start'
      const cookie = await postRefusedAddFor(
        sessionId,
        ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        'PLACE_OF_ORIGIN'
      )
      const started = await getPage(
        getServer(),
        addressTypeStartPath(),
        sessionId,
        cookie
      )

      const { result } = await getAddWithTypeChosen(getServer(), sessionId, {
        cookie: cookieHeaderOf(started.headers) || cookie
      })

      const $ = load(result)
      expect(enteredValuesOf($)).toEqual(
        Object.fromEntries(TEXT_FIELDS.map((field) => [field, '']))
      )
      expectPlaceholderThenCountriesUnitedKingdomSelected(
        $,
        SERVED_COUNTRY_NAMES
      )
      expect(tickedRolesOf($)).toEqual([])
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
        getServer(),
        addressAddPath(),
        sessionId,
        VALID_ADDRESS_PAYLOAD,
        cookie
      )

      const { result } = await getAddWithTypeChosen(getServer(), sessionId, {
        cookie: cookieHeaderOf(saved.headers) || cookie
      })

      expect(enteredValuesOf(load(result))).toEqual(
        Object.fromEntries(TEXT_FIELDS.map((field) => [field, '']))
      )
    })
  }
)

describe(
  '#addressBookAddController — journey handshake role',
  { concurrent: false },
  () => {
    const getServer = startRealModeServerServingCountries(COUNTRIES)
    const { entriesWith: loggedWith } = recordModuleLoggerInfo()

    test.each(Object.entries(ROLES_BY_PARTY))(
      'POST from the %s handshake saves the address with only its own role when the posted role is from outside its side',
      async (party, { ownRole }) => {
        const { scope, captured } = serveAddressCreationCapturingBody()

        await postAdd(getServer(), `add-post-handshake-type-${party}`, {
          ...JOURNEY_HANDSHAKES_BY_PARTY[party],
          ...VALID_ADDRESS_FIELDS,
          roles: ['BRANCH_ADDRESS']
        })

        expect(scope.isDone()).toBe(true)
        expect(captured.body).toMatchObject({ roles: [ownRole] })
      }
    )

    test('POST from the consignee handshake with Importer ticked saves the consignee and importer roles and hands back with the select landing', async () => {
      const { scope, captured } = serveAddressCreationCapturingBody()

      const response = await postAdd(getServer(), 'add-post-handshake-ticked', {
        ...CONSIGNEE_HANDSHAKE,
        ...VALID_ADDRESS_FIELDS,
        roles: 'IMPORTER',
        action: ADDRESS_LANDING.SELECT
      })

      expect(scope.isDone()).toBe(true)
      expect(captured.body).toMatchObject({ roles: ['CONSIGNEE', 'IMPORTER'] })
      expectRedirectTo(
        response,
        returnUrlFor(CONSIGNEE_HANDSHAKE, {
          addressId: ADDRESS_ID,
          landing: ADDRESS_LANDING.SELECT
        })
      )
    })

    test('POST from the consignee handshake with a role from outside its side logs the discarded role against the notification and fulfilment', async () => {
      serveAddressCreated()

      await postAdd(getServer(), 'add-post-handshake-discard', {
        ...CONSIGNEE_HANDSHAKE,
        ...VALID_ADDRESS_FIELDS,
        roles: ['IMPORTER', 'CONSIGNOR']
      })

      expect(loggedWith(DISCARDED_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            notificationId: CONSIGNEE_HANDSHAKE['notification-id'],
            fulfilmentId: CONSIGNEE_HANDSHAKE['fulfilment-id'],
            discardedRoles: ['CONSIGNOR']
          },
          message: DISCARDED_MESSAGE
        }
      ])
    })

    test('POST from the consignee handshake with a field error re-renders with exactly the offered role ticked', async () => {
      const { result, statusCode } = await postAdd(
        getServer(),
        'add-post-handshake-ticks-kept',
        {
          ...CONSIGNEE_HANDSHAKE,
          ...VALID_ADDRESS_FIELDS,
          postcode: '',
          roles: ['IMPORTER', 'PLACE_OF_ORIGIN']
        }
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(tickedRolesOf(load(result))).toEqual(['IMPORTER'])
    })

    test.each([ADDRESS_LANDING.SELECT, ADDRESS_LANDING.RETURN])(
      'POST from the consignee handshake with Save action %s and answers missing re-renders the errors in field order, keeps the name and the tick, and writes nothing',
      async (action) => {
        const createRequested = serveAddressCreated()

        const { result, statusCode } = await postAdd(
          getServer(),
          `add-post-handshake-blank-${action}`,
          {
            ...CONSIGNEE_HANDSHAKE,
            name: 'Highland Livestock Ltd',
            countryCode: 'GB',
            roles: 'IMPORTER',
            action
          }
        )

        expect(statusCode).toBe(statusCodes.badRequest)
        const $ = load(result)
        expectSummaryAndFieldErrors($, [
          ['addressLine1', 'Enter address line 1'],
          ['townOrCity', 'Enter a town or city'],
          ['postcode', REQUIRED_MESSAGES.postcode],
          ['email', 'Enter an email address'],
          ['phone', REQUIRED_MESSAGES.phone]
        ])
        expect($('#name').val()).toBe('Highland Livestock Ltd')
        expect(tickedRolesOf($)).toEqual(['IMPORTER'])
        expect(createRequested.isDone()).toBe(false)
      }
    )

    test('POST from the consignment contact handshake saves the address as a Branch address', async () => {
      const { scope, captured } = serveAddressCreationCapturingBody()

      await postAdd(getServer(), 'add-post-handshake-type-contact', {
        ...CONSIGNMENT_CONTACT_HANDSHAKE,
        ...VALID_ADDRESS_FIELDS
      })

      expect(scope.isDone()).toBe(true)
      expect(captured.body).toMatchObject({ roles: ['BRANCH_ADDRESS'] })
    })

    test.each(Object.keys(ROLES_BY_PARTY))(
      'GET from the %s handshake asks what else the address should be used for after a section break, naming the role and offering only the other roles on its side, unticked',
      async (party) => {
        const { hint, labels } = otherRolesQuestionOf(party)
        const { result } = await getAdd(
          getServer(),
          `add-get-handshake-roles-${party}`,
          JOURNEY_HANDSHAKES_BY_PARTY[party]
        )

        const $ = load(result)
        expect(textsOf($, ROLES_LEGEND_SELECTOR)).toEqual([
          JOURNEY_ROLES_LEGEND
        ])
        expect(textsOf($, ROLES_HINT_SELECTOR)).toEqual([hint])
        expect(textsOf($, ROLE_LABEL_SELECTOR)).toEqual(labels)
        expect(tickedRolesOf($)).toEqual([])
      }
    )

    test('GET from the consignment contact handshake shows the address fields and no roles question', async () => {
      const { result } = await getAdd(
        getServer(),
        'add-get-handshake-no-roles',
        CONSIGNMENT_CONTACT_HANDSHAKE
      )

      const $ = load(result)
      expect(textsOf($, 'form legend')).toEqual([])
      expect(textsOf($, FORM_LABEL_SELECTOR)).toEqual(ADDRESS_FORM_LABELS)
      expect($('input[name="roles"]')).toHaveLength(0)
    })
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
    const getServer = startRealModeServerServingCountries(COUNTRIES)

    test('GET from a role handshake offers Save and select, Save and return to address page and a Cancel and return to hub link, and carries the journey forward in hidden fields', async () => {
      const { result, statusCode } = await getAdd(
        getServer(),
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
        getServer(),
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
        getServer(),
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
      expect(textsOf($, FORM_LABEL_SELECTOR)).toEqual([
        ...ADDRESS_FORM_LABELS,
        ...otherRolesQuestionOf('consignor').labels
      ])
    })

    test('GET from a role handshake links Back to the journey return with no address and no landing', async () => {
      const { result, statusCode } = await getAdd(
        getServer(),
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
    const getServer = startRealModeServerServingCountries(COUNTRIES)
    const { entriesWith: loggedWith } = recordModuleLoggerInfo()

    test('GET refuses an unrecognised journey type', async () => {
      const { statusCode } = await getAdd(
        getServer(),
        'add-get-unknown-journey',
        {
          ...CONSIGNOR_HANDSHAKE,
          'journey-type': UNREGISTERED_JOURNEY_TYPE
        }
      )

      expect(statusCode).toBe(statusCodes.notFound)
    })

    test('GET rejects an incomplete handshake query', async () => {
      const { statusCode } = await getAdd(
        getServer(),
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

      const response = await postAdd(getServer(), 'add-post-handshake', {
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
        getServer(),
        'add-post-handshake',
        response.headers
      )
      expect(load(listResponse.result)(SUCCESS_BANNER)).toHaveLength(0)
    })

    test('POST from a fulfilment id the registry does not list is refused with 404 and creates nothing', async () => {
      const scope = serveAddressCreated()

      const response = await postAdd(
        getServer(),
        'add-post-handshake-unlisted',
        {
          ...CONSIGNOR_HANDSHAKE,
          'fulfilment-id': 'not-a-fulfilment-id',
          ...VALID_ADDRESS_PAYLOAD,
          roles: 'CONSIGNOR',
          action: ADDRESS_LANDING.SELECT
        }
      )

      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(scope.isDone()).toBe(false)
    })

    test('POST of Save and return to address page returns to the journey with the new address id and the return landing', async () => {
      const scope = serveAddressCreated()

      const response = await postAdd(getServer(), 'add-post-handshake-return', {
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

      const response = await postAdd(
        getServer(),
        'add-post-handshake-contact',
        {
          ...CONSIGNMENT_CONTACT_HANDSHAKE,
          ...VALID_ADDRESS_PAYLOAD
        }
      )

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
        getServer(),
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
        await postAdd(getServer(), 'add-post-handshake-cancel-role', {
          cancel: 'true',
          ...CONSIGNOR_HANDSHAKE
        }),
        returnUrlFor(CONSIGNOR_HANDSHAKE, { landing: ADDRESS_LANDING.CANCEL })
      )
    })

    test('Cancel from the consignment contact handshake returns to the journey with no address and no landing, and logs the hand-back once', async () => {
      expectRedirectTo(
        await postAdd(getServer(), 'add-post-handshake-cancel', {
          cancel: 'true',
          ...CONSIGNMENT_CONTACT_HANDSHAKE
        }),
        returnUrlFor(CONSIGNMENT_CONTACT_HANDSHAKE)
      )
      expect(loggedWith(CANCEL_HAND_BACK_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
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
    const getServer = startRealModeServerServingCountries(COUNTRIES)
    const openAddFrom = async (party) => {
      const { result, statusCode } = await getAdd(
        getServer(),
        `add-get-handshake-${party}`,
        JOURNEY_HANDSHAKES_BY_PARTY[party]
      )
      expect(statusCode).toBe(statusCodes.ok)
      return load(result)
    }

    test.each(UNITED_KINGDOM_PARTIES)(
      'GET from the %s handshake offers United Kingdom alone, selected, with every field shown',
      async (party) => {
        const $ = await openAddFrom(party)

        expectUnitedKingdomAloneSelected($)
        expect(textsOf($, FORM_LABEL_SELECTOR)).toEqual([
          ...ADDRESS_FORM_LABELS,
          ...otherRolesQuestionOf(party).labels
        ])
      }
    )

    test.each(ANY_COUNTRY_PARTIES)(
      'GET from the %s handshake opens the Country select on Select a country, offers every served country and shows every field',
      async (party) => {
        const $ = await openAddFrom(party)

        expectPlaceholderThenCountriesNoneSelected($, SERVED_COUNTRY_NAMES)
        expect(textsOf($, FORM_LABEL_SELECTOR)).toEqual([
          ...ADDRESS_FORM_LABELS,
          ...otherRolesQuestionOf(party).labels
        ])
      }
    )

    test('POST from the consignee handshake shows the recoverable-error banner and United Kingdom alone, selected, when the address book fails', async () => {
      addressBookApi()
        .post(addressesApiPath())
        .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

      const { result, statusCode } = await postAdd(
        getServer(),
        'add-post-handshake-503',
        { ...CONSIGNEE_HANDSHAKE, ...VALID_ADDRESS_PAYLOAD }
      )

      const $ = load(result)
      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(textsOf($, '.govuk-notification-banner__content')).toEqual([
        'Sorry, there is a problem with the service. Try again in a few minutes.'
      ])
      expectUnitedKingdomAloneSelected($)
    })

    test('POST from the consignee handshake saves the address as United Kingdom whatever country is posted', async () => {
      const { scope, captured } = serveAddressCreationCapturingBody()

      const response = await postAdd(getServer(), 'add-post-consignee-france', {
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
        getServer(),
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
      ['consignor', 'no country', CONSIGNOR_HANDSHAKE, ''],
      [
        'consignor',
        'a country the list does not offer',
        CONSIGNOR_HANDSHAKE,
        'ZZ'
      ],
      ['consignment contact', 'no country', CONSIGNMENT_CONTACT_HANDSHAKE, ''],
      [
        'consignment contact',
        'a country the list does not offer',
        CONSIGNMENT_CONTACT_HANDSHAKE,
        'ZZ'
      ]
    ])(
      'POST from the %s handshake with %s shows Select a country and saves nothing',
      async (entry, _countryChoice, handshake, countryCode) => {
        const creation = interceptAddressBookRequest('POST', addressesApiPath())

        const { result, statusCode } = await postAdd(
          getServer(),
          `add-post-${entry.replaceAll(' ', '-')}-country-${countryCode || 'blank'}`,
          { ...handshake, ...VALID_ADDRESS_PAYLOAD, countryCode }
        )

        expect(statusCode).toBe(statusCodes.badRequest)
        expectSummaryAndFieldErrors(load(result), [
          ['countryCode', REQUIRED_MESSAGES.countryCode]
        ])
        creation.expectNotSent()
      }
    )

    test('POST from the consignor handshake with a 13-character postcode and a badly formed email shows both format errors and saves nothing', async () => {
      const creation = interceptAddressBookRequest('POST', addressesApiPath())

      const { result, statusCode } = await postAdd(
        getServer(),
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
      creation.expectNotSent()
    })
  }
)

describe(
  '#addressBookAddController — field layout',
  { concurrent: false },
  () => {
    const getServer = startRealModeServerServingCountries(COUNTRIES)

    test('GET renders name, address lines and email full width, town, county, postcode and country at one half, and phone at two thirds', async () => {
      const { result } = await getAddWithTypeChosen(
        getServer(),
        'add-get-widths'
      )

      expectAddressFormWidths(result)
    })

    test('GET sets autocomplete on address lines, town, postcode, email and phone, and none on name, county and country', async () => {
      const { result } = await getAddWithTypeChosen(
        getServer(),
        'add-get-autocomplete'
      )

      expectAddressFormAutocomplete(result)
    })

    test('GET lists Select a country first and opens the Country select on United Kingdom', async () => {
      const { result, statusCode } = await getAddWithTypeChosen(
        getServer(),
        'add-get-select-one'
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($(COUNTRY_OPTIONS).first().attr('value')).toBe('')
      expectPlaceholderThenCountriesUnitedKingdomSelected(
        $,
        SERVED_COUNTRY_NAMES
      )
    })

    test('GET lists the countries by name, not by code, with United Kingdom in its place', async () => {
      const { result } = await getAddWithTypeChosen(
        getServer(),
        'add-get-order'
      )

      const $ = load(result)
      const codes = $(COUNTRY_OPTIONS)
        .map((_, option) => $(option).attr('value'))
        .get()
        .filter(Boolean)

      expect(codes).toEqual(['FR', 'DE', 'CH', GB_COUNTRY.code])
    })
  }
)
