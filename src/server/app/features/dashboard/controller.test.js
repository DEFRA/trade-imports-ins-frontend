import { load } from 'cheerio'
import { describe, expect, test } from 'vitest'

import { config } from '../../../../config/config.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { sessionAuth } from '../../../common/test-helpers/session-auth.js'
import { insBackendApi } from '../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../common/test-helpers/test-server.js'

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]
const ANIMALS_BASE_URL = config.get('tradeImportsAnimalsFrontend.baseUrl')
const NOTIFICATIONS_PATH = '/notifications'
const DEFAULT_QUERY = { page: '1', sort: 'arrivalDate,desc' }
const REFERENCE_NUMBER = 'GBN-AG-26-000001'
const OTHER_REFERENCE_NUMBER = 'GBN-AG-26-000002'
const ARRIVAL_DATE = '2026-09-10'
const CREATE_NEW_SELECTOR = 'main a[role="button"]'

const pageOf = (content, overrides = {}) => ({
  content,
  page: 1,
  size: 25,
  numberOfElements: content.length,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  ...overrides
})

const expectOneCreateNewButton = (result) => {
  const buttons = load(result)(CREATE_NEW_SELECTOR)

  expect(buttons).toHaveLength(1)
  expect(buttons.text().trim()).toBe('Create new')
  expect(buttons.attr('href')).toBe('/notification-type')
  return buttons
}

const documentOrderOf = (result, selectors) =>
  load(result)(selectors.join(','))
    .toArray()
    .map((element) => element.tagName)

describe('#dashboard', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test('renders notifications with reference, status, origin, commodity and arrival date, and a standard Create new button between the heading and the search and table', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: REFERENCE_NUMBER,
            status: 'SUBMITTED',
            originCountry: 'FR',
            commodity: 'Cattle',
            arrivalDate: ARRIVAL_DATE
          }
        ])
      )

    const { result, statusCode } = await getServer().inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-with-notifications')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('govuk-grid-column-full')
    expect(result).toContain('Dashboard')
    expect(result).toContain(REFERENCE_NUMBER)
    expect(result).toContain('SUBMITTED')
    expect(result).toContain('France')
    expect(result).not.toContain('>FR<')
    expect(result).toContain('>Cattle</td>')
    expect(result).toContain('10 Sep 2026')
    expect(result).toContain('Showing 1-1 of 1')
    expect(expectOneCreateNewButton(result).attr('class')).toBe('govuk-button')
    expect(
      documentOrderOf(result, [
        'h1',
        CREATE_NEW_SELECTOR,
        'input[type="search"]',
        'table'
      ])
    ).toEqual(['h1', 'a', 'input', 'table'])
  })

  test('notifications from more than one status all appear in the same list', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf(
          [
            {
              referenceNumber: REFERENCE_NUMBER,
              status: 'SUBMITTED',
              originCountry: 'GB',
              arrivalDate: ARRIVAL_DATE
            },
            {
              referenceNumber: OTHER_REFERENCE_NUMBER,
              status: 'DRAFT',
              originCountry: 'GB',
              arrivalDate: '2026-09-11'
            }
          ],
          { totalElements: 2, totalPages: 1 }
        )
      )

    const { result } = await getServer().inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-two-statuses')
    })

    expect(result).toContain(REFERENCE_NUMBER)
    expect(result).toContain(OTHER_REFERENCE_NUMBER)
  })

  test('selecting a submitted notification links into the notification-view page', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: REFERENCE_NUMBER,
            status: 'SUBMITTED',
            originCountry: 'GB',
            arrivalDate: ARRIVAL_DATE
          }
        ])
      )

    const { result } = await getServer().inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-submitted-link')
    })

    expect(result).toContain(
      `href="${ANIMALS_BASE_URL}/live-animals/notifications/${REFERENCE_NUMBER}/notification-view"`
    )
  })

  test('selecting a draft notification links to the notification journey hub', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(
        200,
        pageOf([
          {
            referenceNumber: OTHER_REFERENCE_NUMBER,
            status: 'DRAFT',
            originCountry: 'GB',
            arrivalDate: ARRIVAL_DATE
          }
        ])
      )

    const { result } = await getServer().inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-draft-link')
    })

    expect(
      load(result)('td a.govuk-link')
        .map((_index, link) => link.attribs.href)
        .toArray()
    ).toEqual([
      `${ANIMALS_BASE_URL}/live-animals/notifications/${OTHER_REFERENCE_NUMBER}`
    ])
  })
})

