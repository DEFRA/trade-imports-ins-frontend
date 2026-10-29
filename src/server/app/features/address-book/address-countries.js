import Boom from '@hapi/boom'

import { getCountries } from '../../services/countries/index.js'
import { requiresUnitedKingdomAddress } from './journey-registry.js'

const GB_COUNTRY = { code: 'GB', name: 'United Kingdom' }

const byName = (left, right) => left.name.localeCompare(right.name, 'en')

export const getAddressFormCountries = async () => {
  const countries = await getCountries()

  if (!countries?.length) {
    throw Boom.serverUnavailable('Reference data unavailable', {
      dataset: 'countries'
    })
  }

  const withoutGb = countries.filter(
    (country) => country.code !== GB_COUNTRY.code
  )

  return [GB_COUNTRY, ...withoutGb].toSorted(byName)
}

export const buildCountryItems = (countries) =>
  countries.map((country) => ({
    value: country.code,
    text: country.name
  }))

export const buildCountrySelectItems = (countries, placeholder) => [
  { value: '', text: placeholder },
  ...buildCountryItems(countries)
]

export const addFormCountryOffer = async ({
  handshakeContext,
  placeholder
}) => {
  if (requiresUnitedKingdomAddress(handshakeContext)) {
    return {
      countryItems: buildCountryItems([GB_COUNTRY]),
      countryCodes: [GB_COUNTRY.code]
    }
  }

  const countries = await getAddressFormCountries()
  return {
    countryItems: buildCountrySelectItems(countries, placeholder),
    countryCodes: countries.map((country) => country.code)
  }
}

export const formValuesWithRequiredCountry = (handshakeContext, formValues) =>
  requiresUnitedKingdomAddress(handshakeContext)
    ? { ...formValues, countryCode: GB_COUNTRY.code }
    : formValues

export const buildEditCountrySelectItems = (
  countries,
  shownCountryCode,
  placeholder
) => {
  const isOffered = countries.some(
    (country) => country.code === shownCountryCode
  )
  return isOffered
    ? buildCountryItems(countries)
    : buildCountrySelectItems(countries, placeholder)
}

export const countryLabelOf = (countries, countryCode) =>
  countries.find((country) => country.code === countryCode)?.name ?? countryCode

export const countryCodesMatching = (searchTerm, countries) => {
  const term = searchTerm?.trim().toLowerCase()
  if (!term) {
    return []
  }

  return countries
    .filter((country) => country.name.toLowerCase().includes(term))
    .map((country) => country.code)
}

export { GB_COUNTRY }
