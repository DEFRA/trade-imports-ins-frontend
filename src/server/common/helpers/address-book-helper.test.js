import { describe, expect, test } from 'vitest'

import {
  buildAddressBookQueryString,
  buildAddressLine,
  buildPaginationLinks,
  mapAddressRows
} from './address-book-helper.js'

describe('#address-book-helper', () => {
  test('buildAddressLine composes addressLine1, townOrCity and postcode', () => {
    expect(
      buildAddressLine({
        addressLine1: '14 Drover\'s Way',
        townOrCity: 'Inverness',
        postcode: 'IV2 3JH'
      })
    ).toBe('14 Drover\'s Way, Inverness, IV2 3JH')
  })

  test('buildPaginationLinks returns numbered pages from API metadata', () => {
    const pagination = buildPaginationLinks({
      page: 2,
      pageSize: 25,
      totalItems: 30,
      totalPages: 2
    })

    expect(pagination.items).toHaveLength(2)
    expect(pagination.items[1].current).toBe(true)
    expect(pagination.previous.href).toBe('/address-book')
    expect(pagination.next).toBeUndefined()
  })

  test('buildAddressBookQueryString omits page size param', () => {
    expect(buildAddressBookQueryString({ page: 2 })).toBe('?page=2')
    expect(buildAddressBookQueryString({ page: 1 })).toBe('')
  })

  test('mapAddressRows maps list rows', () => {
    expect(
      mapAddressRows([
        {
          id: '1',
          name: 'Farm',
          addressLine1: '1 Road',
          townOrCity: 'Town',
          postcode: 'AB1 2CD',
          countryCode: 'GB'
        }
      ])
    ).toEqual([
      {
        id: '1',
        name: 'Farm',
        addressLine: '1 Road, Town, AB1 2CD',
        countryCode: 'GB'
      }
    ])
  })
})
