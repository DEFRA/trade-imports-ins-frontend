import { format, isValid, parseISO } from 'date-fns'

import { config } from '../../../../../config/config.js'
import { dashboardPath } from '../../../shared/paths.js'

const LIST_DATE_FORMAT = 'd MMM yyyy'

export const SORT_OPTIONS = [
  { value: 'arrivalDate,desc', text: 'Arrival date (newest first)' },
  { value: 'arrivalDate,asc', text: 'Arrival date (oldest first)' },
  { value: 'lastUpdated,desc', text: 'Last updated (newest first)' },
  { value: 'lastUpdated,asc', text: 'Last updated (oldest first)' }
]

const DEFAULT_SORT = SORT_OPTIONS[0].value

export function formatDisplayDate(value) {
  if (!value) {
    return ''
  }
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? format(date, LIST_DATE_FORMAT) : ''
}

/**
 * Builds a query string carrying the dashboard's current state (sort,
 * referenceNumber, page) so search/sort/pagination round-trip each other's
 * state rather than clobbering it.
 */
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

/** Builds a results range label for the current page, e.g. "Showing 1-25 of 40". */
export function buildResultsLabel(pagination) {
  if (pagination.totalElements < 1) {
    return null
  }
  const { from, to, count } = pageRange(pagination)
  return `Showing ${from}-${to} of ${count}`
}

/** Builds numbered govukPagination links from the backend's pagination metadata. */
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

/**
 * The journey frontend that owns a notification is addressable by its
 * reference number — trade-imports-animals-frontend's `journeyId` route
 * param is, in practice, that same reference number, and the target routes
 * resolve a fresh request with no session state. SUBMITTED notifications
 * have a read-only view page; DRAFT and AMEND resume at the hub, matching
 * that app's own row-action logic.
 *
 * Single-journey only: there is nothing on a notification yet that says
 * which journey owns it (see EUDPA-306 plan, "Deferred to caller ticket").
 */
export function buildNotificationLink(status, referenceNumber) {
  const baseUrl = config.get('tradeImportsAnimalsFrontend.baseUrl')
  const encodedReference = encodeURIComponent(referenceNumber)
  return status === 'SUBMITTED'
    ? `${baseUrl}/notifications/${encodedReference}/notification-view`
    : `${baseUrl}/notifications/${encodedReference}`
}

export function buildStartNewNotificationLink() {
  return config.get('tradeImportsAnimalsFrontend.baseUrl')
}

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
