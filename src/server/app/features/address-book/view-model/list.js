import { buildResultsLabel } from '../../../shared/list-page.js'
import { addressBookPath } from '../../../shared/paths.js'
import { countryCodesMatching, countryLabelOf } from '../address-countries.js'
import {
  NORTHERN_IRELAND_COUNTRY_CODE,
  TRANSPORTER_TYPES
} from '../../../services/transporters/index.js'
import { displayTextOf, postalLinesOf } from '../fields.js'

export const buildAddressBookQueryString = ({
  addressType,
  page,
  searchTerm,
  filterParam,
  filterValue
} = {}) => {
  const params = new URLSearchParams()
  if (addressType) {
    params.set('addressType', addressType)
  }
  if (searchTerm) {
    params.set('q', searchTerm)
  }
  if (filterParam && filterValue) {
    params.set(filterParam, filterValue)
  }
  if (page && page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const addressBookPageHref = (
  page,
  { addressType, searchTerm, filterParam, filterValue } = {}
) =>
  `${addressBookPath()}${buildAddressBookQueryString({ addressType, searchTerm, filterParam, filterValue, page })}`

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

export const approvalNumberTextOf = (transporter, notApplicableWord) =>
  displayTextOf(transporter.approvalNumber) ?? notApplicableWord

export const transporterTypesWhoseLabelContains = (
  searchTerm,
  copyByTransporterType
) => {
  const term = searchTerm.toLowerCase()
  if (!term) {
    return []
  }
  return Object.entries(copyByTransporterType)
    .filter(([, label]) => label.toLowerCase().includes(term))
    .map(([transporterType]) => transporterType)
}

export const transporterCountryCodesMatching = (
  searchTerm,
  countries,
  fixedCommercialCountryLabel
) => {
  const term = searchTerm?.trim().toLowerCase()
  const matched = countryCodesMatching(searchTerm, countries)
  if (!term || !fixedCommercialCountryLabel?.toLowerCase().includes(term)) {
    return matched
  }
  return [...new Set([...matched, NORTHERN_IRELAND_COUNTRY_CODE])]
}

export const transporterCountryLabelOf = (
  transporter,
  countries,
  fixedCommercialCountryLabel
) =>
  transporter.type === TRANSPORTER_TYPES.COMMERCIAL
    ? fixedCommercialCountryLabel
    : countryLabelOf(countries, transporter.countryCode)

export const mapTransporterRows = (
  transporters,
  {
    countries,
    copyByTransporterType,
    fixedCommercialCountryLabel,
    notApplicableWord
  }
) =>
  transporters.map((transporter) => ({
    id: transporter.id,
    name: transporter.name,
    nameLines: nameLinesOf(transporter.name),
    postalLines: [
      ...postalLinesOf(transporter),
      transporterCountryLabelOf(
        transporter,
        countries,
        fixedCommercialCountryLabel
      )
    ],
    approvalNumberText: approvalNumberTextOf(transporter, notApplicableWord),
    typeLabel: copyByTransporterType[transporter.type] ?? transporter.type
  }))
