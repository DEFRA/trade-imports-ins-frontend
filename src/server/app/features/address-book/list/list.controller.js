import Boom from '@hapi/boom'

import { listAddresses } from '../../../services/address-book/index.js'
import { listTransporters } from '../../../services/transporters/index.js'
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
  listsByRole,
  resolveTab,
  resolveRole
} from '../address-book-tabs.js'
import { linesHtml } from '../lines-html.js'
import { takeSuccessMessage } from '../success-message.js'
import {
  addressBookPageHref,
  mapAddressRows,
  mapTransporterRows,
  resultsLabelOf,
  rolesWhoseLabelContains,
  transporterCountryCodesMatching,
  transporterTypesWhoseLabelContains
} from '../view-model/list.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

export const LIST_PAGE_SIZE = 8

const logger = createLogger()
const view = 'address-book/list/list'
const copy = copyFor({ en, cy })

const viewLink = (record) =>
  `<a class="govuk-link" href="${addressPath(record.id)}">${copy.list.table.view}<span class="govuk-visually-hidden"> ${escapeHtml(record.name)}</span></a>`

const actionHeadCell = () => ({
  html: `<span class="govuk-visually-hidden">${copy.list.table.action}</span>`
})

const ADDRESS_TABLE_HEAD = [
  { text: copy.list.table.name },
  { text: copy.list.table.role },
  { text: copy.list.table.address },
  { text: copy.list.table.country },
  actionHeadCell()
]

const TRANSPORTER_TABLE_HEAD = [
  { text: copy.list.table.name },
  { text: copy.list.table.address },
  { text: copy.list.table.approvalNumber },
  { text: copy.list.table.role },
  actionHeadCell()
]

const tableHeadFor = (tab) =>
  listsByRole(tab) ? ADDRESS_TABLE_HEAD : TRANSPORTER_TABLE_HEAD

const addressTableRowsOf = (addresses) =>
  addresses.map((address) => [
    { html: linesHtml(address.nameLines) },
    { text: address.roleLabelsText },
    { html: linesHtml(address.postalLines, { lineEnding: ',' }) },
    { text: address.countryLabel },
    { html: viewLink(address) }
  ])

const transporterTableRowsOf = (transporters) =>
  transporters.map((transporter) => [
    { html: linesHtml(transporter.nameLines) },
    { html: linesHtml(transporter.postalLines, { lineEnding: ',' }) },
    { text: transporter.approvalNumberText },
    { text: transporter.typeLabel },
    {}
  ])

const paginationOf = (page) => ({
  page: page.page,
  pageSize: page.pageSize,
  totalItems: page.totalItems,
  totalPages: page.totalPages
})

const subNavigationItemsOf = (selectedTab, searchTerm) =>
  ADDRESS_BOOK_TABS.map((tab) => ({
    text: copy.list.tabs[tab.addressType].label,
    href: addressBookPageHref(1, { addressType: tab.addressType, searchTerm }),
    active: tab === selectedTab
  }))

const roleItemsOf = (selectedTab, selectedRole) =>
  listsByRole(selectedTab)
    ? [
        { value: '', text: copy.list.search.role.placeholder },
        ...selectedTab.roles.map((role) => ({
          value: role,
          text: copy.list.roles[role].optionLabel,
          selected: role === selectedRole
        }))
      ]
    : null

const buildView = (toolkit, { recoverableError = false, ...model }) =>
  toolkit.view(view, {
    ...kit.base(copy.list.title, { recoverableError }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    listHref: addressBookPath(),
    addHref: addressTypeStartPath(),
    ...model
  })

const loadPage = async (organisationId, listFn, { page, ...listFilters }) => {
  const requestedPage = await listFn(organisationId, {
    page,
    pageSize: LIST_PAGE_SIZE,
    ...listFilters
  })
  const servedPage = clampPage(page, requestedPage.totalPages)
  if (servedPage === page) {
    return requestedPage
  }

  logger.info(
    { organisationId, ...listFilters, requestedPage: page, servedPage },
    'Address book page is past the last page, serving the last page'
  )
  return listFn(organisationId, {
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

const addressModel = async (
  organisationId,
  { page, searchTerm, role, selectedTab }
) => {
  const countries = await getAddressFormCountries()
  const countryCodes = countryCodesMatching(searchTerm, countries)
  const searchRoles = rolesWhoseLabelContains(searchTerm, copy.list.roles)
  const addressPage = await loadPage(organisationId, listAddresses, {
    page,
    searchTerm,
    countryCodes,
    searchRoles,
    roles: role ? [role] : selectedTab.roles
  })
  const records = mapAddressRows(
    addressPage.items ?? [],
    countries,
    copy.list.roles
  )
  return { page: addressPage, tableRows: addressTableRowsOf(records) }
}

const transporterModel = async (organisationId, { page, searchTerm }) => {
  const countries = await getAddressFormCountries()
  const countryCodes = transporterCountryCodesMatching(
    searchTerm,
    countries,
    copy.commercialTransporterForm.country
  )
  const searchTypes = transporterTypesWhoseLabelContains(
    searchTerm,
    copy.list.transporterTypes
  )
  const transporterPage = await loadPage(organisationId, listTransporters, {
    page,
    searchTerm,
    countryCodes,
    searchTypes
  })
  const records = mapTransporterRows(transporterPage.items ?? [], {
    countries,
    copyByTransporterType: copy.list.transporterTypes,
    fixedCommercialCountryLabel: copy.commercialTransporterForm.country,
    notApplicableWord: copy.notApplicable
  })
  return { page: transporterPage, tableRows: transporterTableRowsOf(records) }
}

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const page = parsePage(request.query.page)
  const searchTerm = request.query.q?.trim() ?? ''
  const selectedTab = selectTab(organisationId, request.query.addressType)
  const { addressType } = selectedTab
  const requestedRole = request.query.role
  const role = listsByRole(selectedTab)
    ? resolveRole(selectedTab, requestedRole)
    : undefined
  if (requestedRole && listsByRole(selectedTab) && !role) {
    logger.info(
      { organisationId, addressType, requestedRole },
      'Address book list ignored a role the tab does not offer'
    )
  }
  const successMessage = takeSuccessMessage(request)

  try {
    const { page: loadedPage, tableRows } = listsByRole(selectedTab)
      ? await addressModel(organisationId, {
          page,
          searchTerm,
          role,
          selectedTab
        })
      : await transporterModel(organisationId, { page, searchTerm })
    const pagination = paginationOf(loadedPage)

    return buildView(toolkit, {
      listLoaded: true,
      subNavigationItems: subNavigationItemsOf(selectedTab, searchTerm),
      panelHeading: copy.list.tabs[selectedTab.addressType].heading,
      tableHead: tableHeadFor(selectedTab),
      clearSearchHref: addressBookPageHref(1, { addressType, role }),
      tableRows,
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
