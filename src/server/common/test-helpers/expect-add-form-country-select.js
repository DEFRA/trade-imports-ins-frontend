import { expect } from 'vitest'

import { GB_COUNTRY } from '../../app/features/address-book/address-countries.js'
import {
  COUNTRY_OPTIONS,
  SELECTED_COUNTRY_OPTION
} from './address-book-requests.js'
import { COUNTRY_PLACEHOLDER } from './country-placeholder.js'
import { textsOf } from './rendered-text.js'

export const expectUnitedKingdomAloneSelected = ($) => {
  expect(textsOf($, COUNTRY_OPTIONS)).toEqual([GB_COUNTRY.name])
  expect($(SELECTED_COUNTRY_OPTION).attr('value')).toBe(GB_COUNTRY.code)
}

export const expectPlaceholderThenCountriesNoneSelected = ($, countryNames) => {
  expect(textsOf($, COUNTRY_OPTIONS)).toEqual([
    COUNTRY_PLACEHOLDER,
    ...countryNames
  ])
  expect($(SELECTED_COUNTRY_OPTION)).toHaveLength(0)
}
