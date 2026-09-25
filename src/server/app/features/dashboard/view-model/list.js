import { format, isValid, parseISO } from 'date-fns'

import { SET_BASES } from '../../../../common/constants/journey-set-bases.js'
import { buildSetBaseUrl } from '../../../../common/helpers/set-base-url.js'
import { dashboardPath } from '../../../shared/paths.js'

const LIST_DATE_FORMAT = 'd MMM yyyy'

export const SORT_OPTIONS = [
  { value: 'arrivalDate,desc', copyKey: 'arrivalNewest' },
  { value: 'arrivalDate,asc', copyKey: 'arrivalOldest' },
  { value: 'lastUpdated,desc', copyKey: 'updatedNewest' },
  { value: 'lastUpdated,asc', copyKey: 'updatedOldest' }
]

const DEFAULT_SORT = SORT_OPTIONS[0].value

export function formatDisplayDate(value) {
  if (!value) {
    return ''
  }
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, LIST_DATE_FORMAT) : ''
}

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

const normalizePageNumber = (page, totalPages) =>
  totalPages < 1 ? 1 : Math.min(Math.max(page, 1), totalPages)

const pageRange = ({ page, size, totalElements, totalPages }) => {
  const currentPage = normalizePageNumber(page, totalPages || 1)
  return {
    from: (currentPage - 1) * size + 1,
    to: Math.min(currentPage * size, totalElements),
    count: totalElements
  }
}

export function buildResultsLabel(pagination, formatLabel) {
  if (pagination.totalElements < 1) {
    return null
  }
  const { from, to, count } = pageRange(pagination)
  return formatLabel(from, to, count)
}

export function buildPaginationLinks(
  pagination,
  { sort, referenceNumber } = {}
) {
  const { totalPages } = pagination
  if (totalPages <= 1) {
    return null
  }
  const page = normalizePageNumber(pagination.page, totalPages)
  const pageHref = (targetPage) =>
    `${dashboardPath()}${buildDashboardQueryString({ sort, referenceNumber, page: targetPage })}`

  return {
    results: pageRange(pagination),
    previous: page > 1 ? { href: pageHref(page - 1) } : undefined,
    next: page < totalPages ? { href: pageHref(page + 1) } : undefined,
    items: Array.from({ length: totalPages }, (_, index) => ({
      number: String(index + 1),
      href: pageHref(index + 1),
      current: index + 1 === page
    }))
  }
}

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
    arrivalDate: formatDisplayDate(notification.arrivalDate),
    href: buildNotificationLink(
      notification.status,
      notification.referenceNumber
    )
  }))
}
