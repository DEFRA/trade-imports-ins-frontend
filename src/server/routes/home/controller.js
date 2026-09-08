import { getTraceId } from '@defra/hapi-tracing'

import { countriesClient } from '#/server/common/clients/countries-client.js'
import { insBackendClient } from '#/server/common/clients/ins-backend-client.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import {
  SORT_OPTIONS,
  buildPaginationLinks,
  buildResultsLabel,
  buildStartNewNotificationLink,
  mapNotificationRows
} from '#/server/common/helpers/notification-dashboard-helper.js'

const logger = createLogger()
const VIEW = 'routes/home/index'
const PAGE_TITLE = 'Dashboard'
const DEFAULT_SORT = SORT_OPTIONS[0].value
const SORT_VALUES = new Set(SORT_OPTIONS.map((option) => option.value))

function parsePage(queryPage) {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

function parseSort(querySort) {
  return SORT_VALUES.has(querySort) ? querySort : DEFAULT_SORT
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')
}

function buildCountryNameMap(countries) {
  return Object.fromEntries(
    countries.map((country) => [country.code, country.name])
  )
}

export function buildTableRows(notifications) {
  return notifications.map((notification) => [
    { text: notification.referenceNumber },
    { text: notification.status },
    { text: notification.originCountry },
    { text: notification.commodity },
    { text: notification.arrivalDate },
    {
      html: `<a class="govuk-link" href="${notification.href}">View<span class="govuk-visually-hidden"> ${escapeHtml(notification.referenceNumber)}</span></a>`
    }
  ])
}

export const homeController = {
  async handler(request, h) {
    const traceId = getTraceId() ?? ''
    const page = parsePage(request.query.page)
    const sort = parseSort(request.query.sort)
    const referenceNumber = request.query.referenceNumber?.trim() ?? ''
    const hasSearch = Boolean(referenceNumber)

    try {
      const countries = await countriesClient.getCountries(traceId)
      const response = await insBackendClient.listNotifications(traceId, {
        page,
        sort,
        referenceNumber: hasSearch ? referenceNumber : undefined
      })

      const pagination = {
        page: response.page,
        size: response.size,
        totalElements: response.totalElements,
        totalPages: response.totalPages
      }

      const countryNames = buildCountryNameMap(countries ?? [])
      const notifications = mapNotificationRows(
        response.content ?? [],
        countryNames
      )
      const isEmpty = response.totalElements === 0 && !hasSearch
      const noSearchResults = response.totalElements === 0 && hasSearch

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_TITLE,
        notifications,
        tableRows: buildTableRows(notifications),
        resultsLabel: buildResultsLabel(pagination),
        pagination: buildPaginationLinks(pagination, { sort, referenceNumber }),
        sortOptions: SORT_OPTIONS.map((option) => ({
          value: option.value,
          text: option.text,
          selected: option.value === sort
        })),
        referenceNumber,
        hasSearch,
        isEmpty,
        noSearchResults,
        startNewNotificationHref: buildStartNewNotificationLink()
      })
    } catch (err) {
      logger.error({ err, traceId }, 'Failed to load dashboard')
      return h
        .view(VIEW, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          notifications: [],
          tableRows: [],
          resultsLabel: null,
          pagination: null,
          sortOptions: SORT_OPTIONS,
          referenceNumber,
          hasSearch,
          isEmpty: false,
          noSearchResults: false,
          startNewNotificationHref: buildStartNewNotificationLink(),
          errorList: [{ text: 'Something went wrong loading the dashboard' }]
        })
        .code(statusCodes.internalServerError)
    }
  }
}
