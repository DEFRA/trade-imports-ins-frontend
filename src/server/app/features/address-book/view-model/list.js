import { buildResultsLabel } from '../../../shared/list-page.js'
import { addressBookPath } from '../../../shared/paths.js'
import { countryLabelOf } from '../address-countries.js'
import { postalLinesOf } from '../fields.js'

export const buildAddressBookQueryString = ({
  addressType,
  page,
  searchTerm,
  role
} = {}) => {
  const params = new URLSearchParams()
  if (addressType) {
    params.set('addressType', addressType)
  }
  if (searchTerm) {
    params.set('q', searchTerm)
  }
  if (role) {
    params.set('role', role)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const addressBookPageHref = (
  page,
  { addressType, searchTerm, role } = {}
) =>
  `${addressBookPath()}${buildAddressBookQueryString({ addressType, searchTerm, role, page })}`

export const nameLinesOf = (name) => {
  const [firstWord, ...otherWords] = (name ?? '').split(/\s+/).filter(Boolean)
  return otherWords.length
    ? [firstWord, otherWords.join(' ')]
    : [firstWord].filter(Boolean)
}

export const resultsLabelOf = (pagination, listCopy) =>
  buildResultsLabel(pagination, listCopy.results) ?? listCopy.noResults

export const roleLabelsTextOf = (roles, copyByRole) =>
  roles.map((role) => copyByRole[role]?.columnLabel ?? role).join(', ')

export const rolesWhoseLabelContains = (searchTerm, copyByRole) => {
  const term = searchTerm.toLowerCase()
  if (!term) {
    return []
  }
  return Object.entries(copyByRole)
    .filter(([, { columnLabel, optionLabel }]) =>
      [columnLabel, optionLabel].some((label) =>
        label.toLowerCase().includes(term)
      )
    )
    .map(([role]) => role)
}

export const mapAddressRows = (addresses, countries, copyByRole) =>
  addresses.map((address) => ({
    id: address.id,
    name: address.name,
    nameLines: nameLinesOf(address.name),
    roleLabelsText: roleLabelsTextOf(address.roles, copyByRole),
    postalLines: postalLinesOf(address),
    countryLabel: countryLabelOf(countries, address.countryCode)
  }))
