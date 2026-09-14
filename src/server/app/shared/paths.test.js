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
  dashboardPath
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
