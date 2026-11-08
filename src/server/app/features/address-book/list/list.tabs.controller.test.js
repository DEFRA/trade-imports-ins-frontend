import { describe, expect, test } from 'vitest'

import { statusCodes } from '../../../../common/constants/status-codes.js'
import {
  addressBookPath,
  pageOf
} from '../../../../common/test-helpers/address-book-requests.js'
import { recordModuleLoggerInfo } from '../../../../common/test-helpers/module-logger-lines.js'
import { textOf } from '../../../../common/test-helpers/rendered-text.js'
import { ORGANISATION_ID } from '../../../../common/test-helpers/session-auth.js'
import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import {
  ADDRESS_BOOK_TABS,
  DEFAULT_ADDRESS_BOOK_TAB,
  ROLE_BACKED_ADDRESS_BOOK_TABS
} from '../address-book-tabs.js'
import { copy } from '../copy/copy.en.js'
import { UNSUPPORTED_ADDRESS_TYPE } from '../fit/address-book-list.js'
import {
  contentOf,
  highlandAddress,
  highlandTransporter,
  panelHeadingTextOf,
  rowCellsOf,
  startServerWithPageReader,
  stubAddressPage,
  stubTransporterPage,
  subNavigationLinksOf,
  subNavigationOf,
  tableHeadingsOf
} from './list.test-support.js'

const readPage = startServerWithPageReader()

