import Boom from '@hapi/boom'

import { getCountries } from '../../services/countries/index.js'

const GB_COUNTRY = { code: 'GB', name: 'United Kingdom' }

const byName = (left, right) => left.name.localeCompare(right.name, 'en')

export async function getAddressFormCountries() {
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

export function buildCountryItems(countries) {
  return countries.map((country) => ({
    value: country.code,
    text: country.name
  }))
}

export function buildCountrySelectItems(countries, placeholder) {
  return [{ value: '', text: placeholder }, ...buildCountryItems(countries)]
}

export function countryLabelOf(countries, countryCode) {
  return (
    countries.find((country) => country.code === countryCode)?.name ??
    countryCode
  )
}

export function resolveCountryCodeFromSearchTerm(searchTerm, countries) {
  const term = searchTerm?.trim()
  if (!term) {
    return undefined
  }

  const normalized = term.toLowerCase()
  const match = countries.find(
    (country) => country.name.toLowerCase() === normalized
  )
  return match?.code
}

export { GB_COUNTRY }
