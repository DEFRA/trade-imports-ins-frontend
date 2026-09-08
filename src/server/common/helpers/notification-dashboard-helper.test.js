import { describe, expect, test, vi } from 'vitest'

vi.mock('#/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsAnimalsFrontend.baseUrl') {
        return 'http://localhost:3000'
      }
      return undefined
    })
  }
}))

const {
  buildDashboardQueryString,
  buildNotificationLink,
  buildPaginationLinks,
  buildResultsLabel,
  buildStartNewNotificationLink,
  formatDisplayDate,
  mapNotificationRows
} = await import('./notification-dashboard-helper.js')

describe('#buildDashboardQueryString', () => {
  test('is empty with no arguments', () => {
    expect(buildDashboardQueryString()).toBe('')
  })

  test('carries referenceNumber, non-default sort and page > 1', () => {
    expect(
      buildDashboardQueryString({
        referenceNumber: 'GBN-AG-26-000001',
        sort: 'lastUpdated,asc',
        page: 3
      })
    ).toBe('?referenceNumber=GBN-AG-26-000001&sort=lastUpdated%2Casc&page=3')
  })

  test('omits the default sort and page 1', () => {
    expect(
      buildDashboardQueryString({ sort: 'arrivalDate,desc', page: 1 })
    ).toBe('')
  })
})

describe('#buildResultsLabel', () => {
  test('returns null when there are no results', () => {
    expect(
      buildResultsLabel({ page: 1, size: 25, totalElements: 0, totalPages: 0 })
    ).toBeNull()
  })

  test('describes the current page range', () => {
    expect(
      buildResultsLabel({ page: 2, size: 25, totalElements: 40, totalPages: 2 })
    ).toBe('Showing 26-40 of 40')
  })
})

describe('#buildPaginationLinks', () => {
  test('returns null for a single page', () => {
    expect(
      buildPaginationLinks({
        page: 1,
        size: 25,
        totalElements: 3,
        totalPages: 1
      })
    ).toBeNull()
  })

  test('builds previous/next and numbered items, carrying sort and referenceNumber', () => {
    const model = buildPaginationLinks(
      { page: 2, size: 25, totalElements: 60, totalPages: 3 },
      { sort: 'lastUpdated,asc', referenceNumber: undefined }
    )

    // page 1 is the default and is omitted from the querystring, matching
    // address-book-helper.js's buildAddressBookQueryString convention.
    expect(model.previous.href).toBe('/?sort=lastUpdated%2Casc')
    expect(model.next.href).toBe('/?sort=lastUpdated%2Casc&page=3')
    expect(model.items).toHaveLength(3)
    expect(model.items[1].current).toBe(true)
  })

  test('omits previous on the first page and next on the last page', () => {
    const first = buildPaginationLinks({
      page: 1,
      size: 25,
      totalElements: 60,
      totalPages: 3
    })
    const last = buildPaginationLinks({
      page: 3,
      size: 25,
      totalElements: 60,
      totalPages: 3
    })

    expect(first.previous).toBeUndefined()
    expect(last.next).toBeUndefined()
  })
})

describe('#buildNotificationLink', () => {
  test('SUBMITTED notifications link to the read-only notification-view page', () => {
    expect(buildNotificationLink('SUBMITTED', 'GBN-AG-26-000001')).toBe(
      'http://localhost:3000/notifications/GBN-AG-26-000001/notification-view'
    )
  })

  test.each(['DRAFT', 'AMEND'])(
    '%s notifications link back to the journey hub, not notification-view',
    (status) => {
      expect(buildNotificationLink(status, 'GBN-AG-26-000002')).toBe(
        'http://localhost:3000/notifications/GBN-AG-26-000002'
      )
    }
  )

  test('encodes the reference number in the path', () => {
    expect(buildNotificationLink('SUBMITTED', 'GBN AG/1')).toBe(
      'http://localhost:3000/notifications/GBN%20AG%2F1/notification-view'
    )
  })
})

describe('#buildStartNewNotificationLink', () => {
  test('links to the journey frontend base', () => {
    expect(buildStartNewNotificationLink()).toBe('http://localhost:3000')
  })
})

describe('#formatDisplayDate', () => {
  test('formats an ISO string as "d MMM yyyy"', () => {
    expect(formatDisplayDate('2026-09-10T00:00:00Z')).toBe('10 Sep 2026')
  })

  test('returns an empty string for a missing value', () => {
    expect(formatDisplayDate(undefined)).toBe('')
  })

  test('returns an empty string for an invalid value', () => {
    expect(formatDisplayDate('not-a-date')).toBe('')
  })
})

describe('#mapNotificationRows', () => {
  test('maps backend fields to row view-model, resolving country names and building the link', () => {
    const rows = mapNotificationRows(
      [
        {
          referenceNumber: 'GBN-AG-26-000001',
          status: 'SUBMITTED',
          originCountry: 'FR',
          commodity: null,
          arrivalDate: '2026-09-10T00:00:00Z'
        }
      ],
      { FR: 'France' }
    )

    expect(rows).toEqual([
      {
        referenceNumber: 'GBN-AG-26-000001',
        status: 'SUBMITTED',
        originCountry: 'France',
        commodity: '',
        arrivalDate: '10 Sep 2026',
        href: 'http://localhost:3000/notifications/GBN-AG-26-000001/notification-view'
      }
    ])
  })

  test('falls back to the raw country code when no name is known', () => {
    const [row] = mapNotificationRows(
      [
        {
          referenceNumber: 'GBN-AG-26-000001',
          status: 'DRAFT',
          originCountry: 'ZZ'
        }
      ],
      {}
    )

    expect(row.originCountry).toBe('ZZ')
  })
})
