import { describe, expect, test } from 'vitest'

import {
  ADDRESS_TYPES,
  PLACE_USES,
  USES_BY_ADDRESS_TYPE,
  addressTypeOfUse,
  addressTypeRequiresUnitedKingdom,
  keepUsesOfferedBy
} from './address-types.js'

describe('the uses each address type lists', () => {
  test('Should list them in the order the Type select offers them', () => {
    expect(USES_BY_ADDRESS_TYPE).toEqual({
      ORIGIN_OR_CONSIGNOR: ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
      DESTINATION_CONSIGNEE_OR_IMPORTER: [
        'CONSIGNEE',
        'IMPORTER',
        'PLACE_OF_DESTINATION'
      ],
      BRANCH: ['BRANCH_ADDRESS']
    })
  })
})

describe('the uses an address type offers', () => {
  test('Should keep the given uses the address type offers, in USES_BY_ADDRESS_TYPE order', () => {
    expect(
      keepUsesOfferedBy('ORIGIN_OR_CONSIGNOR', ['CONSIGNOR', 'PLACE_OF_ORIGIN'])
    ).toEqual(['PLACE_OF_ORIGIN', 'CONSIGNOR'])
    expect(
      keepUsesOfferedBy('DESTINATION_CONSIGNEE_OR_IMPORTER', [
        'PLACE_OF_DESTINATION',
        'CONSIGNEE'
      ])
    ).toEqual(['CONSIGNEE', 'PLACE_OF_DESTINATION'])
  })

  test('Should drop a given use the address type does not offer', () => {
    expect(
      keepUsesOfferedBy('ORIGIN_OR_CONSIGNOR', ['CONSIGNOR', 'IMPORTER'])
    ).toEqual(['CONSIGNOR'])
    expect(keepUsesOfferedBy('BRANCH', ['CONSIGNOR'])).toEqual([])
  })
})

describe('the address type that holds a use', () => {
  test.each(
    Object.entries(USES_BY_ADDRESS_TYPE).flatMap(([addressType, uses]) =>
      uses.map((use) => [use, addressType])
    )
  )('Should give the type %s is listed under', (use, addressType) => {
    expect(addressTypeOfUse(use)).toBe(addressType)
  })

  test('Should give no type for a use no type holds', () => {
    expect(addressTypeOfUse('TRANSPORTER')).toBeUndefined()
  })
})

describe('the address types that must be in the United Kingdom', () => {
  test.each([
    [ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR, false],
    [ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER, true],
    [ADDRESS_TYPES.BRANCH, true]
  ])('Should answer for %s: %s', (addressType, requiresUnitedKingdom) => {
    expect(addressTypeRequiresUnitedKingdom(addressType)).toBe(
      requiresUnitedKingdom
    )
  })

  test('Should answer false for a missing or unknown type', () => {
    expect(addressTypeRequiresUnitedKingdom(undefined)).toBe(false)
    expect(addressTypeRequiresUnitedKingdom('TRANSPORTER')).toBe(false)
  })
})

describe('the place uses', () => {
  test('Should be exactly the place of origin and the place of destination, in that order', () => {
    expect(PLACE_USES).toEqual(['PLACE_OF_ORIGIN', 'PLACE_OF_DESTINATION'])
  })
})
