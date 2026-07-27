import { countriesClient } from '#/server/common/clients/countries-client.js'

const GB_COUNTRY = { code: 'GB', name: 'United Kingdom' }

export async function getAddressFormCountries(traceId) {
  const countries = await countriesClient.getCountries(traceId)

  if (!countries?.length) {
    throw new Error('Country reference data is unavailable')
  }

  const withoutGb = countries.filter((country) => country.code !== 'GB')

  return [GB_COUNTRY, ...withoutGb]
}

export function buildCountryItems(countries) {
  return countries.map((country) => ({
    value: country.code,
    text: country.name
  }))
}

export { GB_COUNTRY }
