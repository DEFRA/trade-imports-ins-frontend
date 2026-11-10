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
import { copy } from './copy/copy.en.js'

const originalMode = process.env.STUB_MODE
const FRANCE = { code: 'FR', name: 'France' }
const UNITED_STATES = { code: 'US', name: 'United States' }
const UNITED_ARAB_EMIRATES = { code: 'AE', name: 'United Arab Emirates' }
const GB_AND_FRANCE = [GB_COUNTRY, FRANCE]
const GB_AND_FRANCE_ITEMS = [
  { value: GB_COUNTRY.code, text: GB_COUNTRY.name },
  { value: FRANCE.code, text: FRANCE.name }
]

const importAddressCountriesInRealMode = async () => {
  process.env.STUB_MODE = 'false'
  vi.resetModules()
  return import('./address-countries.js')
}

afterEach(() => {
  if (originalMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalMode
  }
})

describe('#getAddressFormCountries', () => {
  refuseOutboundHttp()

  test('Should list countries alphabetically with United Kingdom in its place, once', async () => {
    serveCountries([
      UNITED_STATES,
      FRANCE,
      { code: GB_COUNTRY.code, name: 'United Kingdom duplicate' },
      UNITED_ARAB_EMIRATES
    ])
    const { getAddressFormCountries } = await importAddressCountriesInRealMode()

    const countries = await getAddressFormCountries()

    expect(countries).toEqual([
      FRANCE,
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

describe('#addFormCountryOffer', () => {
  refuseOutboundHttp()

  test('Should offer the placeholder then every served country, and accept every served country', async () => {
    serveCountries([FRANCE, GB_COUNTRY])
    const { addFormCountryOffer } = await importAddressCountriesInRealMode()

    const offer = await addFormCountryOffer(copy.form.countryPlaceholder)

    expect(offer).toEqual({
      countryItems: [
        { value: '', text: copy.form.countryPlaceholder },
        { value: FRANCE.code, text: FRANCE.name },
        { value: GB_COUNTRY.code, text: GB_COUNTRY.name }
      ],
      countryCodes: ['FR', GB_COUNTRY.code]
    })
  })
})

describe('#buildCountrySelectItems', () => {
  test('Should put the placeholder option before the country options', () => {
    expect(
      buildCountrySelectItems(GB_AND_FRANCE, copy.form.countryPlaceholder)
    ).toEqual([
      { value: '', text: copy.form.countryPlaceholder },
      ...GB_AND_FRANCE_ITEMS
    ])
  })
})

describe('#buildEditCountrySelectItems', () => {
  const blankOption = { value: '', text: copy.form.countryPlaceholder }

  test('Should offer only the countries when the shown country is one of them', () => {
    expect(
      buildEditCountrySelectItems(
        GB_AND_FRANCE,
        'FR',
        copy.form.countryPlaceholder
      )
    ).toEqual(GB_AND_FRANCE_ITEMS)
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
          copy.form.countryPlaceholder
        )
      ).toEqual([blankOption, ...GB_AND_FRANCE_ITEMS])
    }
  )
})

describe('#buildCountryItems', () => {
  test('Should use the country code as the option value and the name as its text', () => {
    expect(buildCountryItems(GB_AND_FRANCE)).toEqual(GB_AND_FRANCE_ITEMS)
  })
})

describe('#countryCodesMatching', () => {
  const COUNTRIES = [...GB_AND_FRANCE, UNITED_STATES, UNITED_ARAB_EMIRATES]

  test('Should return the alpha-2 code of every country whose name contains the term, ignoring case and surrounding spaces', () => {
    expect(countryCodesMatching(' FRAN ', COUNTRIES)).toEqual(['FR'])
    expect(countryCodesMatching('Kingdom', COUNTRIES)).toEqual([
      GB_COUNTRY.code
    ])
    expect(countryCodesMatching('united', COUNTRIES)).toEqual([
      GB_COUNTRY.code,
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
    expect(countryLabelOf(GB_AND_FRANCE, FRANCE.code)).toBe(FRANCE.name)
  })

  test('Should return the code itself when it is not listed', () => {
    expect(countryLabelOf(GB_AND_FRANCE, 'ZZ')).toBe('ZZ')
  })
})
