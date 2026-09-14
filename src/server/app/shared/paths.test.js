import { describe, expect, it } from 'vitest'

import {
  addressAddPath,
  addressBookPath,
  addressDeletePath,
  addressDeleteRoutePath,
  addressEditPath,
  addressEditRoutePath,
  addressPath,
  addressRoutePath,
  dashboardPath,
  inAddressBookSection,
  inDashboardSection
} from './paths.js'

const ADDRESS_ID = '000000000000000000000001'

describe('public paths', () => {
  it('Should build every public URL the service exposes', () => {
    expect([
      dashboardPath(),
      addressBookPath(),
      addressAddPath(),
      addressPath(ADDRESS_ID),
      addressEditPath(ADDRESS_ID),
      addressDeletePath(ADDRESS_ID)
    ]).toEqual([
      '/',
      '/address-book',
      '/address-book/add',
      '/address-book/000000000000000000000001',
      '/address-book/000000000000000000000001/edit',
      '/address-book/000000000000000000000001/delete'
    ])
  })

  it('Should build the Hapi route form of every path that carries an address id', () => {
    expect([
      addressRoutePath(),
      addressEditRoutePath(),
      addressDeleteRoutePath()
    ]).toEqual([
      '/address-book/{id}',
      '/address-book/{id}/edit',
      '/address-book/{id}/delete'
    ])
  })

  it('Should encode an address id so it cannot rewrite the path', () => {
    expect(addressPath('a/b?c')).toBe('/address-book/a%2Fb%3Fc')
  })
})

describe('navigation sections', () => {
  it('Should place only the dashboard itself in the dashboard section', () => {
    expect(inDashboardSection(dashboardPath())).toBe(true)
    expect(inDashboardSection(addressBookPath())).toBe(false)
  })

  it('Should place every address-book page in the address book section, and nothing that merely starts with its name', () => {
    expect(
      [
        addressBookPath(),
        addressAddPath(),
        addressEditPath(ADDRESS_ID),
        '/address-bookkeeping',
        dashboardPath()
      ].map(inAddressBookSection)
    ).toEqual([true, true, true, false, false])
  })
})
