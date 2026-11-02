import { describe, expect, test } from 'vitest'

import { ADDRESS_TYPES } from '../../services/address-book/index.js'
import { ADDRESS_BOOK_TABS, resolveTab } from './address-book-tabs.js'

const [ORIGIN_TAB, DESTINATION_TAB, BRANCH_TAB] = ADDRESS_BOOK_TABS

describe('address-book-tabs', () => {
  test('lists the three tabs in order with their address types', () => {
    expect(ADDRESS_BOOK_TABS.map((tab) => tab.addressType)).toEqual([
      'ORIGIN_OR_CONSIGNOR',
      'DESTINATION_CONSIGNEE_OR_IMPORTER',
      'BRANCH'
    ])
  })

  test.each([
    [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, ORIGIN_TAB],
    [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER, DESTINATION_TAB],
    [ADDRESS_TYPES.BRANCH, BRANCH_TAB]
  ])('resolves %s to its own tab', (addressType, tab) => {
    expect(resolveTab(addressType)).toBe(tab)
  })

  test.each([
    ['no address type', undefined],
    ['an empty address type', ''],
    ['an unknown address type', 'TRANSPORTER'],
    ['an address type in the wrong case', 'branch']
  ])(
    'resolves %s to the Origin and Consignor tab',
    (_description, requested) => {
      expect(resolveTab(requested)).toBe(ORIGIN_TAB)
    }
  )
})
