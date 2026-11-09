import { load } from 'cheerio'
import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressBookPath,
  COUNTRIES,
  expectRedirectTo,
  expectServerErrorPage,
  getPage,
  getPageAsOtherOrganisation,
  interceptAddressBookRequest,
  MALFORMED_ADDRESS_ID,
  postPage,
  serveAddressBookServerError,
  serveStoredTransporter,
  serveTransporterNotFound,
  STORED_TRANSPORTER,
  transporterApiPath
} from '../../../../common/test-helpers/address-book-requests.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { textOf } from '../../../../common/test-helpers/rendered-text.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import { transporterEditPath, transporterPath } from '../../../shared/paths.js'
import { pathWithReturn } from '../return-to.js'
import { copy } from '../copy/copy.en.js'

const TRANSPORTER_ID = STORED_TRANSPORTER.id
const EDIT_PATH = transporterEditPath(TRANSPORTER_ID)
const TRANSPORTER_TAB = `${addressBookPath()}?addressType=TRANSPORTER`
const BACK_LINK = '.govuk-back-link'
const INS_HOME = '/'
const UPDATED_NAME = 'Highland Haulage and Sons Ltd'
const APPROVAL_NUMBER = 'UK/BELF/T2/00104115'
const RECOVERABLE_ERROR_MESSAGE =
  'Sorry, there is a problem with the service. Try again in a few minutes.'

const VALID_PRIVATE_PAYLOAD = {
  name: UPDATED_NAME,
  addressLine1: '14 Haulage Way',
  addressLine2: '',
  townOrCity: 'Inverness',
  county: '',
  postcode: 'IV2 3JH',
  countryCode: 'GB',
  email: 'ops@example.com',
  phone: '+44 1463 234567'
}

const STORED_COMMERCIAL = {
  ...STORED_TRANSPORTER,
  type: 'COMMERCIAL',
  countryCode: 'GB-NIR',
  approvalNumber: APPROVAL_NUMBER
}

const VALID_COMMERCIAL_PAYLOAD = {
  ...VALID_PRIVATE_PAYLOAD,
  countryCode: 'GB-NIR',
  approvalNumber: APPROVAL_NUMBER
}

const postEdit = (server, sessionId, payload, path = EDIT_PATH) =>
  postPage(server, path, sessionId, payload)

const valueOf = ($, field) => $(`#${field}`).attr('value')

describe('GET /address-book/transporter/{id}/edit', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test("Should open the private form holding the stored transporter's values", async () => {
    serveStoredTransporter()

    const { result, statusCode } = await getPage(
      getServer(),
      EDIT_PATH,
      'transporter-edit-get-private'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(valueOf($, 'name')).toBe(STORED_TRANSPORTER.name)
    expect(valueOf($, 'addressLine1')).toBe(STORED_TRANSPORTER.addressLine1)
    expect(valueOf($, 'postcode')).toBe(STORED_TRANSPORTER.postcode)
    expect(valueOf($, 'email')).toBe(STORED_TRANSPORTER.email)
    expect($('#countryCode option[selected]').attr('value')).toBe(
      STORED_TRANSPORTER.countryCode
    )
  })

  test('Should not ask the transporter type again', async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      EDIT_PATH,
      'transporter-edit-no-type-question'
    )

    expect(load(result)('input[name="transporterType"]')).toHaveLength(0)
  })

  test("Should title the page for editing a transporter's details", async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      EDIT_PATH,
      'transporter-edit-title'
    )

    expect(textOf(load(result), 'h1')).toBe(copy.editTransporter.title)
  })

  test('Should open the commercial form with its approval number and its country fixed and disabled', async () => {
    serveStoredTransporter(STORED_COMMERCIAL)

    const { result, statusCode } = await getPage(
      getServer(),
      EDIT_PATH,
      'transporter-edit-get-commercial'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(valueOf($, 'approvalNumber')).toBe(APPROVAL_NUMBER)
    expect($('#countryCode').attr('disabled')).toBeDefined()
    expect($('input[type="hidden"][name="countryCode"]').attr('value')).toBe(
      'GB-NIR'
    )
  })

  test("Should link Back to the transporter's own page, carrying any return", async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      pathWithReturn(EDIT_PATH, INS_HOME),
      'transporter-edit-back'
    )

    expect(load(result)(BACK_LINK).attr('href')).toBe(
      pathWithReturn(transporterPath(TRANSPORTER_ID), INS_HOME)
    )
  })

  test('Should redirect to the Transporter tab when no transporter is live at that id', async () => {
    serveTransporterNotFound(TRANSPORTER_ID)

    expectRedirectTo(
      await getPage(getServer(), EDIT_PATH, 'transporter-edit-not-live'),
      TRANSPORTER_TAB
    )
  })

  test('Should redirect to the Transporter tab for a tombstone', async () => {
    serveStoredTransporter({ ...STORED_TRANSPORTER, deleted: true })

    expectRedirectTo(
      await getPage(getServer(), EDIT_PATH, 'transporter-edit-tombstone'),
      TRANSPORTER_TAB
    )
  })

  test("Should redirect to the Transporter tab for another organisation's transporter", async () => {
    serveTransporterNotFound(TRANSPORTER_ID)

    expectRedirectTo(
      await getPageAsOtherOrganisation(
        getServer(),
        EDIT_PATH,
        'transporter-edit-other-org'
      ),
      TRANSPORTER_TAB
    )
  })

  test('Should redirect to the Transporter tab when the id is not a record id', async () => {
    expectRedirectTo(
      await getPage(
        getServer(),
        transporterEditPath(MALFORMED_ADDRESS_ID),
        'transporter-edit-malformed'
      ),
      TRANSPORTER_TAB
    )
  })

  test('Should show the service error page when the address book fails', async () => {
    serveAddressBookServerError(transporterApiPath(TRANSPORTER_ID))

    expectServerErrorPage(
      await getPage(getServer(), EDIT_PATH, 'transporter-edit-server-error')
    )
  })
})

