import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import { addressBookApi } from '../../../../common/test-helpers/real-mode.js'
import { startRealModeServerServingCountries } from '../../../../common/test-helpers/test-server.js'
import {
  ADDRESSES_PATH,
  LIST_URL,
  NO_RESULTS_LINE,
  TABLE_HEADINGS,
  bodyRowCountOf,
  contentOf,
  countries,
  fullAddress,
  greenFarmAddress,
  highlandAddress,
  listPageOf,
  pageOf,
  resultsLineOf,
  rowCellsOf,
  tableHeadOf,
  tagNamesOf
} from './list.test-support.js'

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const ADD_PATH = '/address-book/add'

const anchorsAfterFilterForm = ($) =>
  contentOf($)
    .children('form')
    .nextAll()
    .find('a')
    .map((_, anchor) => $(anchor).attr('href'))
    .get()

describe('#addressBookListLayout', () => {
  const server = startRealModeServerServingCountries(countries)
  const getList = (url, sessionId) => listPageOf(server(), url, sessionId)

  test('lays the page out as heading, large intro, Add button, then the filter form wrapping a collapsed Filter addresses disclosure', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highlandAddress]))

    const { $ } = await getList(LIST_URL, 'list-layout')

    const content = contentOf($)
    expect(tagNamesOf(content.children())).toEqual([
      'h1',
      'p',
      'div',
      'form',
      'p',
      'table'
    ])
    expect(content.children('h1').text()).toBe('Address book')
    expect(content.children('p.govuk-body-l').text()).toBe(
      'Manage your addresses for use across all your import notifications'
    )
    const addButton = content.children('div').find('a')
    expect(addButton.text().trim()).toBe('Add a new address')
    expect(addButton.attr('href')).toBe(ADD_PATH)
    const form = content.children('form')
    expect(form.attr('method')).toBe('get')
    expect(form.attr('action')).toBe(LIST_URL)
    expect(tagNamesOf(form.children())).toEqual(['details'])
    const disclosure = form.children('details')
    expect(disclosure.attr('open')).toBeUndefined()
    expect(disclosure.children('summary').text().trim()).toBe(
      'Filter addresses'
    )
  })

  test('holds the Search label, the input and one icon-only submit button inside the disclosure', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highlandAddress]))

    const { $ } = await getList(LIST_URL, 'list-search-controls')

    const controls = contentOf($).find('form details .govuk-details__text')
    expect(
      controls
        .find('label, input, button, .govuk-hint')
        .map((_, element) => ({
          tag: element.tagName,
          text: $(element).text().trim()
        }))
        .get()
    ).toEqual([
      { tag: 'label', text: 'Search' },
      { tag: 'input', text: '' },
      { tag: 'button', text: 'Search' }
    ])
    const input = controls.find('input')
    expect(input.attr('name')).toBe('q')
    expect(controls.find('label').attr('for')).toBe(input.attr('id'))
    expect(input.attr('placeholder')).toBe('Search by name, address or country')
    const button = controls.find('button')
    expect(button.attr('type')).toBe('submit')
    expect(tagNamesOf(button.children())).toEqual(['svg', 'span'])
    expect(button.children('svg').attr('aria-hidden')).toBe('true')
    expect(button.children('span.govuk-visually-hidden').text()).toBe('Search')
  })

  test('shows Showing 0 of 0 and the table headings with no rows when the book is empty', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([]))

    const { $, statusCode } = await getList(LIST_URL, 'list-empty')

    expect(statusCode).toBe(statusCodes.ok)
    expect(resultsLineOf($)).toBe(NO_RESULTS_LINE)
    expect(tableHeadOf($)).toEqual(TABLE_HEADINGS)
    expect(bodyRowCountOf($)).toBe(0)
    expect(contentOf($).children('div').find('a').attr('href')).toBe(ADD_PATH)
  })

  test('shows the name on two lines and every stored address line on its own line', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(200, pageOf([highlandAddress, fullAddress]))

    const { $ } = await getList(LIST_URL, 'list-cells')

    expect(rowCellsOf($, 0).eq(0).html()).toBe('Highland<br> Livestock Ltd')
    expect(rowCellsOf($, 0).eq(1).html()).toBe(
      "14 Drover's Way,<br> Inverness,<br> IV2 3JH"
    )
    expect(rowCellsOf($, 1).eq(0).html()).toBe('Drover')
    expect(rowCellsOf($, 1).eq(1).html()).toBe(
      "14 Drover's Way,<br> Unit 3,<br> Inverness,<br> Highland,<br> IV2 3JH"
    )
  })

  test('escapes markup in stored names and address lines', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1' })
      .reply(
        200,
        pageOf([
          {
            id: '3',
            name: '<b>Bold</b> Farm',
            addressLine1: "1 <i>Lane</i>'s End",
            townOrCity: 'Inverness',
            postcode: 'IV2 3JH',
            countryCode: 'GB'
          }
        ])
      )

    const { $, html } = await getList(LIST_URL, 'list-escaping')

    expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;<br> Farm')
    expect(html).toContain('1 &lt;i&gt;Lane&lt;/i&gt;&#39;s End,<br> Inverness')
    expect($('tbody b, tbody i')).toHaveLength(0)
  })

  test('lists the match under the filter with its View link as the only link there', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'green' })
      .reply(200, pageOf([greenFarmAddress]))

    const { $, statusCode } = await getList(
      `${LIST_URL}?q=green`,
      'list-search-with-results'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(resultsLineOf($)).toBe('Showing 1-1 of 1')
    expect(anchorsAfterFilterForm($)).toEqual(['/address-book/1'])
  })

  test('shows Showing 0 of 0, the table headings, no rows and no links under the filter when a search matches nothing', async () => {
    addressBookApi()
      .get(ADDRESSES_PATH)
      .query({ page: '1', q: 'zzznomatch' })
      .reply(200, pageOf([]))

    const { $, statusCode } = await getList(
      `${LIST_URL}?q=zzznomatch`,
      'list-no-results'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(resultsLineOf($)).toBe(NO_RESULTS_LINE)
    expect(tableHeadOf($)).toEqual(TABLE_HEADINGS)
    expect(bodyRowCountOf($)).toBe(0)
    expect($('input[name="q"]').val()).toBe('zzznomatch')
    expect(anchorsAfterFilterForm($)).toEqual([])
  })
})
