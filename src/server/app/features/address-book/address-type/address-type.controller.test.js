import { load } from 'cheerio'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../../config/config.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADD_ADDRESS_PATH,
  ADDRESS_BOOK_PATH,
  ADDRESS_TYPE_PATH,
  BACK_LINK,
  chooseAddressTypeForCookie,
  cookieHeaderOf,
  expectRedirectTo,
  getPage,
  postPage
} from '../../../../common/test-helpers/address-book-requests.js'
import { captureInfoLogs } from '../../../../common/test-helpers/capture-info-logs.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { startRealModeServer } from '../../../../common/test-helpers/test-server.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { addressTypeStartPath } from '../../../shared/paths.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const CAPTION = '.govuk-caption-l'
const LEGEND = 'fieldset legend'
const RADIOS = '.govuk-radios__input'
const CHECKED_RADIOS = '.govuk-radios__input[checked]'
const RADIO_LABELS = '.govuk-radios__label'
const RADIO_HINTS = '.govuk-radios__hint'
const ERROR_LINKS = '.govuk-error-summary__list a'
const INLINE_ERROR = '.govuk-error-message'
const MISSING_TYPE_MESSAGE = 'Select an address type'
const UNSUPPORTED_ADDRESS_TYPE = 'TRANSPORTER'

const checkedValuesOf = ($) =>
  $(CHECKED_RADIOS)
    .map((_, radio) => $(radio).attr('value'))
    .get()

describe('#addressTypeController', { concurrent: false }, () => {
  const server = startRealModeServer()
  const loggedWith = captureInfoLogs()

  beforeEach(() => {
    config.set('csrf.enabled', false)
  })

  test('GET shows the caption, the heading, a visually hidden legend, the three address types with their hints in order and none chosen, Continue and Back to the address book', async () => {
    const { result, statusCode, headers } = await getPage(
      server(),
      ADDRESS_TYPE_PATH,
      'type-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(headers['cache-control']).toBe('no-store')
    const $ = load(result)
    expect(textsOf($, CAPTION)).toEqual(['Add a new address'])
    expect(textsOf($, 'h1')).toEqual(['Choose an address type'])
    expect(textsOf($, LEGEND)).toEqual(['Choose an address type'])
    expect($(LEGEND).hasClass('govuk-visually-hidden')).toBe(true)
    expect(textsOf($, RADIO_LABELS)).toEqual([
      'Origin or Consignor',
      'Destination, Consignee or Importer',
      'Branch'
    ])
    expect(textsOf($, RADIO_HINTS)).toEqual([
      'Place of origin, Consignor',
      'Place of destination, Consignee, Importer',
      'Branch address'
    ])
    expect($(RADIOS)).toHaveLength(3)
    expect(checkedValuesOf($)).toEqual([])
    expect(textsOf($, 'form button')).toEqual(['Continue'])
    expect($(BACK_LINK).attr('href')).toBe(ADDRESS_BOOK_PATH)
    expect(textOf($, 'head title')).toBe(
      'Choose an address type - Import notification service - GOV.UK'
    )
  })

  test('POST with no address type answers 400 with the message inline and as the summary link to the first option', async () => {
    const { result, statusCode } = await postPage(
      server(),
      ADDRESS_TYPE_PATH,
      'type-post-none',
      {}
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    const $ = load(result)
    expect(textOf($, INLINE_ERROR)).toBe(`Error: ${MISSING_TYPE_MESSAGE}`)
    expect(textsOf($, ERROR_LINKS)).toEqual([MISSING_TYPE_MESSAGE])
    expect($(ERROR_LINKS).attr('href')).toBe('#addressType')
    expect($(RADIOS).first().attr('id')).toBe('addressType')
    expect(textOf($, 'head title')).toBe(
      'Error: Choose an address type - Import notification service - GOV.UK'
    )
  })

  test('POST with a value that is not an offered address type answers as a missing type does', async () => {
    const { result, statusCode } = await postPage(
      server(),
      ADDRESS_TYPE_PATH,
      'type-post-unsupported',
      { addressType: UNSUPPORTED_ADDRESS_TYPE }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(textsOf(load(result), ERROR_LINKS)).toEqual([MISSING_TYPE_MESSAGE])
  })

  test.each(Object.values(ADDRESS_TYPES))(
    'POST of %s goes to the add form and the type page then shows it chosen',
    async (addressType) => {
      const sessionId = `type-post-${addressType}`
      const response = await postPage(server(), ADDRESS_TYPE_PATH, sessionId, {
        addressType
      })

      expectRedirectTo(response, ADD_ADDRESS_PATH)
      const { result } = await getPage(
        server(),
        ADDRESS_TYPE_PATH,
        sessionId,
        cookieHeaderOf(response.headers)
      )
      expect(checkedValuesOf(load(result))).toEqual([addressType])
    }
  )

  test('GET of the start address with a type already chosen shows none chosen', async () => {
    const cookie = await chooseAddressTypeForCookie(server(), 'type-start')

    const { result } = await getPage(
      server(),
      addressTypeStartPath(),
      'type-start',
      cookie
    )

    expect(checkedValuesOf(load(result))).toEqual([])
  })

  test('GET of the start address logs once that a new address is starting', async () => {
    const message = 'Starting a new address, clearing the address being added'

    await getPage(server(), addressTypeStartPath(), 'type-start-log')

    expect(loggedWith(message)).toEqual([
      {
        fields: { organisationId: ORGANISATION_ID, path: ADDRESS_TYPE_PATH },
        message
      }
    ])
  })
})
