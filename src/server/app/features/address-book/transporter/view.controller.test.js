import { load } from 'cheerio'
import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressBookPath,
  ADDRESS_FORM_LABELS,
  BACK_LINK,
  COUNTRIES,
  expectRedirectTo,
  expectServerErrorPage,
  getPage,
  getPageAsOtherOrganisation,
  MALFORMED_ADDRESS_ID,
  serveAddressBookServerError,
  serveStoredTransporter,
  serveTransporterNotFound,
  STORED_TRANSPORTER,
  transporterApiPath
} from '../../../../common/test-helpers/address-book-requests.js'
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import {
  transporterDeletePath,
  transporterEditPath,
  transporterPath
} from '../../../shared/paths.js'
import { pathWithReturn } from '../return-to.js'

const UK_NAME = 'United Kingdom'
const INS_HOME = '/'
const BUTTON_GROUP = '.govuk-button-group'
const SUMMARY_LIST_KEY = '.govuk-summary-list__key'
const SUMMARY_LIST_VALUE = '.govuk-summary-list__value'
const SUMMARY_LIST_ROW = '.govuk-summary-list__row'

const ADDRESS_LINE_2_LABEL = 'Address line 2 (optional)'
const COUNTY_LABEL = 'County (optional)'
const COUNTRY_LABEL = 'Country'

const TRANSPORTER_TAB = `${addressBookPath()}?addressType=TRANSPORTER`

const rowsOf = ($) =>
  $(SUMMARY_LIST_ROW)
    .map((_, row) => ({
      key: textOf($, $(row).find(SUMMARY_LIST_KEY)),
      value: textOf($, $(row).find(SUMMARY_LIST_VALUE))
    }))
    .get()

describe('GET /address-book/transporter/{id}', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test("Should show the signed-in organisation's transporter field by field, with its country by name", async () => {
    const scope = serveStoredTransporter()

    const { result, statusCode } = await getPage(
      getServer(),
      transporterPath(STORED_TRANSPORTER.id),
      'transporter-view-get'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
    const $ = load(result)
    const labelsWithoutOptionalFields = ADDRESS_FORM_LABELS.filter(
      (label) => label !== ADDRESS_LINE_2_LABEL && label !== COUNTY_LABEL
    )
    const countryLabelIndex = labelsWithoutOptionalFields.indexOf(COUNTRY_LABEL)
    expect(textsOf($, SUMMARY_LIST_KEY)).toEqual([
      ...labelsWithoutOptionalFields.slice(0, countryLabelIndex + 1),
      'Type',
      ...labelsWithoutOptionalFields.slice(countryLabelIndex + 1)
    ])
    expect(textsOf($, SUMMARY_LIST_VALUE)).toEqual([
      STORED_TRANSPORTER.name,
      STORED_TRANSPORTER.addressLine1,
      STORED_TRANSPORTER.townOrCity,
      STORED_TRANSPORTER.postcode,
      UK_NAME,
      'Private',
      STORED_TRANSPORTER.email,
      STORED_TRANSPORTER.phone
    ])
  })

  test('Should ask the transporters resource alone, never the addresses resource', async () => {
    const scope = serveStoredTransporter()

    const { statusCode } = await getPage(
      getServer(),
      transporterPath(STORED_TRANSPORTER.id),
      'transporter-view-one-resource'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(scope.isDone()).toBe(true)
  })

  test('Should title the page with the transporter name', async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      transporterPath(STORED_TRANSPORTER.id),
      'transporter-view-title'
    )

    expect(textOf(load(result), 'head > title')).toBe(
      `${STORED_TRANSPORTER.name} - Import notification service - GOV.UK`
    )
  })

  test('Should show no approval number row for a private transporter, which cannot hold one', async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      transporterPath(STORED_TRANSPORTER.id),
      'transporter-view-private-no-approval'
    )

    expect(textsOf(load(result), SUMMARY_LIST_KEY)).not.toContain(
      'Approval number'
    )
  })

  test('Should show the fixed Northern Ireland country, the approval number and the type for a commercial transporter', async () => {
    serveStoredTransporter({
      ...STORED_TRANSPORTER,
      type: 'COMMERCIAL',
      countryCode: 'GB-NIR',
      approvalNumber: 'UK/BELF/T2/00104115'
    })

    const { result, statusCode } = await getPage(
      getServer(),
      transporterPath(STORED_TRANSPORTER.id),
      'transporter-view-commercial'
    )

    expect(statusCode).toBe(statusCodes.ok)
    const rows = rowsOf(load(result))
    expect(rows).toContainEqual({ key: 'Country', value: 'Northern Ireland' })
    expect(rows).toContainEqual({
      key: 'Approval number',
      value: 'UK/BELF/T2/00104115'
    })
    expect(rows).toContainEqual({ key: 'Type', value: 'Commercial' })
  })

  test('Should show an address line 2 and county the transporter holds, marked optional', async () => {
    serveStoredTransporter({
      ...STORED_TRANSPORTER,
      addressLine2: 'Unit 4',
      county: 'Aberdeenshire'
    })

    const { result } = await getPage(
      getServer(),
      transporterPath(STORED_TRANSPORTER.id),
      'transporter-view-optional-fields'
    )

    const rows = rowsOf(load(result))
    expect(rows).toContainEqual({ key: ADDRESS_LINE_2_LABEL, value: 'Unit 4' })
    expect(rows).toContainEqual({ key: COUNTY_LABEL, value: 'Aberdeenshire' })
  })

  test('Should offer to edit and to delete this same transporter', async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      transporterPath(STORED_TRANSPORTER.id),
      'transporter-view-actions'
    )

    const $ = load(result)
    const actions = $(BUTTON_GROUP).find('a')
    expect(actions.map((_, link) => $(link).attr('href')).get()).toEqual([
      transporterEditPath(STORED_TRANSPORTER.id),
      transporterDeletePath(STORED_TRANSPORTER.id)
    ])
  })

  test('Should carry the return it was opened with on to Edit and Delete', async () => {
    serveStoredTransporter()

    const { result } = await getPage(
      getServer(),
      pathWithReturn(transporterPath(STORED_TRANSPORTER.id), INS_HOME),
      'transporter-view-actions-return'
    )

    const $ = load(result)
    const actions = $(BUTTON_GROUP).find('a')
    expect(actions.map((_, link) => $(link).attr('href')).get()).toEqual([
      pathWithReturn(transporterEditPath(STORED_TRANSPORTER.id), INS_HOME),
      pathWithReturn(transporterDeletePath(STORED_TRANSPORTER.id), INS_HOME)
    ])
  })
})

