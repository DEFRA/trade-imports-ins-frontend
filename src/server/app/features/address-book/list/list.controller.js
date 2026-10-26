import Boom from '@hapi/boom'

import { listAddresses } from '../../../services/address-book/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import {
  escapeHtml,
  buildPaginationLinks,
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
  countryCodeMatching
} from '../address-countries.js'
import { takeSuccessMessage } from '../success-message.js'
import {
  addressBookPageHref,
  mapAddressRows,
  resultsLabelOf
} from '../view-model/list.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const logger = createLogger()
const view = 'address-book/list/list'
const copy = copyFor({ en, cy })

const viewLink = (address) =>
  `<a class="govuk-link" href="${addressPath(address.id)}">${copy.list.table.view}<span class="govuk-visually-hidden"> ${escapeHtml(address.name)}</span></a>`

const linesCell = (lines, lineSeparator = '') => ({
  html: lines.map(escapeHtml).join(`${lineSeparator}<br> `)
})

const tableRowsOf = (addresses) =>
  addresses.map((address) => [
    linesCell(address.nameLines),
    linesCell(address.postalLines, ','),
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
  const successMessage = takeSuccessMessage(request)

  try {
    const countries = await getAddressFormCountries()
    const countryCode =
      request.query.countryCode?.trim() ||
      countryCodeMatching(searchTerm, countries)
    const search = { searchTerm, countryCode }
    const addressPage = await listAddresses(organisationId, { page, ...search })
    const pagination = paginationOf(addressPage)
    const addresses = mapAddressRows(addressPage.items ?? [], countries)

    return buildView(toolkit, {
      listLoaded: true,
      tableRows: tableRowsOf(addresses),
      resultsLabel: resultsLabelOf(pagination, copy.list),
      pagination: buildPaginationLinks(pagination, (targetPage) =>
        addressBookPageHref(targetPage, search)
      ),
      searchTerm,
      successMessage
    })
  } catch (err) {
    if (Boom.isBoom(err)) {
      throw err
    }
    logger.error({ err, organisationId }, 'Failed to load address book')
    return buildView(toolkit, {
      listLoaded: false,
      searchTerm,
      successMessage,
      recoverableError: true
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressBookPath(), { get })
