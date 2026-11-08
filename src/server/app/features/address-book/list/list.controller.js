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
  resolveTypeFilterValue
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
  { text: copy.list.table.type },
  { text: copy.list.table.address },
  { text: copy.list.table.country },
  actionHeadCell()
]

const TRANSPORTER_TABLE_HEAD = [
  { text: copy.list.table.name },
  { text: copy.list.table.address },
  { text: copy.list.table.approvalNumber },
  { text: copy.list.table.type },
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

const typeFilterItemsOf = (selectedTab, selectedValue) => {
  const optionLabelOf = listsByRole(selectedTab)
    ? (value) => copy.list.roles[value].optionLabel
    : (value) => copy.list.transporterTypes[value]
  return [
    { value: '', text: copy.list.search.typeFilter.placeholder },
    ...selectedTab.typeFilter.values.map((value) => ({
      value,
      text: optionLabelOf(value),
      selected: value === selectedValue
    }))
  ]
}

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

const transporterModel = async (
  organisationId,
  { page, searchTerm, typeFilterValue }
) => {
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
    searchTypes,
    types: typeFilterValue ? [typeFilterValue] : []
  })
  const records = mapTransporterRows(transporterPage.items ?? [], {
    countries,
    copyByTransporterType: copy.list.transporterTypes,
    fixedCommercialCountryLabel: copy.commercialTransporterForm.country,
    notApplicableWord: copy.notApplicable
  })
  return { page: transporterPage, tableRows: transporterTableRowsOf(records) }
}

const selectTypeFilterValue = (organisationId, selectedTab, request) => {
  const { addressType, typeFilter } = selectedTab
  const requestedTypeFilterValue = request.query[typeFilter.param]
  const typeFilterValue = resolveTypeFilterValue(
    selectedTab,
    requestedTypeFilterValue
  )
  if (requestedTypeFilterValue && !typeFilterValue) {
    logger.info(
      {
        organisationId,
        addressType,
        typeFilterParam: typeFilter.param,
        requestedTypeFilterValue
      },
      'Address book list ignored a filter value the tab does not offer'
    )
  }
  return typeFilterValue
}

const loadListModel = (
  organisationId,
  selectedTab,
  { page, searchTerm, typeFilterValue }
) =>
  listsByRole(selectedTab)
    ? addressModel(organisationId, {
        page,
        searchTerm,
        role: typeFilterValue,
        selectedTab
      })
    : transporterModel(organisationId, { page, searchTerm, typeFilterValue })

const loadedListView = (
  selectedTab,
  { loadedPage, tableRows, searchTerm, typeFilterValue, successMessage }
) => {
  const { addressType, typeFilter } = selectedTab
  const pagination = paginationOf(loadedPage)
  return {
    listLoaded: true,
    subNavigationItems: subNavigationItemsOf(selectedTab, searchTerm),
    panelHeading: copy.list.tabs[selectedTab.addressType].heading,
    tableHead: tableHeadFor(selectedTab),
    clearSearchHref: addressBookPageHref(1, {
      addressType,
      filterParam: typeFilter.param,
      filterValue: typeFilterValue
    }),
    tableRows,
    resultsLabel: resultsLabelOf(pagination, copy.list),
    pagination: buildPaginationLinks(pagination, (targetPage) =>
      addressBookPageHref(targetPage, {
        addressType,
        searchTerm,
        filterParam: typeFilter.param,
        filterValue: typeFilterValue
      })
    ),
    addressType,
    typeFilterParam: typeFilter.param,
    typeFilterItems: typeFilterItemsOf(selectedTab, typeFilterValue),
    searchTerm,
    successMessage
  }
}

const failedListView = (
  selectedTab,
  { searchTerm, typeFilterValue, successMessage }
) => {
  const { addressType, typeFilter } = selectedTab
  return {
    listLoaded: false,
    addressType,
    typeFilterParam: typeFilter.param,
    typeFilterItems: typeFilterItemsOf(selectedTab, typeFilterValue),
    searchTerm,
    successMessage,
    recoverableError: true
  }
}

const get = async (request, toolkit) => {
  const organisationId = kit.requireOrganisationId(request)
  const page = parsePage(request.query.page)
  const searchTerm = request.query.q?.trim() ?? ''
  const selectedTab = selectTab(organisationId, request.query.addressType)
  const typeFilterValue = selectTypeFilterValue(
    organisationId,
    selectedTab,
    request
  )
  const successMessage = takeSuccessMessage(request)

  try {
    const { page: loadedPage, tableRows } = await loadListModel(
      organisationId,
      selectedTab,
      { page, searchTerm, typeFilterValue }
    )
    return buildView(
      toolkit,
      loadedListView(selectedTab, {
        loadedPage,
        tableRows,
        searchTerm,
        typeFilterValue,
        successMessage
      })
    )
  } catch (err) {
    if (Boom.isBoom(err)) {
      throw err
    }
    logger.error(
      {
        err,
        organisationId,
        addressType: selectedTab.addressType,
        typeFilterValue
      },
      'Failed to load address book'
    )
    return buildView(
      toolkit,
      failedListView(selectedTab, {
        searchTerm,
        typeFilterValue,
        successMessage
      })
    ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  }
}

export const routes = kit.pageRoutes(addressBookPath(), { get })
