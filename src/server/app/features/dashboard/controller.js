import { getCountries } from '../../services/countries/index.js'
import { listNotifications } from '../../services/ins-backend/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../lib/http-status.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import {
  buildPaginationLinks,
  buildResultsLabel,
  escapeHtml,
  parsePage
} from '../../shared/list-page.js'
import { dashboardPath } from '../../shared/paths.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import {
  SORT_OPTIONS,
  buildStartNewNotificationLink,
  dashboardPageHref,
  mapNotificationRows
} from './view-model/list.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const logger = createLogger()
const view = 'dashboard/template'
const copy = copyFor({ en, cy })
const DEFAULT_SORT = SORT_OPTIONS[0].value
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

const parseSort = (querySort) =>
  SORT_VALUES.has(querySort) ? querySort : DEFAULT_SORT

const countryNamesOf = (countries) =>
  Object.fromEntries(countries.map((country) => [country.code, country.name]))

const sortOptionsOf = (sort) =>
  SORT_OPTIONS.map(({ value, copyKey }) => ({
    value,
    text: copy.sort.options[copyKey],
    selected: value === sort
  }))

const viewLink = (notificationRow) =>
  `<a class="govuk-link" href="${notificationRow.href}">${copy.table.view}<span class="govuk-visually-hidden"> ${escapeHtml(notificationRow.referenceNumber)}</span></a>`

const tableRowsOf = (notificationRows) =>
  notificationRows.map((notificationRow) => [
    { text: notificationRow.referenceNumber },
    { text: notificationRow.status },
    { text: notificationRow.originCountry },
    { text: notificationRow.commodity },
    { text: notificationRow.arrivalDate },
    { html: viewLink(notificationRow) }
  ])

const paginationOf = (response) => ({
  page: response.page,
  pageSize: response.size,
  totalItems: response.totalElements,
  totalPages: response.totalPages
})

const buildView = (
  toolkit,
  { sort, referenceNumber, hasSearch },
  { recoverableError = false, ...model }
) =>
  toolkit.view(view, {
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

const get = async (request, toolkit) => {
  const page = parsePage(request.query.page)
  const sort = parseSort(request.query.sort)
  const referenceNumber = request.query.referenceNumber?.trim() ?? ''
  const hasSearch = Boolean(referenceNumber)
  const listQuery = { sort, referenceNumber, hasSearch }

  try {
    const countries = await getCountries()
    const response = await listNotifications({
      page,
      sort,
      referenceNumber: hasSearch ? referenceNumber : undefined
    })
    const pagination = paginationOf(response)
    const notificationRows = mapNotificationRows(
      response.content ?? [],
      countryNamesOf(countries ?? [])
    )

    return buildView(toolkit, listQuery, {
      tableRows: tableRowsOf(notificationRows),
      resultsLabel: buildResultsLabel(pagination, copy.results),
      pagination: buildPaginationLinks(pagination, (targetPage) =>
        dashboardPageHref(targetPage, { sort, referenceNumber })
      ),
      isEmpty: response.totalElements === 0 && !hasSearch,
      noSearchResults: response.totalElements === 0 && hasSearch
    })
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    logger.error({ err }, 'Failed to load dashboard')
    return buildView(toolkit, listQuery, {
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
