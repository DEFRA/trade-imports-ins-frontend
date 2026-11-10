import { expect } from 'vitest'

import { GB_COUNTRY } from '../../app/features/address-book/address-countries.js'
import { copy } from '../../app/features/address-book/copy/copy.en.js'
import {
  COUNTRY_OPTIONS,
  SELECTED_COUNTRY_OPTION
} from './address-book-requests.js'
import { textsOf } from './rendered-text.js'

const expectPlaceholderThenCountries = ($, countryNames) =>
  expect(textsOf($, COUNTRY_OPTIONS)).toEqual([
    copy.form.countryPlaceholder,
    ...countryNames
  ])

export const expectPlaceholderThenCountriesNoneSelected = ($, countryNames) => {
  expectPlaceholderThenCountries($, countryNames)
  expect($(SELECTED_COUNTRY_OPTION)).toHaveLength(0)
}

export const expectPlaceholderThenCountriesUnitedKingdomSelected = (
  $,
  countryNames
) => {
  expectPlaceholderThenCountries($, countryNames)
  expect($(SELECTED_COUNTRY_OPTION).attr('value')).toBe(GB_COUNTRY.code)
}
