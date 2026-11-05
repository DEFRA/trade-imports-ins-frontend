import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressTypeStartPath,
  addressBookPath,
  addressPath,
  pageOf
} from '../../../../common/test-helpers/address-book-requests.js'
import {
  textOf,
  textsOf
} from '../../../../common/test-helpers/rendered-text.js'
import {
  NO_RESULTS_LINE,
  TABLE_HEADINGS,
  bodyRowCountOf,
  contentOf,
  fullAddress,
  greenFarmAddress,
  highlandAddress,
  resultsLineOf,
  rowCellsOf,
  startServerWithPageReader,
  stubAddressPage,
  subNavigationOf,
  tableHeadingsOf,
  tagNamesOf,
  typeSelectStateOf
} from './list.test-support.js'

const linksAfterSubNavigation = ($) =>
  subNavigationOf($)
    .nextAll()
    .find('a')
    .map((_, anchor) => ({
      text: textOf($, anchor),
      href: $(anchor).attr('href')
    }))
    .get()

describe('#addressBookListLayout', () => {
  const readPage = startServerWithPageReader()

  test('lays the page out as heading, large intro, Add button, the filter form wrapping a collapsed Filter addresses disclosure, the sub navigation, the panel heading, the results line and the table', async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

    const { $ } = await readPage(addressBookPath(), 'list-layout')

    const content = contentOf($)
    expect(tagNamesOf(content.children())).toEqual([
      'h1',
      'p',
      'div',
      'form',
      'nav',
      'h2',
      'p',
      'table'
    ])
    expect(content.children('h1').text()).toBe('Address book')
    expect(content.children('p.govuk-body-l').text()).toBe(
      'Manage your addresses for use across all your import notifications'
    )
    const addButton = content.children('div').find('a')
    expect(textOf($, addButton)).toBe('Add a new address')
    expect(addButton.attr('href')).toBe(addressTypeStartPath())
    const form = content.children('form')
    expect(form.attr('method')).toBe('get')
    expect(form.attr('action')).toBe(addressBookPath())
    expect(tagNamesOf(form.children())).toEqual(['input', 'details'])
    const disclosure = form.children('details')
    expect(disclosure.attr('open')).toBeUndefined()
    expect(textOf($, disclosure.children('summary'))).toBe('Filter addresses')
  })

  test('holds the Search controls, then the Type label and select, inside the disclosure', async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

    const { $ } = await readPage(addressBookPath(), 'list-search-controls')

    const controls = contentOf($).find('form details .govuk-details__text')
    expect(
      tagNamesOf(controls.find('label, input, button, select, .govuk-hint'))
    ).toEqual(['label', 'div', 'input', 'button', 'label', 'select'])
    expect(textsOf($, controls.find('label'))).toEqual(['Search', 'Type'])
    expect(textOf($, controls.find('.govuk-hint'))).toBe(
      'Search by name, address or country'
    )
    expect(textOf($, controls.find('button'))).toBe('Search')
    expect(typeSelectStateOf($).optionTexts).toEqual([
      'Select one',
      'Place of Origin',
      'Consignor'
    ])
    const input = controls.find('input')
    expect(input.attr('name')).toBe('q')
    expect(controls.find('label').first().attr('for')).toBe(input.attr('id'))
    const select = controls.find('select')
    expect(select.attr('name')).toBe('role')
    expect(controls.find('label').last().attr('for')).toBe(select.attr('id'))
    expect(input.attr('aria-describedby')).toBe(
      controls.find('.govuk-hint').attr('id')
    )
    const button = controls.find('button')
    expect(button.attr('type')).toBe('submit')
    expect(tagNamesOf(button.children())).toEqual(['svg', 'span'])
    expect(button.children('svg').attr('aria-hidden')).toBe('true')
    expect(button.children('span.govuk-visually-hidden').text()).toBe('Search')
  })

  test('shows Showing 0 of 0 and the table headings with no rows when the book is empty', async () => {
    stubAddressPage({ page: '1' }, pageOf([]))

    const { $, statusCode } = await readPage(addressBookPath(), 'list-empty')

    expect(statusCode).toBe(statusCodes.ok)
    expect(resultsLineOf($)).toBe(NO_RESULTS_LINE)
    expect(tableHeadingsOf($)).toEqual(TABLE_HEADINGS)
    expect(bodyRowCountOf($)).toBe(0)
  })

  test('hides the Action heading visually while keeping it for assistive technology', async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

    const { $ } = await readPage(addressBookPath(), 'list-action-heading')

    const actionHeading = $('thead th').last().children('span')
    expect(actionHeading.attr('class')).toBe('govuk-visually-hidden')
    expect(textOf($, actionHeading)).toBe('Action')
  })

  test('breaks the name after its first word and puts every stored address line on its own line', async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress, fullAddress]))

    const { $ } = await readPage(addressBookPath(), 'list-cells')

    expect(rowCellsOf($, 0).eq(0).html()).toBe('Highland<br> Livestock Ltd')
    expect(rowCellsOf($, 0).eq(2).html()).toBe(
      "14 Drover's Way,<br> Inverness,<br> IV2 3JH"
    )
    expect(rowCellsOf($, 1).eq(0).html()).toBe('Drover')
    expect(rowCellsOf($, 1).eq(2).html()).toBe(
      "14 Drover's Way,<br> Unit 3,<br> Inverness,<br> Highland,<br> IV2 3JH"
    )
  })

  test('escapes markup in stored names and address lines', async () => {
    stubAddressPage(
      { page: '1' },
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

    const { $, html } = await readPage(addressBookPath(), 'list-escaping')

    expect(html).toContain('&lt;b&gt;Bold&lt;/b&gt;<br> Farm')
    expect(html).toContain('1 &lt;i&gt;Lane&lt;/i&gt;&#39;s End,<br> Inverness')
    expect($('tbody b, tbody i')).toHaveLength(0)
  })

  test('lists the match under the tabs with Clear search and its View link as the only links there', async () => {
    stubAddressPage({ page: '1', q: 'green' }, pageOf([greenFarmAddress]))

    const { $, statusCode } = await readPage(
      `${addressBookPath()}?q=green`,
      'list-search-with-results'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(resultsLineOf($)).toBe('Showing 1-1 of 1')
    expect(linksAfterSubNavigation($)).toEqual([
      {
        text: 'Clear search',
        href: `${addressBookPath()}?addressType=ORIGIN_OR_CONSIGNOR`
      },
      {
        text: `View ${greenFarmAddress.name}`,
        href: addressPath(greenFarmAddress.id)
      }
    ])
  })

  test('shows Showing 0 of 0, the table headings, no rows and Clear search as the only link under the tabs when a search matches nothing', async () => {
    stubAddressPage({ page: '1', q: 'zzznomatch' }, pageOf([]))

    const { $, statusCode } = await readPage(
      `${addressBookPath()}?q=zzznomatch`,
      'list-no-results'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(resultsLineOf($)).toBe(NO_RESULTS_LINE)
    expect(tableHeadingsOf($)).toEqual(TABLE_HEADINGS)
    expect(bodyRowCountOf($)).toBe(0)
    expect(linksAfterSubNavigation($)).toEqual([
      {
        text: 'Clear search',
        href: `${addressBookPath()}?addressType=ORIGIN_OR_CONSIGNOR`
      }
    ])
  })

  test('keeps the search term in the Search box', async () => {
    stubAddressPage({ page: '1', q: 'green' }, pageOf([greenFarmAddress]))

    const { $ } = await readPage(
      `${addressBookPath()}?q=green`,
      'list-search-term-kept'
    )

    expect(contentOf($).find('form input[name="q"]').val()).toBe('green')
  })
})