describe('GET /address-book/transporter/{id} — leaving it, and ids it cannot serve', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test('Should go back to the address book on the Transporter tab when opened without a return', async () => {
    serveStoredTransporter()

    const { result, statusCode } = await getPage(
      getServer(),
      transporterPath(STORED_TRANSPORTER.id),
      'transporter-view-back-default'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(BACK_LINK).attr('href')).toBe(TRANSPORTER_TAB)
  })

  test('Should go back to the return it was opened with', async () => {
    serveStoredTransporter()

    const { result, statusCode } = await getPage(
      getServer(),
      pathWithReturn(transporterPath(STORED_TRANSPORTER.id), INS_HOME),
      'transporter-view-back-return'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)(BACK_LINK).attr('href')).toBe(INS_HOME)
  })

  test('Should redirect to the Transporter tab when no transporter is live at that id', async () => {
    serveTransporterNotFound(STORED_TRANSPORTER.id)

    expectRedirectTo(
      await getPage(
        getServer(),
        transporterPath(STORED_TRANSPORTER.id),
        'transporter-view-not-found'
      ),
      TRANSPORTER_TAB
    )
  })

  test('Should redirect to the Transporter tab for a soft-deleted transporter tombstone', async () => {
    serveStoredTransporter({ ...STORED_TRANSPORTER, deleted: true })

    expectRedirectTo(
      await getPage(
        getServer(),
        transporterPath(STORED_TRANSPORTER.id),
        'transporter-view-tombstone'
      ),
      TRANSPORTER_TAB
    )
  })

  test("Should redirect to the Transporter tab for another organisation's transporter", async () => {
    serveTransporterNotFound(STORED_TRANSPORTER.id)

    expectRedirectTo(
      await getPageAsOtherOrganisation(
        getServer(),
        transporterPath(STORED_TRANSPORTER.id),
        'transporter-view-other-organisation'
      ),
      TRANSPORTER_TAB
    )
  })

  test('Should redirect to the Transporter tab when the id is not a record id', async () => {
    expectRedirectTo(
      await getPage(
        getServer(),
        transporterPath(MALFORMED_ADDRESS_ID),
        'transporter-view-malformed-id'
      ),
      TRANSPORTER_TAB
    )
  })

  test('Should show the service error page when the address book fails', async () => {
    serveAddressBookServerError(transporterApiPath(STORED_TRANSPORTER.id))

    expectServerErrorPage(
      await getPage(
        getServer(),
        transporterPath(STORED_TRANSPORTER.id),
        'transporter-view-server-error'
      )
    )
  })
})
