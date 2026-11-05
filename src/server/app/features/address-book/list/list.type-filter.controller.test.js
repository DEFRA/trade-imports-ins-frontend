import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressBookPath,
  pageOf
} from '../../../../common/test-helpers/address-book-requests.js'
import { captureInfoLogs } from '../../../../common/test-helpers/capture-info-logs.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import {
  greenFarmAddress,
  highlandAddress,
  parisDepotAddress,
  resultsLineOf,
  rowCellsOf,
  startServerWithPageReader,
  stubAddressBookUnavailable,
  stubAddressPage,
  typeSelectStateOf
} from './list.test-support.js'

const SELECT_ONE = 'Select one'
const BRANCH_ADDRESS_OPTION = 'Branch Address'
const IGNORED_ROLE_MESSAGE =
  'Address book list ignored a role the tab does not offer'

describe('#addressBookListTypeFilter', () => {
  const readPage = startServerWithPageReader()
  const infoLogs = captureInfoLogs()

  test.each([
    [
      ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
      [SELECT_ONE, 'Place of Origin', 'Consignor']
    ],
    [
      ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      [SELECT_ONE, 'Consignee', 'Importer', 'Place of Destination']
    ],
    [ADDRESS_TYPES.BRANCH, [SELECT_ONE, BRANCH_ADDRESS_OPTION]]
  ])(
    'offers the Type select the options of the %s tab only, led by Select one with no value',
    async (addressType, optionTexts) => {
      stubAddressPage(
        { page: '1', tabAddressType: addressType },
        pageOf([highlandAddress])
      )

      const { $ } = await readPage(
        `${addressBookPath()}?addressType=${addressType}`,
        'list-type-options'
      )

      expect(typeSelectStateOf($)).toEqual({
        label: 'Type',
        optionTexts,
        emptyValueTexts: [SELECT_ONE],
        selectedTexts: []
      })
    }
  )

  test('asks the address book for the role the tab offers and shows it chosen', async () => {
    const scope = stubAddressPage(
      {
        page: '1',
        tabAddressType: ADDRESS_TYPES.BRANCH,
        role: 'BRANCH_ADDRESS'
      },
      pageOf([highlandAddress])
    )

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=${ADDRESS_TYPES.BRANCH}&role=BRANCH_ADDRESS`,
      'list-role-honoured'
    )

    expect(scope.isDone()).toBe(true)
    expect(typeSelectStateOf($).selectedTexts).toEqual([BRANCH_ADDRESS_OPTION])
  })

  test.each([
    ['a role another tab offers', '?role=IMPORTER'],
    ['an unknown role', '?role=TRANSPORTER'],
    ['an empty role', '?role=']
  ])(
    'asks the address book for no role and shows Select one for %s',
    async (_description, query) => {
      const scope = stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

      const { $ } = await readPage(
        `${addressBookPath()}${query}`,
        'list-role-not-honoured'
      )

      expect(scope.isDone()).toBe(true)
      expect(typeSelectStateOf($).selectedTexts).toEqual([])
    }
  )

  test('lists the whole Branch tab with no Type selected for a role the Branch tab does not offer, and logs the ignored role once', async () => {
    const scope = stubAddressPage(
      { page: '1', tabAddressType: ADDRESS_TYPES.BRANCH },
      pageOf([highlandAddress])
    )

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=BRANCH&role=CONSIGNOR`,
      'list-role-of-another-tab'
    )

    expect(scope.isDone()).toBe(true)
    expect(resultsLineOf($)).toBe('Showing 1-1 of 1')
    expect(typeSelectStateOf($).selectedTexts).toEqual([])
    expect(infoLogs(IGNORED_ROLE_MESSAGE)).toEqual([
      {
        fields: {
          organisationId: ORGANISATION_ID,
          addressType: ADDRESS_TYPES.BRANCH,
          requestedRole: 'CONSIGNOR'
        },
        message: IGNORED_ROLE_MESSAGE
      }
    ])
  })

  test('offers the Type select of the tab, with the chosen Type selected, on the page shown when the address book cannot be reached', async () => {
    const scope = stubAddressBookUnavailable({
      tabAddressType: ADDRESS_TYPES.BRANCH,
      role: 'BRANCH_ADDRESS'
    })

    const { $, statusCode } = await readPage(
      `${addressBookPath()}?addressType=BRANCH&role=BRANCH_ADDRESS`,
      'list-role-address-book-unavailable'
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(scope.isDone()).toBe(true)
    expect(typeSelectStateOf($)).toEqual({
      label: 'Type',
      optionTexts: [SELECT_ONE, BRANCH_ADDRESS_OPTION],
      emptyValueTexts: [SELECT_ONE],
      selectedTexts: [BRANCH_ADDRESS_OPTION]
    })
  })
})

