import { afterEach, describe, expect, test, vi } from 'vitest'

const configState = vi.hoisted(() => {
  const defaultAnimalsBaseUrl = 'http://localhost:3000'
  return { defaultAnimalsBaseUrl, animalsBaseUrl: defaultAnimalsBaseUrl }
})

vi.mock('../../../../../config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsAnimalsFrontend.baseUrl') {
        return configState.animalsBaseUrl
      }
      if (key === 'log') {
        return { enabled: true, level: 'info', format: 'ecs', redact: [] }
      }
      return undefined
    })
  }
}))

const REFERENCE_NUMBER = 'GBN-AG-26-000001'
const LAST_UPDATED_OLDEST_FIRST = 'lastUpdated,asc'

const logLines = vi.hoisted(() => [])

vi.mock('pino', async (importOriginal) => {
  const { pino } = await importOriginal()
  const lineRecorder = { write: (line) => logLines.push(JSON.parse(line)) }
  return { pino: (options) => pino(options, lineRecorder) }
})

afterEach(() => {
  configState.animalsBaseUrl = configState.defaultAnimalsBaseUrl
  logLines.length = 0
})

const {
  buildDashboardQueryString,
  buildNotificationLink,
  buildStartNewNotificationLink,
  dashboardPageHref,
  mapNotificationRows
} = await import('./list.js')

describe('#buildDashboardQueryString', () => {
  test('is empty with no arguments', () => {
    expect(buildDashboardQueryString()).toBe('')
  })

  test('carries referenceNumber, non-default sort and page > 1', () => {
    expect(
      buildDashboardQueryString({
        referenceNumber: REFERENCE_NUMBER,
        sort: LAST_UPDATED_OLDEST_FIRST,
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

describe('#dashboardPageHref', () => {
  test('Should link to the given page carrying referenceNumber and sort', () => {
    expect(
      dashboardPageHref(3, {
        sort: LAST_UPDATED_OLDEST_FIRST,
        referenceNumber: REFERENCE_NUMBER
      })
    ).toBe('/?referenceNumber=GBN-AG-26-000001&sort=lastUpdated%2Casc&page=3')
  })

  test('Should leave the page off the link to page 1', () => {
    expect(
      dashboardPageHref(1, {
        sort: LAST_UPDATED_OLDEST_FIRST,
        referenceNumber: null
      })
    ).toBe('/?sort=lastUpdated%2Casc')
  })
})

describe('#buildNotificationLink', () => {
  test('SUBMITTED notifications link to the read-only notification-view page', () => {
    expect(buildNotificationLink('SUBMITTED', REFERENCE_NUMBER)).toBe(
      `http://localhost:3000/live-animals/notifications/${REFERENCE_NUMBER}/notification-view`
    )
  })

  test.each(['DRAFT', 'AMEND'])(
    '%s notifications link back to the journey hub, not notification-view',
    (status) => {
      expect(buildNotificationLink(status, 'GBN-AG-26-000002')).toBe(
        'http://localhost:3000/live-animals/notifications/GBN-AG-26-000002'
      )
    }
  )

  test('encodes the reference number in the path', () => {
    expect(buildNotificationLink('SUBMITTED', 'GBN AG/1')).toBe(
      'http://localhost:3000/live-animals/notifications/GBN%20AG%2F1/notification-view'
    )
  })

  test('does not double the slash when the configured base URL ends in one', () => {
    configState.animalsBaseUrl = 'http://localhost:3000/'

    expect(buildNotificationLink('SUBMITTED', REFERENCE_NUMBER)).toBe(
      `http://localhost:3000/live-animals/notifications/${REFERENCE_NUMBER}/notification-view`
    )
  })
})

describe('#buildStartNewNotificationLink', () => {
  test("links to the live-animals set's base, not the journey frontend root", () => {
    expect(buildStartNewNotificationLink()).toBe(
      'http://localhost:3000/live-animals'
    )
  })

  test('does not double the slash when the configured base URL ends in one', () => {
    configState.animalsBaseUrl = 'http://localhost:3000/'

    expect(buildStartNewNotificationLink()).toBe(
      'http://localhost:3000/live-animals'
    )
  })
})

describe('#mapNotificationRows', () => {
  test('maps backend fields to row view-model, resolving country names and building the link', () => {
    const rows = mapNotificationRows(
      [
        {
          referenceNumber: REFERENCE_NUMBER,
          status: 'SUBMITTED',
          originCountry: 'FR',
          commodity: null,
          arrivalDate: '2026-09-10'
        }
      ],
      { FR: 'France' }
    )

    expect(rows).toEqual([
      {
        referenceNumber: REFERENCE_NUMBER,
        status: 'SUBMITTED',
        originCountry: 'France',
        commodity: '',
        arrivalDate: '10 Sep 2026',
        href: `http://localhost:3000/live-animals/notifications/${REFERENCE_NUMBER}/notification-view`
      }
    ])
  })

  test('falls back to the raw country code when no name is known', () => {
    const [row] = mapNotificationRows(
      [
        {
          referenceNumber: REFERENCE_NUMBER,
          status: 'DRAFT',
          originCountry: 'ZZ'
        }
      ],
      {}
    )

    expect(row.originCountry).toBe('ZZ')
  })

  test('shows an unparseable arrival date blank and warns with the reference and raw value', () => {
    const [row] = mapNotificationRows([
      {
        referenceNumber: REFERENCE_NUMBER,
        status: 'SUBMITTED',
        arrivalDate: '2026-02-30'
      }
    ])

    expect(row.arrivalDate).toBe('')
    expect(logLines).toEqual([
      expect.objectContaining({
        'log.level': 'warn',
        referenceNumber: REFERENCE_NUMBER,
        arrivalDate: '2026-02-30',
        message:
          'Arrival date from the backend is not a calendar date, showing it blank'
      })
    ])
  })

  test('does not warn for a valid arrival date', () => {
    mapNotificationRows([
      {
        referenceNumber: REFERENCE_NUMBER,
        status: 'SUBMITTED',
        arrivalDate: '2026-09-10'
      }
    ])

    expect(logLines).toEqual([])
  })

  test('shows a missing arrival date blank without warning', () => {
    const [row] = mapNotificationRows([
      { referenceNumber: REFERENCE_NUMBER, status: 'DRAFT' }
    ])

    expect(row.arrivalDate).toBe('')
    expect(logLines).toEqual([])
  })
})
