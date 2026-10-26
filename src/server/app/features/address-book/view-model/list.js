import { buildResultsLabel } from '../../../shared/list-page.js'
import { addressBookPath } from '../../../shared/paths.js'
import { countryLabelOf } from '../address-countries.js'
import { postalLinesOf } from '../fields.js'

export const buildAddressBookQueryString = ({
  page,
  searchTerm,
  countryCode
} = {}) => {
  const params = new URLSearchParams()
  if (searchTerm) {
    params.set('q', searchTerm)
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

export const addressBookPageHref = (page, { searchTerm, countryCode } = {}) =>
  `${addressBookPath()}${buildAddressBookQueryString({ searchTerm, countryCode, page })}`

export const nameLinesOf = (name) => {
  const [firstWord, ...otherWords] = (name ?? '').split(/\s+/).filter(Boolean)
  return otherWords.length
    ? [firstWord, otherWords.join(' ')]
    : [firstWord].filter(Boolean)
}

export const resultsLabelOf = (pagination, listCopy) =>
  buildResultsLabel(pagination, listCopy.results) ?? listCopy.noResults

export const mapAddressRows = (addresses, countries = []) =>
  addresses.map((address) => ({
    id: address.id,
    name: address.name,
    nameLines: nameLinesOf(address.name),
    postalLines: postalLinesOf(address),
    countryLabel: countryLabelOf(countries, address.countryCode)
  }))
