/**
 * Builds a query string for address book list pagination.
 */
export function buildAddressBookQueryString({ page } = {}) {
  const params = new URLSearchParams()
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

function normalizePageNumber(page, totalPages) {
  if (totalPages < 1) {
    return 1
  }
  return Math.min(Math.max(page, 1), totalPages)
}

/**
 * Builds numbered govukPagination links from API pagination metadata.
 */
export function buildPaginationLinks(
  pagination,
  { baseUrl = '/address-book' } = {}
) {
  const { totalPages, pageSize, totalItems } = pagination
  const page = normalizePageNumber(pagination.page, totalPages)

  if (totalPages <= 1) {
    return null
  }

  const model = {
    results: {
      from: (page - 1) * pageSize + 1,
      to: Math.min(page * pageSize, totalItems),
      count: totalItems
    }
  }

  if (page > 1) {
    model.previous = {
      href: `${baseUrl}${buildAddressBookQueryString({ page: page - 1 })}`
    }
  }

  if (page < totalPages) {
    model.next = {
      href: `${baseUrl}${buildAddressBookQueryString({ page: page + 1 })}`
    }
  }

  model.items = Array.from({ length: totalPages }, (_, index) => {
    const number = index + 1
    return {
      number: String(number),
      href: `${baseUrl}${buildAddressBookQueryString({ page: number })}`,
      current: number === page
    }
  })

  return model
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

export function mapAddressRows(items) {
  return items.map((address) => ({
    id: address.id,
    name: address.name,
    addressLine: buildAddressLine(address),
    countryCode: address.countryCode
  }))
}
