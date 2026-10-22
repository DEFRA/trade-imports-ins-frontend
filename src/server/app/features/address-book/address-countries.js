import Boom from '@hapi/boom'

import { getCountries } from '../../services/countries/index.js'

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

export const countryLabelOf = (countries, countryCode) =>
  countries.find((country) => country.code === countryCode)?.name ?? countryCode

export const countryCodeMatching = (searchTerm, countries) => {
  const term = searchTerm?.trim()
  if (!term) {
    return null
  }

  const normalized = term.toLowerCase()
  const match = countries.find(
    (country) => country.name.toLowerCase() === normalized
  )
  return match?.code ?? null
}

export { GB_COUNTRY }
