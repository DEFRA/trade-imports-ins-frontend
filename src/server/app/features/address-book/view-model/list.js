import { buildResultsLabel } from '../../../shared/list-page.js'
import { addressBookPath } from '../../../shared/paths.js'
import { countryLabelOf } from '../address-countries.js'
import { postalLinesOf } from '../fields.js'

export const buildAddressBookQueryString = ({
  addressType,
  page,
  searchTerm
} = {}) => {
  const params = new URLSearchParams()
  if (addressType) {
    params.set('addressType', addressType)
  }
  if (searchTerm) {
    params.set('q', searchTerm)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const addressBookPageHref = (page, { addressType, searchTerm } = {}) =>
  `${addressBookPath()}${buildAddressBookQueryString({ addressType, searchTerm, page })}`

export const nameLinesOf = (name) => {
  const [firstWord, ...otherWords] = (name ?? '').split(/\s+/).filter(Boolean)
  return otherWords.length
    ? [firstWord, otherWords.join(' ')]
    : [firstWord].filter(Boolean)
}

export const resultsLabelOf = (pagination, listCopy) =>
  buildResultsLabel(pagination, listCopy.results) ?? listCopy.noResults

export const useLabelsOf = (uses, labelByUse) =>
  (uses ?? []).map((use) => labelByUse[use] ?? use).join(', ')

export const mapAddressRows = (addresses, countries = [], labelByUse = {}) =>
  addresses.map((address) => ({
    id: address.id,
    name: address.name,
    nameLines: nameLinesOf(address.name),
    useLabels: useLabelsOf(address.uses, labelByUse),
    postalLines: postalLinesOf(address),
    countryLabel: countryLabelOf(countries, address.countryCode)
  }))
