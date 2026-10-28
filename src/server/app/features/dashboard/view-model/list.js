import { SET_BASES } from '../../../../common/constants/journey-set-bases.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import { buildSetBaseUrl } from '../../../../common/helpers/set-base-url.js'
import { formatCalendarDate } from '../../../lib/validate/index.js'
import { dashboardPath } from '../../../shared/paths.js'

const logger = createLogger()

export const SORT_OPTIONS = [
  { value: 'arrivalDate,desc', copyKey: 'arrivalNewest' },
  { value: 'arrivalDate,asc', copyKey: 'arrivalOldest' },
  { value: 'lastUpdated,desc', copyKey: 'updatedNewest' },
  { value: 'lastUpdated,asc', copyKey: 'updatedOldest' }
]

const DEFAULT_SORT = SORT_OPTIONS[0].value

export function buildDashboardQueryString({
  page,
  sort,
  referenceNumber
} = {}) {
  const params = new URLSearchParams()
  if (referenceNumber) {
    params.set('referenceNumber', referenceNumber)
  }
  if (sort && sort !== DEFAULT_SORT) {
    params.set('sort', sort)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const dashboardPageHref = (page, { sort, referenceNumber } = {}) =>
  `${dashboardPath()}${buildDashboardQueryString({ sort, referenceNumber, page })}`

export function buildNotificationLink(status, referenceNumber) {
  const setUrl = buildLiveAnimalsSetUrl()
  const encodedReference = encodeURIComponent(referenceNumber)
  return status === 'SUBMITTED'
    ? `${setUrl}/notifications/${encodedReference}/notification-view`
    : `${setUrl}/notifications/${encodedReference}`
}

export function buildStartNewNotificationLink() {
  return buildLiveAnimalsSetUrl()
}

const buildLiveAnimalsSetUrl = () =>
  buildSetBaseUrl('tradeImportsAnimalsFrontend.baseUrl', SET_BASES.LIVE_ANIMALS)

export function mapNotificationRows(notifications, countryNames = {}) {
  return notifications.map((notification) => ({
    referenceNumber: notification.referenceNumber,
    status: notification.status,
    originCountry:
      countryNames[notification.originCountry] ??
      notification.originCountry ??
      '',
    commodity: notification.commodity ?? '',
    arrivalDate: formatArrivalDate(notification),
    href: buildNotificationLink(
      notification.status,
      notification.referenceNumber
    )
  }))
}

function formatArrivalDate({ referenceNumber, arrivalDate }) {
  const formatted = formatCalendarDate(arrivalDate)
  if (!formatted && arrivalDate != null) {
    logger.warn(
      { referenceNumber, arrivalDate },
      'Arrival date from the backend is not a calendar date, showing it blank'
    )
  }
  return formatted
}
