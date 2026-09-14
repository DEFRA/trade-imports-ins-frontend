import { addressBookPath } from '../../../shared/paths.js'

export const buildAddressBookQueryString = ({ page, q, countryCode } = {}) => {
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

const clampPage = (page, totalPages) =>
  Math.min(Math.max(page, 1), Math.max(totalPages, 1))

export const buildResultsLabel = ({
  page,
  pageSize,
  totalItems,
  totalPages
}) => {
  if (totalItems < 1) {
    return null
  }
  const currentPage = clampPage(page, totalPages)
  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)
  return `Showing ${from}-${to} of ${totalItems}`
}

const pageHrefFor = (search) => (page) =>
  `${addressBookPath()}${buildAddressBookQueryString({ ...search, page })}`

export const buildPaginationLinks = (
  { page, totalPages },
  { q, countryCode } = {}
) => {
  if (totalPages <= 1) {
    return null
  }
  const currentPage = clampPage(page, totalPages)
  const hrefOf = pageHrefFor({ q, countryCode })
  return {
    ...(currentPage > 1 && { previous: { href: hrefOf(currentPage - 1) } }),
    ...(currentPage < totalPages && {
      next: { href: hrefOf(currentPage + 1) }
    }),
    items: Array.from({ length: totalPages }, (_, index) => ({
      number: String(index + 1),
      href: hrefOf(index + 1),
      current: index + 1 === currentPage
    }))
  }
}

export const buildAddressLine = (address) =>
  [address.addressLine1, address.townOrCity, address.postcode]
    .filter(Boolean)
    .join(', ')

export const mapAddressRows = (items, countryNames = {}) =>
  items.map((address) => ({
    id: address.id,
    name: address.name,
    addressLine: buildAddressLine(address),
    countryCode: address.countryCode,
    countryName: countryNames[address.countryCode] ?? address.countryCode
  }))