describe('#addressBookListTypeFilter links', () => {
  const readPage = startServerWithPageReader()

  test('links every page with the selected tab, the search term, the role and the page number only', async () => {
    const scope = stubAddressPage(
      {
        page: '2',
        q: 'green',
        tabAddressType: ADDRESS_TYPES.BRANCH,
        role: 'BRANCH_ADDRESS'
      },
      pageOf([greenFarmAddress], {
        page: 2,
        totalItems: 30,
        totalPages: 4
      })
    )

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=BRANCH&q=green&role=BRANCH_ADDRESS&page=2`,
      'list-role-page-2'
    )

    expect(scope.isDone()).toBe(true)
    expect(
      $('.govuk-pagination__item a')
        .map((_, link) => $(link).attr('href'))
        .get()
    ).toEqual([
      `${addressBookPath()}?addressType=BRANCH&q=green&role=BRANCH_ADDRESS`,
      `${addressBookPath()}?addressType=BRANCH&q=green&role=BRANCH_ADDRESS&page=2`,
      `${addressBookPath()}?addressType=BRANCH&q=green&role=BRANCH_ADDRESS&page=3`,
      `${addressBookPath()}?addressType=BRANCH&q=green&role=BRANCH_ADDRESS&page=4`
    ])
  })

  test('counts the matches of a role and shows no pagination when they fit on one page', async () => {
    stubAddressPage(
      { page: '1', role: 'CONSIGNOR' },
      pageOf([greenFarmAddress, highlandAddress])
    )

    const { $ } = await readPage(
      `${addressBookPath()}?role=CONSIGNOR`,
      'list-role-one-page'
    )

    expect(resultsLineOf($)).toBe('Showing 1-2 of 2')
    expect($('.govuk-pagination')).toHaveLength(0)
  })

  test('links Clear search to the selected tab with the role kept and no search', async () => {
    stubAddressPage(
      {
        page: '1',
        q: 'green',
        tabAddressType: ADDRESS_TYPES.BRANCH,
        role: 'BRANCH_ADDRESS'
      },
      pageOf([greenFarmAddress])
    )

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=BRANCH&q=green&role=BRANCH_ADDRESS`,
      'list-clear-search-role'
    )

    expect($('[data-testid="address-book-clear-search"]').attr('href')).toBe(
      `${addressBookPath()}?addressType=BRANCH&role=BRANCH_ADDRESS`
    )
  })

  test.each([
    ['consignor', 'CONSIGNOR'],
    ['place of origin', 'PLACE_OF_ORIGIN'],
    ['  BRANCH ', 'BRANCH_ADDRESS']
  ])(
    'asks the address book to match the role whose label contains %j beside the search term',
    async (term, searchRole) => {
      const scope = stubAddressPage(
        { page: '1', q: term.trim(), searchRole },
        pageOf([greenFarmAddress])
      )

      const { statusCode } = await readPage(
        `${addressBookPath()}?q=${encodeURIComponent(term)}`,
        'list-search-roles'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(scope.isDone()).toBe(true)
    }
  )

  test('lists the address holding a Branch Address role when the Branch tab is searched for branch address', async () => {
    const scope = stubAddressPage(
      {
        page: '1',
        q: 'branch address',
        tabAddressType: ADDRESS_TYPES.BRANCH,
        searchRole: 'BRANCH_ADDRESS'
      },
      pageOf([{ ...parisDepotAddress, roles: ['BRANCH_ADDRESS'] }])
    )

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=BRANCH&q=${encodeURIComponent('branch address')}`,
      'list-search-branch-address'
    )

    expect(scope.isDone()).toBe(true)
    expect(rowCellsOf($, 0).eq(1).text().trim()).toBe('Branch')
    expect(resultsLineOf($)).toBe('Showing 1-1 of 1')
  })

  test('asks the address book to match every role whose label contains the search term', async () => {
    const scope = stubAddressPage(
      { page: '1', q: 'consign', searchRole: ['CONSIGNOR', 'CONSIGNEE'] },
      pageOf([greenFarmAddress])
    )

    await readPage(
      `${addressBookPath()}?q=consign`,
      'list-search-several-roles'
    )

    expect(scope.isDone()).toBe(true)
  })
})
