import { describe, expect, test } from 'vitest'

import { copy } from '../copy/copy.en.js'
import {
  addressBookPageHref,
  postalLinesOf,
  buildAddressBookQueryString,
  mapAddressRows,
  nameLinesOf,
  resultsLabelOf
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

describe('#postalLinesOf', () => {
  test('Should give address line 1, address line 2, town or city, county and postcode in that order', () => {
    expect(
      postalLinesOf({
        postcode: 'IV2 3JH',
        county: 'Highland',
        townOrCity: 'Inverness',
        addressLine2: 'Unit 3',
        addressLine1: "14 Drover's Way"
      })
    ).toEqual(["14 Drover's Way", 'Unit 3', 'Inverness', 'Highland', 'IV2 3JH'])
  })

  test('Should leave out blank and missing lines', () => {
    expect(
      postalLinesOf({
        addressLine1: '1 Road',
        addressLine2: '  ',
        townOrCity: 'Town',
        postcode: 'AB1 2CD'
      })
    ).toEqual(['1 Road', 'Town', 'AB1 2CD'])
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

  test('Should carry q and countryCode before the page param', () => {
    expect(
      buildAddressBookQueryString({
        searchTerm: 'green',
        countryCode: 'GB',
        page: 2
      })
    ).toBe('?q=green&countryCode=GB&page=2')
  })
})

describe('#addressBookPageHref', () => {
  test('Should link to the address book carrying q and countryCode, adding page only after the first page', () => {
    const search = { searchTerm: 'green', countryCode: 'GB' }

    expect(addressBookPageHref(1, search)).toBe(
      '/address-book?q=green&countryCode=GB'
    )
    expect(addressBookPageHref(2, search)).toBe(
      '/address-book?q=green&countryCode=GB&page=2'
    )
  })

  test('Should link to /address-book with no query for the first page and no search', () => {
    expect(addressBookPageHref(1)).toBe('/address-book')
  })
})

describe('#mapAddressRows', () => {
  test('Should map each address to a row with its name lines, postal lines and country label', () => {
    expect(
      mapAddressRows(
        [
          {
            id: '1',
            name: 'Green Farm',
            addressLine1: '1 Road',
            townOrCity: 'Town',
            postcode: 'AB1 2CD',
            countryCode: 'GB'
          }
        ],
        [{ code: 'GB', name: 'United Kingdom' }]
      )
    ).toEqual([
      {
        id: '1',
        name: 'Green Farm',
        nameLines: ['Green', 'Farm'],
        postalLines: ['1 Road', 'Town', 'AB1 2CD'],
        countryCode: 'GB',
        countryLabel: 'United Kingdom'
      }
    ])
  })
})
