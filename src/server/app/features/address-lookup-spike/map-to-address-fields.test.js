import { describe, expect, test } from 'vitest'

import {
  composeAddressLines,
  mapToAddressFields
} from './map-to-address-fields.js'

const DOWNING_STREET = 'DOWNING STREET'
const DOWNING_HOUSE = 'DOWNING HOUSE'
const BUCKINGHAM_PALACE_NAME = 'BUCKINGHAM PALACE'
const FALLBACK_ADDRESS = 'SOMEWHERE, LONDON, SW1A 1AA'

describe('#composeAddressLines', () => {
  test('puts a number with its street, not on its own', () => {
    const lines = composeAddressLines({
      buildingNumber: '1',
      street: DOWNING_STREET
    })

    expect(lines).toEqual({
      addressLine1: `1 ${DOWNING_STREET}`,
      addressLine2: ''
    })
  })

  test('reads sub-building before building name', () => {
    const lines = composeAddressLines({
      subBuildingName: 'UNIT 1',
      buildingName: DOWNING_HOUSE,
      street: DOWNING_STREET
    })

    expect(lines).toEqual({
      addressLine1: `UNIT 1, ${DOWNING_HOUSE}`,
      addressLine2: DOWNING_STREET
    })
  })

  test('keeps a name that arrives only in subBuildingName', () => {
    // What dev really returned for SW1A 1AA on 2026-09-17.
    const lines = composeAddressLines({
      addressLine: 'BUCKINGHAM PALACE, LONDON, SW1A 1AA',
      subBuildingName: BUCKINGHAM_PALACE_NAME,
      buildingName: null,
      buildingNumber: null,
      street: null
    })

    expect(lines).toEqual({
      addressLine1: BUCKINGHAM_PALACE_NAME,
      addressLine2: ''
    })
  })

  test('puts locality in line 2 when the street is already line 1', () => {
    const lines = composeAddressLines({
      buildingNumber: '10',
      street: DOWNING_STREET,
      locality: 'WESTMINSTER'
    })

    expect(lines).toEqual({
      addressLine1: `10 ${DOWNING_STREET}`,
      addressLine2: 'WESTMINSTER'
    })
  })

  test('puts the street and locality in line 2 when premises take line 1', () => {
    const lines = composeAddressLines({
      buildingName: DOWNING_HOUSE,
      buildingNumber: '10',
      street: DOWNING_STREET,
      locality: 'WESTMINSTER'
    })

    expect(lines).toEqual({
      addressLine1: DOWNING_HOUSE,
      addressLine2: `10 ${DOWNING_STREET}, WESTMINSTER`
    })
  })

  test('falls back to the formatted line when there is nothing to compose from', () => {
    const lines = composeAddressLines({
      addressLine: FALLBACK_ADDRESS
    })

    expect(lines.addressLine1).toBe(FALLBACK_ADDRESS)
  })
})

describe('#mapToAddressFields', () => {
  const buckinghamPalace = {
    addressLine: 'BUCKINGHAM PALACE, LONDON, SW1A 1AA',
    subBuildingName: BUCKINGHAM_PALACE_NAME,
    town: 'LONDON',
    postcode: 'SW1A 1AA',
    country: 'ENGLAND'
  }

  test('fills the address book fields it can', () => {
    const { fields } = mapToAddressFields(buckinghamPalace)

    expect(fields.addressLine1).toBe(BUCKINGHAM_PALACE_NAME)
    expect(fields.townOrCity).toBe('LONDON')
    expect(fields.postcode).toBe('SW1A 1AA')
  })

  test('leaves county and country code empty, because the lookup cannot fill them', () => {
    const { fields } = mapToAddressFields(buckinghamPalace)

    expect(fields.county).toBe('')
    expect(fields.countryCode).toBe('')
  })

  test('always reports the county and country gaps', () => {
    const { gaps } = mapToAddressFields(buckinghamPalace)

    expect(gaps).toEqual(
      expect.arrayContaining([
        expect.stringContaining('no county'),
        expect.stringContaining('ISO code')
      ])
    )
  })

  test('reports the fallback when no name, number or street is returned', () => {
    const { gaps } = mapToAddressFields({
      addressLine: FALLBACK_ADDRESS,
      town: 'LONDON'
    })

    expect(gaps).toEqual(
      expect.arrayContaining([expect.stringContaining('fell back')])
    )
  })

  test('reports a missing town, which the form requires', () => {
    const { gaps } = mapToAddressFields({
      subBuildingName: BUCKINGHAM_PALACE_NAME,
      postcode: 'SW1A 1AA'
    })

    expect(gaps).toEqual(
      expect.arrayContaining([expect.stringContaining('No town returned')])
    )
  })
})
