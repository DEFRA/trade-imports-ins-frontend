import { getCountries } from '../../services/countries/index.js'
import { listNotifications } from '../../services/ins-backend/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../lib/http-status.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { dashboardPath } from '../../shared/paths.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import {
  SORT_OPTIONS,
  buildPaginationLinks,
  buildResultsLabel,
  buildStartNewNotificationLink,
  mapNotificationRows
} from './view-model/list.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const logger = createLogger()
const view = 'dashboard/template'
const copy = copyFor({ en, cy })
const DEFAULT_SORT = SORT_OPTIONS[0].value
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

const parsePage = (queryPage) => {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

const parseSort = (querySort) =>
  SORT_VALUES.has(querySort) ? querySort : DEFAULT_SORT

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')

const countryNamesOf = (countries) =>
  Object.fromEntries(countries.map((country) => [country.code, country.name]))

const sortOptionsOf = (sort) =>
  SORT_OPTIONS.map(({ value, copyKey }) => ({
    value,
    text: copy.sort.options[copyKey],
    selected: value === sort
  }))

const viewLink = (notification) =>
  `<a class="govuk-link" href="${notification.href}">${copy.table.view}<span class="govuk-visually-hidden"> ${escapeHtml(notification.referenceNumber)}</span></a>`

const tableRowsOf = (notifications) =>
  notifications.map((notification) => [
    { text: notification.referenceNumber },
    { text: notification.status },
    { text: notification.originCountry },
    { text: notification.commodity },
    { text: notification.arrivalDate },
    { html: viewLink(notification) }
  ])

const paginationOf = (response) => ({
  page: response.page,
  size: response.size,
  totalElements: response.totalElements,
  totalPages: response.totalPages
})

const buildView = (
  h,
  { sort, referenceNumber, hasSearch },
  { recoverableError = false, ...model }
) =>
  h.view(view, {
    ...kit.base(copy.title, { recoverableError }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    listHref: dashboardPath(),
    sort,
    sortOptions: sortOptionsOf(sort),
    referenceNumber,
    hasSearch,
    startNewNotificationHref: buildStartNewNotificationLink(),
    ...model
  })

const get = async (request, h) => {
  const page = parsePage(request.query.page)
  const sort = parseSort(request.query.sort)
  const referenceNumber = request.query.referenceNumber?.trim() ?? ''
  const hasSearch = Boolean(referenceNumber)
  const query = { sort, referenceNumber, hasSearch }

  try {
    const countries = await getCountries()
    const response = await listNotifications({
      page,
      sort,
      referenceNumber: hasSearch ? referenceNumber : undefined
    })
    const pagination = paginationOf(response)
    const notifications = mapNotificationRows(
      response.content ?? [],
      countryNamesOf(countries ?? [])
    )

    return buildView(h, query, {
      tableRows: tableRowsOf(notifications),
      resultsLabel: buildResultsLabel(pagination, copy.results),
      pagination: buildPaginationLinks(pagination, { sort, referenceNumber }),
      isEmpty: response.totalElements === 0 && !hasSearch,
      noSearchResults: response.totalElements === 0 && hasSearch
    })
  } catch (err) {
    logger.error({ err }, 'Failed to load dashboard')
    return buildView(h, query, {
      tableRows: [],
      resultsLabel: null,
      pagination: null,
      isEmpty: false,
      noSearchResults: false,
      recoverableError: true
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(dashboardPath(), { get })
