import { getTraceId } from '@defra/hapi-tracing'

import { listAddresses } from '../../app/services/address-book/index.js'
import {
  buildPaginationLinks,
  buildResultsLabel,
  mapAddressRows
} from '../../common/helpers/address-book-helper.js'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { requireOrganisationId } from '../../app/shared/kit.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  getAddressFormCountries,
  resolveCountryCodeFromSearchTerm
} from '../address-countries.js'

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
    { text: address.name },
    { text: address.addressLine },
    { text: address.countryName },
    {
      // The name is visually hidden so each "View" link is distinguishable row to row.
      html: `<a class="govuk-link" href="/address-book/${encodeURIComponent(address.id)}">View<span class="govuk-visually-hidden"> ${escapeHtml(address.name)}</span></a>`
    }
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
      const countries = await getAddressFormCountries()
      const resolvedCountryCode =
        request.query.countryCode?.trim() ||
        resolveCountryCodeFromSearchTerm(q, countries)

      const response = await listAddresses(orgId, {
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
