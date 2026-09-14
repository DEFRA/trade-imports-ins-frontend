import { describe, expect, test } from 'vitest'

import {
  buildAddressBookQueryString,
  buildAddressLine,
  buildPaginationLinks,
  buildResultsLabel,
  mapAddressRows
} from './list.js'
import { copy } from '../copy/copy.en.js'

const twoPages = { page: 2, pageSize: 25, totalItems: 30, totalPages: 2 }

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

describe('#buildResultsLabel', () => {
  test('formats the current page range', () => {
    expect(
      buildResultsLabel(
        { page: 1, pageSize: 8, totalItems: 24, totalPages: 3 },
        copy.list.results
      )
    ).toBe('Showing 1-8 of 24')
    expect(buildResultsLabel(twoPages, copy.list.results)).toBe(
      'Showing 26-30 of 30'
    )
  })

  test('returns null when there are no results', () => {
    expect(
      buildResultsLabel(
        { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
        copy.list.results
      )
    ).toBeNull()
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

describe('#buildPaginationLinks', () => {
  test('returns numbered pages from API metadata', () => {
    const pagination = buildPaginationLinks(twoPages)

    expect(pagination.items).toHaveLength(2)
    expect(pagination.items[1].current).toBe(true)
    expect(pagination.previous.href).toBe('/address-book')
    expect(pagination.next).toBeUndefined()
  })

  test('preserves active search terms', () => {
    const pagination = buildPaginationLinks(twoPages, {
      q: 'green',
      countryCode: 'GB'
    })

    expect(pagination.previous.href).toBe(
      '/address-book?q=green&countryCode=GB'
    )
    expect(pagination.items[1].href).toBe(
      '/address-book?q=green&countryCode=GB&page=2'
    )
  })

  test('returns null for a single page', () => {
    expect(
      buildPaginationLinks({
        page: 1,
        pageSize: 25,
        totalItems: 3,
        totalPages: 1
      })
    ).toBeNull()
  })

  test('omits previous on the first page and next on the last page', () => {
    const first = buildPaginationLinks({ ...twoPages, page: 1 })

    expect(first.previous).toBeUndefined()
    expect(first.next.href).toBe('/address-book?page=2')
    expect(buildPaginationLinks(twoPages).next).toBeUndefined()
  })

  test('clamps a page past the end to the last page', () => {
    const pagination = buildPaginationLinks({ ...twoPages, page: 5 })

    expect(pagination.items[1].current).toBe(true)
    expect(pagination.previous.href).toBe('/address-book')
    expect(pagination.next).toBeUndefined()
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
        { GB: 'United Kingdom' }
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
