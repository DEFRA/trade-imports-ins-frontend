import { listAddresses } from '../../../services/address-book/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  buildPaginationLinks,
  buildResultsLabel,
  escapeHtml,
  parsePage
} from '../../../shared/list-page.js'
import {
  addressAddPath,
  addressBookPath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  getAddressFormCountries,
  countryCodeMatchingOrNull
} from '../address-countries.js'
import { takeSuccessBanner } from '../success-banner.js'
import { addressBookPageHref, mapAddressRows } from '../view-model/list.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/list/list'
const copy = copyFor({ en, cy })

const viewLink = (address) =>
  `<a class="govuk-link" href="${addressPath(address.id)}">${copy.list.table.view}<span class="govuk-visually-hidden"> ${escapeHtml(address.name)}</span></a>`

const tableRowsOf = (addresses) =>
  addresses.map((address) => [
    { text: address.name },
    { text: address.addressLine },
    { text: address.countryLabel },
    { html: viewLink(address) }
  ])

const paginationOf = (addressPage) => ({
  page: addressPage.page,
  pageSize: addressPage.pageSize,
  totalItems: addressPage.totalItems,
  totalPages: addressPage.totalPages
})

const buildView = (toolkit, { recoverableError = false, ...model }) =>
  toolkit.view(view, {
    ...kit.base(copy.list.title, { recoverableError }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    listHref: addressBookPath(),
    addHref: addressAddPath(),
    ...model
  })

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const page = parsePage(request.query.page)
  const searchTerm = request.query.q?.trim() ?? ''
  const hasSearch = Boolean(searchTerm)
  const successBanner = takeSuccessBanner(request)

  try {
    const countries = await getAddressFormCountries()
    const countryCode =
      request.query.countryCode?.trim() ||
      countryCodeMatchingOrNull(searchTerm, countries)
    const search = { q: hasSearch ? searchTerm : undefined, countryCode }
    const addressPage = await listAddresses(organisationId, { page, ...search })
    const pagination = paginationOf(addressPage)
    const addresses = mapAddressRows(addressPage.items ?? [], countries)

    return buildView(toolkit, {
      tableRows: tableRowsOf(addresses),
      resultsLabel: buildResultsLabel(pagination, copy.list.results),
      pagination: buildPaginationLinks(pagination, (targetPage) =>
        addressBookPageHref(targetPage, search)
      ),
      searchTerm,
      hasSearch,
      isEmpty: addressPage.totalItems === 0 && !hasSearch,
      noSearchResults: addressPage.totalItems === 0 && hasSearch,
      successBanner
    })
  } catch (err) {
    if (err.isBoom) {
      throw err
    }
    logger.error({ err, organisationId }, 'Failed to load address book')
    return buildView(toolkit, {
      tableRows: [],
      resultsLabel: null,
      pagination: null,
      searchTerm,
      hasSearch,
      isEmpty: false,
      noSearchResults: false,
      successBanner,
      recoverableError: true
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressBookPath(), { get })
