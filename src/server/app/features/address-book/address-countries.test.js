import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  refuseOutboundHttp,
  serveCountries
} from '../../../common/test-helpers/real-mode.js'
import { COUNTRY_PLACEHOLDER } from '../../../common/test-helpers/country-placeholder.js'
import { ADDRESS_TYPES } from '../../services/address-book/index.js'
import {
  ANY_COUNTRY_ROLES,
  CONSIGNMENT_CONTACT_HANDSHAKE,
  handshakeContextOf,
  JOURNEY_HANDSHAKES_BY_ROLE,
  UNITED_KINGDOM_ROLES
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
const FRANCE = { code: 'FR', name: 'France' }
const UNITED_STATES = { code: 'US', name: 'United States' }
const UNITED_ARAB_EMIRATES = { code: 'AE', name: 'United Arab Emirates' }
const GB_AND_FRANCE = [GB_COUNTRY, FRANCE]
const GB_AND_FRANCE_ITEMS = [
  { value: GB_COUNTRY.code, text: GB_COUNTRY.name },
  { value: FRANCE.code, text: FRANCE.name }
]

const anyCountryContexts = [
  ...ANY_COUNTRY_ROLES.map((role) => [
    `the ${role} handshake`,
    handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role]),
    undefined
  ]),
  [
    'the consignment contact handshake',
    handshakeContextOf(CONSIGNMENT_CONTACT_HANDSHAKE),
    undefined
  ],
  [
    'no handshake and Origin or Consignor chosen',
    null,
    ADDRESS_TYPES.ORIGIN_OR_CONSIGNOR
  ]
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

  const postedValues = { name: 'Farm', countryCode: 'FR', postcode: 'AB1 2CD' }

  test.each([
    ...UNITED_KINGDOM_ROLES.map((role) => [
      `the ${role} handshake`,
      handshakeContextOf(JOURNEY_HANDSHAKES_BY_ROLE[role]),
      undefined
    ]),
    [
      'no handshake and Destination, Consignee or Importer chosen',
      null,
      ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER
    ],
    ['no handshake and Branch chosen', null, ADDRESS_TYPES.BRANCH]
  ])(
    'Should offer United Kingdom alone, accept only GB and fix the posted country to GB for %s',
    async (_name, handshakeContext, addressType) => {
      const { addFormCountryOffer } = await importAddressCountriesInRealMode()

      const offer = await addFormCountryOffer({
        handshakeContext,
        addressType,
        placeholder: COUNTRY_PLACEHOLDER,
        formValues: postedValues
      })

      expect(offer).toEqual({
        countryItems: [{ value: GB_COUNTRY.code, text: GB_COUNTRY.name }],
        countryCodes: [GB_COUNTRY.code],
        formValues: { ...postedValues, countryCode: GB_COUNTRY.code }
      })
    }
  )

  test('Should let the consignor handshake decide over a chosen type that must be in the United Kingdom', async () => {
    serveCountries([FRANCE, GB_COUNTRY])
    const { addFormCountryOffer } = await importAddressCountriesInRealMode()

    const offer = await addFormCountryOffer({
      handshakeContext: handshakeContextOf(
        JOURNEY_HANDSHAKES_BY_ROLE.consignor
      ),
      addressType: ADDRESS_TYPES.DESTINATION_CONSIGNEE_OR_IMPORTER,
      placeholder: COUNTRY_PLACEHOLDER,
      formValues: postedValues
    })

    expect(offer.countryCodes).toEqual(['FR', GB_COUNTRY.code])
    expect(offer.formValues).toEqual(postedValues)
  })

  test.each(anyCountryContexts)(
    'Should offer the placeholder then every served country and leave the posted country as posted for %s',
    async (_name, handshakeContext, addressType) => {
      serveCountries([FRANCE, GB_COUNTRY])
      const { addFormCountryOffer } = await importAddressCountriesInRealMode()

      const offer = await addFormCountryOffer({
        handshakeContext,
        addressType,
        placeholder: COUNTRY_PLACEHOLDER,
        formValues: postedValues
      })

      expect(offer).toEqual({
        countryItems: [
          { value: '', text: COUNTRY_PLACEHOLDER },
          { value: FRANCE.code, text: FRANCE.name },
          { value: GB_COUNTRY.code, text: GB_COUNTRY.name }
        ],
        countryCodes: ['FR', GB_COUNTRY.code],
        formValues: postedValues
      })
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
