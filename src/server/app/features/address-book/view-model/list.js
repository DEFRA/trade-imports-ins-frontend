import { buildResultsLabel } from '../../../shared/list-page.js'
import { addressBookPath } from '../../../shared/paths.js'
import { countryLabelOf } from '../address-countries.js'
import { postalLinesOf } from '../fields.js'

export const buildAddressBookQueryString = ({
  addressType,
  page,
  searchTerm,
  use
} = {}) => {
  const params = new URLSearchParams()
  if (addressType) {
    params.set('addressType', addressType)
  }
  if (searchTerm) {
    params.set('q', searchTerm)
  }
  if (use) {
    params.set('use', use)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const addressBookPageHref = (
  page,
  { addressType, searchTerm, use } = {}
) =>
  `${addressBookPath()}${buildAddressBookQueryString({ addressType, searchTerm, use, page })}`

export const nameLinesOf = (name) => {
  const [firstWord, ...otherWords] = (name ?? '').split(/\s+/).filter(Boolean)
  return otherWords.length
    ? [firstWord, otherWords.join(' ')]
    : [firstWord].filter(Boolean)
}

export const resultsLabelOf = (pagination, listCopy) =>
  buildResultsLabel(pagination, listCopy.results) ?? listCopy.noResults

export const useLabelsOf = (uses, copyByUse) =>
  (uses ?? []).map((use) => copyByUse[use]?.columnLabel ?? use).join(', ')

export const usesWhoseLabelContains = (searchTerm, copyByUse) => {
  const term = searchTerm?.trim().toLowerCase()
  if (!term) {
    return []
  }
  return Object.entries(copyByUse)
    .filter(([, { columnLabel, optionLabel }]) =>
      [columnLabel, optionLabel].some((label) =>
        label.toLowerCase().includes(term)
      )
    )
    .map(([use]) => use)
}

export const mapAddressRows = (addresses, countries = [], copyByUse = {}) =>
  addresses.map((address) => ({
    id: address.id,
    name: address.name,
    nameLines: nameLinesOf(address.name),
    useLabels: useLabelsOf(address.uses, copyByUse),
    postalLines: postalLinesOf(address),
    countryLabel: countryLabelOf(countries, address.countryCode)
  }))
