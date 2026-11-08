import { describe, expect, test } from 'vitest'

import { ADDRESS_TYPES } from '../../services/address-book/index.js'
import {
  ADDRESS_BOOK_TABS,
  ROLE_BACKED_ADDRESS_BOOK_TABS,
  resolveTab,
  resolveTypeFilterValue
} from './address-book-tabs.js'

const [ORIGIN_TAB, DESTINATION_TAB, TRANSPORTER_TAB, BRANCH_TAB] =
  ADDRESS_BOOK_TABS

describe('address-book-tabs', () => {
  test('lists the four tabs in order with their address types', () => {
    expect(ADDRESS_BOOK_TABS.map((tab) => tab.addressType)).toEqual([
      'ORIGIN_OR_CONSIGNOR',
      'DESTINATION_CONSIGNEE_OR_IMPORTER',
      'TRANSPORTER',
      'BRANCH'
    ])
  })

  test.each([
    [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, ORIGIN_TAB],
    [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER, DESTINATION_TAB],
    [ADDRESS_TYPES.TRANSPORTER, TRANSPORTER_TAB],
    [ADDRESS_TYPES.BRANCH, BRANCH_TAB]
  ])('resolves %s to its own tab', (addressType, tab) => {
    expect(resolveTab(addressType)).toBe(tab)
  })

  test.each([
    ['no address type', undefined],
    ['an empty address type', ''],
    ['an unknown address type', 'UNSUPPORTED_ADDRESS_TYPE'],
    ['an address type in the wrong case', 'branch']
  ])('resolves %s to no tab', (_description, requested) => {
    expect(resolveTab(requested)).toBeUndefined()
  })

  test('offers each role-backed tab its own roles in the Type select order, and none to the Transporter tab', () => {
    expect(ADDRESS_BOOK_TABS.map((tab) => tab.roles)).toEqual([
      ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
      ['CONSIGNEE', 'IMPORTER', 'PLACE_OF_DESTINATION'],
      null,
      ['BRANCH_ADDRESS']
    ])
  })

  test('lists only the three role-backed tabs, Transporter excluded', () => {
    expect(ROLE_BACKED_ADDRESS_BOOK_TABS).toEqual([
      ORIGIN_TAB,
      DESTINATION_TAB,
      BRANCH_TAB
    ])
  })

  test('carries each tab its own filter parameter name and its ordered values', () => {
    expect(ADDRESS_BOOK_TABS.map((tab) => tab.typeFilter)).toEqual([
      { param: 'role', values: ['PLACE_OF_ORIGIN', 'CONSIGNOR'] },
      {
        param: 'role',
        values: ['CONSIGNEE', 'IMPORTER', 'PLACE_OF_DESTINATION']
      },
      { param: 'type', values: ['COMMERCIAL', 'PRIVATE'] },
      { param: 'role', values: ['BRANCH_ADDRESS'] }
    ])
  })

  test.each([
    ['CONSIGNOR', ORIGIN_TAB.addressType, ORIGIN_TAB],
    ['IMPORTER', DESTINATION_TAB.addressType, DESTINATION_TAB],
    ['BRANCH_ADDRESS', BRANCH_TAB.addressType, BRANCH_TAB],
    ['COMMERCIAL', TRANSPORTER_TAB.addressType, TRANSPORTER_TAB],
    ['PRIVATE', TRANSPORTER_TAB.addressType, TRANSPORTER_TAB]
  ])(
    'honours %s on the %s tab, whose Type filter offers it',
    (value, _tabName, tab) => {
      expect(resolveTypeFilterValue(tab, value)).toBe(value)
    }
  )

  test.each([
    ['no value', ORIGIN_TAB, undefined],
    ['an empty value', ORIGIN_TAB, ''],
    ['an unknown value', ORIGIN_TAB, 'UNSUPPORTED_ROLE'],
    ['a role another tab offers', ORIGIN_TAB, 'IMPORTER'],
    ['a role in the wrong case', BRANCH_TAB, 'branch_address'],
    ['a transporter type on a role-backed tab', ORIGIN_TAB, 'COMMERCIAL'],
    ['a role on the Transporter tab', TRANSPORTER_TAB, 'BRANCH_ADDRESS']
  ])('honours no value for %s', (_description, tab, requested) => {
    expect(resolveTypeFilterValue(tab, requested)).toBeUndefined()
  })
})
