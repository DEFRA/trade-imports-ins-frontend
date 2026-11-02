import { describe, expect, test } from 'vitest'

import { ADDRESS_TYPES } from '../../../services/address-book/index.js'
import { copy } from '../copy/copy.en.js'
import {
  addressBookPageHref,
  buildAddressBookQueryString,
  mapAddressRows,
  nameLinesOf,
  resultsLabelOf,
  useLabelsOf,
  usesWhoseLabelContains
} from './list.js'

describe('#nameLinesOf', () => {
  test('Should give the first word then the rest, single-spaced, for a name of several words', () => {
    expect(nameLinesOf('Green Valley   Farm')).toEqual(['Green', 'Valley Farm'])
  })

  test('Should give one line for a one-word name', () => {
    expect(nameLinesOf('  Farm ')).toEqual(['Farm'])
  })

  test('Should give no lines for a blank name', () => {
    expect(nameLinesOf('   ')).toEqual([])
  })
})

describe('#resultsLabelOf', () => {
  test('Should give the range label for a page with results', () => {
    expect(
      resultsLabelOf(
        { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
        copy.list
      )
    ).toBe('Showing 1-1 of 1')
  })

  test('Should give Showing 0 of 0 for a page with no results', () => {
    expect(
      resultsLabelOf(
        { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
        copy.list
      )
    ).toBe('Showing 0 of 0')
  })
})

describe('#buildAddressBookQueryString', () => {
  test('Should add the page param only after the first page', () => {
    expect(buildAddressBookQueryString({ page: 2 })).toBe('?page=2')
    expect(buildAddressBookQueryString({ page: 1 })).toBe('')
  })

  test('Should carry q before the page param', () => {
    expect(buildAddressBookQueryString({ searchTerm: 'green', page: 2 })).toBe(
      '?q=green&page=2'
    )
  })

  test('Should carry the address type before q and the page param', () => {
    expect(
      buildAddressBookQueryString({
        addressType: ADDRESS_TYPES.BRANCH,
        searchTerm: 'green',
        page: 2
      })
    ).toBe('?addressType=BRANCH&q=green&page=2')
  })

  test('Should carry the use after q and before the page param', () => {
    expect(
      buildAddressBookQueryString({
        addressType: ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR,
        searchTerm: 'green',
        use: 'CONSIGNOR',
        page: 2
      })
    ).toBe('?addressType=ORIGIN_OR_CONSIGNOR&q=green&use=CONSIGNOR&page=2')
  })

  test('Should carry the address type alone on the first page with no search', () => {
    expect(
      buildAddressBookQueryString({
        addressType: ADDRESS_TYPES.BRANCH,
        page: 1
      })
    ).toBe('?addressType=BRANCH')
  })
})

describe('#addressBookPageHref', () => {
  test('Should link to the address book carrying q, adding page only after the first page', () => {
    const search = { searchTerm: 'green' }

    expect(addressBookPageHref(1, search)).toBe('/address-book?q=green')
    expect(addressBookPageHref(2, search)).toBe('/address-book?q=green&page=2')
  })

  test('Should link to /address-book with no query for the first page and no search', () => {
    expect(addressBookPageHref(1)).toBe('/address-book')
  })

  test('Should link to the address type carrying q and the page', () => {
    const search = { addressType: ADDRESS_TYPES.BRANCH, searchTerm: 'green' }

    expect(addressBookPageHref(1, search)).toBe(
      '/address-book?addressType=BRANCH&q=green'
    )
    expect(addressBookPageHref(3, search)).toBe(
      '/address-book?addressType=BRANCH&q=green&page=3'
    )
  })

  test('Should link to the address type carrying q, the use and the page', () => {
    const filters = {
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      searchTerm: 'green',
      use: 'IMPORTER'
    }

    expect(addressBookPageHref(1, filters)).toBe(
      '/address-book?addressType=DESTINATION_CONSIGNEE_OR_IMPORTER&q=green&use=IMPORTER'
    )
    expect(addressBookPageHref(2, filters)).toBe(
      '/address-book?addressType=DESTINATION_CONSIGNEE_OR_IMPORTER&q=green&use=IMPORTER&page=2'
    )
  })
})

describe('#useLabelsOf', () => {
  test.each([
    ['PLACE_OF_ORIGIN', 'Place of origin'],
    ['CONSIGNOR', 'Consignor'],
    ['CONSIGNEE', 'Consignee'],
    ['IMPORTER', 'Importer'],
    ['PLACE_OF_DESTINATION', 'Place of destination'],
    ['BRANCH_ADDRESS', 'Branch']
  ])('Should label the %s use alone as %s', (use, label) => {
    expect(useLabelsOf([use], copy.list.uses)).toBe(label)
  })

  test('Should join the labels of several uses with a comma in the order stored', () => {
    expect(useLabelsOf(['CONSIGNOR', 'PLACE_OF_ORIGIN'], copy.list.uses)).toBe(
      'Consignor, Place of origin'
    )
  })

  test('Should give an empty label for an address with no uses', () => {
    expect(useLabelsOf([], copy.list.uses)).toBe('')
    expect(useLabelsOf(undefined, copy.list.uses)).toBe('')
  })
})

describe('#usesWhoseLabelContains', () => {
  test.each([
    ['consignor', ['CONSIGNOR']],
    ['consign', ['CONSIGNOR', 'CONSIGNEE']],
    ['  PLACE OF ', ['PLACE_OF_ORIGIN', 'PLACE_OF_DESTINATION']],
    ['branch', ['BRANCH_ADDRESS']],
    ['branch address', ['BRANCH_ADDRESS']],
    ['farm', []]
  ])(
    'Should give the uses whose Type column label or Type option label contains %j, ignoring case',
    (searchTerm, uses) => {
      expect(usesWhoseLabelContains(searchTerm, copy.list.uses)).toEqual(uses)
    }
  )

  test('Should give no uses for a blank or missing term', () => {
    expect(usesWhoseLabelContains('   ', copy.list.uses)).toEqual([])
    expect(usesWhoseLabelContains(undefined, copy.list.uses)).toEqual([])
  })
})

describe('#mapAddressRows', () => {
  test('Should map each address to a row with its name lines, use labels, postal lines and country label', () => {
    expect(
      mapAddressRows(
        [
          {
            id: '1',
            name: 'Green Farm',
            addressLine1: '1 Road',
            townOrCity: 'Town',
            postcode: 'AB1 2CD',
            countryCode: 'GB',
            uses: ['PLACE_OF_ORIGIN', 'CONSIGNOR']
          }
        ],
        [{ code: 'GB', name: 'United Kingdom' }],
        copy.list.uses
      )
    ).toEqual([
      {
        id: '1',
        name: 'Green Farm',
        nameLines: ['Green', 'Farm'],
        useLabels: 'Place of origin, Consignor',
        postalLines: ['1 Road', 'Town', 'AB1 2CD'],
        countryLabel: 'United Kingdom'
      }
    ])
  })
})
