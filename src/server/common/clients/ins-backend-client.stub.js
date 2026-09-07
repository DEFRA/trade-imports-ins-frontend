/**
 * In-memory stand-in for the real INS Backend API, selected by runMode=stub
 * (see mode.js). The dashboard is deliberately unscoped to an organisation,
 * so — unlike address-book-client.stub.js — there is a single fixed dataset
 * rather than one keyed per organisation.
 */
const PAGE_SIZE = 25
const DELETED_STATUS = 'DELETED'

const NOTIFICATIONS = [
  {
    aggregateId: 'agg-stub-1',
    aggregateVersion: 3,
    referenceNumber: 'GBN-AG-26-000001',
    status: 'SUBMITTED',
    originCountry: 'FR',
    commodity: null,
    arrivalDate: '2026-09-10T00:00:00Z',
    lastUpdated: '2026-09-05T09:00:00Z'
  },
  {
    aggregateId: 'agg-stub-2',
    aggregateVersion: 1,
    referenceNumber: 'GBN-AG-26-000002',
    status: 'DRAFT',
    originCountry: 'IE',
    commodity: null,
    arrivalDate: '2026-09-12T00:00:00Z',
    lastUpdated: '2026-09-04T11:30:00Z'
  },
  {
    aggregateId: 'agg-stub-3',
    aggregateVersion: 2,
    referenceNumber: 'GBN-AG-26-000003',
    status: 'AMEND',
    originCountry: 'DE',
    commodity: null,
    arrivalDate: '2026-09-08T00:00:00Z',
    lastUpdated: '2026-09-06T08:15:00Z'
  },
  {
    aggregateId: 'agg-stub-4',
    aggregateVersion: 4,
    referenceNumber: 'GBN-AG-26-000004',
    status: DELETED_STATUS,
    originCountry: 'GB',
    commodity: null,
    arrivalDate: '2026-09-09T00:00:00Z',
    lastUpdated: '2026-09-06T10:00:00Z'
  }
]

function sortComparator(sort) {
  const [field, direction] = (sort ?? 'arrivalDate,desc').split(',')
  const sortField = field === 'lastUpdated' ? 'lastUpdated' : 'arrivalDate'
  const multiplier = direction === 'asc' ? 1 : -1
  return (a, b) =>
    multiplier * (new Date(a[sortField]) - new Date(b[sortField]))
}

export const insBackendClient = {
  async listNotifications(_traceId, { page = 1, sort, referenceNumber } = {}) {
    const visible = NOTIFICATIONS.filter((n) => n.status !== DELETED_STATUS)

    const matches = referenceNumber
      ? visible.filter((n) => n.referenceNumber === referenceNumber)
      : visible.slice().sort(sortComparator(sort))

    const totalElements = matches.length
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE))
    const from = (page - 1) * PAGE_SIZE
    const content = matches.slice(from, from + PAGE_SIZE)

    return {
      content,
      page,
      size: PAGE_SIZE,
      numberOfElements: content.length,
      totalElements,
      totalPages
    }
  }
}
