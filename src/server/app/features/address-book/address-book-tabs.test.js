import { describe, expect, test } from 'vitest'

import { ADDRESS_TYPES } from '../../services/address-book/index.js'
import {
  ADDRESS_BOOK_TABS,
  resolveTab,
  resolveUse
} from './address-book-tabs.js'

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
  ])('resolves %s to no tab', (_description, requested) => {
    expect(resolveTab(requested)).toBeUndefined()
  })

  test('offers each tab its own uses in the Type select order', () => {
    expect(ADDRESS_BOOK_TABS.map((tab) => tab.uses)).toEqual([
      ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
      ['CONSIGNEE', 'IMPORTER', 'PLACE_OF_DESTINATION'],
      ['BRANCH_ADDRESS']
    ])
  })

  test.each([
    ['CONSIGNOR', ORIGIN_TAB.addressType, ORIGIN_TAB],
    ['IMPORTER', DESTINATION_TAB.addressType, DESTINATION_TAB],
    ['BRANCH_ADDRESS', BRANCH_TAB.addressType, BRANCH_TAB]
  ])('honours %s on the %s tab, which offers it', (use, _tabName, tab) => {
    expect(resolveUse(tab, use)).toBe(use)
  })

  test.each([
    ['no use', ORIGIN_TAB, undefined],
    ['an empty use', ORIGIN_TAB, ''],
    ['an unknown use', ORIGIN_TAB, 'TRANSPORTER'],
    ['a use another tab offers', ORIGIN_TAB, 'IMPORTER'],
    ['a use in the wrong case', BRANCH_TAB, 'branch_address']
  ])('honours no use for %s', (_description, tab, requested) => {
    expect(resolveUse(tab, requested)).toBeUndefined()
  })
})