describe('POST /address-book/transporter/{id}/edit', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  const interceptUnwantedUpdate = () =>
    interceptAddressBookRequest('PUT', transporterApiPath(TRANSPORTER_ID))

  test('Should send the edited fields with the stored type, and land on the Transporter tab', async () => {
    serveStoredTransporter()
    let sent
    const scope = addressBookApi()
      .put(transporterApiPath(TRANSPORTER_ID), (body) => {
        sent = body
        return true
      })
      .reply(statusCodes.ok, { ...STORED_TRANSPORTER, name: UPDATED_NAME })

    const response = await postEdit(
      getServer(),
      'transporter-edit-post',
      VALID_PRIVATE_PAYLOAD
    )

    expectRedirectTo(response, TRANSPORTER_TAB)
    expect(scope.isDone()).toBe(true)
    expect(sent).toEqual({ ...VALID_PRIVATE_PAYLOAD, type: 'PRIVATE' })
  })

  test('Should keep a commercial transporter commercial, under the fixed country', async () => {
    serveStoredTransporter(STORED_COMMERCIAL)
    let sent
    addressBookApi()
      .put(transporterApiPath(TRANSPORTER_ID), (body) => {
        sent = body
        return true
      })
      .reply(statusCodes.ok, { ...STORED_COMMERCIAL, name: UPDATED_NAME })

    await postEdit(
      getServer(),
      'transporter-edit-post-commercial',
      VALID_COMMERCIAL_PAYLOAD
    )

    expect(sent).toEqual({
      ...VALID_PRIVATE_PAYLOAD,
      approvalNumber: APPROVAL_NUMBER,
      countryCode: 'GB-NIR',
      type: 'COMMERCIAL'
    })
  })

  test('Should clear an optional field left blank', async () => {
    serveStoredTransporter({
      ...STORED_TRANSPORTER,
      addressLine2: 'Unit 4',
      county: 'Inverness-shire'
    })
    let sent
    addressBookApi()
      .put(transporterApiPath(TRANSPORTER_ID), (body) => {
        sent = body
        return true
      })
      .reply(statusCodes.ok, STORED_TRANSPORTER)

    await postEdit(getServer(), 'transporter-edit-clear-optional', {
      ...VALID_PRIVATE_PAYLOAD,
      addressLine2: '',
      county: ''
    })

    expect({ addressLine2: sent.addressLine2, county: sent.county }).toEqual({
      addressLine2: '',
      county: ''
    })
  })

  test('Should refuse a blank name, naming it, without updating', async () => {
    serveStoredTransporter()
    const update = interceptUnwantedUpdate()

    const { statusCode, result } = await postEdit(
      getServer(),
      'transporter-edit-blank-name',
      { ...VALID_PRIVATE_PAYLOAD, name: '' }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(load(result)('.govuk-error-summary').text()).toContain(
      copy.errors.name.required
    )
    update.expectNotSent()
  })

  test('Should refuse a commercial edit whose approval number was cleared', async () => {
    serveStoredTransporter(STORED_COMMERCIAL)
    const update = interceptUnwantedUpdate()

    const { statusCode, result } = await postEdit(
      getServer(),
      'transporter-edit-blank-approval',
      { ...VALID_COMMERCIAL_PAYLOAD, approvalNumber: '' }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(load(result)('.govuk-error-summary').text()).toContain(
      copy.errors.approvalNumber.required
    )
    update.expectNotSent()
  })

  test('Should refuse a commercial edit whose country was tampered with', async () => {
    serveStoredTransporter(STORED_COMMERCIAL)
    const update = interceptUnwantedUpdate()

    const { statusCode } = await postEdit(
      getServer(),
      'transporter-edit-tampered-country',
      { ...VALID_COMMERCIAL_PAYLOAD, countryCode: 'FR' }
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    update.expectNotSent()
  })

  test('Should leave the transporter as it was on Cancel, returning to its own page', async () => {
    const update = interceptUnwantedUpdate()

    const response = await postEdit(getServer(), 'transporter-edit-cancel', {
      ...VALID_PRIVATE_PAYLOAD,
      cancel: 'true'
    })

    expectRedirectTo(response, transporterPath(TRANSPORTER_ID))
    update.expectNotSent()
  })

  test('Should redirect to the Transporter tab when the transporter is not live', async () => {
    serveTransporterNotFound(TRANSPORTER_ID)
    const update = interceptUnwantedUpdate()

    expectRedirectTo(
      await postEdit(
        getServer(),
        'transporter-edit-post-not-live',
        VALID_PRIVATE_PAYLOAD
      ),
      TRANSPORTER_TAB
    )
    update.expectNotSent()
  })

  test('Should re-render with the recoverable error message when the update fails', async () => {
    serveStoredTransporter()
    addressBookApi()
      .put(transporterApiPath(TRANSPORTER_ID))
      .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

    const { statusCode, result } = await postEdit(
      getServer(),
      'transporter-edit-recoverable',
      VALID_PRIVATE_PAYLOAD
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(load(result).text()).toContain(RECOVERABLE_ERROR_MESSAGE)
  })
})
