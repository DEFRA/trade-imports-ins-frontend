import { addressBookPath } from '../../../shared/paths.js'
import { countryLabelOf } from '../address-countries.js'

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

export const buildAddressLine = (address) =>
  [address.addressLine1, address.townOrCity, address.postcode]
    .filter(Boolean)
    .join(', ')

export const mapAddressRows = (addresses, countries = []) =>
  addresses.map((address) => ({
    id: address.id,
    name: address.name,
    addressLine: buildAddressLine(address),
    countryCode: address.countryCode,
    countryLabel: countryLabelOf(countries, address.countryCode)
  }))
