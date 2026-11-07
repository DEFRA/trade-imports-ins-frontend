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
  addressTypePath,
  addressTypeStartPath,
  commercialTransporterPath,
  dashboardPath,
  inAddressBookSection,
  inDashboardSection,
  isAddressTypeStart,
  notificationTypePath,
  privateTransporterPath,
  transporterTypePath
} from './paths.js'

const ADDRESS_ID = '000000000000000000000001'

describe('public paths', () => {
  it('Should build every public URL the service exposes', () => {
    expect([
      dashboardPath(),
      notificationTypePath(),
      addressBookPath(),
      addressAddPath(),
      addressTypePath(),
      addressTypeStartPath(),
      transporterTypePath(),
      privateTransporterPath(),
      commercialTransporterPath(),
      addressPath(ADDRESS_ID),
      addressEditPath(ADDRESS_ID),
      addressDeletePath(ADDRESS_ID)
    ]).toEqual([
      '/',
      '/notification-type',
      '/address-book',
      '/address-book/add',
      '/address-book/add/address-type',
      '/address-book/add/address-type?start=true',
      '/address-book/add/transporter',
      '/address-book/add/transporter/private',
      '/address-book/add/transporter/commercial',
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

  it('Should read the start marker only when it is true', () => {
    expect([
      isAddressTypeStart({ start: 'true' }),
      isAddressTypeStart({}),
      isAddressTypeStart({ start: 'false' })
    ]).toEqual([true, false, false])
  })

  it('Should encode an address id so it cannot rewrite the path', () => {
    expect(addressPath('a/b?c')).toBe('/address-book/a%2Fb%3Fc')
  })
})

describe('navigation sections', () => {
  it('Should place the dashboard and the notification type question in the dashboard section', () => {
    expect(inDashboardSection(dashboardPath())).toBe(true)
    expect(inDashboardSection(notificationTypePath())).toBe(true)
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
