import { describe, expect, test } from 'vitest'

import {
  addressBookPageHref,
  buildAddressBookQueryString,
  buildAddressLine,
  mapAddressRows
} from './list.js'

describe('#buildAddressLine', () => {
  test('composes addressLine1, townOrCity and postcode', () => {
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
  test('omits page size param', () => {
    expect(buildAddressBookQueryString({ page: 2 })).toBe('?page=2')
    expect(buildAddressBookQueryString({ page: 1 })).toBe('')
  })

  test('preserves search terms', () => {
    expect(
      buildAddressBookQueryString({ q: 'green', countryCode: 'GB', page: 2 })
    ).toBe('?q=green&countryCode=GB&page=2')
  })
})

describe('#addressBookPageHref', () => {
  test('links to a page of the address book carrying the search', () => {
    const search = { q: 'green', countryCode: 'GB' }

    expect(addressBookPageHref(1, search)).toBe(
      '/address-book?q=green&countryCode=GB'
    )
    expect(addressBookPageHref(2, search)).toBe(
      '/address-book?q=green&countryCode=GB&page=2'
    )
  })

  test('links to the first page with no query', () => {
    expect(addressBookPageHref(1)).toBe('/address-book')
  })
})

describe('#mapAddressRows', () => {
  test('maps list rows with country names', () => {
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
        countryName: 'United Kingdom'
      }
    ])
  })
})
