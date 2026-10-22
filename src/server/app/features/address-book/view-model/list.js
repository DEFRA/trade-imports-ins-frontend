import { addressBookPath } from '../../../shared/paths.js'
import { countryLabelOf } from '../address-countries.js'

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

export const addressBookPageHref = (page, { q, countryCode } = {}) =>
  `${addressBookPath()}${buildAddressBookQueryString({ q, countryCode, page })}`

export const buildAddressLine = (address) =>
  [address.addressLine1, address.townOrCity, address.postcode]
    .filter(Boolean)
    .join(', ')

export const mapAddressRows = (items, countries = []) =>
  items.map((address) => ({
    id: address.id,
    name: address.name,
    addressLine: buildAddressLine(address),
    countryCode: address.countryCode,
    countryLabel: countryLabelOf(countries, address.countryCode)
  }))
