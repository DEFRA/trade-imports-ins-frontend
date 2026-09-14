import { listAddresses } from '../../../services/address-book/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import {
  addressAddPath,
  addressBookPath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  getAddressFormCountries,
  resolveCountryCodeFromSearchTerm
} from '../address-countries.js'
import { takeSuccessBanner } from '../success-banner.js'
import {
  buildPaginationLinks,
  buildResultsLabel,
  mapAddressRows
} from '../view-model/list.js'

const logger = createLogger()
const view = 'address-book/list/template'
const PAGE_TITLE = 'Address book'

const parsePage = (queryPage) => {
  const page = Number.parseInt(queryPage, 10)
  return Number.isNaN(page) || page < 1 ? 1 : page
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('"', '&quot;')

const viewLink = (address) =>
  `<a class="govuk-link" href="${addressPath(address.id)}">View<span class="govuk-visually-hidden"> ${escapeHtml(address.name)}</span></a>`

const tableRowsOf = (addresses) =>
  addresses.map((address) => [
    { text: address.name },
    { text: address.addressLine },
    { text: address.countryName },
    { html: viewLink(address) }
  ])

const countryNamesOf = (countries) =>
  Object.fromEntries(countries.map((country) => [country.code, country.name]))

const paginationOf = (response) => ({
  page: response.page,
  pageSize: response.pageSize,
  totalItems: response.totalItems,
  totalPages: response.totalPages
})

const buildView = (h, model) =>
  h.view(view, {
    ...kit.base(PAGE_TITLE),
    heading: PAGE_TITLE,
    listHref: addressBookPath(),
    addHref: addressAddPath(),
    ...model
  })

const get = async (request, h) => {
  const orgId = kit.requireOrganisationId(request)
  const page = parsePage(request.query.page)
  const q = request.query.q?.trim() ?? ''
  const hasSearch = Boolean(q)
  const successBanner = takeSuccessBanner(request)

  try {
    const countries = await getAddressFormCountries()
    const countryCode =
      request.query.countryCode?.trim() ||
      resolveCountryCodeFromSearchTerm(q, countries)
    const search = { q: hasSearch ? q : undefined, countryCode }
    const response = await listAddresses(orgId, { page, ...search })
    const pagination = paginationOf(response)
    const addresses = mapAddressRows(
      response.items ?? [],
      countryNamesOf(countries)
    )

    return buildView(h, {
      tableRows: tableRowsOf(addresses),
      resultsLabel: buildResultsLabel(pagination),
      pagination: buildPaginationLinks(pagination, search),
      q,
      hasSearch,
      isEmpty: response.totalItems === 0 && !hasSearch,
      noSearchResults: response.totalItems === 0 && hasSearch,
      successBanner
    })
  } catch (err) {
    logger.error({ err, orgId }, 'Failed to load address book')
    return buildView(h, {
      tableRows: [],
      resultsLabel: null,
      pagination: null,
      q,
      hasSearch,
      isEmpty: false,
      noSearchResults: false,
      successBanner,
      errorList: [{ text: 'Something went wrong loading your address book' }]
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressBookPath(), { get })