describe('#addressBookListTabs', () => {
  test.each([
    [
      'no address type',
      addressBookPath(),
      DEFAULT_ADDRESS_BOOK_TAB.addressType
    ],
    [
      'an unknown address type',
      `${addressBookPath()}?addressType=${UNSUPPORTED_ADDRESS_TYPE}`,
      DEFAULT_ADDRESS_BOOK_TAB.addressType
    ],
    [
      'the Destination, Consignee and Importer address type',
      `${addressBookPath()}?addressType=${ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER}`,
      ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
    ],
    [
      'the Branch address type',
      `${addressBookPath()}?addressType=${ADDRESS_TYPES.BRANCH}`,
      ADDRESS_TYPES.BRANCH
    ]
  ])(
    'asks the address book for the tab chosen by %s',
    async (_description, url, askedAddressType) => {
      const scope = stubAddressPage(
        { page: '1', tabAddressType: askedAddressType },
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
    const { entriesWith: infoLogs } = recordModuleLoggerInfo()

    test('logs an unknown address type once, with the organisation and the address type served', async () => {
      stubAddressPage(
        { page: '1', tabAddressType: DEFAULT_ADDRESS_BOOK_TAB.addressType },
        pageOf([highlandAddress])
      )

      await readPage(
        `${addressBookPath()}?addressType=${UNSUPPORTED_ADDRESS_TYPE}`,
        'list-unknown-tab-log'
      )

      expect(infoLogs(IGNORED_ADDRESS_TYPE_MESSAGE)).toEqual([
        {
          fields: {
            organisationId: ORGANISATION_ID,
            requestedAddressType: UNSUPPORTED_ADDRESS_TYPE,
            addressType: DEFAULT_ADDRESS_BOOK_TAB.addressType
          },
          message: IGNORED_ADDRESS_TYPE_MESSAGE
        }
      ])
    })

    test.each([
      [
        'no address type',
        addressBookPath(),
        DEFAULT_ADDRESS_BOOK_TAB.addressType
      ],
      [
        'an address type it offers',
        `${addressBookPath()}?addressType=${ADDRESS_TYPES.BRANCH}`,
        ADDRESS_TYPES.BRANCH
      ]
    ])('logs nothing for %s', async (_description, url, servedAddressType) => {
      const scope = stubAddressPage(
        { page: '1', tabAddressType: servedAddressType },
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
    async (_description, roles, roleLabelsText) => {
      stubAddressPage({ page: '1' }, pageOf([{ ...highlandAddress, roles }]))

      const { $ } = await readPage(addressBookPath(), 'list-type-cell')

      expect(textOf($, rowCellsOf($, 0).eq(1))).toBe(roleLabelsText)
    }
  )

  test('names the four tabs in order as links to the list on each tab, marking the Origin and Consignor tab as current', async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

    const { $ } = await readPage(addressBookPath(), 'list-tabs')

    expect(subNavigationLinksOf($)).toEqual([
      {
        text: 'Origin and Consignor',
        href: `${addressBookPath()}?addressType=ORIGIN_OR_CONSIGNOR`,
        current: 'page'
      },
      {
        text: 'Destination, Consignee and Importer',
        href: `${addressBookPath()}?addressType=DESTINATION_CONSIGNEE_OR_IMPORTER`,
        current: null
      },
      {
        text: 'Transporter',
        href: `${addressBookPath()}?addressType=TRANSPORTER`,
        current: null
      },
      {
        text: 'Branch',
        href: `${addressBookPath()}?addressType=BRANCH`,
        current: null
      }
    ])
    expect(subNavigationOf($).attr('aria-label')).toBe('Address types')
  })

  test('shows the default tab, marked current and heading its panel, for an unknown address type', async () => {
    stubAddressPage({ page: '1' }, pageOf([highlandAddress]))

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=${UNSUPPORTED_ADDRESS_TYPE}`,
      'list-unknown-tab'
    )

    expect(
      subNavigationLinksOf($)
        .filter(({ current }) => current === 'page')
        .map(({ text }) => text)
    ).toEqual([copy.list.tabs[DEFAULT_ADDRESS_BOOK_TAB.addressType].label])
    expect(panelHeadingTextOf($)).toBe(
      copy.list.tabs[DEFAULT_ADDRESS_BOOK_TAB.addressType].heading
    )
  })
})

describe('#addressBookListTabs — the selected tab', () => {
  test.each(
    ROLE_BACKED_ADDRESS_BOOK_TABS.map(({ addressType }) => [addressType])
  )(
    'marks only the %s tab as current and heads its panel',
    async (addressType) => {
      stubAddressPage(
        { page: '1', tabAddressType: addressType },
        pageOf([highlandAddress])
      )

      const { $ } = await readPage(
        `${addressBookPath()}?addressType=${addressType}`,
        'list-selected-tab'
      )

      expect(
        subNavigationLinksOf($).map(({ text, current }) => [text, current])
      ).toEqual(
        ADDRESS_BOOK_TABS.map((tab) => [
          copy.list.tabs[tab.addressType].label,
          tab.addressType === addressType ? 'page' : null
        ])
      )
      expect(panelHeadingTextOf($)).toBe(copy.list.tabs[addressType].heading)
    }
  )

  test('marks only the Transporter tab as current, heads its panel and lists the organisation transporters', async () => {
    stubTransporterPage({ page: '1' }, pageOf([highlandTransporter]))

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=TRANSPORTER`,
      'list-transporter-tab'
    )

    expect(
      subNavigationLinksOf($).map(({ text, current }) => [text, current])
    ).toEqual(
      ADDRESS_BOOK_TABS.map((tab) => [
        copy.list.tabs[tab.addressType].label,
        tab.addressType === ADDRESS_TYPES.TRANSPORTER ? 'page' : null
      ])
    )
    expect(panelHeadingTextOf($)).toBe(
      copy.list.tabs[ADDRESS_TYPES.TRANSPORTER].heading
    )
    expect(tableHeadingsOf($)).toEqual([
      copy.list.table.name,
      copy.list.table.address,
      copy.list.table.approvalNumber,
      copy.list.table.type,
      copy.list.table.action
    ])
    expect(textOf($, rowCellsOf($, 0).first())).toBe(highlandTransporter.name)
    expect(textOf($, rowCellsOf($, 0).eq(2))).toBe(copy.notApplicable)
    expect(textOf($, rowCellsOf($, 0).eq(3))).toBe(
      copy.list.transporterTypes[highlandTransporter.type]
    )
  })

  test('heads the Transporter tab panel with "Transporter addresses"', async () => {
    stubTransporterPage({ page: '1' }, pageOf([highlandTransporter]))

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=TRANSPORTER`,
      'list-transporter-panel-heading'
    )

    expect(panelHeadingTextOf($)).toBe('Transporter addresses')
  })

  test('holds the selected tab as a hidden addressType input in the filter form', async () => {
    stubAddressPage(
      { page: '1', tabAddressType: ADDRESS_TYPES.BRANCH },
      pageOf([highlandAddress])
    )

    const { $ } = await readPage(
      `${addressBookPath()}?addressType=${ADDRESS_TYPES.BRANCH}`,
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
      `${addressBookPath()}?q=farm&role=CONSIGNOR&page=2`,
      'list-tab-links-with-search'
    )

    expect(subNavigationLinksOf($).map(({ href }) => href)).toEqual([
      `${addressBookPath()}?addressType=ORIGIN_OR_CONSIGNOR&q=farm`,
      `${addressBookPath()}?addressType=DESTINATION_CONSIGNEE_OR_IMPORTER&q=farm`,
      `${addressBookPath()}?addressType=TRANSPORTER&q=farm`,
      `${addressBookPath()}?addressType=BRANCH&q=farm`
    ])
  })
})
