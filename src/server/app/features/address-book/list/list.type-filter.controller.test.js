import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADDRESS_BOOK_PATH,
  pageOf
} from '../../../../common/test-helpers/address-book-requests.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import {
  greenFarmAddress,
  highlandAddress,
  resultsLineOf,
  startServerWithPageReader,
  stubAddressPage,
  typeSelectOf
} from './list.test-support.js'

const SELECT_ONE = 'Select one'

describe('#addressBookListTypeFilter', () => {
  const readPage = startServerWithPageReader()

  test.each([
    [
      ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
      [SELECT_ONE, 'Place of Origin', 'Consignor']
    ],
    [
      ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      [SELECT_ONE, 'Consignee', 'Importer', 'Place of Destination']
    ],
    [ADDRESS_TYPES.BRANCH, [SELECT_ONE, 'Branch Address']]
  ])(
    'offers the Type select the options of the %s tab only, led by Select one with no value',
    async (addressType, optionTexts) => {
      stubAddressPage({ page: '1', addressType }, pageOf([highlandAddress]))

      const { $ } = await readPage(
        `${ADDRESS_BOOK_PATH}?addressType=${addressType}`,
        'list-type-options'
      )

      expect(typeSelectOf($)).toEqual({
        label: 'Type',
        optionTexts,
        emptyValueTexts: [SELECT_ONE],
        selectedTexts: []
      })
    }
  )

  test('asks the address book for the use the tab offers and shows it chosen', async () => {
    const scope = stubAddressPage(
      { page: '1', addressType: ADDRESS_TYPES.BRANCH, use: 'BRANCH_ADDRESS' },
      pageOf([highlandAddress])
    )

    const { $ } = await readPage(
      `${ADDRESS_BOOK_PATH}?addressType=${ADDRESS_TYPES.BRANCH}&use=BRANCH_ADDRESS`,
      'list-use-honoured'
    )

    expect(scope.isDone()).toBe(true)
    expect(typeSelectOf($).selectedTexts).toEqual(['Branch Address'])
  })

  test.each([
    ['a use another tab offers', '?use=IMPORTER'],
    ['an unknown use', '?use=TRANSPORTER'],
    ['an empty use', '?use=']
  ])(
    'asks the address book for no use and shows Select one for %s',
    async (_description, query) => {
      const scope = stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

      const { $ } = await readPage(
        `${ADDRESS_BOOK_PATH}${query}`,
        'list-use-not-honoured'
      )

      expect(scope.isDone()).toBe(true)
      expect(typeSelectOf($).selectedTexts).toEqual([])
    }
  )

  test('links every page with the selected tab, the search term, the use and the page number only', async () => {
    const scope = stubAddressPage(
      {
        page: '2',
        q: 'green',
        addressType: ADDRESS_TYPES.BRANCH,
        use: 'BRANCH_ADDRESS'
      },
      pageOf([greenFarmAddress], {
        page: 2,
        totalItems: 30,
        totalPages: 4
      })
    )

    const { $ } = await readPage(
      `${ADDRESS_BOOK_PATH}?addressType=BRANCH&q=green&use=BRANCH_ADDRESS&page=2`,
      'list-use-page-2'
    )

    expect(scope.isDone()).toBe(true)
    expect(
      $('.govuk-pagination__item a')
        .map((_, link) => $(link).attr('href'))
        .get()
    ).toEqual([
      `${ADDRESS_BOOK_PATH}?addressType=BRANCH&q=green&use=BRANCH_ADDRESS`,
      `${ADDRESS_BOOK_PATH}?addressType=BRANCH&q=green&use=BRANCH_ADDRESS&page=2`,
      `${ADDRESS_BOOK_PATH}?addressType=BRANCH&q=green&use=BRANCH_ADDRESS&page=3`,
      `${ADDRESS_BOOK_PATH}?addressType=BRANCH&q=green&use=BRANCH_ADDRESS&page=4`
    ])
  })

  test('counts the matches of a use and shows no pagination when they fit on one page', async () => {
    stubAddressPage(
      { page: '1', use: 'CONSIGNOR' },
      pageOf([greenFarmAddress, highlandAddress])
    )

    const { $ } = await readPage(
      `${ADDRESS_BOOK_PATH}?use=CONSIGNOR`,
      'list-use-one-page'
    )

    expect(resultsLineOf($)).toBe('Showing 1-2 of 2')
    expect($('.govuk-pagination')).toHaveLength(0)
  })

  test('links Clear search to the selected tab with the use kept and no search', async () => {
    stubAddressPage(
      {
        page: '1',
        q: 'green',
        addressType: ADDRESS_TYPES.BRANCH,
        use: 'BRANCH_ADDRESS'
      },
      pageOf([greenFarmAddress])
    )

    const { $ } = await readPage(
      `${ADDRESS_BOOK_PATH}?addressType=BRANCH&q=green&use=BRANCH_ADDRESS`,
      'list-clear-search-use'
    )

    expect($('[data-testid="address-book-clear-search"]').attr('href')).toBe(
      `${ADDRESS_BOOK_PATH}?addressType=BRANCH&use=BRANCH_ADDRESS`
    )
  })

  test.each([
    ['consignor', 'CONSIGNOR'],
    ['place of origin', 'PLACE_OF_ORIGIN'],
    ['  BRANCH ', 'BRANCH_ADDRESS']
  ])(
    'asks the address book to match the use whose label contains %j beside the search term',
    async (term, searchUse) => {
      const scope = stubAddressPage(
        { page: '1', q: term.trim(), searchUse },
        pageOf([greenFarmAddress])
      )

      const { statusCode } = await readPage(
        `${ADDRESS_BOOK_PATH}?q=${encodeURIComponent(term)}`,
        'list-search-uses'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(scope.isDone()).toBe(true)
    }
  )

  test('asks the address book to match every use whose label contains the search term', async () => {
    const scope = stubAddressPage(
      { page: '1', q: 'consign', searchUse: ['CONSIGNOR', 'CONSIGNEE'] },
      pageOf([greenFarmAddress])
    )

    await readPage(`${ADDRESS_BOOK_PATH}?q=consign`, 'list-search-several-uses')

    expect(scope.isDone()).toBe(true)
  })
})
