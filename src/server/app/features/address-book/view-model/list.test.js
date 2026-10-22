import { describe, expect, test } from 'vitest'

import {
  addressBookPageHref,
  buildAddressBookQueryString,
  buildAddressLine,
  mapAddressRows
} from './list.js'

describe('#buildAddressLine', () => {
  test('Should join addressLine1, townOrCity and postcode with commas', () => {
    expect(
      buildAddressLine({
        addressLine1: "14 Drover's Way",
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH'
      })
    ).toBe("14 Drover's Way, Inverness, IV2 3JH")
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
  test('Should map each address to a row with its address line and country label', () => {
    expect(
      mapAddressRows(
        [
          {
            id: '1',
            name: 'Farm',
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
        name: 'Farm',
        addressLine: '1 Road, Town, AB1 2CD',
        countryCode: 'GB',
        countryLabel: 'United Kingdom'
      }
    ])
  })
})
