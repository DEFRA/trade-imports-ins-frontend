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

/**
 * Resolves a search term to an ISO alpha-2 country code when it matches an MDM country name
 * (cv-048 FE-resolve). Comparison is case-insensitive on the full trimmed term.
 *
 * @param {string|undefined} q the user's search term
 * @param {{ code: string, name: string }[]} countries the MDM country list
 * @returns {string|undefined} the alpha-2 code when matched, otherwise undefined
 */
export function resolveCountryCodeFromSearchTerm(q, countries) {
  const term = q?.trim()
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
