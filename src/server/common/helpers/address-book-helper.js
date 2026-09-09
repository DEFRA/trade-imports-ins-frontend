import {
  buildPaginationLinks as buildSharedPaginationLinks,
  buildResultsLabel as buildSharedResultsLabel
} from './pagination-helper.js'

/**
 * Builds a query string for address book list pagination and search.
 */
export function buildAddressBookQueryString({ page, q, countryCode } = {}) {
  const params = new URLSearchParams()
  if (q) {
    params.set('q', q)
  }
  if (countryCode) {
    params.set('countryCode', countryCode)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

/**
 * Builds a results range label for the current page, e.g. "Showing 1-8 of 24".
 */
export function buildResultsLabel(pagination) {
  return buildSharedResultsLabel(pagination, {
    sizeField: 'pageSize',
    totalField: 'totalItems'
  })
}

/**
 * Builds numbered govukPagination links from API pagination metadata.
 */
export function buildPaginationLinks(
  pagination,
  { baseUrl = '/address-book', q, countryCode } = {}
) {
  return buildSharedPaginationLinks(pagination, {
    sizeField: 'pageSize',
    totalField: 'totalItems',
    basePath: baseUrl,
    queryArgs: { q, countryCode },
    buildQueryString: buildAddressBookQueryString
  })
}

export function buildAddressLine(address) {
  return [address.addressLine1, address.townOrCity, address.postcode]
    .filter(Boolean)
    .join(', ')
}

export function buildFullAddress(address) {
  return [
    address.addressLine1,
    address.addressLine2,
    address.townOrCity,
    address.county,
    address.postcode
  ]
    .filter(Boolean)
    .join(', ')
}

export function mapAddressRows(items, countryNames = {}) {
  return items.map((address) => ({
    id: address.id,
    name: address.name,
    addressLine: buildAddressLine(address),
    countryCode: address.countryCode,
    countryName: countryNames[address.countryCode] ?? address.countryCode
  }))
}
