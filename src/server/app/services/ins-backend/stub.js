const DELETED_STATUS = 'DELETED'

const NOTIFICATIONS = [
  {
    aggregateId: 'agg-stub-1',
    aggregateVersion: 3,
    referenceNumber: 'GBN-AG-26-000001',
    status: 'SUBMITTED',
    originCountry: 'FR',
    commodity: 'Cattle',
    arrivalDate: '2026-09-10',
    lastUpdated: '2026-09-03T09:00:00Z'
  },
  {
    aggregateId: 'agg-stub-2',
    aggregateVersion: 1,
    referenceNumber: 'GBN-AG-26-000002',
    status: 'DRAFT',
    originCountry: 'IE',
    commodity: null,
    arrivalDate: '2026-09-12',
    lastUpdated: '2026-09-04T11:30:00Z'
  },
  {
    aggregateId: 'agg-stub-3',
    aggregateVersion: 2,
    referenceNumber: 'GBN-AG-26-000003',
    status: 'AMEND',
    originCountry: 'DE',
    commodity: null,
    arrivalDate: '2026-09-08',
    lastUpdated: '2026-09-06T08:15:00Z'
  },
  {
    aggregateId: 'agg-stub-4',
    aggregateVersion: 4,
    referenceNumber: 'GBN-AG-26-000004',
    status: DELETED_STATUS,
    originCountry: 'GB',
    commodity: null,
    arrivalDate: '2026-09-09',
    lastUpdated: '2026-09-06T10:00:00Z'
  }
]

const sortComparator = (sort) => {
  const [field, direction] = (sort ?? 'arrivalDate,desc').split(',')
  const sortField = field === 'lastUpdated' ? 'lastUpdated' : 'arrivalDate'
  const multiplier = direction === 'asc' ? 1 : -1
  return (left, right) =>
    multiplier * (new Date(left[sortField]) - new Date(right[sortField]))
}

export const listNotifications = async ({
  page = 1,
  sort,
  referenceNumber
} = {}) => {
  const visible = NOTIFICATIONS.filter(
    (notification) => notification.status !== DELETED_STATUS
  )

  const matches = referenceNumber
    ? visible.filter(
        (notification) => notification.referenceNumber === referenceNumber
      )
    : visible.slice().sort(sortComparator(sort))

  const pageSize = 25
  const totalElements = matches.length
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize))
  const from = (page - 1) * pageSize
  const content = matches.slice(from, from + pageSize)

  return {
    content,
    page,
    size: pageSize,
    numberOfElements: content.length,
    totalElements,
    totalPages
  }
}
