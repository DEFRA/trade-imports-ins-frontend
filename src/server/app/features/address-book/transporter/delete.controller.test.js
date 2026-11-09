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
import {
  transporterDeletePath,
  transporterPath
} from '../../../shared/paths.js'
import { pathWithReturn } from '../return-to.js'
import { copy } from '../copy/copy.en.js'
import {
  deletedSuccessMessage,
  transporterSummaryLines
} from './delete.controller.js'

const TRANSPORTER_ID = STORED_TRANSPORTER.id
const DELETE_PATH = transporterDeletePath(TRANSPORTER_ID)
const TRANSPORTER_TAB = `${addressBookPath()}?addressType=TRANSPORTER`
const BACK_LINK = '.govuk-back-link'
const INS_HOME = '/'
const SUMMARY_LIST_KEY = '.govuk-summary-list__key'
const SUMMARY_LIST_VALUE = '.govuk-summary-list__value'

const STORED_COMMERCIAL = {
  ...STORED_TRANSPORTER,
  type: 'COMMERCIAL',
  countryCode: 'GB-NIR',
  approvalNumber: 'UK/BELF/T2/00104115'
}

describe('#transporterSummaryLines', () => {
  test('Should read the name, then the address lines it holds, then the country', () => {
    expect(
      transporterSummaryLines(
        { ...STORED_TRANSPORTER, addressLine2: '', county: '' },
        'United Kingdom'
      )
    ).toEqual([
      STORED_TRANSPORTER.name,
      STORED_TRANSPORTER.addressLine1,
      STORED_TRANSPORTER.townOrCity,
      STORED_TRANSPORTER.postcode,
      'United Kingdom'
    ])
  })

  test('Should leave out an address line the transporter does not hold', () => {
    expect(transporterSummaryLines({ name: 'Just A Name' }, undefined)).toEqual(
      ['Just A Name']
    )
  })
})

describe('#deletedSuccessMessage', () => {
  test('Should name the transporter it deleted', () => {
    expect(deletedSuccessMessage('Highland Haulage Ltd')).toBe(
      'Highland Haulage Ltd deleted from your address book'
    )
  })

  test('Should fall back to the unnamed message when the record has no name', () => {
    expect(deletedSuccessMessage('')).toBe(
      copy.successBanner.transporterDeletedUnnamed
    )
  })
})

describe('GET /address-book/transporter/{id}/delete', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test('Should ask for confirmation, summarising the transporter it would delete', async () => {
    serveStoredTransporter()

    const { result, statusCode } = await getPage(
      getServer(),
      DELETE_PATH,
      'transporter-delete-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect(textOf($, 'h1')).toBe(copy.deleteTransporter.title)
    expect(textOf($, SUMMARY_LIST_KEY)).toBe(
      copy.deleteTransporter.summaryTransporter
    )
    const summary = $(SUMMARY_LIST_VALUE).text()
    expect(summary).toContain(STORED_TRANSPORTER.name)
    expect(summary).toContain(STORED_TRANSPORTER.addressLine1)
    expect(summary).toContain(STORED_TRANSPORTER.postcode)
  })

  test('Should offer an action to confirm and a way to cancel back to the transporter', async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      DELETE_PATH,
      'transporter-delete-actions'
    )

    const $ = load(result)
    expect($('button').text()).toContain(copy.deleteTransporter.confirm)
    expect($(`a:contains(${copy.deleteTransporter.cancel})`).attr('href')).toBe(
      transporterPath(TRANSPORTER_ID)
    )
  })

  test("Should name a commercial transporter's country as Northern Ireland", async () => {
    serveStoredTransporter(STORED_COMMERCIAL)

    const { result } = await getPage(
      getServer(),
      DELETE_PATH,
      'transporter-delete-commercial-country'
    )

    expect(load(result)(SUMMARY_LIST_VALUE).text()).toContain(
      'Northern Ireland'
    )
  })

  test("Should link Back to the transporter's own page, carrying any return", async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      pathWithReturn(DELETE_PATH, INS_HOME),
      'transporter-delete-back'
    )

    expect(load(result)(BACK_LINK).attr('href')).toBe(
      pathWithReturn(transporterPath(TRANSPORTER_ID), INS_HOME)
    )
  })

  test('Should redirect to the Transporter tab when no transporter is live at that id', async () => {
    serveTransporterNotFound(TRANSPORTER_ID)

    expectRedirectTo(
      await getPage(getServer(), DELETE_PATH, 'transporter-delete-not-live'),
      TRANSPORTER_TAB
    )
  })

  test("Should redirect to the Transporter tab for another organisation's transporter", async () => {
    serveTransporterNotFound(TRANSPORTER_ID)

    expectRedirectTo(
      await getPageAsOtherOrganisation(
        getServer(),
        DELETE_PATH,
        'transporter-delete-other-org'
      ),
      TRANSPORTER_TAB
    )
  })

  test('Should redirect to the Transporter tab when the id is not a record id', async () => {
    expectRedirectTo(
      await getPage(
        getServer(),
        transporterDeletePath(MALFORMED_ADDRESS_ID),
        'transporter-delete-malformed'
      ),
      TRANSPORTER_TAB
    )
  })

  test('Should show the service error page when the address book fails', async () => {
    serveAddressBookServerError(transporterApiPath(TRANSPORTER_ID))

    expectServerErrorPage(
      await getPage(getServer(), DELETE_PATH, 'transporter-delete-error')
    )
  })
})

describe('POST /address-book/transporter/{id}/delete', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  const interceptUnwantedDelete = () =>
    interceptAddressBookRequest('DELETE', transporterApiPath(TRANSPORTER_ID))

  test('Should delete the transporter and land on the Transporter tab', async () => {
    serveStoredTransporter()
    const scope = addressBookApi()
      .delete(transporterApiPath(TRANSPORTER_ID))
      .reply(statusCodes.noContent)

    const response = await postPage(
      getServer(),
      DELETE_PATH,
      'transporter-delete-post',
      {}
    )

    expectRedirectTo(response, TRANSPORTER_TAB)
    expect(scope.isDone()).toBe(true)
  })

  test('Should redirect to the Transporter tab without deleting when it is not live', async () => {
    serveTransporterNotFound(TRANSPORTER_ID)
    const deletion = interceptUnwantedDelete()

    expectRedirectTo(
      await postPage(
        getServer(),
        DELETE_PATH,
        'transporter-delete-post-not-live',
        {}
      ),
      TRANSPORTER_TAB
    )
    deletion.expectNotSent()
  })

  test('Should redirect to the Transporter tab when the transporter went while being deleted', async () => {
    serveStoredTransporter()
    addressBookApi()
      .delete(transporterApiPath(TRANSPORTER_ID))
      .reply(statusCodes.notFound, { message: 'Not found' })

    expectRedirectTo(
      await postPage(
        getServer(),
        DELETE_PATH,
        'transporter-delete-post-gone',
        {}
      ),
      TRANSPORTER_TAB
    )
  })

  test('Should show the service error page when the deletion fails', async () => {
    serveStoredTransporter()
    addressBookApi()
      .delete(transporterApiPath(TRANSPORTER_ID))
      .reply(statusCodes.serviceUnavailable, { title: 'Service Unavailable' })

    expectServerErrorPage(
      await postPage(
        getServer(),
        DELETE_PATH,
        'transporter-delete-post-error',
        {}
      )
    )
  })
})
