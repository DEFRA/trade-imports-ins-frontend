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
  countryCodesMatching,
  GB_COUNTRY
} from './address-countries.js'

const originalMode = process.env.STUB_MODE
const COUNTRY_PLACEHOLDER = 'Select a country'
const UK_NAME = 'United Kingdom'
const UNITED_STATES = { code: 'US', name: 'United States' }
const UNITED_ARAB_EMIRATES = { code: 'AE', name: 'United Arab Emirates' }
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
      UNITED_STATES,
      { code: 'FR', name: 'France' },
      { code: 'GB', name: 'United Kingdom duplicate' },
      UNITED_ARAB_EMIRATES
    ])
    const { getAddressFormCountries } = await importAddressCountriesInRealMode()

    const countries = await getAddressFormCountries()

    expect(countries).toEqual([
      { code: 'FR', name: 'France' },
      UNITED_ARAB_EMIRATES,
      GB_COUNTRY,
      UNITED_STATES
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

describe('#countryCodesMatching', () => {
  const COUNTRIES = [...GB_AND_FRANCE, UNITED_STATES, UNITED_ARAB_EMIRATES]

  test('Should return the alpha-2 code of every country whose name contains the term, ignoring case and surrounding spaces', () => {
    expect(countryCodesMatching(' FRAN ', COUNTRIES)).toEqual(['FR'])
    expect(countryCodesMatching('united', COUNTRIES)).toEqual([
      'GB',
      'US',
      'AE'
    ])
  })

  test('Should return no codes when the term is not inside a country name', () => {
    expect(countryCodesMatching('Paris', COUNTRIES)).toEqual([])
  })

  test.each(['', '   ', undefined])(
    'Should return no codes for the blank term %j',
    (term) => {
      expect(countryCodesMatching(term, COUNTRIES)).toEqual([])
    }
  )
})

describe('#countryLabelOf', () => {
  test('Should return the country name for a listed code', () => {
    expect(countryLabelOf(GB_AND_FRANCE, 'FR')).toBe('France')
  })

  test('Should return the code itself when it is not listed', () => {
    expect(countryLabelOf(GB_AND_FRANCE, 'ZZ')).toBe('ZZ')
  })
})
