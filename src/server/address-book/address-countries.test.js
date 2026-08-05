import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  buildCountryItems,
  buildCountrySelectItems,
  getAddressFormCountries,
  resolveCountryCodeFromSearchTerm,
  GB_COUNTRY
} from './address-countries.js'

vi.mock('#/server/common/clients/countries-client.js', () => ({
  countriesClient: {
    getCountries: vi.fn()
  }
}))

import { countriesClient } from '#/server/common/clients/countries-client.js'

describe('#getAddressFormCountries', () => {
  beforeEach(() => {
    vi.mocked(countriesClient.getCountries).mockReset()
  })

  test('GB-prepends countries from reference data', async () => {
    countriesClient.getCountries.mockResolvedValue([
      { code: 'FR', name: 'France' },
      { code: 'GB', name: 'United Kingdom duplicate' }
    ])

    const countries = await getAddressFormCountries('trace-1')

    expect(countries[0]).toEqual(GB_COUNTRY)
    expect(countries[1]).toEqual({ code: 'FR', name: 'France' })
    expect(countries.some((c) => c.code === 'GB')).toBe(true)
    expect(countries.filter((c) => c.code === 'GB')).toHaveLength(1)
  })

  test('throws when MDM list is empty', async () => {
    countriesClient.getCountries.mockResolvedValue([])

    await expect(getAddressFormCountries('trace-1')).rejects.toThrow(
      'Country reference data is unavailable'
    )
  })
})

describe('#buildCountrySelectItems', () => {
  test('prepends the placeholder option for govukSelect', () => {
    expect(
      buildCountrySelectItems([
        { code: 'GB', name: 'United Kingdom' },
        { code: 'FR', name: 'France' }
      ])
    ).toEqual([
      { value: '', text: 'Select a country' },
      { value: 'GB', text: 'United Kingdom' },
      { value: 'FR', text: 'France' }
    ])
  })
})

describe('#buildCountryItems', () => {
  test('binds option value to country code not name', () => {
    expect(
      buildCountryItems([
        { code: 'GB', name: 'United Kingdom' },
        { code: 'FR', name: 'France' }
      ])
    ).toEqual([
      { value: 'GB', text: 'United Kingdom' },
      { value: 'FR', text: 'France' }
    ])
  })
})

describe('#resolveCountryCodeFromSearchTerm', () => {
  const countries = [
    { code: 'GB', name: 'United Kingdom' },
    { code: 'FR', name: 'France' }
  ]

  test('returns alpha-2 code for a case-insensitive country name match', () => {
    expect(resolveCountryCodeFromSearchTerm('France', countries)).toBe('FR')
    expect(resolveCountryCodeFromSearchTerm('france', countries)).toBe('FR')
    expect(resolveCountryCodeFromSearchTerm('United Kingdom', countries)).toBe(
      'GB'
    )
  })

  test('returns undefined when the term does not match a country name', () => {
    expect(resolveCountryCodeFromSearchTerm('Paris', countries)).toBeUndefined()
    expect(resolveCountryCodeFromSearchTerm('', countries)).toBeUndefined()
    expect(
      resolveCountryCodeFromSearchTerm(undefined, countries)
    ).toBeUndefined()
  })
})
