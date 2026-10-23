import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  refuseOutboundHttp,
  serveCountries
} from '../../../common/test-helpers/real-mode.js'
import {
  buildCountryItems,
  buildCountrySelectItems,
  buildEditCountrySelectItems,
  countryLabelOf,
  countryCodeMatching,
  GB_COUNTRY
} from './address-countries.js'

const originalMode = process.env.STUB_MODE
const COUNTRY_PLACEHOLDER = 'Select a country'
const UK_NAME = 'United Kingdom'
const GB_AND_FRANCE = [
  { code: 'GB', name: UK_NAME },
  { code: 'FR', name: 'France' }
]

const importAddressCountriesInRealMode = async () => {
  process.env.STUB_MODE = 'false'
  vi.resetModules()
  return import('./address-countries.js')
}

describe('#getAddressFormCountries', () => {
  refuseOutboundHttp()

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.STUB_MODE
    } else {
      process.env.STUB_MODE = originalMode
    }
  })

  test('Should list countries alphabetically with United Kingdom in its place, once', async () => {
    serveCountries([
      { code: 'US', name: 'United States' },
      { code: 'FR', name: 'France' },
      { code: 'GB', name: 'United Kingdom duplicate' },
      { code: 'AE', name: 'United Arab Emirates' }
    ])
    const { getAddressFormCountries } = await importAddressCountriesInRealMode()

    const countries = await getAddressFormCountries()

    expect(countries).toEqual([
      { code: 'FR', name: 'France' },
      { code: 'AE', name: 'United Arab Emirates' },
      GB_COUNTRY,
      { code: 'US', name: 'United States' }
    ])
  })

  test('Should reject with a serverUnavailable Boom when the list is empty', async () => {
    serveCountries([])
    const { getAddressFormCountries } = await importAddressCountriesInRealMode()

    await expect(getAddressFormCountries()).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 503 },
      data: { dataset: 'countries' }
    })
  })
})

describe('#buildCountrySelectItems', () => {
  test('Should put the placeholder option before the country options', () => {
    expect(buildCountrySelectItems(GB_AND_FRANCE, COUNTRY_PLACEHOLDER)).toEqual(
      [
        { value: '', text: COUNTRY_PLACEHOLDER },
        { value: 'GB', text: UK_NAME },
        { value: 'FR', text: 'France' }
      ]
    )
  })
})

describe('#buildEditCountrySelectItems', () => {
  const countryItems = [
    { value: 'GB', text: UK_NAME },
    { value: 'FR', text: 'France' }
  ]
  const blankOption = { value: '', text: COUNTRY_PLACEHOLDER }

  test('Should offer only the countries when the shown country is one of them', () => {
    expect(
      buildEditCountrySelectItems(GB_AND_FRANCE, 'FR', COUNTRY_PLACEHOLDER)
    ).toEqual(countryItems)
  })

  test.each([
    ['a country that is not offered', 'XX'],
    ['a blank country', ''],
    ['no country', undefined]
  ])(
    'Should put one blank option before the countries for %s',
    (_name, shownCountryCode) => {
      expect(
        buildEditCountrySelectItems(
          GB_AND_FRANCE,
          shownCountryCode,
          COUNTRY_PLACEHOLDER
        )
      ).toEqual([blankOption, ...countryItems])
    }
  )
})

describe('#buildCountryItems', () => {
  test('Should use the country code as the option value and the name as its text', () => {
    expect(buildCountryItems(GB_AND_FRANCE)).toEqual([
      { value: 'GB', text: UK_NAME },
      { value: 'FR', text: 'France' }
    ])
  })
})

describe('#countryCodeMatching', () => {
  test('Should return the alpha-2 code for a case-insensitive country name match', () => {
    expect(countryCodeMatching('France', GB_AND_FRANCE)).toBe('FR')
    expect(countryCodeMatching('france', GB_AND_FRANCE)).toBe('FR')
    expect(countryCodeMatching(UK_NAME, GB_AND_FRANCE)).toBe('GB')
  })

  test('Should return null when the term does not match a country name', () => {
    expect(countryCodeMatching('Paris', GB_AND_FRANCE)).toBeNull()
    expect(countryCodeMatching('', GB_AND_FRANCE)).toBeNull()
    expect(countryCodeMatching(undefined, GB_AND_FRANCE)).toBeNull()
  })
})

describe('#countryLabelOf', () => {
  test('Should return the country name for a listed code', () => {
    expect(countryLabelOf(GB_AND_FRANCE, 'FR')).toBe('France')
  })

  test('Should return the code itself when it is not listed', () => {
    expect(countryLabelOf(GB_AND_FRANCE, 'ZZ')).toBe('ZZ')
  })
})
