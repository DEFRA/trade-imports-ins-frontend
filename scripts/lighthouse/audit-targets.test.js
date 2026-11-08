import { describe, expect, test } from 'vitest'

import { allRoutes } from '../../src/server/app/features/index.js'
import {
  assertTargetsAreCurrent,
  auditableRoutePaths,
  auditPaths,
  auditUrls,
  QUERY,
  reportName,
  reportNames,
  SKIPPED
} from './audit-targets.js'

const ORIGIN = 'http://localhost:3002'
const ADDRESS_ID = '665f1c2ab3e4d51a2c9d0e77'

const DASHBOARD_PATH = '/'
const NOTIFICATION_TYPE_PATH = '/notification-type'
const LIST_PATH = '/address-book'
const ADD_PATH = '/address-book/add'
const ADDRESS_TYPE_PATH = '/address-book/add/address-type'
const VIEW_PATH = '/address-book/{id}'
const EDIT_PATH = '/address-book/{id}/edit'
const DELETE_PATH = '/address-book/{id}/delete'
const TRANSPORTER_TYPE_PATH = '/address-book/add/transporter'
const PRIVATE_TRANSPORTER_PATH = '/address-book/add/transporter/private'
const COMMERCIAL_TRANSPORTER_PATH = '/address-book/add/transporter/commercial'

// The private transporter form is the one route the skip list names: a session holds one
// chosen transporter type at a time and the audit chooses commercial.
const AUDITED_PATHS = [
  DASHBOARD_PATH,
  NOTIFICATION_TYPE_PATH,
  LIST_PATH,
  ADD_PATH,
  ADDRESS_TYPE_PATH,
  VIEW_PATH,
  EDIT_PATH,
  DELETE_PATH,
  TRANSPORTER_TYPE_PATH,
  COMMERCIAL_TRANSPORTER_PATH
]

const STATUS_PATH = '/address-book/{id}/status'

const withRoute = (path) => [...allRoutes, { method: 'GET', path }]

const withEntries = (map, entries, run) => {
  for (const [key, value] of entries) {
    map.set(key, value)
  }
  try {
    return run()
  } finally {
    for (const [key] of entries) {
      map.delete(key)
    }
  }
}

describe('#auditableRoutePaths', () => {
  test('Should name every GET route the service registers today, id unsubstituted', () => {
    expect(auditableRoutePaths()).toEqual(AUDITED_PATHS)
  })

  test('Should leave out a route the skip list names', () => {
    const paths = withEntries(
      SKIPPED,
      [[STATUS_PATH, 'polling endpoint — JSON, not a page']],
      () => auditableRoutePaths(withRoute(STATUS_PATH))
    )

    expect(paths).toEqual(AUDITED_PATHS)
  })
})

describe('#auditPaths', () => {
  test('Should audit every page the service registers today on the seeded address', () => {
    expect(auditPaths(ADDRESS_ID)).toEqual([
      DASHBOARD_PATH,
      NOTIFICATION_TYPE_PATH,
      LIST_PATH,
      ADD_PATH,
      ADDRESS_TYPE_PATH,
      `/address-book/${ADDRESS_ID}`,
      `/address-book/${ADDRESS_ID}/edit`,
      `/address-book/${ADDRESS_ID}/delete`,
      TRANSPORTER_TYPE_PATH,
      COMMERCIAL_TRANSPORTER_PATH
    ])
  })

  test('Should leave the private transporter form out, with the skip list saying why', () => {
    expect(auditPaths(ADDRESS_ID)).not.toContain(PRIVATE_TRANSPORTER_PATH)
    expect(SKIPPED.get(PRIVATE_TRANSPORTER_PATH)).toContain(
      'one chosen transporter type at a time'
    )
  })

  test('Should audit a page the moment the app registers a GET route for it', () => {
    expect(auditPaths(ADDRESS_ID, withRoute('/brand-new'))).toContain(
      '/brand-new'
    )
  })

  test('Should carry the query string a route needs before it will render', () => {
    const paths = withEntries(QUERY, [[LIST_PATH, '?page=2']], () =>
      auditPaths(ADDRESS_ID)
    )

    expect(paths).toContain(`${LIST_PATH}?page=2`)
  })

  test('Should refuse to audit an address page when no address was seeded', () => {
    expect(() => auditPaths(undefined)).toThrow(
      /audits \/address-book\/\{id} on the seeded address, which the setup step did not create/
    )
  })
})

describe('#auditUrls', () => {
  test('Should resolve every path against the origin', () => {
    expect(auditUrls(ORIGIN, ADDRESS_ID)).toEqual(
      auditPaths(ADDRESS_ID).map((path) => `${ORIGIN}${path}`)
    )
  })
})

describe('#assertTargetsAreCurrent', () => {
  test('Should pass against the routes the app registers today', () => {
    expect(() => assertTargetsAreCurrent()).not.toThrow()
  })

  test('Should reject a skip list naming a route the app no longer serves', () => {
    expect(() =>
      withEntries(SKIPPED, [[STATUS_PATH, 'gone']], () =>
        assertTargetsAreCurrent()
      )
    ).toThrow(/skip list names .*, which the app no longer serves/)
  })

  test('Should reject a query entry naming a route the app no longer serves', () => {
    expect(() =>
      withEntries(QUERY, [[STATUS_PATH, '?page=2']], () =>
        assertTargetsAreCurrent()
      )
    ).toThrow(/query list names .*, which the app no longer serves/)
  })

  test('Should refuse a new route whose extra path parameter nothing can satisfy', () => {
    expect(() =>
      assertTargetsAreCurrent(withRoute('/address-book/{id}/lines/{lineId}'))
    ).toThrow(/cannot build a URL for \/address-book\/\{id}\/lines\/\{lineId}/)
  })
})

describe('#reportName', () => {
  test('Should name the report for the service start page', () => {
    expect(reportName(DASHBOARD_PATH)).toBe('home')
  })

  test('Should name a report after its route, with the id parameter as a plain segment', () => {
    expect(reportName(LIST_PATH)).toBe('address_book')
    expect(reportName(VIEW_PATH)).toBe('address_book_id')
    expect(reportName(EDIT_PATH)).toBe('address_book_id_edit')
    expect(reportName(ADDRESS_TYPE_PATH)).toBe('address_book_add_address_type')
  })
})

describe('#reportNames', () => {
  test('Should name every audited URL, and never with the seeded address id', () => {
    const urls = auditUrls(ORIGIN, ADDRESS_ID)
    const names = reportNames(ORIGIN, ADDRESS_ID)

    expect(Object.keys(names)).toEqual(urls)
    expect(Object.values(names)).toEqual([
      'home',
      'notification_type',
      'address_book',
      'address_book_add',
      'address_book_add_address_type',
      'address_book_id',
      'address_book_id_edit',
      'address_book_id_delete',
      'address_book_add_transporter',
      'address_book_add_transporter_commercial'
    ])
    expect(
      Object.values(names).filter((name) => name.includes(ADDRESS_ID))
    ).toEqual([])
  })

  test('Should give a page the same report name whichever address is seeded', () => {
    const other = '000000000000000000000001'

    expect(Object.values(reportNames(ORIGIN, other))).toEqual(
      Object.values(reportNames(ORIGIN, ADDRESS_ID))
    )
  })

  test('Should refuse two routes that would overwrite each other', () => {
    expect(() =>
      reportNames(ORIGIN, ADDRESS_ID, withRoute('/address-book/id'))
    ).toThrow(/would write both .* to address_book_id\.report\.html/)
  })
})
