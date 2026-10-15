import nock from 'nock'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { config } from '../../../../config/config.js'
import { refuseOutboundHttp } from '../../../common/test-helpers/real-mode.js'
import {
  buildCountryItems,
  buildCountrySelectItems,
  resolveCountryCodeFromSearchTerm,
  GB_COUNTRY
} from './address-countries.js'

const REFERENCE_DATA_URL = config.get('tradeImportsReferenceDataApi.baseUrl')
const originalMode = process.env.STUB_MODE
const UK_NAME = 'United Kingdom'

const serveCountryList = (countries) =>
  nock(REFERENCE_DATA_URL).get('/countries').reply(200, countries)

const importAddressCountries = async () => {
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
    serveCountryList([
      { code: 'US', name: 'United States' },
      { code: 'FR', name: 'France' },
      { code: 'GB', name: 'United Kingdom duplicate' },
      { code: 'AE', name: 'United Arab Emirates' }
    ])
    const { getAddressFormCountries } = await importAddressCountries()

    const countries = await getAddressFormCountries()

    expect(countries).toEqual([
      { code: 'FR', name: 'France' },
      { code: 'AE', name: 'United Arab Emirates' },
      GB_COUNTRY,
      { code: 'US', name: 'United States' }
    ])
  })

  test('Should reject with a serverUnavailable Boom when the list is empty', async () => {
    serveCountryList([])
    const { getAddressFormCountries } = await importAddressCountries()

    await expect(getAddressFormCountries()).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 503 },
      data: { dataset: 'countries' }
    })
  })
})

describe('#buildCountrySelectItems', () => {
  test('prepends the placeholder option for govukSelect', () => {
    expect(
      buildCountrySelectItems(
        [
          { code: 'GB', name: UK_NAME },
          { code: 'FR', name: 'France' }
        ],
        'Select a country'
      )
    ).toEqual([
      { value: '', text: 'Select a country' },
      { value: 'GB', text: UK_NAME },
      { value: 'FR', text: 'France' }
    ])
  })
})

describe('#buildCountryItems', () => {
  test('binds option value to country code not name', () => {
    expect(
      buildCountryItems([
        { code: 'GB', name: UK_NAME },
        { code: 'FR', name: 'France' }
      ])
    ).toEqual([
      { value: 'GB', text: UK_NAME },
      { value: 'FR', text: 'France' }
    ])
  })
})

describe('#resolveCountryCodeFromSearchTerm', () => {
  const countries = [
    { code: 'GB', name: UK_NAME },
    { code: 'FR', name: 'France' }
  ]

  test('returns alpha-2 code for a case-insensitive country name match', () => {
    expect(resolveCountryCodeFromSearchTerm('France', countries)).toBe('FR')
    expect(resolveCountryCodeFromSearchTerm('france', countries)).toBe('FR')
    expect(resolveCountryCodeFromSearchTerm(UK_NAME, countries)).toBe('GB')
  })

  test('returns undefined when the term does not match a country name', () => {
    expect(resolveCountryCodeFromSearchTerm('Paris', countries)).toBeUndefined()
    expect(resolveCountryCodeFromSearchTerm('', countries)).toBeUndefined()
    expect(
      resolveCountryCodeFromSearchTerm(undefined, countries)
    ).toBeUndefined()
  })
})