describe('#dashboard — search, sort and errors', () => {
  const getServer = startRealModeServerServingCountries(COUNTRIES)

  test('searching by complete reference asks the backend for that reference, shows it and still offers Create new', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ ...DEFAULT_QUERY, referenceNumber: REFERENCE_NUMBER })
      .reply(
        200,
        pageOf([
          {
            referenceNumber: REFERENCE_NUMBER,
            status: 'SUBMITTED',
            originCountry: 'GB',
            arrivalDate: ARRIVAL_DATE
          }
        ])
      )

    const { result } = await getServer().inject({
      method: 'GET',
      url: `/?referenceNumber=${REFERENCE_NUMBER}`,
      auth: sessionAuth('dashboard-search-match')
    })

    const referenceCell = load(result)('.govuk-table__body td').first()

    expect(scope.isDone()).toBe(true)
    expect(referenceCell.text().trim()).toBe(REFERENCE_NUMBER)
    expectOneCreateNewButton(result)
  })

  test('no matching notification shows "No notifications found" and still offers Create new', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({ ...DEFAULT_QUERY, referenceNumber: 'GBN-AG-26-999999' })
      .reply(200, pageOf([]))

    const { result, statusCode } = await getServer().inject({
      method: 'GET',
      url: '/?referenceNumber=GBN-AG-26-999999',
      auth: sessionAuth('dashboard-search-no-match')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No notifications found')
    expectOneCreateNewButton(result)
  })

  test('empty aggregated store shows the empty text and the Create new button', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(200, pageOf([]))

    const { result, statusCode } = await getServer().inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-empty-store')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('There are no notifications yet.')
    expectOneCreateNewButton(result)
  })

  test('sort and referenceNumber are forwarded to the backend', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query({
        page: '1',
        sort: 'lastUpdated,asc',
        referenceNumber: REFERENCE_NUMBER
      })
      .reply(200, pageOf([]))

    await getServer().inject({
      method: 'GET',
      url: `/?sort=lastUpdated,asc&referenceNumber=${REFERENCE_NUMBER}`,
      auth: sessionAuth('dashboard-sort-forward')
    })

    expect(scope.isDone()).toBe(true)
  })

  test('an unrecognised sort value falls back to the default rather than reaching the backend', async () => {
    const scope = insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(200, pageOf([]))

    await getServer().inject({
      method: 'GET',
      url: '/?sort=not-a-real-option',
      auth: sessionAuth('dashboard-sort-invalid')
    })

    expect(scope.isDone()).toBe(true)
  })

  test('shows the recoverable-error banner and the Create new button under the heading when the backend call fails', async () => {
    insBackendApi()
      .get(NOTIFICATIONS_PATH)
      .query(DEFAULT_QUERY)
      .reply(500, { title: 'Internal Server Error' })

    const { result, statusCode } = await getServer().inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('dashboard-error')
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toContain('govuk-notification-banner')
    expect(result).toContain(
      'Sorry, there is a problem with the service. Try again in a few minutes.'
    )
    expectOneCreateNewButton(result)
    expect(
      documentOrderOf(result, [
        'h1',
        CREATE_NEW_SELECTOR,
        'input[type="search"]'
      ])
    ).toEqual(['h1', 'a', 'input'])
  })
})
