import { describe, expect, test } from 'vitest'

import {
  ADDRESS_BOOK_BASE,
  addressBookAdd,
  addressBookAddPath,
  addressBookDelete,
  addressBookDeletePath,
  addressBookEdit,
  addressBookEditPath,
  addressBookList,
  addressBookListPath,
  addressBookView,
  addressBookViewPath,
  buildAddressBookRoutes
} from './routes.js'

describe('address book routes', () => {
  test('exports the current address book URLs', () => {
    expect(addressBookList()).toBe('/address-book')
    expect(addressBookListPath()).toBe('/address-book')
    expect(addressBookAdd()).toBe('/address-book/add')
    expect(addressBookAddPath()).toBe('/address-book/add')
    expect(addressBookViewPath()).toBe('/address-book/{id}')
    expect(addressBookEditPath()).toBe('/address-book/{id}/edit')
    expect(addressBookDeletePath()).toBe('/address-book/{id}/delete')
    expect(addressBookView('507f1f77bcf86cd799439011')).toBe(
      '/address-book/507f1f77bcf86cd799439011'
    )
    expect(addressBookEdit('507f1f77bcf86cd799439011')).toBe(
      '/address-book/507f1f77bcf86cd799439011/edit'
    )
    expect(addressBookDelete('507f1f77bcf86cd799439011')).toBe(
      '/address-book/507f1f77bcf86cd799439011/delete'
    )
  })

  test('derives every path from ADDRESS_BOOK_BASE', () => {
    expect(addressBookList()).toBe(ADDRESS_BOOK_BASE)
    expect(addressBookAdd()).toBe(`${ADDRESS_BOOK_BASE}/add`)
    expect(addressBookView('abc')).toBe(`${ADDRESS_BOOK_BASE}/abc`)
    expect(addressBookEdit('abc')).toBe(`${ADDRESS_BOOK_BASE}/abc/edit`)
    expect(addressBookDelete('abc')).toBe(`${ADDRESS_BOOK_BASE}/abc/delete`)
  })

  test('moves the whole feature when the base path changes', () => {
    const altBase = '/new-address-book'
    const altRoutes = buildAddressBookRoutes(altBase)

    expect(altRoutes.list()).toBe(altBase)
    expect(altRoutes.add()).toBe(`${altBase}/add`)
    expect(altRoutes.viewPath()).toBe(`${altBase}/{id}`)
    expect(altRoutes.view('abc')).toBe(`${altBase}/abc`)
    expect(altRoutes.editPath()).toBe(`${altBase}/{id}/edit`)
    expect(altRoutes.edit('abc')).toBe(`${altBase}/abc/edit`)
    expect(altRoutes.deletePath()).toBe(`${altBase}/{id}/delete`)
    expect(altRoutes.delete('abc')).toBe(`${altBase}/abc/delete`)
    expect(altRoutes.isAddressBookPath(`${altBase}/add`)).toBe(true)
    expect(altRoutes.isAddressBookPath('/address-book')).toBe(false)
  })
})
