import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  refuseOutboundHttp,
  serveCountries
} from '../../../common/test-helpers/real-mode.js'
import {
  handshakeContextOf,
  JOURNEY_HANDSHAKES_BY_ROLE
} from '../../../common/test-helpers/journey-handshake.js'
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
const UNITED_KINGDOM = { code: 'GB', name: 'United Kingdom' }
const FRANCE = { code: 'FR', name: 'France' }
const UNITED_STATES = { code: 'US', name: 'United States' }
const UNITED_ARAB_EMIRATES = { code: 'AE', name: 'United Arab Emirates' }
const GB_AND_FRANCE = [UNITED_KINGDOM, FRANCE]
const GB_AND_FRANCE_ITEMS = [
  { value: UNITED_KINGDOM.code, text: UNITED_KINGDOM.name },
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
      { code: 'GB', name: 'United Kingdom duplicate' },
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

  test.each(['consignee', 'importer', 'placeOfDestination'])(
    'Should offer United Kingdom alone and accept only GB for the %s',
    async (role) => {
      const { addFormCountryOffer } = await importAddressCountriesInRealMode()

      const offer = await addFormCountryOffer({
        handshakeContext: handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role]),
        placeholder: COUNTRY_PLACEHOLDER
      })

      expect(offer).toEqual({
        countryItems: [
          { value: UNITED_KINGDOM.code, text: UNITED_KINGDOM.name }
        ],
        countryCodes: ['GB']
      })
    }
  )

  test.each([
    [
      'the place of origin',
      handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE.placeOfOrigin)
    ],
    ['the consignor', handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE.consignor)],
    ['no handshake', null]
  ])(
    'Should offer the placeholder then every served country for %s',
    async (_name, handshakeContext) => {
      serveCountries([FRANCE, UNITED_KINGDOM])
      const { addFormCountryOffer } = await importAddressCountriesInRealMode()

      const offer = await addFormCountryOffer({
        handshakeContext,
        placeholder: COUNTRY_PLACEHOLDER
      })

      expect(offer).toEqual({
        countryItems: [
          { value: '', text: COUNTRY_PLACEHOLDER },
          { value: FRANCE.code, text: FRANCE.name },
          { value: UNITED_KINGDOM.code, text: UNITED_KINGDOM.name }
        ],
        countryCodes: ['FR', 'GB']
      })
    }
  )
})

describe('#formValuesWithRequiredCountry', () => {
  const postedValues = { name: 'Farm', countryCode: 'FR', postcode: 'AB1 2CD' }

  test.each(['consignee', 'importer', 'placeOfDestination'])(
    'Should fix the posted country to GB for the %s',
    async (role) => {
      const { formValuesWithRequiredCountry } =
        await importAddressCountriesInRealMode()

      expect(
        formValuesWithRequiredCountry(
          handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role]),
          postedValues
        )
      ).toEqual({ ...postedValues, countryCode: 'GB' })
    }
  )

  test.each([
    [
      'the place of origin',
      handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE.placeOfOrigin)
    ],
    ['the consignor', handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE.consignor)],
    ['no handshake', null]
  ])(
    'Should leave the posted country as posted for %s',
    async (_name, handshakeContext) => {
      const { formValuesWithRequiredCountry } =
        await importAddressCountriesInRealMode()

      expect(
        formValuesWithRequiredCountry(handshakeContext, postedValues)
      ).toEqual(postedValues)
    }
  )
})

describe('#buildCountrySelectItems', () => {
  test('Should put the placeholder option before the country options', () => {
    expect(buildCountrySelectItems(GB_AND_FRANCE, COUNTRY_PLACEHOLDER)).toEqual(
      [{ value: '', text: COUNTRY_PLACEHOLDER }, ...GB_AND_FRANCE_ITEMS]
    )
  })
})

describe('#buildEditCountrySelectItems', () => {
  const blankOption = { value: '', text: COUNTRY_PLACEHOLDER }

  test('Should offer only the countries when the shown country is one of them', () => {
    expect(
      buildEditCountrySelectItems(GB_AND_FRANCE, 'FR', COUNTRY_PLACEHOLDER)
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
          COUNTRY_PLACEHOLDER
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
    expect(countryLabelOf(GB_AND_FRANCE, FRANCE.code)).toBe(FRANCE.name)
  })

  test('Should return the code itself when it is not listed', () => {
    expect(countryLabelOf(GB_AND_FRANCE, 'ZZ')).toBe('ZZ')
  })
})
