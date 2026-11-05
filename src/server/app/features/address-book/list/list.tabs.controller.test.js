import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  ADDRESS_BOOK_PATH,
  pageOf
} from '../../../../common/test-helpers/address-book-requests.js'
import { captureInfoLogs } from '../../../../common/test-helpers/capture-info-logs.js'
import { textOf } from '../../../../common/test-helpers/rendered-text.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import {
  ADDRESS_BOOK_TABS,
  DEFAULT_ADDRESS_BOOK_TAB
} from '../address-book-tabs.js'
import { copy } from '../copy/copy.en.js'
import {
  contentOf,
  highlandAddress,
  panelHeadingTextOf,
  rowCellsOf,
  startServerWithPageReader,
  stubAddressPage,
  subNavigationLinksOf,
  subNavigationOf
} from './list.test-support.js'

describe('#addressBookListTabs', () => {
  const readPage = startServerWithPageReader()

  test.each([
    [
      'no address type',
      ADDRESS_BOOK_PATH,
      DEFAULT_ADDRESS_BOOK_TAB.addressType
    ],
    [
      'an unknown address type',
      `${ADDRESS_BOOK_PATH}?addressType=TRANSPORTER`,
      DEFAULT_ADDRESS_BOOK_TAB.addressType
    ],
    [
      'the Destination, Consignee and Importer address type',
      `${ADDRESS_BOOK_PATH}?addressType=${ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER}`,
      ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
    ],
    [
      'the Branch address type',
      `${ADDRESS_BOOK_PATH}?addressType=${ADDRESS_TYPES.BRANCH}`,
      ADDRESS_TYPES.BRANCH
    ]
  ])(
    'asks the address book for the tab chosen by %s',
    async (_description, url, askedAddressType) => {
      const scope = stubAddressPage(
        { page: '1', addressType: askedAddressType },
        pageOf([highlandAddress])
      )

      const { statusCode } = await readPage(url, 'list-asked-tab')

      expect(statusCode).toBe(statusCodes.ok)
      expect(scope.isDone()).toBe(true)
    }
  )

  describe('logging the address type it serves in place of the one asked', () => {
    const IGNORED_ADDRESS_TYPE_MESSAGE =
      'Address book list ignored an address type it does not offer'
    const infoLogs = captureInfoLogs()

    test('logs an unknown address type once, with the organisation and the address type served', async () => {
      stubAddressPage(
        { page: '1', addressType: DEFAULT_ADDRESS_BOOK_TAB.addressType },
        pageOf([highlandAddress])
      )

      await readPage(
        `${ADDRESS_BOOK_PATH}?addressType=TRANSPORTER`,
        'list-unknown-tab-log'
      )

      expect(infoLogs(IGNORED_ADDRESS_TYPE_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            requestedAddressType: 'TRANSPORTER',
            addressType: DEFAULT_ADDRESS_BOOK_TAB.addressType
          },
          message: IGNORED_ADDRESS_TYPE_MESSAGE
        }
      ])
    })

    test.each([
      [
        'no address type',
        ADDRESS_BOOK_PATH,
        DEFAULT_ADDRESS_BOOK_TAB.addressType
      ],
      [
        'an address type it offers',
        `${ADDRESS_BOOK_PATH}?addressType=${ADDRESS_TYPES.BRANCH}`,
        ADDRESS_TYPES.BRANCH
      ]
    ])('logs nothing for %s', async (_description, url, servedAddressType) => {
      const scope = stubAddressPage(
        { page: '1', addressType: servedAddressType },
        pageOf([highlandAddress])
      )

      await readPage(url, 'list-known-tab-log')

      expect(scope.isDone()).toBe(true)
      expect(infoLogs(IGNORED_ADDRESS_TYPE_MESSAGE)).toEqual([])
    })
  })

  test.each([
    [
      'place of origin and consignor roles',
      ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
      'Place of origin, Consignor'
    ],
    ['a branch address role', ['BRANCH_ADDRESS'], 'Branch'],
    ['no roles', null, '']
  ])(
    'shows the labels of the roles of an address holding %s in its Type cell',
    async (_description, roles, roleLabels) => {
      stubAddressPage({ page: '1' }, pageOf([{ ...highlandAddress, roles }]))

      const { $ } = await readPage(ADDRESS_BOOK_PATH, 'list-type-cell')

      expect(textOf($, rowCellsOf($, 0).eq(1))).toBe(roleLabels)
    }
  )

  test('names the three tabs in order as links to the list on each tab, marking the Origin and Consignor tab as current', async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

    const { $ } = await readPage(ADDRESS_BOOK_PATH, 'list-tabs')

    expect(subNavigationLinksOf($)).toEqual([
      {
        text: 'Origin and Consignor',
        href: `${ADDRESS_BOOK_PATH}?addressType=ORIGIN_OR_CONSIGNOR`,
        current: 'page'
      },
      {
        text: 'Destination, Consignee and Importer',
        href: `${ADDRESS_BOOK_PATH}?addressType=DESTINATION_CONSIGNEE_OR_IMPORTER`,
        current: null
      },
      {
        text: 'Branch',
        href: `${ADDRESS_BOOK_PATH}?addressType=BRANCH`,
        current: null
      }
    ])
    expect(subNavigationOf($).attr('aria-label')).toBe('Address types')
  })

  test('shows the default tab, marked current and heading its panel, for an unknown address type', async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

    const { $ } = await readPage(
      `${ADDRESS_BOOK_PATH}?addressType=TRANSPORTER`,
      'list-unknown-tab'
    )

    expect(
      subNavigationLinksOf($)
        .filter(({ current }) => current === 'page')
        .map(({ text }) => text)
    ).toEqual([copy.list.tabs[DEFAULT_ADDRESS_BOOK_TAB.copyKey].label])
    expect(panelHeadingTextOf($)).toBe(
      copy.list.tabs[DEFAULT_ADDRESS_BOOK_TAB.copyKey].heading
    )
  })

  test.each(
    ADDRESS_BOOK_TABS.map(({ addressType }, index) => [addressType, index])
  )(
    'marks only the %s tab as current and heads its panel',
    async (addressType, tabIndex) => {
      stubAddressPage({ page: '1', addressType }, pageOf([highlandAddress]))

      const { $ } = await readPage(
        `${ADDRESS_BOOK_PATH}?addressType=${addressType}`,
        'list-selected-tab'
      )

      expect(
        subNavigationLinksOf($).map(({ text, current }) => [text, current])
      ).toEqual(
        ADDRESS_BOOK_TABS.map(({ copyKey }, index) => [
          copy.list.tabs[copyKey].label,
          index === tabIndex ? 'page' : null
        ])
      )
      expect(panelHeadingTextOf($)).toBe(
        copy.list.tabs[ADDRESS_BOOK_TABS[tabIndex].copyKey].heading
      )
    }
  )

  test('holds the selected tab in the filter form so a search stays on it', async () => {
    stubAddressPage(
      { page: '1', addressType: ADDRESS_TYPES.BRANCH },
      pageOf([highlandAddress])
    )

    const { $ } = await readPage(
      `${ADDRESS_BOOK_PATH}?addressType=${ADDRESS_TYPES.BRANCH}`,
      'list-form-tab'
    )

    const hiddenInput = contentOf($).children('form').children('input')
    expect(hiddenInput.attr('type')).toBe('hidden')
    expect(hiddenInput.attr('name')).toBe('addressType')
    expect(hiddenInput.attr('value')).toBe(ADDRESS_TYPES.BRANCH)
  })

  test('links each tab, from a page after the first, with the current search and no role or page', async () => {
    stubAddressPage(
      { page: '2', q: 'farm', role: 'CONSIGNOR' },
      pageOf([highlandAddress], { page: 2, totalItems: 30, totalPages: 2 })
    )

    const { $ } = await readPage(
      `${ADDRESS_BOOK_PATH}?q=farm&role=CONSIGNOR&page=2`,
      'list-tab-links-with-search'
    )

    expect(subNavigationLinksOf($).map(({ href }) => href)).toEqual([
      `${ADDRESS_BOOK_PATH}?addressType=ORIGIN_OR_CONSIGNOR&q=farm`,
      `${ADDRESS_BOOK_PATH}?addressType=DESTINATION_CONSIGNEE_OR_IMPORTER&q=farm`,
      `${ADDRESS_BOOK_PATH}?addressType=BRANCH&q=farm`
    ])
  })
})
