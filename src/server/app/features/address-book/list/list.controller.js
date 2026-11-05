import Boom from '@hapi/boom'

import { listAddresses } from '../../../services/address-book/index.js'
import { HTTP_STATUS_INTERNAL_SERVER_ERROR } from '../../../lib/http-status.js'
import * as kit from '../../../shared/kit.js'
import { copyFor } from '../../../shared/copy.js'
import { escapeHtml } from '../../../shared/escape-html.js'
import {
  buildPaginationLinks,
  clampPage,
  parsePage
} from '../../../shared/list-page.js'
import {
  addressTypeStartPath,
  addressBookPath,
  addressPath
} from '../../../shared/paths.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  getAddressFormCountries,
  countryCodesMatching
} from '../address-countries.js'
import {
  ADDRESS_BOOK_TABS,
  DEFAULT_ADDRESS_BOOK_TAB,
  resolveTab,
  resolveRole
} from '../address-book-tabs.js'
import { linesHtml } from '../lines-html.js'
import { takeSuccessMessage } from '../success-message.js'
import {
  addressBookPageHref,
  mapAddressRows,
  resultsLabelOf,
  rolesWhoseLabelContains
} from '../view-model/list.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

export const LIST_PAGE_SIZE = 8

const logger = createLogger()
const view = 'address-book/list/list'
const copy = copyFor({ en, cy })

const viewLink = (address) =>
  `<a class="govuk-link" href="${addressPath(address.id)}">${copy.list.table.view}<span class="govuk-visually-hidden"> ${escapeHtml(address.name)}</span></a>`

const tableRowsOf = (addresses) =>
  addresses.map((address) => [
    { html: linesHtml(address.nameLines) },
    { text: address.roleLabelsText },
    { html: linesHtml(address.postalLines, { lineEnding: ',' }) },
    { text: address.countryLabel },
    { html: viewLink(address) }
  ])

const paginationOf = (addressPage) => ({
  page: addressPage.page,
  pageSize: addressPage.pageSize,
  totalItems: addressPage.totalItems,
  totalPages: addressPage.totalPages
})

const subNavigationItemsOf = (selectedTab, searchTerm) =>
  ADDRESS_BOOK_TABS.map((tab) => ({
    text: copy.list.tabs[tab.copyKey].label,
    href: addressBookPageHref(1, { addressType: tab.addressType, searchTerm }),
    active: tab === selectedTab
  }))

const roleItemsOf = (selectedTab, selectedRole) => [
  { value: '', text: copy.list.search.type.placeholder },
  ...selectedTab.roles.map((role) => ({
    value: role,
    text: copy.list.roles[role].optionLabel,
    selected: role === selectedRole
  }))
]

const buildView = (toolkit, { recoverableError = false, ...model }) =>
  toolkit.view(view, {
    ...kit.base(copy.list.title, { recoverableError }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    listHref: addressBookPath(),
    addHref: addressTypeStartPath(),
    ...model
  })

const loadAddressPage = async (organisationId, { page, ...listFilters }) => {
  const requestedAddressPage = await listAddresses(organisationId, {
    page,
    pageSize: LIST_PAGE_SIZE,
    ...listFilters
  })
  const servedPage = clampPage(page, requestedAddressPage.totalPages)
  if (servedPage === page) {
    return requestedAddressPage
  }

  logger.info(
    {
      organisationId,
      roles: listFilters.roles,
      requestedPage: page,
      servedPage
    },
    'Address book page is past the last page, serving the last page'
  )
  return listAddresses(organisationId, {
    page: servedPage,
    pageSize: LIST_PAGE_SIZE,
    ...listFilters
  })
}

const selectTab = (organisationId, requestedAddressType) => {
  const requestedTab = resolveTab(requestedAddressType)
  if (requestedTab) {
    return requestedTab
  }
  if (requestedAddressType) {
    logger.info(
      {
        organisationId,
        requestedAddressType,
        addressType: DEFAULT_ADDRESS_BOOK_TAB.addressType
      },
      'Address book list ignored an address type it does not offer'
    )
  }
  return DEFAULT_ADDRESS_BOOK_TAB
}

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const page = parsePage(request.query.page)
  const searchTerm = request.query.q?.trim() ?? ''
  const selectedTab = selectTab(organisationId, request.query.addressType)
  const { addressType } = selectedTab
  const requestedRole = request.query.role
  const role = resolveRole(selectedTab, requestedRole)
  if (requestedRole && !role) {
    logger.info(
      { organisationId, addressType, requestedRole },
      'Address book list ignored a role the tab does not offer'
    )
  }
  const successMessage = takeSuccessMessage(request)

  try {
    const countries = await getAddressFormCountries()
    const countryCodes = countryCodesMatching(searchTerm, countries)
    const searchRoles = rolesWhoseLabelContains(searchTerm, copy.list.roles)
    const addressPage = await loadAddressPage(organisationId, {
      page,
      searchTerm,
      countryCodes,
      searchRoles,
      roles: role ? [role] : selectedTab.roles
    })
    const pagination = paginationOf(addressPage)
    const addresses = mapAddressRows(
      addressPage.items ?? [],
      countries,
      copy.list.roles
    )

    return buildView(toolkit, {
      listLoaded: true,
      subNavigationItems: subNavigationItemsOf(selectedTab, searchTerm),
      panelHeading: copy.list.tabs[selectedTab.copyKey].heading,
      clearSearchHref: addressBookPageHref(1, { addressType, role }),
      tableRows: tableRowsOf(addresses),
      resultsLabel: resultsLabelOf(pagination, copy.list),
      pagination: buildPaginationLinks(pagination, (targetPage) =>
        addressBookPageHref(targetPage, {
          addressType,
          searchTerm,
          role
        })
      ),
      addressType,
      roleItems: roleItemsOf(selectedTab, role),
      searchTerm,
      successMessage
    })
  } catch (err) {
    if (Boom.isBoom(err)) {
      throw err
    }
    logger.error(
      { err, organisationId, addressType, role },
      'Failed to load address book'
    )
    return buildView(toolkit, {
      listLoaded: false,
      addressType,
      roleItems: roleItemsOf(selectedTab, role),
      searchTerm,
      successMessage,
      recoverableError: true
    }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressBookPath(), { get })
