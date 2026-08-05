import { getTraceId } from '@defra/hapi-tracing'

import { addressBookClient } from '#/server/common/clients/address-book-client.js'
import {
  buildPaginationLinks,
  buildResultsLabel,
  mapAddressRows
} from '#/server/common/helpers/address-book-helper.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { getSessionValue } from '#/server/common/helpers/session-helpers.js'
import { sessionKeys } from '#/server/common/constants/session-keys.js'
import { requireOrganisationId } from '#/server/common/helpers/require-organisation-id.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getAddressFormCountries,
  resolveCountryCodeFromSearchTerm
} from '#/server/address-book/address-countries.js'

const logger = createLogger()
const VIEW = 'address-book/list/index'
const PAGE_TITLE = 'Address book'

function parsePage(queryPage) {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')
}

export function buildTableRows(addresses) {
  return addresses.map((address) => [
    {
      html: `<a class="govuk-link" href="/address-book/${encodeURIComponent(address.id)}"><span class="govuk-visually-hidden">View </span>${escapeHtml(address.name)}</a>`
    },
    { text: address.addressLine },
    { text: address.countryName }
  ])
}

function buildCountryNameMap(countries) {
  return Object.fromEntries(
    countries.map((country) => [country.code, country.name])
  )
}

export const listController = {
  async handler(request, h) {
    const traceId = getTraceId() ?? ''
    const orgId = requireOrganisationId(request)
    const page = parsePage(request.query.page)
    const q = request.query.q?.trim() ?? ''
    const hasSearch = Boolean(q)
    const successBanner = getSessionValue(
      request,
      sessionKeys.addressBookSuccess,
      true
    )

    try {
      const countries = await getAddressFormCountries(traceId)
      const resolvedCountryCode =
        request.query.countryCode?.trim() ||
        resolveCountryCodeFromSearchTerm(q, countries)

      const response = await addressBookClient.listAddresses(orgId, traceId, {
        page,
        q: hasSearch ? q : undefined,
        countryCode: resolvedCountryCode
      })

      const pagination = {
        page: response.page,
        pageSize: response.pageSize,
        totalItems: response.totalItems,
        totalPages: response.totalPages
      }

      const countryNames = buildCountryNameMap(countries)
      const addresses = mapAddressRows(response.items ?? [], countryNames)
      const isEmpty = response.totalItems === 0 && !hasSearch
      const noSearchResults = response.totalItems === 0 && hasSearch

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        heading: PAGE_TITLE,
        addresses,
        tableRows: buildTableRows(addresses),
        resultsLabel: buildResultsLabel(pagination),
        pagination: buildPaginationLinks(pagination, {
          q: hasSearch ? q : undefined,
          countryCode: resolvedCountryCode
        }),
        paginationMeta: pagination,
        q,
        countryCode: resolvedCountryCode,
        hasSearch,
        isEmpty,
        noSearchResults,
        successBanner
      })
    } catch (err) {
      logger.error({ err, traceId, orgId }, 'Failed to load address book')
      return h
        .view(VIEW, {
          pageTitle: PAGE_TITLE,
          heading: PAGE_TITLE,
          addresses: [],
          tableRows: [],
          resultsLabel: null,
          pagination: null,
          paginationMeta: null,
          q,
          countryCode: undefined,
          hasSearch,
          isEmpty: false,
          noSearchResults: false,
          successBanner,
          errorList: [
            { text: 'Something went wrong loading your address book' }
          ]
        })
        .code(statusCodes.internalServerError)
    }
  }
}
